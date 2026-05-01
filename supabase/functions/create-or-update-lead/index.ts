import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WLM CRM API endpoint - per WLM documentation
// NOTE: this is an external backend function (WLM side)
const WLM_API_URL = "https://xkxbdwhwkbzjowcdyhqq.supabase.co/functions/v1/external-lead-sync";

// Status mapping: our internal lead status -> WLM status
const statusMap: Record<string, string> = {
  new: "new",
  influencer: "new",
  contacted: "contacted",
  qualified: "qualified",
  supertip: "qualified",
  negotiation: "negotiation",
  closed_won: "won",
  closed_lost: "lost",
  inactive: "inactive",
  merged: "inactive",
};

interface LeadRequest {
  // Identification (at least one required)
  email?: string;
  phone?: string;

  // Basic info
  name: string;

  // Source
  source_type:
    | "contact_form"
    | "chatbot"
    | "seminar_booking"
    | "supertip_form"
    | "brochure_request"
    | "catalog_download";
  source_page?: string;

  // Referral (optional)
  affiliate_code?: string;

  // Click history from frontend (optional) - for tracking all affiliate interactions
  click_history?: Array<{
    code: string;
    timestamp: string;
    page_url?: string;
    was_first?: boolean;
  }>;

  // Interaction (optional)
  message?: string;
  metadata?: Record<string, any>;

  // Seminar specific (optional)
  seminar_slug?: string;
  time_slot?: string;
  seminar_accepted?: boolean;

  // Chatbot specific (optional)
  investor_data?: Record<string, any>;
  session_id?: string;

  // Additional fields
  budget?: string;
  investment_goals?: string;
  investment_timeline?: string;
  preferred_contact_time?: string;
}

interface LeadResponse {
  success: boolean;
  lead_id?: string;
  is_new_lead: boolean;
  interaction_id?: string;
  wlm_synced: boolean;
  error?: string;
}

// WLM Lead format per API documentation (single lead inside payload.leads[])
interface WLMLeadData {
  source_lead_id: string;
  source_domain: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  status: string;
  notes?: string;
  warmth_level?: number;
  lead_score?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

// Parse full name into first and last name
function parseFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }
  const first_name = parts[0];
  const last_name = parts.slice(1).join(" ");
  return { first_name, last_name };
}

// Normalize phone number for comparison
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, "").replace(/^00/, "+");
}

// Transform warmth_level from 1-100 -> 1-10 for WLM
function transformWarmthLevel(warmth: number): number {
  return Math.min(10, Math.max(1, Math.round(warmth / 10)));
}

// Transform lead_level from 1-5 -> 0-100 for WLM
function transformLeadScore(leadLevel: number): number {
  return Math.min(100, Math.max(0, leadLevel * 20));
}

// Send one lead to WLM API in the documented batch format
async function sendLeadToWLM(leadData: {
  name: string;
  email?: string;
  phone?: string;
  source_page?: string;
  affiliate_code?: string;
  message?: string;
  lead_id: string;
  status?: string;
  warmth_level?: number;
  lead_level?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = Deno.env.get("WLM_EXTERNAL_API_KEY");

  if (!apiKey) {
    console.log("[WLM] WLM_EXTERNAL_API_KEY not configured, skipping WLM sync");
    return { success: false, error: "WLM_EXTERNAL_API_KEY not configured" };
  }

  try {
    const { first_name, last_name } = parseFullName(leadData.name);

    const lead: WLMLeadData = {
      // WLM expects a stable external ID like "dr-12345"
      source_lead_id: `dr-${leadData.lead_id}`,
      source_domain: "go2dubai.online",
      first_name,
      last_name,
      email: leadData.email || "",
      phone: leadData.phone || undefined,
      whatsapp: leadData.phone || undefined,
      status: statusMap[leadData.status || "new"] || "new",
      notes: leadData.message || undefined,
      warmth_level:
        typeof leadData.warmth_level === "number"
          ? transformWarmthLevel(leadData.warmth_level)
          : undefined,
      lead_score:
        typeof leadData.lead_level === "number"
          ? transformLeadScore(leadData.lead_level)
          : undefined,
      utm_source: leadData.utm_source || undefined,
      utm_medium: leadData.utm_medium || undefined,
      utm_campaign: leadData.utm_campaign || undefined,
      utm_content: leadData.utm_content || undefined,
      utm_term: leadData.utm_term || undefined,
    };

    // Clean undefined/null/"" values
    const cleanedLead = Object.fromEntries(
      Object.entries(lead).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    );

    const payload = {
      mode: "full_sync",
      leads: [cleanedLead],
    };

    console.log("[WLM] Sending payload to WLM:", JSON.stringify(payload, null, 2));

    const response = await fetch(WLM_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("[WLM] Response status:", response.status);
    console.log("[WLM] Response body:", responseText);

    if (!response.ok) {
      return { success: false, error: `WLM API error: ${response.status} - ${responseText}` };
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[WLM] Error sending lead:", error);
    return { success: false, error: errorMessage };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: LeadRequest = await req.json();
    console.log("[create-or-update-lead] Received request:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.name || body.name.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.email && !body.phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Email or phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.source_type) {
      return new Response(
        JSON.stringify({ success: false, error: "Source type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize inputs
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone ? normalizePhone(body.phone) : undefined;
    const affiliateCode = body.affiliate_code?.trim().toUpperCase();

    // Step 1: Look up referrer if affiliate code provided
    let referrerId: string | null = null;
    if (affiliateCode) {
      console.log("[create-or-update-lead] Looking up referrer for code:", affiliateCode);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("affiliate_code", affiliateCode)
        .maybeSingle();

      if (profileError) {
        console.error("[create-or-update-lead] Error looking up referrer:", profileError);
      } else if (profile) {
        referrerId = profile.id;
        console.log("[create-or-update-lead] Found referrer:", referrerId);
      } else {
        console.log("[create-or-update-lead] No referrer found for code:", affiliateCode);
      }
    }

    // Step 2: Check for existing lead by email OR phone
    let existingLead = null;
    
    if (email) {
      const { data: leadByEmail } = await supabase
        .from("leads")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      
      if (leadByEmail) {
        existingLead = leadByEmail;
        console.log("[create-or-update-lead] Found existing lead by email:", existingLead.id);
      }
    }

    if (!existingLead && phone) {
      const { data: leadByPhone } = await supabase
        .from("leads")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();
      
      if (leadByPhone) {
        existingLead = leadByPhone;
        console.log("[create-or-update-lead] Found existing lead by phone:", existingLead.id);
      }
    }

    let leadId: string;
    let isNewLead = false;

    if (existingLead) {
      // Step 3a: Update existing lead
      leadId = existingLead.id;
      console.log("[create-or-update-lead] Updating existing lead:", leadId);

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Update seminar_accepted if this is a seminar booking
      if (body.source_type === 'seminar_booking' || body.seminar_accepted) {
        updateData.seminar_accepted = true;
      }

      // Update referrer if not already set and we have one
      if (!existingLead.referrer_id && referrerId) {
        updateData.referrer_id = referrerId;
        updateData.affiliate_code = affiliateCode;
      }

      // Update phone if not set
      if (!existingLead.phone && phone) {
        updateData.phone = phone;
      }

      // Update email if not set
      if (!existingLead.email && email) {
        updateData.email = email;
      }

      // Append to click_history if new affiliate code interaction
      if (affiliateCode) {
        const existingHistory = Array.isArray(existingLead.click_history) ? existingLead.click_history : [];
        const newClickEntry = {
          code: affiliateCode,
          timestamp: new Date().toISOString(),
          page_url: body.source_page,
          was_first: existingHistory.length === 0,
        };
        updateData.click_history = [...existingHistory, newClickEntry];
        console.log("[create-or-update-lead] Appending to click_history:", newClickEntry);
      }

      const { error: updateError } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId);

      if (updateError) {
        console.error("[create-or-update-lead] Error updating lead:", updateError);
      }
    } else {
      // Step 3b: Create new lead
      console.log("[create-or-update-lead] Creating new lead");
      isNewLead = true;

      // Build initial click history from provided data or create entry for current affiliate
      let clickHistory: Array<{ code: string; timestamp: string; page_url?: string; was_first?: boolean }> = [];
      if (body.click_history && Array.isArray(body.click_history)) {
        clickHistory = body.click_history;
      } else if (affiliateCode) {
        // Create initial entry for the affiliate code
        clickHistory = [{
          code: affiliateCode,
          timestamp: new Date().toISOString(),
          page_url: body.source_page,
          was_first: true,
        }];
      }

      const newLead = {
        lead_name: body.name.trim(),
        email: email || null,
        phone: phone || null,
        lead_type: "referral" as const, // Valid constraint value
        status: "influencer" as const, // Valid constraint value
        warmth_level: 50, // Valid constraint value
        lead_level: 1, // Valid constraint value
        referrer_id: referrerId,
        affiliate_code: affiliateCode || null,
        source_form: body.source_type,
        budget: body.budget || null,
        investment_goals: body.investment_goals || null,
        investment_timeline: body.investment_timeline || null,
        preferred_contact_time: body.preferred_contact_time || null,
        seminar_accepted: body.source_type === 'seminar_booking' || body.seminar_accepted || false,
        notes: body.message || null,
        click_history: clickHistory,
      };

      console.log("[create-or-update-lead] New lead data:", JSON.stringify(newLead, null, 2));

      const { data: insertedLead, error: insertError } = await supabase
        .from("leads")
        .insert(newLead)
        .select("id")
        .single();

      if (insertError) {
        console.error("[create-or-update-lead] Error creating lead:", insertError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to create lead: ${insertError.message}`,
            details: insertError 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      leadId = insertedLead.id;
      console.log("[create-or-update-lead] Created new lead:", leadId);
    }

    // Step 4: Always add interaction to history
    const interactionData = {
      lead_id: leadId,
      interaction_type: body.source_type,
      source_page: body.source_page || null,
      message: body.message || null,
      metadata: {
        ...body.metadata,
        seminar_slug: body.seminar_slug,
        time_slot: body.time_slot,
        investor_data: body.investor_data,
        session_id: body.session_id,
        is_new_lead: isNewLead,
      },
    };

    console.log("[create-or-update-lead] Adding interaction:", JSON.stringify(interactionData, null, 2));

    const { data: interaction, error: interactionError } = await supabase
      .from("lead_interactions")
      .insert(interactionData)
      .select("id")
      .single();

    if (interactionError) {
      console.error("[create-or-update-lead] Error adding interaction:", interactionError);
      // Don't fail the whole request, just log
    }

    // Step 5: Fetch questionnaire data for WLM sync (if exists)
    let questionnaireData: Record<string, any> = {};
    const { data: questionnaire } = await supabase
      .from("investor_questionnaires")
      .select(`
        experience_level,
        risk_tolerance,
        financing_type,
        budget_min,
        budget_max,
        target_markets,
        preferred_property_types,
        investment_horizon
      `)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (questionnaire) {
      console.log("[create-or-update-lead] Found questionnaire for lead:", leadId);
      questionnaireData = questionnaire;
    }

    // Step 6: Fetch current lead data for WLM sync
    const { data: currentLead } = await supabase
      .from("leads")
      .select(
        "status, warmth_level, lead_level, utm_source, utm_medium, utm_campaign, utm_content, utm_term"
      )
      .eq("id", leadId)
      .single();

    // Step 7: Sync to WLM
    const wlmResult = await sendLeadToWLM({
      name: body.name,
      email,
      phone,
      source_page: body.source_page,
      affiliate_code: affiliateCode,
      message: body.message,
      lead_id: leadId,
      status: currentLead?.status,

      // Qualification
      warmth_level: currentLead?.warmth_level || 50,
      lead_level: currentLead?.lead_level || 1,
      
      // UTM parameters
      utm_source: currentLead?.utm_source,
      utm_medium: currentLead?.utm_medium,
      utm_campaign: currentLead?.utm_campaign,
      utm_content: currentLead?.utm_content,
      utm_term: currentLead?.utm_term,
      
    });

    console.log("[create-or-update-lead] WLM sync result:", wlmResult);

    const response: LeadResponse = {
      success: true,
      lead_id: leadId,
      is_new_lead: isNewLead,
      interaction_id: interaction?.id,
      wlm_synced: wlmResult.success,
    };

    console.log("[create-or-update-lead] Final response:", JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[create-or-update-lead] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
