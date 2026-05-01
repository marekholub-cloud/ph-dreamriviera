import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
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
  return phone.replace(/[^\d+\-() ]/g, "").substring(0, 20);
}

function sanitizeName(name: string): string {
  return name.replace(/[\x00-\x1F\x7F]/g, "").trim().substring(0, 100);
}

function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().substring(0, 255);
}

// Parse budget range to min/max values
function parseBudgetMin(budgetRange: string): number | null {
  const match = budgetRange.match(/(\d+)/);
  return match ? parseInt(match[1], 10) * 1000000 : null;
}

function parseBudgetMax(budgetRange: string): number | null {
  const matches = budgetRange.match(/(\d+)/g);
  if (matches && matches.length >= 2) {
    return parseInt(matches[1], 10) * 1000000;
  }
  // For "10+ mil" type ranges, return null for max
  return null;
}

// Map form values to database enum values
function mapFinancing(financing: string): string {
  const map: Record<string, string> = {
    'own': 'cash',
    'cash': 'cash',
    'mortgage': 'mortgage',
    'mixed': 'mixed',
    'other': 'other',
  };
  return map[financing.toLowerCase()] || 'other';
}

function mapInvestmentHorizon(horizon: string): string {
  const map: Record<string, string> = {
    'short': 'short_term',
    'short_term': 'short_term',
    'medium': 'medium_term',
    'medium_term': 'medium_term',
    'long': 'long_term',
    'long_term': 'long_term',
  };
  return map[horizon.toLowerCase()] || 'medium_term';
}

function mapPriority(priority: string): string {
  const map: Record<string, string> = {
    'capital': 'capital_growth',
    'capital_growth': 'capital_growth',
    'developer': 'capital_growth',
    'rental': 'rental_income',
    'rental_income': 'rental_income',
    'cashflow': 'rental_income',
    'personal': 'personal_use',
    'personal_use': 'personal_use',
    'mixed': 'mixed',
  };
  return map[priority.toLowerCase()] || 'mixed';
}

function mapExperience(experience: string): string {
  const map: Record<string, string> = {
    'beginner': 'beginner',
    'none': 'beginner',
    'intermediate': 'intermediate',
    'some': 'intermediate',
    'advanced': 'advanced',
    'experienced': 'advanced',
    'professional': 'professional',
    'expert': 'professional',
  };
  return map[experience.toLowerCase()] || 'beginner';
}

interface FormRequest {
  affiliateCode: string;
  name: string;
  email: string;
  phone: string;
  preferredContactTime: string;
  primaryGoal: string;
  experience: string;
  markets: string[];
  budgetRange: string;
  financing: string;
  investmentHorizon: string;
  timeline: string;
  topPriority: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (isRateLimited(clientIP)) {
      console.log(`Rate limited IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: FormRequest = await req.json();

    // Validate required fields
    if (!body.affiliateCode || !body.name || !body.email || !body.phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      affiliateCode: body.affiliateCode.toUpperCase().trim(),
      name: sanitizeName(body.name),
      email: sanitizeEmail(body.email),
      phone: sanitizePhone(body.phone),
      preferredContactTime: body.preferredContactTime,
      primaryGoal: body.primaryGoal,
      experience: body.experience,
      markets: body.markets,
      budgetRange: body.budgetRange,
      financing: body.financing,
      investmentHorizon: body.investmentHorizon,
      timeline: body.timeline,
      topPriority: body.topPriority,
    };

    console.log(`Processing embed form submission from: ${sanitizedData.email}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find referrer by affiliate code
    const { data: referrerProfile, error: referrerError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("affiliate_code", sanitizedData.affiliateCode)
      .maybeSingle();

    if (referrerError) {
      console.error("Error finding referrer:", referrerError);
    }

    const referrerId = referrerProfile?.id || null;

    // Check for existing lead
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .or(`email.eq.${sanitizedData.email},phone.eq.${sanitizedData.phone}`)
      .maybeSingle();

    let leadId: string;

    if (existingLead) {
      // Update existing lead
      const { data: updatedLead, error: updateError } = await supabase
        .from("leads")
        .update({
          lead_name: sanitizedData.name,
          phone: sanitizedData.phone,
          status: "supertip",
          warmth_level: 100,
          lead_level: 3,
          budget: sanitizedData.budgetRange,
          investment_goals: sanitizedData.primaryGoal,
          investment_timeline: sanitizedData.timeline,
          preferred_contact_time: sanitizedData.preferredContactTime,
          questionnaire_completed_independently: true,
          notes: `[AKTUALIZOVÁNO Z EMBED FORMULÁŘE]\nZkušenosti: ${sanitizedData.experience}\nTrhy: ${sanitizedData.markets.join(", ")}\nFinancování: ${sanitizedData.financing}\nHorizont: ${sanitizedData.investmentHorizon}\nPriorita: ${sanitizedData.topPriority}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLead.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("Error updating lead:", updateError);
        throw updateError;
      }

      leadId = updatedLead.id;
      console.log(`Updated existing lead: ${leadId}`);
    } else {
      // Create new lead
      const { data: newLead, error: insertError } = await supabase
        .from("leads")
        .insert({
          referrer_id: referrerId,
          referred_by: referrerId,
          lead_name: sanitizedData.name,
          email: sanitizedData.email,
          phone: sanitizedData.phone,
          status: "supertip",
          warmth_level: 100,
          lead_level: 3,
          affiliate_code: sanitizedData.affiliateCode,
          budget: sanitizedData.budgetRange,
          investment_goals: sanitizedData.primaryGoal,
          investment_timeline: sanitizedData.timeline,
          preferred_contact_time: sanitizedData.preferredContactTime,
          questionnaire_completed_independently: true,
          seminar_accepted: false,
          commission_rate: 0.01,
          notes: `[EMBED FORMULÁŘ]\nZkušenosti: ${sanitizedData.experience}\nTrhy: ${sanitizedData.markets.join(", ")}\nFinancování: ${sanitizedData.financing}\nHorizont: ${sanitizedData.investmentHorizon}\nPriorita: ${sanitizedData.topPriority}`,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creating lead:", insertError);
        throw insertError;
      }

      leadId = newLead.id;
      console.log(`Created new lead: ${leadId}`);
    }

    // Save to investor_questionnaires table for proper tracking
    const questionnaireData = {
      lead_id: leadId,
      completed_at: new Date().toISOString(),
      experience_level: mapExperience(sanitizedData.experience),
      budget_min: parseBudgetMin(sanitizedData.budgetRange),
      budget_max: parseBudgetMax(sanitizedData.budgetRange),
      financing_type: mapFinancing(sanitizedData.financing),
      investment_horizon: mapInvestmentHorizon(sanitizedData.investmentHorizon),
      priority: mapPriority(sanitizedData.topPriority),
      target_markets: sanitizedData.markets,
      additional_notes: `Vyplněno přes embed formulář. Primární cíl: ${sanitizedData.primaryGoal}. Timeline: ${sanitizedData.timeline}`,
      responses: {
        ...sanitizedData,
        collected_via: "embed_form",
        collected_at: new Date().toISOString(),
      },
      version: 1,
    };

    const { error: qError } = await supabase
      .from("investor_questionnaires")
      .upsert(questionnaireData, { onConflict: "lead_id" });

    if (qError) {
      console.error("Error saving questionnaire:", qError);
      // Don't block the main flow, just log the error
    } else {
      console.log(`Questionnaire saved for lead: ${leadId}`);
    }

    // Send notification emails
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      // Format contact time
      const contactDate = new Date(sanitizedData.preferredContactTime);
      const formattedDate = contactDate.toLocaleDateString("cs-CZ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Admin notification
      try {
        await resend.emails.send({
          from: "CA Development <info@cadevelopment.cz>",
          to: ["hello@cadevelopment.cz"],
          subject: `🎯 Nový kvalifikovaný investor - ${sanitizedData.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #C9A227;">Nový kvalifikovaný investor!</h1>
              <p>Z embed formuláře byl odeslán nový dotazník investora.</p>
              
              <h2 style="color: #333;">Kontaktní údaje</h2>
              <ul>
                <li><strong>Jméno:</strong> ${escapeHtml(sanitizedData.name)}</li>
                <li><strong>Email:</strong> ${escapeHtml(sanitizedData.email)}</li>
                <li><strong>Telefon:</strong> ${escapeHtml(sanitizedData.phone)}</li>
                <li><strong>Preferovaný termín:</strong> ${formattedDate}</li>
              </ul>
              
              <h2 style="color: #333;">Investiční profil</h2>
              <ul>
                <li><strong>Primární cíl:</strong> ${escapeHtml(sanitizedData.primaryGoal)}</li>
                <li><strong>Zkušenosti:</strong> ${escapeHtml(sanitizedData.experience)}</li>
                <li><strong>Preferované trhy:</strong> ${sanitizedData.markets.map(m => escapeHtml(m)).join(", ")}</li>
                <li><strong>Budget:</strong> ${escapeHtml(sanitizedData.budgetRange)}</li>
                <li><strong>Financování:</strong> ${escapeHtml(sanitizedData.financing)}</li>
                <li><strong>Investiční horizont:</strong> ${escapeHtml(sanitizedData.investmentHorizon)}</li>
                <li><strong>Timeline:</strong> ${escapeHtml(sanitizedData.timeline)}</li>
                <li><strong>Top priorita:</strong> ${escapeHtml(sanitizedData.topPriority)}</li>
              </ul>
              
              ${referrerProfile ? `
              <h2 style="color: #333;">Referrer</h2>
              <ul>
                <li><strong>Jméno:</strong> ${escapeHtml(referrerProfile.full_name || "N/A")}</li>
                <li><strong>Email:</strong> ${escapeHtml(referrerProfile.email)}</li>
                <li><strong>Affiliate kód:</strong> ${escapeHtml(sanitizedData.affiliateCode)}</li>
              </ul>
              ` : ""}
              
              <p style="margin-top: 30px; color: #666;">
                Lead ID: ${leadId}<br>
                Zdroj: Embed formulář
              </p>
            </div>
          `,
        });
        console.log("Admin notification sent");
      } catch (emailError) {
        console.error("Error sending admin email:", emailError);
      }

      // User confirmation email
      try {
        await resend.emails.send({
          from: "CA Development <info@cadevelopment.cz>",
          to: [sanitizedData.email],
          subject: "Děkujeme za vyplnění dotazníku investora",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #C9A227;">Děkujeme, ${escapeHtml(sanitizedData.name.split(" ")[0])}!</h1>
              
              <p>Obdrželi jsme váš dotazník investora a velmi si vážíme vašeho zájmu o investice do nemovitostí.</p>
              
              <p>Na základě vašich odpovědí připravíme personalizovanou nabídku a budeme vás kontaktovat v termínu, který jste zvolili:</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>📅 ${formattedDate}</strong>
              </div>
              
              <p>Mezitím se můžete podívat na naše aktuální projekty na <a href="https://cadevelopment.cz/nemovitosti" style="color: #C9A227;">cadevelopment.cz</a>.</p>
              
              <p style="margin-top: 30px;">
                S pozdravem,<br>
                <strong>Tým CA Development</strong>
              </p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              
              <p style="color: #888; font-size: 12px;">
                Tento email byl vygenerován automaticky. Neodpovídejte na něj prosím.<br>
                Pro dotazy nás kontaktujte na <a href="mailto:hello@cadevelopment.cz" style="color: #C9A227;">hello@cadevelopment.cz</a>
              </p>
            </div>
          `,
        });
        console.log("User confirmation sent");
      } catch (emailError) {
        console.error("Error sending user email:", emailError);
      }

      // Notify referrer if exists
      if (referrerProfile?.email) {
        try {
          await resend.emails.send({
            from: "CA Development <info@cadevelopment.cz>",
            to: [referrerProfile.email],
            subject: `🎉 Nový kvalifikovaný lead - ${sanitizedData.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #C9A227;">Gratulujeme k novému leadu!</h1>
                
                <p>Dobrý den ${escapeHtml(referrerProfile.full_name || "")}!</p>
                
                <p>Prostřednictvím vašeho odkazu někdo vyplnil investorský dotazník:</p>
                
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <strong>👤 ${escapeHtml(sanitizedData.name)}</strong><br>
                  Budget: ${escapeHtml(sanitizedData.budgetRange)}<br>
                  Status: Kvalifikovaný investor
                </div>
                
                <p>Tento lead se vám zobrazí ve vašem dashboardu. Budeme vás informovat o dalším vývoji.</p>
                
                <p style="margin-top: 30px;">
                  S pozdravem,<br>
                  <strong>Tým CA Development</strong>
                </p>
              </div>
            `,
          });
          console.log("Referrer notification sent");
        } catch (emailError) {
          console.error("Error sending referrer email:", emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, leadId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in embed-investor-form:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
