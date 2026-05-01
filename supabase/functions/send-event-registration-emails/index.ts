import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventRegistrationEmailRequest {
  registrationId: string;
}

// Generate ICS calendar file content
function generateICSFile(
  eventTitle: string,
  startTime: Date,
  locationName: string | null,
  description: string | null
): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CAD Estates//Event Registration//CS
BEGIN:VEVENT
UID:${Date.now()}@cadestates.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startTime)}
DTEND:${formatDate(endTime)}
SUMMARY:${eventTitle}
DESCRIPTION:${description || "Investiční seminář CAD Estates"}
LOCATION:${locationName || "Bude upřesněno"}
END:VEVENT
END:VCALENDAR`;

  return icsContent;
}

// Create base64 encoded ICS attachment
function createICSAttachment(icsContent: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(icsContent);
  return btoa(String.fromCharCode(...data));
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-event-registration-emails function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registrationId }: EventRegistrationEmailRequest = await req.json();
    console.log("Processing registration:", registrationId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch registration with all related data
    const { data: registration, error: regError } = await supabase
      .from("event_registrations")
      .select(`
        id,
        slot_id,
        lead_id,
        referrer_id,
        registered_at,
        leads (
          id,
          lead_name,
          email,
          phone
        ),
        event_slots (
          id,
          start_time,
          capacity,
          events (
            id,
            title,
            description,
            location_name,
            maps_url
          )
        )
      `)
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      console.error("Registration fetch error:", regError);
      throw new Error("Registration not found");
    }

    console.log("Registration data fetched:", registration);

    const lead = registration.leads as any;
    const slot = registration.event_slots as any;
    const event = slot?.events as any;

    if (!lead || !slot || !event) {
      throw new Error("Missing related data");
    }

    const eventStartTime = new Date(slot.start_time);
    const formattedDate = eventStartTime.toLocaleDateString("cs-CZ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailPromises: Promise<any>[] = [];

    // 1. Email to client (lead)
    if (lead.email) {
      const icsContent = generateICSFile(
        event.title,
        eventStartTime,
        event.location_name,
        event.description
      );
      const icsBase64 = createICSAttachment(icsContent);

      const mapButton = event.maps_url
        ? `<a href="${event.maps_url}" style="display: inline-block; background-color: #C9A961; color: #1A1F2E; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">📍 Zobrazit na mapě</a>`
        : "";

      const clientEmailPromise = resend.emails.send({
        from: "CAD Estates <info@cadestates.com>",
        to: [lead.email],
        subject: `Potvrzení registrace: ${event.title}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1A1F2E; color: #F5F0E6; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #242936; border-radius: 12px; padding: 40px; border: 1px solid #3A3F4E;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #C9A961; margin: 0; font-size: 28px;">✨ Registrace potvrzena!</h1>
              </div>
              
              <p style="color: #F5F0E6; font-size: 16px; line-height: 1.6;">
                Dobrý den, <strong>${lead.lead_name}</strong>,
              </p>
              
              <p style="color: #A0A5B5; font-size: 16px; line-height: 1.6;">
                Děkujeme za vaši registraci na investiční seminář. Těšíme se na setkání s vámi!
              </p>
              
              <div style="background-color: #1A1F2E; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #C9A961;">
                <h2 style="color: #C9A961; margin: 0 0 16px 0; font-size: 20px;">${event.title}</h2>
                <p style="color: #F5F0E6; margin: 8px 0; font-size: 15px;">
                  📅 <strong>Datum:</strong> ${formattedDate}
                </p>
                ${event.location_name ? `<p style="color: #F5F0E6; margin: 8px 0; font-size: 15px;">📍 <strong>Místo:</strong> ${event.location_name}</p>` : ""}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                ${mapButton}
              </div>
              
              <p style="color: #A0A5B5; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                V příloze naleznete soubor pro přidání události do vašeho kalendáře.
              </p>
              
              <hr style="border: none; border-top: 1px solid #3A3F4E; margin: 30px 0;">
              
              <p style="color: #6B7080; font-size: 12px; text-align: center;">
                CAD Estates | Prémiové investiční nemovitosti<br>
                Máte dotazy? Odpovězte na tento e-mail.
              </p>
            </div>
          </body>
          </html>
        `,
        attachments: [
          {
            filename: "event.ics",
            content: icsBase64,
          },
        ],
      });

      emailPromises.push(
        clientEmailPromise
          .then((res) => {
            console.log("Client email sent:", res);
            return { type: "client", success: true, result: res };
          })
          .catch((err) => {
            console.error("Client email error:", err);
            return { type: "client", success: false, error: err.message };
          })
      );
    }

    // 2. Email to tipar (referrer)
    if (registration.referrer_id) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", registration.referrer_id)
        .single();

      if (referrer?.email) {
        const tiparEmailPromise = resend.emails.send({
          from: "CAD Estates <info@cadestates.com>",
          to: [referrer.email],
          subject: `🎉 Váš kontakt se registroval na seminář!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1A1F2E; color: #F5F0E6; padding: 40px 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #242936; border-radius: 12px; padding: 40px; border: 1px solid #3A3F4E;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #C9A961; margin: 0; font-size: 28px;">🎉 Gratulujeme!</h1>
                </div>
                
                <p style="color: #F5F0E6; font-size: 16px; line-height: 1.6;">
                  Dobrý den${referrer.full_name ? `, <strong>${referrer.full_name}</strong>` : ""},
                </p>
                
                <p style="color: #A0A5B5; font-size: 16px; line-height: 1.6;">
                  Váš kontakt <strong style="color: #F5F0E6;">${lead.lead_name}</strong> se právě registroval na investiční seminář!
                </p>
                
                <div style="background-color: #10B981; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
                  <p style="color: white; margin: 0; font-size: 18px; font-weight: bold;">
                    ⭐ Váš lead dosáhl úrovně SUPERTIP
                  </p>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 24px; font-weight: bold;">
                    1% provize z hodnoty nemovitosti
                  </p>
                </div>
                
                <div style="background-color: #1A1F2E; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <h3 style="color: #C9A961; margin: 0 0 12px 0; font-size: 16px;">Detail události:</h3>
                  <p style="color: #F5F0E6; margin: 6px 0; font-size: 14px;">
                    📅 <strong>${event.title}</strong>
                  </p>
                  <p style="color: #A0A5B5; margin: 6px 0; font-size: 14px;">
                    🕐 ${formattedDate}
                  </p>
                  ${event.location_name ? `<p style="color: #A0A5B5; margin: 6px 0; font-size: 14px;">📍 ${event.location_name}</p>` : ""}
                </div>
                
                <p style="color: #A0A5B5; font-size: 14px; line-height: 1.6;">
                  Pokračujte v práci a zvyšujte své příjmy doporučením dalších kontaktů!
                </p>
                
                <hr style="border: none; border-top: 1px solid #3A3F4E; margin: 30px 0;">
                
                <p style="color: #6B7080; font-size: 12px; text-align: center;">
                  CAD Estates Partner Program
                </p>
              </div>
            </body>
            </html>
          `,
        });

        emailPromises.push(
          tiparEmailPromise
            .then((res) => {
              console.log("Tipar email sent:", res);
              return { type: "tipar", success: true, result: res };
            })
            .catch((err) => {
              console.error("Tipar email error:", err);
              return { type: "tipar", success: false, error: err.message };
            })
        );
      }
    }

    // 3. Email to obchodnik (get one with least assignments or admin)
    // For now, we'll send to admins
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(3);

    if (admins && admins.length > 0) {
      const adminIds = admins.map((a) => a.user_id);
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("email, full_name")
        .in("id", adminIds);

      if (adminProfiles && adminProfiles.length > 0) {
        const adminEmails = adminProfiles
          .map((p) => p.email)
          .filter((e) => e) as string[];

        if (adminEmails.length > 0) {
          const obchodnikEmailPromise = resend.emails.send({
            from: "CAD Estates <info@cadestates.com>",
            to: adminEmails,
            subject: `📋 Nový účastník semináře: ${lead.lead_name}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1A1F2E; color: #F5F0E6; padding: 40px 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #242936; border-radius: 12px; padding: 40px; border: 1px solid #3A3F4E;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #C9A961; margin: 0; font-size: 28px;">📋 Nový účastník semináře</h1>
                  </div>
                  
                  <p style="color: #A0A5B5; font-size: 16px; line-height: 1.6;">
                    Na seminář <strong style="color: #F5F0E6;">${event.title}</strong> se zaregistroval nový účastník.
                  </p>
                  
                  <div style="background-color: #1A1F2E; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #C9A961;">
                    <h3 style="color: #C9A961; margin: 0 0 16px 0; font-size: 18px;">Údaje účastníka:</h3>
                    <p style="color: #F5F0E6; margin: 8px 0; font-size: 15px;">
                      👤 <strong>Jméno:</strong> ${lead.lead_name}
                    </p>
                    ${lead.email ? `<p style="color: #F5F0E6; margin: 8px 0; font-size: 15px;">📧 <strong>Email:</strong> <a href="mailto:${lead.email}" style="color: #C9A961;">${lead.email}</a></p>` : ""}
                    ${lead.phone ? `<p style="color: #F5F0E6; margin: 8px 0; font-size: 15px;">📱 <strong>Telefon:</strong> <a href="tel:${lead.phone}" style="color: #C9A961;">${lead.phone}</a></p>` : ""}
                  </div>
                  
                  <div style="background-color: #1A1F2E; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #C9A961; margin: 0 0 12px 0; font-size: 16px;">Detail akce:</h3>
                    <p style="color: #F5F0E6; margin: 6px 0; font-size: 14px;">
                      📅 <strong>${event.title}</strong>
                    </p>
                    <p style="color: #A0A5B5; margin: 6px 0; font-size: 14px;">
                      🕐 ${formattedDate}
                    </p>
                    ${event.location_name ? `<p style="color: #A0A5B5; margin: 6px 0; font-size: 14px;">📍 ${event.location_name}</p>` : ""}
                  </div>
                  
                  <p style="color: #F59E0B; font-size: 14px; line-height: 1.6; background-color: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 6px;">
                    ⚠️ <strong>Doporučení:</strong> Prověřte profil účastníka před akcí a připravte si personalizovaný přístup.
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #3A3F4E; margin: 30px 0;">
                  
                  <p style="color: #6B7080; font-size: 12px; text-align: center;">
                    CAD Estates CRM System
                  </p>
                </div>
              </body>
              </html>
            `,
          });

          emailPromises.push(
            obchodnikEmailPromise
              .then((res) => {
                console.log("Obchodnik email sent:", res);
                return { type: "obchodnik", success: true, result: res };
              })
              .catch((err) => {
                console.error("Obchodnik email error:", err);
                return { type: "obchodnik", success: false, error: err.message };
              })
          );
        }
      }
    }

    // Wait for all emails to complete
    const results = await Promise.all(emailPromises);
    console.log("All email results:", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-event-registration-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
