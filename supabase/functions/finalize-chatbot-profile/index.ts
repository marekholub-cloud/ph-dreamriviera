import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InvestorData = Record<string, any> & {
  contact_email?: string;
  contact_whatsapp?: string;
  budget_amount?: string;
  budget_currency?: string;
  horizon?: string;
  goals?: string[];
  experience?: string;
  financing?: string;
  property_type?: string;
  location_preference?: string;
  biggest_concern?: string;
  management_needed?: string;
  strategy?: string;
  handoff_to_human?: boolean;
  completed?: boolean;
};

const parseBudget = (budgetAmount?: string) => {
  if (!budgetAmount) return { min: null as number | null, max: null as number | null };
  const parts = String(budgetAmount).split("-");
  const toNum = (s: string) => {
    const digits = s.replace(/[^0-9]/g, "");
    const n = digits ? parseFloat(digits) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const min = toNum(parts[0] ?? "");
  const max = toNum(parts[1] ?? parts[0] ?? "");
  return { min, max };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, affiliateCode } = await req.json();
    
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(JSON.stringify({ error: "Missing sessionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[finalize-chatbot-profile] Processing session:", sessionId);
    console.log("[finalize-chatbot-profile] Affiliate code from request:", affiliateCode);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const { data: convo, error: convoError } = await supabase
      .from("chatbot_conversations")
      .select("id, investor_data, messages")
      .eq("session_id", sessionId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convoError) {
      console.error("[finalize-chatbot-profile] convo read error:", convoError);
      throw convoError;
    }

    if (!convo) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const investorData = (convo.investor_data || null) as InvestorData | null;
    if (!investorData) {
      return new Response(JSON.stringify({ error: "Missing investor data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine contact info - prefer from investor_data, fallback to user email
    const contactEmail = investorData.contact_email || userEmail;
    const contactPhone = investorData.contact_whatsapp;
    const leadName = contactEmail || contactPhone || "Chatbot návštěvník";

    console.log("[finalize-chatbot-profile] Calling create-or-update-lead...");

    // Call centralized create-or-update-lead function
    const leadRequest = {
      name: leadName,
      email: contactEmail || undefined,
      phone: contactPhone || undefined,
      source_type: 'chatbot',
      source_page: '/chatbot',
      affiliate_code: affiliateCode?.trim().toUpperCase() || undefined,
      message: `Chatbot lead. Budget: ${investorData.budget_amount || 'N/A'}, Horizont: ${investorData.horizon || 'N/A'}, Cíle: ${Array.isArray(investorData.goals) ? investorData.goals.join(', ') : 'N/A'}`,
      investor_data: investorData,
      session_id: sessionId,
      metadata: {
        conversation_id: convo.id,
        user_id: userId,
        biggest_concern: investorData.biggest_concern,
        management_needed: investorData.management_needed,
      },
    };

    let leadId: string | null = null;

    try {
      const leadResponse = await fetch(`${supabaseUrl}/functions/v1/create-or-update-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(leadRequest),
      });

      const leadResult = await leadResponse.json();
      console.log("[finalize-chatbot-profile] create-or-update-lead result:", leadResult);

      if (leadResult.success && leadResult.lead_id) {
        leadId = leadResult.lead_id;
        console.log("[finalize-chatbot-profile] Lead created/updated:", leadId);
      } else {
        console.error("[finalize-chatbot-profile] Failed to create/update lead:", leadResult.error);
      }
    } catch (leadError) {
      console.error("[finalize-chatbot-profile] Error calling create-or-update-lead:", leadError);
    }

    // If centralized lead creation failed, create lead directly as fallback
    if (!leadId) {
      console.log("[finalize-chatbot-profile] Fallback: creating lead directly");
      
      // Look up referrer if affiliate code provided
      let referrerId: string | null = null;
      if (affiliateCode) {
        const normalizedCode = affiliateCode.trim().toUpperCase();
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("affiliate_code", normalizedCode)
          .maybeSingle();
        
        if (profile) {
          referrerId = profile.id;
        }
      }

      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          lead_name: leadName,
          lead_type: "referral", // Valid constraint value
          status: "influencer", // Valid constraint value
          warmth_level: 50, // Valid constraint value
          lead_level: 1, // Valid constraint value
          email: contactEmail || null,
          phone: contactPhone || null,
          source_form: "chatbot",
          referrer_id: referrerId,
          affiliate_code: affiliateCode?.trim().toUpperCase() || null,
          questionnaire_completed_independently: true,
          investment_timeline: investorData.horizon || null,
          investment_goals: Array.isArray(investorData.goals) ? investorData.goals.join(", ") : null,
        })
        .select("id")
        .single();

      if (leadError) {
        console.error("[finalize-chatbot-profile] lead insert error:", leadError);
        throw leadError;
      }

      leadId = lead.id;
    }

    // Create investor questionnaire
    const { min, max } = parseBudget(investorData.budget_amount);

    const questionnaireData = {
      lead_id: leadId,
      completed_by: userId,
      completed_at: new Date().toISOString(),
      experience_level: investorData.experience || null,
      budget_min: min,
      budget_max: max,
      financing_type: investorData.financing || null,
      investment_horizon: investorData.horizon || null,
      risk_tolerance:
        investorData.strategy === "hold" ? "conservative" : investorData.strategy === "flip" ? "aggressive" : "moderate",
      preferred_property_types: investorData.property_type ? [investorData.property_type] : [],
      target_markets: investorData.location_preference ? [investorData.location_preference] : [],
      priority: Array.isArray(investorData.goals) ? investorData.goals[0] || null : null,
      additional_notes: `Chatbot session. Biggest concern: ${investorData.biggest_concern || "N/A"}. Management needed: ${investorData.management_needed || "N/A"}`,
      responses: {
        ...investorData,
        conversation_history: convo.messages,
        collected_via: "chatbot",
        collected_at: new Date().toISOString(),
      },
      version: 1,
    };

    const { data: questionnaire, error: qError } = await supabase
      .from("investor_questionnaires")
      .insert(questionnaireData)
      .select("id")
      .single();

    if (qError) {
      console.error("[finalize-chatbot-profile] questionnaire insert error:", qError);
      throw qError;
    }

    // Link conversation to user + lead
    const status = investorData.completed ? "completed" : investorData.handoff_to_human ? "handoff" : "active";

    const { error: convoUpdateError } = await supabase
      .from("chatbot_conversations")
      .update({
        user_id: userId,
        lead_id: leadId,
        status,
        completed: Boolean(investorData.completed),
        handoff_to_human: Boolean(investorData.handoff_to_human),
      })
      .eq("id", convo.id);

    if (convoUpdateError) {
      console.error("[finalize-chatbot-profile] convo update error:", convoUpdateError);
      throw convoUpdateError;
    }

    console.log("[finalize-chatbot-profile] Successfully finalized:", { leadId, questionnaireId: questionnaire.id });

    return new Response(
      JSON.stringify({
        success: true,
        leadId: leadId,
        questionnaireId: questionnaire.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[finalize-chatbot-profile] error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
