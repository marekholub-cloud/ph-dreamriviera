import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailHookPayload {
  user: {
    email: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmailHookPayload = await req.json();
    const { user, email_data } = payload;
    
    console.log("Received email hook payload:", JSON.stringify(payload, null, 2));

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // Always redirect to the production admin page
    const redirectTo = "https://nakostariku.cz/admin";
    const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(redirectTo)}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="cs">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Přihlášení do administrace</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                
                <!-- Header with Logo -->
                <tr>
                  <td style="background-color: #ffffff; padding: 40px 40px 20px 40px; text-align: center; border-bottom: 3px solid #C9A962;">
                    <img src="https://nakostariku.cz/logo-cad-email.png" alt="CAD Logo" style="max-width: 200px; height: auto;">
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600; text-align: center;">
                      Přihlášení do administrace
                    </h1>
                    
                    <p style="margin: 0 0 30px 0; color: #555555; font-size: 16px; line-height: 1.6; text-align: center;">
                      Obdrželi jsme žádost o přihlášení do administračního panelu. Klikněte na tlačítko níže pro dokončení přihlášení.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${confirmationUrl}" 
                             style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #C9A962 0%, #B8964F 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 15px rgba(201, 169, 98, 0.4);">
                            Přihlásit se
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 30px 0 0 0; color: #888888; font-size: 14px; line-height: 1.6; text-align: center;">
                      Pokud jste o přihlášení nežádali, tento email můžete ignorovat.
                    </p>

                    <!-- Security Note -->
                    <div style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid #C9A962;">
                      <p style="margin: 0; color: #666666; font-size: 13px; line-height: 1.5;">
                        <strong>Bezpečnostní upozornění:</strong> Tento odkaz je platný pouze pro jedno použití a vyprší po určité době.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #1a1a1a; padding: 30px 40px; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #C9A962; font-size: 14px; font-weight: 600;">
                      CAD - Dubai & Dominican Republic
                    </p>
                    <p style="margin: 0; color: #888888; font-size: 12px;">
                      Investiční nemovitosti v Kostarice
                    </p>
                    <p style="margin: 15px 0 0 0;">
                      <a href="https://nakostariku.cz" style="color: #C9A962; text-decoration: none; font-size: 12px;">
                        www.nakostariku.cz
                      </a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "CAD Admin <admin@nakostariku.cz>",
      to: [user.email],
      subject: "Přihlášení do administrace - CAD",
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in custom-email-hook:", error);
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
