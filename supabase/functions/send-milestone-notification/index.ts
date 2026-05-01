import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MilestoneNotificationRequest {
  user_id: string;
  milestone_type: 'tipar_5_deals' | 'senior_obchodnik' | 'vip_client';
  user_email: string;
  user_name?: string;
}

const milestoneTemplates = {
  tipar_5_deals: {
    subject: "🎉 Gratulujeme! Máte nárok na kurz obchodníka",
    html: (name: string) => `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; font-size: 28px; margin: 0;">Congratulations!</h1>
        </div>
        <p style="font-size: 18px; line-height: 1.6;">Vážený/á ${name},</p>
        <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
          Dosáhli jste <strong style="color: #d4af37;">5 uzavřených obchodů</strong> jako tipař! 
          Tímto splňujete podmínky pro účast na našem exkluzivním <strong style="color: #d4af37;">kurzu obchodníka</strong>.
        </p>
        <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid #d4af37; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; font-size: 18px; color: #d4af37;">🏆 Kurz obchodníka vás čeká!</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #e0e0e0;">Kontaktujte nás pro více informací.</p>
        </div>
        <p style="font-size: 14px; color: #888; margin-top: 30px; text-align: center;">
          S pozdravem,<br>Tým CAD Invest
        </p>
      </div>
    `,
  },
  senior_obchodnik: {
    subject: "🌟 Povýšení na Senior Obchodníka",
    html: (name: string) => `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; font-size: 28px; margin: 0;">Povýšení!</h1>
        </div>
        <p style="font-size: 18px; line-height: 1.6;">Vážený/á ${name},</p>
        <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
          Gratulujeme! Díky vašemu výjimečnému výkonu - <strong style="color: #d4af37;">10 uzavřených obchodů za 90 dní</strong> - 
          jste byli automaticky povýšeni na pozici <strong style="color: #d4af37;">Senior Obchodník</strong>.
        </p>
        <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid #d4af37; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; font-size: 24px; color: #d4af37;">⭐ Senior Obchodník ⭐</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #e0e0e0;">Nová role je již aktivní ve vašem účtu.</p>
        </div>
        <p style="font-size: 14px; color: #888; margin-top: 30px; text-align: center;">
          S pozdravem,<br>Tým CAD Invest
        </p>
      </div>
    `,
  },
  vip_client: {
    subject: "👑 Vítejte v klubu VIP klientů",
    html: (name: string) => `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; font-size: 28px; margin: 0;">VIP Status</h1>
        </div>
        <p style="font-size: 18px; line-height: 1.6;">Vážený/á ${name},</p>
        <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
          S potěšením vám oznamujeme, že váš celkový obrat přesáhl <strong style="color: #d4af37;">10 000 000 AED</strong>!
          Nyní jste oficiálním členem našeho exkluzivního <strong style="color: #d4af37;">VIP klubu</strong>.
        </p>
        <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid #d4af37; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; font-size: 24px; color: #d4af37;">👑 VIP Klient 👑</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #e0e0e0;">Máte nyní přístup k off-market nabídkám.</p>
        </div>
        <ul style="font-size: 14px; color: #e0e0e0; line-height: 2;">
          <li>Exkluzivní přístup k off-market nemovitostem</li>
          <li>Přednostní informace o nových projektech</li>
          <li>Osobní VIP konzultant</li>
          <li>Speciální podmínky financování</li>
        </ul>
        <p style="font-size: 14px; color: #888; margin-top: 30px; text-align: center;">
          S pozdravem,<br>Tým CAD Invest
        </p>
      </div>
    `,
  },
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Milestone notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, milestone_type, user_email, user_name }: MilestoneNotificationRequest = await req.json();

    console.log("Processing milestone:", { user_id, milestone_type, user_email });

    // Check if already notified
    const { data: existing } = await supabase
      .from("milestone_notifications")
      .select("id")
      .eq("user_id", user_id)
      .eq("milestone_type", milestone_type)
      .single();

    if (existing) {
      console.log("User already notified for this milestone");
      return new Response(
        JSON.stringify({ success: false, message: "Already notified" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const template = milestoneTemplates[milestone_type];
    if (!template) {
      throw new Error(`Unknown milestone type: ${milestone_type}`);
    }

    const displayName = user_name || user_email.split("@")[0];

    // Send email
    const emailResponse = await resend.emails.send({
      from: "CAD Invest <onboarding@resend.dev>",
      to: [user_email],
      subject: template.subject,
      html: template.html(displayName),
    });

    console.log("Email sent:", emailResponse);

    // Record notification to prevent duplicates
    const { error: insertError } = await supabase
      .from("milestone_notifications")
      .insert({
        user_id,
        milestone_type,
      });

    if (insertError) {
      console.error("Failed to record notification:", insertError);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in milestone notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
