import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60000; // 1 minute in milliseconds

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return true;
  }
  
  entry.count++;
  return false;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    // Check rate limit
    if (isRateLimited(clientIp)) {
      console.log(`Rate limited IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Too many requests" }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { brochure_request_id, client_id } = await req.json();

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!brochure_request_id || !uuidRegex.test(brochure_request_id)) {
      console.log(`Invalid brochure_request_id format: ${brochure_request_id}`);
      return new Response(
        JSON.stringify({ error: "Invalid request ID format" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Also validate client_id if provided
    if (client_id && !uuidRegex.test(client_id)) {
      console.log(`Invalid client_id format: ${client_id}`);
      return new Response(
        JSON.stringify({ error: "Invalid client ID format" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the brochure_request_id exists
    const { data: requestData, error: requestError } = await supabase
      .from("brochure_requests")
      .select("id")
      .eq("id", brochure_request_id)
      .maybeSingle();

    if (requestError || !requestData) {
      console.log(`Invalid brochure_request_id: ${brochure_request_id}`);
      return new Response(
        JSON.stringify({ error: "Invalid request ID" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Insert download tracking record
    const { error: insertError } = await supabase
      .from("catalog_downloads")
      .insert({
        brochure_request_id,
        client_id: client_id || null,
        ip_address: clientIp,
        user_agent: req.headers.get("user-agent") || null,
      });

    if (insertError) {
      console.error("Error inserting download record:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to track download" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Download tracked for request: ${brochure_request_id}, IP: ${clientIp}`);

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in track-download:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
