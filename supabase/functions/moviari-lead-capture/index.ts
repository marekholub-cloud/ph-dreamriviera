import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
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

// Input sanitization
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+\-\s()]/g, "");
}

function sanitizeName(name: string): string {
  return name.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

// Fixed referrer for Moviari landing page
const MOVIARI_AFFILIATE_CODE = "C752A1C7";
const MOVIARI_REFERRER_ID = "baec3fbd-d4a3-4ce9-9b59-03d0b7be93a1";

interface LeadRequest {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (isRateLimited(clientIp)) {
      console.log(`Rate limited: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    const body: LeadRequest = await req.json();
    
    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Name is required and must be at least 2 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeName(body.name).substring(0, 100);
    const sanitizedEmail = body.email.toLowerCase().trim().substring(0, 255);
    const sanitizedPhone = body.phone ? sanitizePhone(body.phone).substring(0, 30) : null;
    const sanitizedMessage = body.message ? escapeHtml(body.message.substring(0, 2000)) : null;

    console.log(`Moviari lead capture: ${sanitizedName} (${sanitizedEmail})`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save to contact_messages
    const { error: contactError } = await supabase
      .from("contact_messages")
      .insert({
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        message: sanitizedMessage || "Dotaz z Moviari landing page",
        affiliate_code: MOVIARI_AFFILIATE_CODE,
      });

    if (contactError) {
      console.error("Error saving contact message:", contactError);
    }

    // Check for duplicate lead
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .or(`email.eq.${sanitizedEmail}${sanitizedPhone ? `,phone.eq.${sanitizedPhone}` : ""}`)
      .limit(1)
      .single();

    if (!existingLead) {
      // Create new lead
      const { error: leadError } = await supabase
        .from("leads")
        .insert({
          lead_name: sanitizedName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          referrer_id: MOVIARI_REFERRER_ID,
          affiliate_code: MOVIARI_AFFILIATE_CODE,
          status: "influencer",
          notes: `Lead z Moviari landing page (${new Date().toLocaleDateString("cs-CZ")})`,
        });

      if (leadError) {
        console.error("Error creating lead:", leadError);
      } else {
        console.log("New lead created for Moviari");
      }
    } else {
      console.log("Lead already exists, skipping creation");
    }

    // Send notification emails
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      // Notify admin
      try {
        await resend.emails.send({
          from: "CA Development <info@cadevelopment.cz>",
          to: ["hello@cadevelopment.cz"],
          subject: `Nový dotaz z Moviari - ${sanitizedName}`,
          html: `
            <h2>Nový dotaz z Moviari landing page</h2>
            <p><strong>Jméno:</strong> ${escapeHtml(sanitizedName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(sanitizedEmail)}</p>
            <p><strong>Telefon:</strong> ${sanitizedPhone ? escapeHtml(sanitizedPhone) : "Neuvedeno"}</p>
            <p><strong>Zpráva:</strong> ${sanitizedMessage || "Bez zprávy"}</p>
            <hr>
            <p><em>Přiřazeno: Paula Moviari (${MOVIARI_AFFILIATE_CODE})</em></p>
          `,
        });
        console.log("Admin notification sent");
      } catch (emailError) {
        console.error("Error sending admin email:", emailError);
      }

      // Send confirmation to user
      try {
        await resend.emails.send({
          from: "CA Development <info@cadevelopment.cz>",
          to: [sanitizedEmail],
          subject: "Děkujeme za váš dotaz",
          html: `
            <h2>Děkujeme, ${escapeHtml(sanitizedName)}!</h2>
            <p>Obdrželi jsme váš dotaz a budeme vás kontaktovat co nejdříve.</p>
            <p>S pozdravem,<br>Tým CA Development</p>
          `,
        });
        console.log("User confirmation sent");
      } catch (emailError) {
        console.error("Error sending user email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Lead captured successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Moviari lead capture error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
