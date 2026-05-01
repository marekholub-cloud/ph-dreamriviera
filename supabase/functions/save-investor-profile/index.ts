import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { investorData, leadId, userId, conversationHistory } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Saving investor profile:", investorData);

    // Map chatbot data to questionnaire fields
    const questionnaireData = {
      lead_id: leadId,
      completed_by: userId,
      completed_at: new Date().toISOString(),
      experience_level: investorData.experience || null,
      budget_min: investorData.budget_amount ? parseFloat(String(investorData.budget_amount).split("-")[0].replace(/[^0-9]/g, "")) : null,
      budget_max: investorData.budget_amount ? parseFloat(String(investorData.budget_amount).split("-")[1]?.replace(/[^0-9]/g, "") || String(investorData.budget_amount).replace(/[^0-9]/g, "")) : null,
      financing_type: investorData.financing || null,
      investment_horizon: investorData.horizon || null,
      risk_tolerance: investorData.strategy === "hold" ? "conservative" : investorData.strategy === "flip" ? "aggressive" : "moderate",
      preferred_property_types: investorData.property_type ? [investorData.property_type] : [],
      target_markets: investorData.location_preference ? [investorData.location_preference] : [],
      priority: investorData.goals?.[0] || null,
      additional_notes: `Chatbot session. Biggest concern: ${investorData.biggest_concern || "N/A"}. Management needed: ${investorData.management_needed || "N/A"}`,
      responses: {
        ...investorData,
        conversation_history: conversationHistory,
        collected_via: "chatbot",
        collected_at: new Date().toISOString(),
      },
    };

    // Check if questionnaire already exists for this lead
    const { data: existingQuestionnaire } = await supabase
      .from("investor_questionnaires")
      .select("id")
      .eq("lead_id", leadId)
      .single();

    let result;
    if (existingQuestionnaire) {
      // Update existing
      result = await supabase
        .from("investor_questionnaires")
        .update(questionnaireData)
        .eq("id", existingQuestionnaire.id)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from("investor_questionnaires")
        .insert(questionnaireData)
        .select()
        .single();
    }

    if (result.error) {
      console.error("Error saving questionnaire:", result.error);
      throw result.error;
    }

    // Update lead with contact info if provided
    if (leadId && (investorData.contact_whatsapp || investorData.contact_email)) {
      const leadUpdate: Record<string, unknown> = {};
      if (investorData.contact_whatsapp) {
        leadUpdate.phone = investorData.contact_whatsapp;
        leadUpdate.preferred_communication_channel = "whatsapp";
      }
      if (investorData.contact_email) {
        leadUpdate.email = investorData.contact_email;
      }
      if (investorData.budget_amount) {
        leadUpdate.budget = `${investorData.budget_amount} ${investorData.budget_currency || ""}`;
      }
      leadUpdate.questionnaire_completed_independently = true;
      leadUpdate.investment_timeline = investorData.horizon;
      leadUpdate.investment_goals = investorData.goals?.join(", ");

      await supabase
        .from("leads")
        .update(leadUpdate)
        .eq("id", leadId);
    }

    // If handoff to human is needed, create a notification
    if (investorData.handoff_to_human) {
      // Get admin users to notify
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.user_id,
          type: "system_alert" as const,
          title: "Chatbot: Požadavek na lidskou asistenci",
          message: `Uživatel požádal o předání konverzace konzultantovi. Kontakt: ${investorData.contact_whatsapp || investorData.contact_email || "Neuvedeno"}`,
          data: { leadId, investorData },
        }));

        await supabase.from("notifications").insert(notifications);
      }
    }

    return new Response(
      JSON.stringify({ success: true, questionnaire: result.data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Save investor profile error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
