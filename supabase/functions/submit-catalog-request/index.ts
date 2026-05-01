import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WLM sync is now handled centrally by create-or-update-lead function

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute in milliseconds

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

// Sanitize phone number - keep only valid phone characters
function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
}

// Sanitize name - remove control characters and excessive whitespace
function sanitizeName(name: string): string {
  return name
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ')            // Normalize whitespace
    .trim();
}

interface CatalogRequest {
  name: string;
  email: string;
  phone: string;
  investmentType?: string;
  propertyId: string;
  requestType?: "hero" | "catalog" | "homepage" | "brochure";
  affiliateCode?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for rate limiting
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Check rate limit
  if (isRateLimited(clientIP)) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    const requestData: CatalogRequest = await req.json();
    
    // Input validation
    const validationErrors: string[] = [];
    
    // Validate required fields exist
    if (!requestData.name || typeof requestData.name !== 'string') {
      validationErrors.push("Name is required");
    } else if (requestData.name.length > 100) {
      validationErrors.push("Name must be 100 characters or less");
    }
    
    if (!requestData.email || typeof requestData.email !== 'string') {
      validationErrors.push("Email is required");
    } else {
      // Email format and length validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (requestData.email.length > 255) {
        validationErrors.push("Email must be 255 characters or less");
      } else if (!emailRegex.test(requestData.email)) {
        validationErrors.push("Invalid email format");
      }
    }
    
    if (!requestData.phone || typeof requestData.phone !== 'string') {
      validationErrors.push("Phone is required");
    } else {
      // Sanitize phone first
      requestData.phone = sanitizePhone(requestData.phone);
      if (requestData.phone.length < 6) {
        validationErrors.push("Phone number is too short");
      } else if (requestData.phone.length > 30) {
        validationErrors.push("Phone must be 30 characters or less");
      }
    }

    if (!requestData.propertyId || typeof requestData.propertyId !== 'string') {
      validationErrors.push("Property ID is required");
    } else if (requestData.propertyId.length > 100) {
      validationErrors.push("Property ID must be 100 characters or less");
    }
    
    // Sanitize name
    if (requestData.name) {
      requestData.name = sanitizeName(requestData.name);
    }
    
    // Validate optional fields if present
    if (requestData.investmentType && requestData.investmentType.length > 100) {
      validationErrors.push("Investment type must be 100 characters or less");
    }

    // Validate requestType if present
    const allowedRequestTypes = new Set(["hero", "catalog", "homepage", "brochure"]);
    if (requestData.requestType && !allowedRequestTypes.has(requestData.requestType)) {
      validationErrors.push("Invalid request type");
    }
    
    if (validationErrors.length > 0) {
      console.log("Validation errors:", validationErrors);
      return new Response(
        JSON.stringify({ error: "Validation failed", details: validationErrors }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Trim inputs
    requestData.name = requestData.name.trim();
    requestData.email = requestData.email.trim().toLowerCase();
    requestData.phone = requestData.phone.trim();
    
    console.log("Received catalog request:", {
      propertyId: requestData.propertyId,
      requestType: requestData.requestType ?? "brochure",
      hasInvestmentType: Boolean(requestData.investmentType),
    });

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find or create client by email
    let clientId: string | null = null;
    
    // Check if client exists
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id, name, phone")
      .eq("email", requestData.email)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
      console.log("Found existing client:", clientId);
      
      // Update client info if we have newer data
      const updates: Record<string, string> = {};
      if (requestData.name && requestData.name !== existingClient.name) {
        updates.name = requestData.name;
      }
      if (requestData.phone && requestData.phone !== existingClient.phone) {
        updates.phone = requestData.phone;
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase
          .from("clients")
          .update(updates)
          .eq("id", clientId);
        console.log("Updated client info:", updates);
      }
    } else {
      // Create new client
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          email: requestData.email,
          name: requestData.name,
          phone: requestData.phone,
        })
        .select()
        .single();

      if (clientError) {
        console.error("Error creating client:", clientError);
        // Continue without client link if creation fails
      } else {
        clientId = newClient.id;
        console.log("Created new client:", clientId);
      }
    }

    // Save to database with client link
    const { data: savedRequest, error: dbError } = await supabase
      .from("brochure_requests")
      .insert({
        name: requestData.name,
        email: requestData.email,
        phone: requestData.phone,
        selected_brochures: [requestData.propertyId],
        investment_type: requestData.investmentType,
        request_type: requestData.requestType ?? "brochure",
        client_id: clientId,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save request: ${dbError.message}`);
    }

    console.log("Catalog request saved to database:", savedRequest);

    // Create or update lead in leads table via centralized function
    let leadId: string | null = null;
    try {
      const leadResponse = await fetch(`${supabaseUrl}/functions/v1/create-or-update-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          name: requestData.name,
          email: requestData.email,
          phone: requestData.phone,
          source_type: 'catalog_download',
          source_page: `/catalog/${requestData.propertyId}`,
          affiliate_code: requestData.affiliateCode || undefined,
          message: `Zájem o: ${requestData.propertyId}${requestData.investmentType ? `, Typ investice: ${requestData.investmentType}` : ''}`,
          metadata: {
            property_id: requestData.propertyId,
            investment_type: requestData.investmentType,
            request_type: requestData.requestType,
            brochure_request_id: savedRequest.id,
          },
        }),
      });

      const leadResult = await leadResponse.json();
      console.log("Lead creation result:", leadResult);

      if (leadResult.success && leadResult.lead_id) {
        leadId = leadResult.lead_id;
        // Update brochure_request with lead_id
        await supabase
          .from("brochure_requests")
          .update({ lead_id: leadId })
          .eq("id", savedRequest.id);
        console.log("Linked catalog request to lead:", leadId);
      }
    } catch (leadError) {
      console.error("Error creating/updating lead:", leadError);
      // Continue even if lead creation fails - request is already saved
    }

    // WLM sync is now handled by create-or-update-lead function above
    console.log("WLM sync handled via create-or-update-lead");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Request saved successfully",
        requestId: savedRequest.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error processing catalog request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
