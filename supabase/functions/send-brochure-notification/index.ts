import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

// Helper function to escape HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrochureRequest {
  name: string;
  email: string;
  phone: string;
  selectedBrochures?: string[];
  investmentType?: string;
  budget?: string;
  timeline?: string;
  requestType: string;
  whatsappOptIn?: boolean;
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
    const requestData: BrochureRequest = await req.json();
    
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
    
    // Validate request type (whitelist) - extended to support all form types
    const validRequestTypes = [
      'catalog',
      'hero',
      'homepage',
      'project',
      'brochure',
      'investice_brochure',
      'contact',
      'presentation',
      'presentation_download',
      'general',
    ];
    if (!requestData.requestType || !validRequestTypes.includes(requestData.requestType)) {
      validationErrors.push("Invalid request type");
    }
    
    // Sanitize name
    if (requestData.name) {
      requestData.name = sanitizeName(requestData.name);
    }
    
    // Validate optional fields if present
    if (requestData.investmentType && requestData.investmentType.length > 100) {
      validationErrors.push("Investment type must be 100 characters or less");
    }
    if (requestData.budget && requestData.budget.length > 100) {
      validationErrors.push("Budget must be 100 characters or less");
    }
    if (requestData.timeline && requestData.timeline.length > 100) {
      validationErrors.push("Timeline must be 100 characters or less");
    }
    
    // Validate selectedBrochures if present - extended to support all brochure names
    const validBrochures = ['laperla', 'oceanviews', 'villapark', 'oasis', 'tropical', 'catalog', 'Prezentace ProDubai', 'prezentace', 'produbai'];
    if (requestData.selectedBrochures) {
      if (!Array.isArray(requestData.selectedBrochures)) {
        validationErrors.push("Selected brochures must be an array");
      } else if (requestData.selectedBrochures.length > 10) {
        validationErrors.push("Too many brochures selected");
      } else {
        for (const brochure of requestData.selectedBrochures) {
          if (!validBrochures.includes(brochure)) {
            validationErrors.push(`Invalid brochure: ${brochure}`);
            break;
          }
        }
      }
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
    
    console.log("Received brochure request:", requestData);

    // Initialize Supabase client
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
        selected_brochures: requestData.selectedBrochures || [],
        investment_type: requestData.investmentType,
        budget: requestData.budget,
        timeline: requestData.timeline,
        request_type: requestData.requestType,
        client_id: clientId,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save request: ${dbError.message}`);
    }

    console.log("Request saved to database:", savedRequest);

    // Create or update lead in leads table via centralized function
    let leadId: string | null = null;
    const leadPayload = {
      name: requestData.name,
      email: requestData.email,
      phone: requestData.phone,
      source_type: 'brochure_request',
      source_page: `/brochure/${requestData.requestType}`,
      affiliate_code: requestData.affiliateCode || undefined,
      message: `Zájem o brožury: ${requestData.selectedBrochures?.join(', ') || 'N/A'}${requestData.budget ? `, Budget: ${requestData.budget}` : ''}${requestData.timeline ? `, Timeline: ${requestData.timeline}` : ''}`,
      metadata: {
        selected_brochures: requestData.selectedBrochures,
        investment_type: requestData.investmentType,
        budget: requestData.budget,
        timeline: requestData.timeline,
        request_type: requestData.requestType,
        brochure_request_id: savedRequest.id,
      },
      budget: requestData.budget,
      investment_timeline: requestData.timeline,
    };

    const leadFunctionUrl = `${supabaseUrl}/functions/v1/create-or-update-lead`;
    console.log("[send-brochure-notification] Calling create-or-update-lead at:", leadFunctionUrl);
    console.log("[send-brochure-notification] Lead payload:", JSON.stringify(leadPayload, null, 2));

    try {
      const leadResponse = await fetch(leadFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(leadPayload),
      });

      const responseText = await leadResponse.text();
      console.log("[send-brochure-notification] Lead response status:", leadResponse.status);
      console.log("[send-brochure-notification] Lead response body:", responseText);

      if (!leadResponse.ok) {
        console.error("[send-brochure-notification] Lead creation failed with status:", leadResponse.status);
      } else {
        try {
          const leadResult = JSON.parse(responseText);
          console.log("[send-brochure-notification] Lead creation result:", leadResult);

          if (leadResult.success && leadResult.lead_id) {
            leadId = leadResult.lead_id;
            // Update brochure_request with lead_id
            const { error: updateError } = await supabase
              .from("brochure_requests")
              .update({ lead_id: leadId })
              .eq("id", savedRequest.id);
            
            if (updateError) {
              console.error("[send-brochure-notification] Failed to link brochure request to lead:", updateError);
            } else {
              console.log("[send-brochure-notification] Linked brochure request to lead:", leadId);
            }
          } else {
            console.error("[send-brochure-notification] Lead creation returned success=false:", leadResult);
          }
        } catch (parseError) {
          console.error("[send-brochure-notification] Failed to parse lead response:", parseError);
        }
      }
    } catch (leadError) {
      console.error("[send-brochure-notification] Error creating/updating lead:", leadError);
      // Continue even if lead creation fails - brochure request is already saved
    }

    // WLM sync is now handled by create-or-update-lead function above
    console.log("WLM sync handled via create-or-update-lead");

    // Determine brand and base URL for links in emails / WhatsApp (whitelisted)
    const requestOrigin = (req.headers.get("origin") || "").toLowerCase();
    const appUrl = requestOrigin.includes("nakostariku.cz")
      ? "https://nakostariku.cz"
      : "https://go2dubai.online";
    const isDubai = appUrl.includes("go2dubai.online");

    const brandName = isDubai ? "go2dubai.online" : "CAD Dubai";
    const brandDescriptor = isDubai ? "nemovitosti v Dubaji" : "nemovitosti v Kostarice";
    const brandSubline = isDubai ? "Reality & investice" : "PRESTON DEVELOPMENT FZ LLC";
    const brandFooterLine = isDubai
      ? "Reality v Dubaji | Investice do nemovitostí"
      : "Reality v Kostarice | Investice do nemovitostí";
    const brandWebsite = isDubai ? "www.go2dubai.online" : "www.nakostariku.cz";
    const logoUrl = `${appUrl}/logo-cad-email.png`;

    const downloadLink =
      requestData.requestType === "presentation_download"
        ? `${appUrl}/prezentace-produbai.pdf`
        : `${appUrl}/download-catalog?requestId=${savedRequest.id}`;

    // Escape all user inputs for HTML safety
    const safeName = escapeHtml(requestData.name);
    const safeEmail = escapeHtml(requestData.email);
    const safePhone = escapeHtml(requestData.phone);
    const safeRequestType = escapeHtml(requestData.requestType);

    // Build safe mailto link for admin "reply" button
    const replySubject = isDubai
      ? "Re: Váš zájem o investice v Dubaji"
      : "Re: Váš zájem o projekty CAD Dubai";
    const replyBody = `Dobrý den ${requestData.name},\n\nDěkujeme za váš zájem o ${brandDescriptor}.\n\nS pozdravem,\n${brandName}`;
    const replyMailtoHref = escapeHtml(
      `mailto:${requestData.email}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`,
    );

    // Prepare project names mapping for admin email
    const projectNames: { [key: string]: string } = {
      laperla: "La Perla Beach Front Resort",
      oceanviews: "Ocean Views San Miguel",
      villapark: "Villa Park Sandalo",
      oasis: "Oasis de Coco",
      tropical: "Tropical Gardens Cañaza",
      catalog: "Katalog vzorových vil",
      "Prezentace ProDubai": "Prezentace ProDubai",
      produbai: "Prezentace ProDubai",
      prezentace: "Prezentace ProDubai",
    };

    // Prepare download page links (opens PDF + triggers download)
    const projectDownloadUrls: { [key: string]: string } = {
      laperla: `${appUrl}/download-file?file=laperla`,
      oceanviews: `${appUrl}/download-file?file=oceanviews`,
      villapark: `${appUrl}/download-file?file=villapark`,
      oasis: `${appUrl}/download-file?file=oasis`,
      tropical: `${appUrl}/download-file?file=tropical`,
      catalog: `${appUrl}/download-file?file=catalog`,
      "Prezentace ProDubai": `${appUrl}/prezentace-produbai.pdf`,
      produbai: `${appUrl}/prezentace-produbai.pdf`,
      prezentace: `${appUrl}/prezentace-produbai.pdf`,
    };

    // Request type labels
    const requestTypeLabels: { [key: string]: string } = {
      catalog: "Stažení katalogu",
      hero: "Výběr brožur z homepage",
      homepage: "Kontaktní formulář",
      brochure: "Vyžádání brožur",
      project: "Vyžádání brožury projektu",
      investice_brochure: "Investiční brožura",
      contact: "Kontakt",
      presentation_download: "Stažení prezentace ProDubai",
    };

    // Create admin email template
    const createAdminEmailTemplate = () => `
      <!DOCTYPE html>
      <html lang="cs">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nový požadavek - ${safeName}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
            background-color: #f5f5f5;
            color: #333;
          }
          .container {
            max-width: 650px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            padding: 30px;
            color: white;
          }
          .header-title {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          .header-subtitle {
            margin: 8px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
          }
          .badge {
            display: inline-block;
            padding: 6px 12px;
            background-color: rgba(255,255,255,0.2);
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-top: 10px;
          }
          .content {
            padding: 35px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e40af;
            margin: 0 0 15px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-grid {
            display: table;
            width: 100%;
            border-collapse: collapse;
          }
          .info-row {
            display: table-row;
          }
          .info-label {
            display: table-cell;
            padding: 12px 15px;
            background-color: #f8fafc;
            font-weight: 600;
            color: #475569;
            width: 40%;
            border-bottom: 1px solid #e2e8f0;
          }
          .info-value {
            display: table-cell;
            padding: 12px 15px;
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
          }
          .highlight-box {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-left: 4px solid #3b82f6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .projects-list {
            list-style: none;
            padding: 0;
            margin: 15px 0 0 0;
          }
          .project-item {
            padding: 10px 15px;
            background-color: white;
            border-radius: 6px;
            margin-bottom: 8px;
            border: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
          }
          .project-check {
            color: #10b981;
            font-weight: 700;
            margin-right: 10px;
            font-size: 18px;
          }
          .button-group {
            margin: 30px 0;
            text-align: center;
          }
          .button {
            display: inline-block;
            padding: 14px 30px;
            margin: 0 8px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.3s ease;
          }
          .button-primary {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white !important;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          }
          .button-secondary {
            background-color: #f1f5f9;
            color: #475569 !important;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px 35px;
            border-top: 1px solid #e2e8f0;
            font-size: 13px;
            color: #64748b;
          }
          .meta-info {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            margin-top: 10px;
          }
          .meta-item {
            margin: 5px 0;
          }
          @media only screen and (max-width: 600px) {
            .content {
              padding: 25px 20px;
            }
            .button-group {
              display: flex;
              flex-direction: column;
            }
            .button {
              margin: 8px 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1 class="header-title">🔔 Nový požadavek na brožury</h1>
            <p class="header-subtitle">${new Date().toLocaleString('cs-CZ', { 
              dateStyle: 'full', 
              timeStyle: 'short' 
            })}</p>
            <span class="badge">${requestTypeLabels[requestData.requestType] || safeRequestType}</span>
          </div>
          
          <!-- Content -->
          <div class="content">
            <!-- Contact Information -->
            <div class="section">
              <h2 class="section-title">👤 Kontaktní údaje</h2>
              <div class="info-grid">
                <div class="info-row">
                  <div class="info-label">Jméno</div>
                  <div class="info-value"><strong>${safeName}</strong></div>
                </div>
                <div class="info-row">
                  <div class="info-label">Email</div>
                  <div class="info-value">
                    <a href="mailto:${safeEmail}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">${safeEmail}</a>
                  </div>
                </div>
                <div class="info-row">
                  <div class="info-label">Telefon</div>
                  <div class="info-value">
                    <a href="tel:${safePhone}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">${safePhone}</a>
                  </div>
                </div>
              </div>
            </div>

            ${requestData.selectedBrochures && requestData.selectedBrochures.length > 0 ? `
            <!-- Selected Projects -->
            <div class="section">
              <h2 class="section-title">📋 Vybrané projekty (${requestData.selectedBrochures.length})</h2>
              <ul class="projects-list">
                ${requestData.selectedBrochures.map(id => `
                  <li class="project-item">
                    <span class="project-check">✓</span>
                    <span>${projectNames[id] || id}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
            ` : '<div class="highlight-box">ℹ️ Klient nevybral žádné konkrétní projekty.</div>'}

            ${requestData.investmentType ? `
            <!-- Investment Preferences -->
            <div class="section">
              <h2 class="section-title">💰 Investiční preference</h2>
              <div class="info-grid">
                <div class="info-row">
                  <div class="info-label">Typ investice</div>
                  <div class="info-value">${escapeHtml(requestData.investmentType)}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Rozpočet</div>
                  <div class="info-value">${escapeHtml(requestData.budget || 'Neuvedeno')}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Časový horizont</div>
                  <div class="info-value">${escapeHtml(requestData.timeline || 'Neuvedeno')}</div>
                </div>
              </div>
            </div>
            ` : ''}

            <!-- Quick Actions -->
            <div class="button-group">
              <a href="${replyMailtoHref}" 
                 class="button button-primary">
                ✉️ Odpovědět klientovi
              </a>
              <a href="${appUrl}/admin" 
                 class="button button-secondary">
                📊 Otevřít dashboard
              </a>
            </div>

            <div class="highlight-box" style="margin-top: 30px;">
              <strong>💡 Rychlá akce:</strong><br>
              Klient automaticky obdržel email s odkazem ke stažení brožur. Doporučujeme kontaktovat klienta do 24 hodin pro osobnější přístup.
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <strong>Systémové informace</strong>
            <div class="meta-info">
              <div class="meta-item">Request ID: <code>${savedRequest.id}</code></div>
              <div class="meta-item">Timestamp: ${new Date().toISOString()}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send notification email to admin
    const adminEmailResponse = await resend.emails.send({
      from: `${brandName} <info@news.b22studio.cz>`,
      to: ["hello@cadevelopment.cz"], // Admin email
      subject: `🔔 Nový požadavek: ${safeName} - ${requestTypeLabels[requestData.requestType] || safeRequestType}`,
      html: createAdminEmailTemplate(),
    });

    console.log("Admin notification email sent:", adminEmailResponse);

    // Professional email template function
    const createEmailTemplate = (
      name: string,
      title: string,
      mainContent: string,
      buttonText: string,
      buttonLink: string,
      projectsList?: string,
      investmentInfo?: string,
      showMainButton: boolean = true
    ) => `
      <!DOCTYPE html>
      <html lang="cs">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&family=Inter:wght@400;500;600&display=swap');
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: #f5f2ed;
            color: #3d3428;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background-color: #ffffff;
            padding: 40px 30px;
            text-align: center;
            border-bottom: 3px solid #c9b697;
          }
          .logo {
            max-width: 200px;
            height: auto;
          }
          .content {
            padding: 50px 40px;
          }
          .title {
            font-family: 'Noto Serif', Georgia, serif;
            font-size: 28px;
            font-weight: 700;
            color: #3d3428;
            margin: 0 0 20px 0;
            line-height: 1.3;
          }
          .subtitle {
            font-size: 18px;
            color: #c9b697;
            margin: 0 0 30px 0;
            font-weight: 600;
          }
          .text {
            font-size: 16px;
            line-height: 1.7;
            color: #5a5140;
            margin: 0 0 25px 0;
          }
          .button-container {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            padding: 18px 45px;
            background: linear-gradient(135deg, #c9b697 0%, #b39b7a 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 15px rgba(201, 182, 151, 0.4);
            transition: all 0.3s ease;
          }
          .button:hover {
            box-shadow: 0 6px 20px rgba(201, 182, 151, 0.6);
            transform: translateY(-2px);
          }
          .projects-box {
            background-color: #f9f7f4;
            border-left: 4px solid #c9b697;
            padding: 25px 30px;
            margin: 30px 0;
            border-radius: 8px;
          }
          .projects-title {
            font-family: 'Noto Serif', Georgia, serif;
            font-size: 20px;
            font-weight: 700;
            color: #3d3428;
            margin: 0 0 15px 0;
          }
          .project-item {
            padding: 12px 0;
            border-bottom: 1px solid #e8e4dd;
            font-size: 16px;
            color: #5a5140;
            display: flex;
            align-items: center;
          }
          .project-item:last-child {
            border-bottom: none;
          }
          .checkmark {
            color: #c9b697;
            font-weight: 700;
            margin-right: 12px;
            font-size: 18px;
          }
          .investment-box {
            background: linear-gradient(135deg, #f9f7f4 0%, #f5f2ed 100%);
            padding: 25px 30px;
            margin: 30px 0;
            border-radius: 8px;
            border: 1px solid #e8e4dd;
          }
          .investment-title {
            font-family: 'Noto Serif', Georgia, serif;
            font-size: 18px;
            font-weight: 700;
            color: #3d3428;
            margin: 0 0 15px 0;
          }
          .investment-item {
            margin: 10px 0;
            font-size: 15px;
            color: #5a5140;
          }
          .investment-label {
            font-weight: 600;
            color: #3d3428;
          }
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e8e4dd, transparent);
            margin: 40px 0;
          }
          .footer {
            background-color: #3d3428;
            padding: 40px 30px;
            text-align: center;
            color: #c9b697;
          }
          .footer-title {
            font-family: 'Noto Serif', Georgia, serif;
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 10px 0;
            color: #e8d7c3;
          }
          .footer-text {
            font-size: 14px;
            line-height: 1.6;
            margin: 8px 0;
            color: #a89679;
          }
          .footer-link {
            color: #c9b697;
            text-decoration: none;
            font-weight: 500;
          }
          .footer-link:hover {
            color: #e8d7c3;
          }
          @media only screen and (max-width: 600px) {
            .content {
              padding: 40px 25px;
            }
            .title {
              font-size: 24px;
            }
            .button {
              padding: 16px 35px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header with Logo -->
          <div class="header">
            <img src="${logoUrl}" alt="${brandName}" class="logo">
          </div>
          
          <!-- Main Content -->
          <div class="content">
            <h1 class="title">${title}</h1>
            <p class="subtitle">Dobrý den ${name},</p>
            
            <p class="text">${mainContent}</p>
            
            ${projectsList || ''}
            
            ${showMainButton ? `
            <!-- CTA Button -->
            <div class="button-container">
              <a href="${buttonLink}" class="button">${buttonText}</a>
            </div>
            
            <p class="text" style="font-size: 15px; color: #7a6d5a;">
              Po kliknutí na tlačítko se vám materiály automaticky stáhnou do vašeho zařízení.
            </p>
            ` : `
            <p class="text" style="font-size: 15px; color: #7a6d5a;">
              Kliknutím na tlačítko "Stáhnout PDF" u každého projektu se vám brožura otevře v novém okně.
            </p>
            `}
            
            ${investmentInfo || ''}
            
            <div class="divider"></div>
            
            <p class="text" style="font-size: 15px;">
              Máte dotazy nebo potřebujete více informací? Jsme tu pro vás. Neváhejte nás kontaktovat.
            </p>
            
            <p class="text" style="text-align: center; margin-top: 30px;">
              <a href="mailto:hello@cadevelopment.cz" class="footer-link" style="font-size: 16px; font-weight: 600;">hello@cadevelopment.cz</a>
            </p>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p class="footer-title">${brandName}</p>
            <p class="footer-text">${brandSubline}</p>
            <p class="footer-text">${brandFooterLine}</p>
            <p class="footer-text" style="margin-top: 20px; font-size: 13px;">
              © ${new Date().getFullYear()} ${brandName}. Všechna práva vyhrazena.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to client if they selected specific brochures OR requested catalog
    const shouldSendClientEmail = requestData.requestType === 'catalog' || 
                                  (requestData.selectedBrochures && requestData.selectedBrochures.length > 0);

    if (shouldSendClientEmail) {
      // Determine email content based on request type
      const isCatalog = requestData.requestType === "catalog";
      const isPresentation = requestData.requestType === "presentation_download";
      const showMainButton = isCatalog || isPresentation;

      const emailSubject = isPresentation
        ? "Vaše prezentace ProDubai"
        : isCatalog
          ? `Váš katalog od ${brandName}`
          : `Vaše vybrané materiály - ${brandName}`;

      const emailTitle = isPresentation
        ? "Děkujeme za váš zájem!"
        : isCatalog
          ? "Děkujeme za váš zájem!"
          : "Vaše vybrané materiály jsou připraveny";

      const mainContent = isPresentation
        ? "Děkujeme za váš zájem. Připravili jsme pro vás prezentaci ProDubai – stačí kliknout a stáhnout PDF."
        : isCatalog
          ? `Děkujeme za váš zájem. Připravili jsme pro vás katalog s přehledem možností a informacemi k investici.`
          : `Děkujeme za váš zájem. Připravili jsme pro vás materiály k vybraným tématům.`;

      const buttonText = isPresentation
        ? "📥 Stáhnout prezentaci"
        : isCatalog
          ? "📥 Stáhnout katalog"
          : "📥 Otevřít materiály";

      // Create projects list HTML (skip for presentation download)
      const projectsListHtml = !isPresentation && requestData.selectedBrochures && requestData.selectedBrochures.length > 0
        ? `
          <div class="projects-box">
            <h3 class="projects-title">Vaše materiály ke stažení:</h3>
            ${requestData.selectedBrochures.map(id => `
              <div class="project-item" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center;">
                  <span class="checkmark">✓</span>
                  <span>${projectNames[id] || id}</span>
                </div>
                <a href="${projectDownloadUrls[id] || '#'}" 
                   style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #c9b697 0%, #b39b7a 100%); color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 8px rgba(201, 182, 151, 0.3);"
                   target="_blank">
                  📥 Stáhnout PDF
                </a>
              </div>
            `).join('')}
          </div>
        `
        : "";

      // Create investment info HTML
      const investmentInfoHtml = requestData.investmentType
        ? `
          <div class="investment-box">
            <h3 class="investment-title">Vaše investiční preference:</h3>
            <div class="investment-item">
              <span class="investment-label">Typ investice:</span> ${escapeHtml(requestData.investmentType || 'Neuvedeno')}
            </div>
            <div class="investment-item">
              <span class="investment-label">Rozpočet:</span> ${escapeHtml(requestData.budget || 'Neuvedeno')}
            </div>
            <div class="investment-item">
              <span class="investment-label">Časový horizont:</span> ${escapeHtml(requestData.timeline || 'Neuvedeno')}
            </div>
          </div>
        `
        : '';

      const emailHtml = createEmailTemplate(
        safeName,
        emailTitle,
        mainContent,
        buttonText,
        downloadLink,
        projectsListHtml,
        investmentInfoHtml,
        showMainButton,
      );

      const clientEmailResponse = await resend.emails.send({
        from: `${brandName} <info@news.b22studio.cz>`,
        to: [requestData.email],
        subject: emailSubject,
        html: emailHtml,
      });

      console.log("Client email sent:", clientEmailResponse);
    }

    // Send WhatsApp message if opted in and phone is provided
    let whatsappSent = false;
    let whatsappError: string | null = null;
    
    if (requestData.whatsappOptIn && requestData.phone) {
      try {
        console.log("WhatsApp opt-in check:", {
          whatsappOptIn: requestData.whatsappOptIn,
          hasPhone: !!requestData.phone,
        });

        const whatsappMessage = isDubai
          ? `Dobrý den ${requestData.name}!\n\nDěkujeme za váš zájem. Zde je odkaz ke stažení materiálů:\n\n📥 ${downloadLink}\n\n---\n${brandName}\n${brandWebsite}`
          : `Dobrý den ${requestData.name}! 👋\n\nDěkujeme za váš zájem o ${brandDescriptor}. Zde je odkaz ke stažení vašich materiálů:\n\n📥 ${downloadLink}\n\n---\n${brandName}\n${brandWebsite}`;

        console.log("Calling WhatsApp function with phone:", requestData.phone);

        const { data: whatsappResult, error: whatsappInvokeError } = await supabase.functions.invoke(
          "send-whatsapp-message",
          {
            body: {
              phone: requestData.phone,
              message: whatsappMessage,
              name: requestData.name,
            },
          },
        );

        if (whatsappInvokeError) {
          console.error("Failed to send WhatsApp message:", whatsappInvokeError);
          whatsappError = whatsappInvokeError.message;
        } else if ((whatsappResult as any)?.success) {
          console.log("WhatsApp message sent successfully:", whatsappResult);
          whatsappSent = true;
        } else {
          console.error("Failed to send WhatsApp message:", whatsappResult);
          whatsappError = (whatsappResult as any)?.details || (whatsappResult as any)?.error || "WhatsApp delivery failed";
        }
      } catch (err: any) {
        console.error("Error sending WhatsApp message:", err);
        whatsappError = err.message || "Unknown error";
        // Don't fail the whole request if WhatsApp fails
      }
    } else {
      console.log("WhatsApp skipped:", { whatsappOptIn: requestData.whatsappOptIn, hasPhone: !!requestData.phone });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Request saved and notification sent",
        requestId: savedRequest.id,
        whatsappRequested: requestData.whatsappOptIn,
        whatsappSent,
        whatsappError
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-brochure-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
