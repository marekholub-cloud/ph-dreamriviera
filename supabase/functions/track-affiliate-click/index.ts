import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60000; // 1 minute

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

interface ClickRequest {
  affiliate_code: string;
  page_url?: string;
  is_first_click?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    // Check rate limit
    if (isRateLimited(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Too many requests" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ClickRequest = await req.json();
    const { affiliate_code, page_url, is_first_click } = body;

    // Validate affiliate code
    if (!affiliate_code || typeof affiliate_code !== "string" || affiliate_code.length > 20) {
      return new Response(
        JSON.stringify({ error: "Invalid affiliate code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find referrer by affiliate code
    const { data: referrer, error: referrerError } = await supabase
      .from("profiles")
      .select("id")
      .eq("affiliate_code", affiliate_code.toUpperCase())
      .single();

    if (referrerError || !referrer) {
      console.log("Affiliate code not found:", affiliate_code);
      return new Response(
        JSON.stringify({ error: "Affiliate code not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user agent
    const userAgent = req.headers.get("user-agent") || null;

    // Insert click record with first_click tracking
    const { error: insertError } = await supabase
      .from("affiliate_clicks")
      .insert({
        affiliate_code: affiliate_code.toUpperCase(),
        referrer_id: referrer.id,
        ip_address: clientIP,
        user_agent: userAgent,
        page_url: page_url || null,
        was_first_click: is_first_click === true
      });

    if (insertError) {
      console.error("Error inserting click:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to track click" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Click tracked for affiliate: ${affiliate_code}, first_click: ${is_first_click}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error tracking click:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
