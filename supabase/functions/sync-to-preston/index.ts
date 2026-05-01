import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  resource: "lead" | "questionnaire" | "consultation" | "event-registration";
  id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const PRESTON_URL = Deno.env.get("PRESTON_API_URL");
  const PRESTON_KEY = Deno.env.get("PRESTON_OUTBOUND_API_KEY");

  if (!PRESTON_URL || !PRESTON_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Preston API credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { resource, id } = (await req.json()) as SyncRequest;
    if (!resource || !id) {
      return new Response(JSON.stringify({ success: false, error: "resource and id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let endpoint = "";
    let payload: Record<string, unknown> = {};

    if (resource === "lead") {
      const { data: lead, error } = await supabase
        .from("leads")
        .select("*, investor_questionnaires(*)")
        .eq("id", id)
        .single();
      if (error || !lead) throw new Error(error?.message || "Lead not found");

      const [first, ...rest] = (lead.lead_name || "").split(" ");
      endpoint = "/leads";
      payload = {
        source_lead_id: lead.id,
        source_domain: "go2dubai.lovable.app",
        first_name: first || lead.lead_name,
        last_name: rest.join(" ") || "",
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        notes: lead.notes,
        utm_source: lead.utm_source,
        utm_medium: lead.utm_medium,
        utm_campaign: lead.utm_campaign,
        warmth_level: lead.warmth_level ? lead.warmth_level * 10 : undefined,
      };
    } else if (resource === "questionnaire") {
      const { data: q, error } = await supabase
        .from("investor_questionnaires")
        .select("*, leads(email, lead_name, phone)")
        .eq("id", id)
        .single();
      if (error || !q) throw new Error(error?.message || "Questionnaire not found");
      endpoint = "/questionnaires";
      payload = {
        email: (q.leads as any)?.email,
        name: (q.leads as any)?.lead_name,
        phone: (q.leads as any)?.phone,
        experience_level: q.experience_level,
        risk_tolerance: q.risk_tolerance,
        investment_horizon: q.investment_horizon,
        budget_min: q.budget_min,
        budget_max: q.budget_max,
        priority: q.priority,
        financing_type: q.financing_type,
        preferred_property_types: q.preferred_property_types,
        target_markets: q.target_markets,
        additional_notes: q.additional_notes,
      };
    } else {
      throw new Error(`Unsupported resource: ${resource}`);
    }

    const baseUrl = PRESTON_URL.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "x-api-key": PRESTON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (!response.ok) {
      console.error("Preston API error:", response.status, responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Preston API ${response.status}`,
          details: responseData,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, resource, remote_response: responseData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    console.error("sync-to-preston error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
