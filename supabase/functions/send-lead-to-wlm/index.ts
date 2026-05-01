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

// Progress step mapping for interactions → history
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

// Transform warmth_level 1-100 → 1-10 for WLM
function transformWarmthLevel(warmth: number | null): number {
  if (!warmth) return 5;
  return Math.min(10, Math.max(1, Math.round(warmth / 10)));
}

// Transform lead_level 1-5 → 0-100 for WLM
function transformLeadScore(leadLevel: number | null): number {
  if (!leadLevel) return 20;
  return Math.min(100, Math.max(0, leadLevel * 20));
}

async function fetchCompleteLeadData(supabase: any, leadId: string): Promise<WLMLeadData | null> {
  console.log("[WLM] Fetching lead data for:", leadId);

  // Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    console.error("[WLM] Lead fetch error:", leadError);
    return null;
  }

  // Fetch questionnaire
  const { data: questionnaire } = await supabase
    .from("investor_questionnaires")
    .select("*")
    .eq("lead_id", leadId)
    .maybeSingle();

  // Fetch interactions for history
  const { data: interactions } = await supabase
    .from("lead_interactions")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  // Parse name
  const { first_name, last_name } = parseFullName(lead.lead_name);

  // Parse budget
  const budgetData = questionnaire?.budget_min
    ? { budget_min: questionnaire.budget_min, budget_max: questionnaire.budget_max }
    : parseBudget(lead.budget);

  // Build history from interactions
  const history = (interactions || []).map((interaction: any) => ({
    action: interaction.interaction_type,
    details: interaction.message || interaction.source_page || "",
    timestamp: interaction.created_at,
    progress_step: interactionToProgressStep[interaction.interaction_type] || "contacted",
  }));

  // Add creation event if no history
  if (history.length === 0) {
    history.push({
      action: "Lead vytvořen",
      details: lead.source_form || "Registrace",
      timestamp: lead.created_at,
      progress_step: "new_lead",
    });
  }

  const wlmLead: WLMLeadData = {
    source_lead_id: `dr-${lead.id}`,
    source_domain: "go2dubai.online",
    first_name,
    last_name,
    email: lead.email || "",
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

  console.log("[WLM] Lead data assembled for:", lead.lead_name);
  return wlmLead;
}

// Send leads to WLM using the correct API format
async function sendToWLM(leads: WLMLeadData[]): Promise<any> {
  const apiKey = Deno.env.get("WLM_EXTERNAL_API_KEY");

  if (!apiKey) {
    throw new Error("WLM_EXTERNAL_API_KEY not configured");
  }

  console.log(`[WLM] Sending ${leads.length} lead(s) to WLM API`);

  // Clean undefined values from leads
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

  console.log("[WLM] Request payload:", JSON.stringify(payload, null, 2));

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
  console.log(`[WLM] Response body: ${responseText}`);

  if (!response.ok) {
    throw new Error(`WLM API error: ${response.status} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-lead-to-wlm] Function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { lead_id, lead_ids } = body;

    // Handle single lead or multiple leads
    const idsToProcess = lead_ids || (lead_id ? [lead_id] : []);

    if (idsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No lead_id or lead_ids provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (idsToProcess.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: "Maximum 100 leads per request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[WLM] Processing ${idsToProcess.length} lead(s)`);

    // Fetch all lead data
    const leads: WLMLeadData[] = [];
    const errors: Array<{ lead_id: string; error: string }> = [];

    for (const id of idsToProcess) {
      const leadData = await fetchCompleteLeadData(supabase, id);
      if (leadData) {
        if (leadData.email) {
          leads.push(leadData);
        } else {
          errors.push({ lead_id: id, error: "Lead has no email address" });
        }
      } else {
        errors.push({ lead_id: id, error: "Lead not found" });
      }
    }

    if (leads.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No valid leads to sync", errors }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send to WLM
    const wlmResponse = await sendToWLM(leads);

    return new Response(
      JSON.stringify({
        success: true,
        wlm_response: wlmResponse,
        processed: leads.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[send-lead-to-wlm] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
