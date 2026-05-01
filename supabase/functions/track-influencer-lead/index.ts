import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return false;
  }

  if (record.count >= RATE_LIMIT) {
    return true;
  }

  record.count++;
  return false;
}

interface InfluencerLeadRequest {
  affiliate_code: string;
  lead_name?: string;
  email?: string;
  phone?: string;
  source?: string; // e.g., "newsletter", "contact_form", "brochure_request"
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(clientIP)) {
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const requestData: InfluencerLeadRequest = await req.json();

    // Validate affiliate code
    if (!requestData.affiliate_code || typeof requestData.affiliate_code !== "string") {
      return new Response(
        JSON.stringify({ error: "Affiliate code is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const affiliateCode = requestData.affiliate_code.trim().toUpperCase();
    
    if (affiliateCode.length > 20) {
      return new Response(
        JSON.stringify({ error: "Invalid affiliate code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Tracking influencer lead for affiliate code:", affiliateCode);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the referrer by affiliate code
    const { data: referrer, error: referrerError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("affiliate_code", affiliateCode)
      .single();

    if (referrerError || !referrer) {
      console.log("No referrer found for code:", affiliateCode);
      return new Response(
        JSON.stringify({ success: false, message: "Invalid affiliate code" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Found referrer:", referrer.id);

    // Create lead name from available data
    const leadName = requestData.lead_name || 
                     requestData.email?.split("@")[0] || 
                     `Anonymous (${requestData.source || "unknown"})`;

    // Check for duplicate lead (same email or phone for same referrer)
    if (requestData.email || requestData.phone) {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("referrer_id", referrer.id)
        .or(
          requestData.email 
            ? `email.eq.${requestData.email}` 
            : `phone.eq.${requestData.phone}`
        )
        .single();

      if (existingLead) {
        console.log("Lead already exists for this referrer:", existingLead.id);
        return new Response(
          JSON.stringify({ success: true, message: "Lead already tracked", leadId: existingLead.id }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Create influencer lead
    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        referrer_id: referrer.id,
        lead_name: leadName.substring(0, 100),
        email: requestData.email?.trim().toLowerCase().substring(0, 255) || null,
        phone: requestData.phone?.replace(/[^\d+\-\s()]/g, "").substring(0, 30) || null,
        status: "influencer",
        warmth_level: 50,
        commission_rate: 0.005,
        notes: requestData.source ? `Source: ${requestData.source}` : null,
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error creating lead:", leadError);
      throw new Error("Failed to create lead");
    }

    console.log("Created influencer lead:", newLead.id);

    return new Response(
      JSON.stringify({ success: true, leadId: newLead.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in track-influencer-lead:", error);
    return new Response(
      JSON.stringify({ error: "Failed to track lead" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);