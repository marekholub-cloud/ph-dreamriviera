import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  record.count++;
  return record.count > RATE_LIMIT;
}

// HTML escape for security
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Sanitize phone number
function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
}

// Sanitize name
function sanitizeName(name: string): string {
  return name
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  message: string;
  affiliate_code?: string;
  source_page?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(clientIP)) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const requestData: ContactRequest = await req.json();
    const validationErrors: string[] = [];

    // Validate name
    if (!requestData.name || typeof requestData.name !== 'string') {
      validationErrors.push("Name is required");
    } else if (requestData.name.length > 100) {
      validationErrors.push("Name must be 100 characters or less");
    }

    // Validate email
    if (!requestData.email || typeof requestData.email !== 'string') {
      validationErrors.push("Email is required");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (requestData.email.length > 255) {
        validationErrors.push("Email must be 255 characters or less");
      } else if (!emailRegex.test(requestData.email)) {
        validationErrors.push("Invalid email format");
      }
    }

    // Validate message
    if (!requestData.message || typeof requestData.message !== 'string') {
      validationErrors.push("Message is required");
    } else if (requestData.message.length > 5000) {
      validationErrors.push("Message must be 5000 characters or less");
    }

    // Validate phone if provided
    if (requestData.phone) {
      requestData.phone = sanitizePhone(requestData.phone);
      if (requestData.phone.length > 30) {
        validationErrors.push("Phone must be 30 characters or less");
      }
    }

    if (validationErrors.length > 0) {
      console.log("Validation errors:", validationErrors);
      return new Response(
        JSON.stringify({ error: "Validation failed", details: validationErrors }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize inputs
    requestData.name = sanitizeName(requestData.name);
    requestData.email = requestData.email.trim().toLowerCase();
    requestData.message = requestData.message.trim();

    console.log("[send-contact-message] Received contact message from:", requestData.email, "affiliate_code:", requestData.affiliate_code);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save to contact_messages database
    const { data: savedMessage, error: dbError } = await supabase
      .from("contact_messages")
      .insert({
        name: requestData.name,
        email: requestData.email,
        phone: requestData.phone || null,
        message: requestData.message,
        affiliate_code: requestData.affiliate_code || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[send-contact-message] Database error:", dbError);
      throw new Error(`Failed to save message: ${dbError.message}`);
    }

    console.log("[send-contact-message] Message saved to database:", savedMessage.id);

    // Call centralized create-or-update-lead function
    console.log("[send-contact-message] Calling create-or-update-lead...");
    
    const leadRequest = {
      name: requestData.name,
      email: requestData.email,
      phone: requestData.phone || undefined,
      source_type: 'contact_form',
      source_page: requestData.source_page || '/kontakt',
      affiliate_code: requestData.affiliate_code?.trim().toUpperCase() || undefined,
      message: requestData.message,
      metadata: {
        contact_message_id: savedMessage.id,
        client_ip: clientIP,
      },
    };

    try {
      const leadResponse = await fetch(`${supabaseUrl}/functions/v1/create-or-update-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(leadRequest),
      });

      const leadResult = await leadResponse.json();
      console.log("[send-contact-message] create-or-update-lead result:", leadResult);

      if (!leadResult.success) {
        console.error("[send-contact-message] Failed to create/update lead:", leadResult.error);
      } else {
        console.log("[send-contact-message] Lead processed:", {
          lead_id: leadResult.lead_id,
          is_new: leadResult.is_new_lead,
          wlm_synced: leadResult.wlm_synced,
        });
      }
    } catch (leadError) {
      console.error("[send-contact-message] Error calling create-or-update-lead:", leadError);
      // Don't fail the main request, lead creation is secondary
    }

    // Escape for HTML
    const safeName = escapeHtml(requestData.name);
    const safeEmail = escapeHtml(requestData.email);
    const safePhone = escapeHtml(requestData.phone || '');
    const safeMessage = escapeHtml(requestData.message).replace(/\n/g, '<br>');

    // Send notification email to admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nová zpráva z kontaktního formuláře</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Nová zpráva z kontaktního formuláře</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #1a365d; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">Kontaktní údaje</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 12px; background: #f7fafc; font-weight: 600; width: 30%; border: 1px solid #e2e8f0;">Jméno:</td>
              <td style="padding: 12px; background: white; border: 1px solid #e2e8f0;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f7fafc; font-weight: 600; border: 1px solid #e2e8f0;">Email:</td>
              <td style="padding: 12px; background: white; border: 1px solid #e2e8f0;"><a href="mailto:${safeEmail}" style="color: #2c5282;">${safeEmail}</a></td>
            </tr>
            ${safePhone ? `
            <tr>
              <td style="padding: 12px; background: #f7fafc; font-weight: 600; border: 1px solid #e2e8f0;">Telefon:</td>
              <td style="padding: 12px; background: white; border: 1px solid #e2e8f0;"><a href="tel:${safePhone}" style="color: #2c5282;">${safePhone}</a></td>
            </tr>
            ` : ''}
          </table>
          
          <h2 style="color: #1a365d; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">Zpráva</h2>
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #c9a227;">
            ${safeMessage}
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; font-size: 12px;">
            <p>Tato zpráva byla odeslána z kontaktního formuláře na webu go2dubai.online</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: adminEmailError } = await resend.emails.send({
      from: "go2dubai.online <hello@go2dubai.online>",
      to: ["hello@go2dubai.online"],
      subject: `Nová zpráva z webu: ${safeName}`,
      html: adminEmailHtml,
    });

    if (adminEmailError) {
      console.error("[send-contact-message] Error sending admin email:", adminEmailError);
    } else {
      console.log("[send-contact-message] Admin notification email sent");
    }

    // Send confirmation email to user
    const userEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Děkujeme za Vaši zprávu</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Děkujeme za Vaši zprávu</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <p style="font-size: 16px;">Vážený/á ${safeName},</p>
          
          <p>děkujeme za Vaši zprávu. Vaši žádost jsme přijali a budeme Vás kontaktovat co nejdříve.</p>
          
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c9a227;">
            <p style="margin: 0 0 10px 0; font-weight: 600;">Vaše zpráva:</p>
            <p style="margin: 0; color: #4a5568;">${safeMessage}</p>
          </div>
          
          <p>V případě naléhavých dotazů nás můžete kontaktovat na:</p>
          <ul style="list-style: none; padding: 0;">
            <li style="padding: 5px 0;">📞 <a href="tel:+420234278988" style="color: #2c5282;">+420 234 278 988</a></li>
            <li style="padding: 5px 0;">✉️ <a href="mailto:hello@cadevelopment.cz" style="color: #2c5282;">hello@cadevelopment.cz</a></li>
          </ul>
          
          <p style="margin-top: 30px;">S pozdravem,<br><strong>Tým go2dubai.online</strong></p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; font-size: 12px;">
            <p>CA Development s.r.o.<br>Jiráskovo náměstí 1981/6, 120 00 Praha 2</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: userEmailError } = await resend.emails.send({
      from: "go2dubai.online <hello@go2dubai.online>",
      to: [requestData.email],
      subject: "Děkujeme za Vaši zprávu - go2dubai.online",
      html: userEmailHtml,
    });

    if (userEmailError) {
      console.error("[send-contact-message] Error sending user confirmation email:", userEmailError);
    } else {
      console.log("[send-contact-message] User confirmation email sent to:", requestData.email);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: savedMessage.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[send-contact-message] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
