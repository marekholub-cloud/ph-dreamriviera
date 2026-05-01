import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WLM CRM API endpoint - CORRECT endpoint per documentation
const WLM_API_URL = "https://xkxbdwhwkbzjowcdyhqq.supabase.co/functions/v1/external-lead-sync";

// Status mapping: ProDubai → WLM
const statusMap: Record<string, string> = {
  "new": "new",
  "influencer": "new",
  "contacted": "contacted",
  "qualified": "qualified",
  "supertip": "qualified",
  "negotiation": "negotiation",
  "closed_won": "won",
  "closed_lost": "lost",
  "inactive": "inactive",
};

// Investment horizon mapping
const investmentHorizonMap: Record<string, string> = {
  "okamžitě": "0-3 months",
  "do 3 měsíců": "0-3 months",
  "0-3 months": "0-3 months",
  "3-6 měsíců": "3-6 months",
  "3-6 months": "3-6 months",
  "6-12 měsíců": "6-12 months",
  "6-12 months": "6-12 months",
  "12+ měsíců": "12+ months",
  "více než rok": "12+ months",
  "12+ months": "12+ months",
};

// Investment strategy mapping
const investmentStrategyMap: Record<string, string> = {
  "pasivní příjem": "rental_income",
  "rental": "rental_income",
  "rental_income": "rental_income",
  "růst kapitálu": "capital_growth",
  "capital": "capital_growth",
  "capital_growth": "capital_growth",
  "osobní užití": "personal_use",
  "personal": "personal_use",
  "personal_use": "personal_use",
  "mix": "mixed",
  "kombinace": "mixed",
  "mixed": "mixed",
};

// Property type mapping
const propertyTypeMap: Record<string, string> = {
  "byt": "apartment",
  "apartment": "apartment",
  "vila": "villa",
  "villa": "villa",
  "penthouse": "penthouse",
  "studio": "studio",
  "townhouse": "townhouse",
  "řadový dům": "townhouse",
};

// Progress step mapping
const interactionToProgressStep: Record<string, string> = {
  "lead_created": "new_lead",
  "brochure_request": "contacted",
  "contact_form": "contacted",
  "seminar_registration": "meeting_scheduled",
  "consultation_booked": "meeting_scheduled",
  "consultation_completed": "meeting_done",
  "offer_sent": "offer_sent",
  "negotiation": "negotiation",
  "documents_signed": "documents",
  "payment_received": "payment",
  "deal_closed": "closed_won",
  "deal_lost": "closed_lost",
};

// WLM Lead format per API documentation
interface WLMLeadData {
  source_lead_id: string;
  source_domain: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  status: string;
  budget_min?: number;
  budget_max?: number;
  investment_horizon?: string;
  investment_strategy?: string;
  preferred_property_types?: string[];
  experience_level?: string;
  financing_type?: string;
  notes?: string;
  warmth_level?: number;
  lead_score?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  history?: Array<{
    action: string;
    details: string;
    timestamp: string;
    progress_step: string;
  }>;
}

function parseFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

function parseBudget(budget: string | null): { budget_min?: number; budget_max?: number } {
  if (!budget) return {};
  const numbers = budget.match(/[\d,.]+/g);
  if (!numbers || numbers.length === 0) return {};
  const parseNumber = (str: string) => parseFloat(str.replace(/,/g, "").replace(/\s/g, ""));
  if (numbers.length === 1) {
    const value = parseNumber(numbers[0]);
    return { budget_min: value, budget_max: value };
  }
  return { budget_min: parseNumber(numbers[0]), budget_max: parseNumber(numbers[1]) };
}

function mapPropertyTypes(types: string[] | null): string[] {
  if (!types) return [];
  return types
    .map(t => propertyTypeMap[t.toLowerCase()] || t.toLowerCase())
    .filter(t => ["apartment", "villa", "penthouse", "studio", "townhouse"].includes(t));
}

function transformWarmthLevel(warmth: number | null): number {
  if (!warmth) return 5;
  return Math.min(10, Math.max(1, Math.round(warmth / 10)));
}

function transformLeadScore(leadLevel: number | null): number {
  if (!leadLevel) return 20;
  return Math.min(100, Math.max(0, leadLevel * 20));
}

async function sendToWLM(leads: WLMLeadData[]): Promise<any> {
  const apiKey = Deno.env.get("WLM_EXTERNAL_API_KEY");

  if (!apiKey) {
    throw new Error("WLM_EXTERNAL_API_KEY not configured");
  }

  console.log(`[WLM] Sending batch of ${leads.length} lead(s)`);

  // Clean undefined values
  const cleanedLeads = leads.map(lead => {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(lead)) {
      if (value !== undefined && value !== null && value !== "") {
        cleaned[key] = value;
      }
    }
    return cleaned;
  });

  // WLM API format per documentation
  const payload = {
    mode: "full_sync",
    leads: cleanedLeads,
  };

  console.log("[WLM] Payload size:", JSON.stringify(payload).length, "bytes");

  const response = await fetch(WLM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log(`[WLM] Response status: ${response.status}`);

  if (!response.ok) {
    throw new Error(`WLM API error: ${response.status} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[bulk-sync-leads-to-wlm] Function started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { filter, limit = 100 } = body;

    console.log("[bulk-sync] Filter:", filter, "Limit:", limit);

    // Build query
    let query = supabase
      .from("leads")
      .select("*")
      .not("email", "is", null)
      .neq("email", "")
      .is("merged_into_id", null)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 100));

    // Apply filters
    if (filter?.status) {
      query = query.eq("status", filter.status);
    }
    if (filter?.created_after) {
      query = query.gte("created_at", filter.created_after);
    }
    if (filter?.created_before) {
      query = query.lte("created_at", filter.created_before);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error("[bulk-sync] Error fetching leads:", leadsError);
      throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    }

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No leads to sync",
          summary: { total: 0, created: 0, updated: 0, skipped: 0, errors: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[bulk-sync] Found ${leads.length} leads`);

    // Fetch questionnaires for all leads
    const leadIds = leads.map(l => l.id);
    const { data: questionnaires } = await supabase
      .from("investor_questionnaires")
      .select("*")
      .in("lead_id", leadIds);

    const questionnaireMap = new Map((questionnaires || []).map(q => [q.lead_id, q]));

    // Fetch all interactions
    const { data: interactions } = await supabase
      .from("lead_interactions")
      .select("*")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: true });

    const interactionsMap = new Map<string, any[]>();
    for (const i of interactions || []) {
      if (!interactionsMap.has(i.lead_id)) interactionsMap.set(i.lead_id, []);
      interactionsMap.get(i.lead_id)!.push(i);
    }

    // Filter by questionnaire if needed
    let filteredLeads = leads;
    if (filter?.has_questionnaire === true) {
      filteredLeads = leads.filter(l => questionnaireMap.has(l.id));
    } else if (filter?.has_questionnaire === false) {
      filteredLeads = leads.filter(l => !questionnaireMap.has(l.id));
    }

    // Transform to WLM format
    const wlmLeads: WLMLeadData[] = filteredLeads.map(lead => {
      const questionnaire = questionnaireMap.get(lead.id);
      const leadInteractions = interactionsMap.get(lead.id) || [];

      const { first_name, last_name } = parseFullName(lead.lead_name);
      const budgetData = questionnaire?.budget_min
        ? { budget_min: questionnaire.budget_min, budget_max: questionnaire.budget_max }
        : parseBudget(lead.budget);

      // Build history
      const history = leadInteractions.map((i: any) => ({
        action: i.interaction_type,
        details: i.message || i.source_page || "",
        timestamp: i.created_at,
        progress_step: interactionToProgressStep[i.interaction_type] || "contacted",
      }));

      if (history.length === 0) {
        history.push({
          action: "Lead vytvořen",
          details: lead.source_form || "Registrace",
          timestamp: lead.created_at,
          progress_step: "new_lead",
        });
      }

      return {
        source_lead_id: `dr-${lead.id}`,
        source_domain: "go2dubai.online",
        first_name,
        last_name,
        email: lead.email,
        phone: lead.phone || undefined,
        whatsapp: lead.phone || undefined,
        status: statusMap[lead.status] || "new",
        ...budgetData,
        investment_horizon: questionnaire?.investment_horizon
          ? investmentHorizonMap[questionnaire.investment_horizon] || questionnaire.investment_horizon
          : lead.investment_timeline
            ? investmentHorizonMap[lead.investment_timeline] || lead.investment_timeline
            : undefined,
        investment_strategy: questionnaire?.priority
          ? investmentStrategyMap[questionnaire.priority] || questionnaire.priority
          : lead.investment_goals
            ? investmentStrategyMap[lead.investment_goals] || lead.investment_goals
            : undefined,
        preferred_property_types: mapPropertyTypes(questionnaire?.preferred_property_types),
        experience_level: questionnaire?.experience_level || undefined,
        financing_type: questionnaire?.financing_type || undefined,
        notes: lead.notes || questionnaire?.additional_notes || undefined,
        warmth_level: transformWarmthLevel(lead.warmth_level),
        lead_score: transformLeadScore(lead.lead_level),
        utm_source: lead.utm_source || undefined,
        utm_medium: lead.utm_medium || undefined,
        utm_campaign: lead.utm_campaign || undefined,
        utm_content: lead.utm_content || undefined,
        utm_term: lead.utm_term || undefined,
        history,
      };
    });

    // Filter out leads without email
    const validLeads = wlmLeads.filter(l => l.email);

    if (validLeads.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No valid leads to sync (all missing email)",
          summary: { total: wlmLeads.length, created: 0, updated: 0, skipped: wlmLeads.length, errors: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send to WLM API
    const wlmResponse = await sendToWLM(validLeads);

    console.log(`[bulk-sync] Completed. Processed: ${validLeads.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        wlm_response: wlmResponse,
        processed: validLeads.length,
        skipped: wlmLeads.length - validLeads.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[bulk-sync-leads-to-wlm] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
