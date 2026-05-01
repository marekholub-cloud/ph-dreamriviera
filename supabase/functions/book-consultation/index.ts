import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingRequest {
  lead_id: string;
  slot_id?: string;
  requested_time?: string;
  referrer_id?: string;
  investor_notes?: string;
  affiliate_code?: string;
}

// Generate ICS calendar file content
function generateICS(booking: {
  id: string;
  start_time: string;
  end_time: string;
  lead_name: string;
  obchodnik_name: string;
  obchodnik_email: string;
  investor_email?: string;
  notes?: string;
}): string {
  const formatDate = (date: string) => {
    return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const uid = `${booking.id}@go2dubai.online`;
  const now = formatDate(new Date().toISOString());
  const start = formatDate(booking.start_time);
  const end = formatDate(booking.end_time);

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//go2dubai.online//Consultation Booking//CS
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:Konzultace - ${booking.lead_name}
DESCRIPTION:Investiční konzultace s ${booking.lead_name}${booking.notes ? '\\n\\nPoznámky: ' + booking.notes.replace(/\n/g, '\\n') : ''}
ORGANIZER;CN=${booking.obchodnik_name}:mailto:${booking.obchodnik_email}
${booking.investor_email ? `ATTENDEE;CN=${booking.lead_name};RSVP=TRUE:mailto:${booking.investor_email}` : ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: BookingRequest = await req.json();
    console.log("Booking request received:", JSON.stringify(body, null, 2));

    const { lead_id, slot_id, requested_time, referrer_id, investor_notes, affiliate_code } = body;

    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: "lead_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get lead information
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*, referrer:profiles!leads_referrer_id_fkey(id, full_name, email, assigned_obchodnik_id)")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      console.error("Lead fetch error:", leadError);
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let assignedObchodnikId: string | null = null;
    let slotData: any = null;

    // If slot is provided, get slot information
    if (slot_id) {
      const { data: slot, error: slotError } = await supabase
        .from("consultation_slots")
        .select("*, obchodnik:profiles!consultation_slots_obchodnik_id_fkey(id, full_name, email)")
        .eq("id", slot_id)
        .single();

      if (slotError || !slot) {
        console.error("Slot fetch error:", slotError);
        return new Response(
          JSON.stringify({ error: "Slot not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if slot is still available
      if (!slot.is_available || slot.booked_count >= slot.capacity) {
        return new Response(
          JSON.stringify({ error: "Slot is no longer available" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      slotData = slot;
      assignedObchodnikId = slot.obchodnik_id;
    } else {
      // Determine obchodnik based on referrer logic
      const actualReferrerId = referrer_id || lead.referrer_id;
      
      if (actualReferrerId) {
        // Check if referrer is an obchodnik
        const { data: referrerRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", actualReferrerId);

        const isObchodnik = referrerRoles?.some(r => 
          r.role === 'obchodnik' || r.role === 'senior_obchodnik'
        );

        if (isObchodnik) {
          // Referrer is obchodnik, they handle the consultation
          assignedObchodnikId = actualReferrerId;
        } else {
          // Referrer is tipar, check if they have assigned obchodnik
          const { data: referrerProfile } = await supabase
            .from("profiles")
            .select("assigned_obchodnik_id")
            .eq("id", actualReferrerId)
            .single();

          if (referrerProfile?.assigned_obchodnik_id) {
            assignedObchodnikId = referrerProfile.assigned_obchodnik_id;
          }
          // If no assigned obchodnik, leave it null for manager assignment
        }
      }
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("consultation_bookings")
      .insert({
        lead_id,
        slot_id: slot_id || null,
        referrer_id: referrer_id || lead.referrer_id,
        assigned_obchodnik_id: assignedObchodnikId,
        requested_time: slot_id ? null : (requested_time || new Date().toISOString()),
        investor_notes,
        status: assignedObchodnikId ? 'confirmed' : 'pending',
        confirmed_at: assignedObchodnikId ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking creation error:", bookingError);
      return new Response(
        JSON.stringify({ error: "Failed to create booking", details: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Booking created:", booking.id);

    // Send notifications and ICS if we have an assigned obchodnik
    if (assignedObchodnikId && resendApiKey && slotData) {
      // Dynamic import of Resend using esm.sh
      const resendModule = await import("https://esm.sh/resend@2.0.0");
      const resend = new resendModule.Resend(resendApiKey);
      
      // Get obchodnik details
      const { data: obchodnik } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", assignedObchodnikId)
        .single();

      if (obchodnik?.email) {
        const icsContent = generateICS({
          id: booking.id,
          start_time: slotData.start_time,
          end_time: slotData.end_time,
          lead_name: lead.lead_name,
          obchodnik_name: obchodnik.full_name || 'Obchodník',
          obchodnik_email: obchodnik.email,
          investor_email: lead.email,
          notes: investor_notes,
        });

        // Encode ICS to base64 using btoa
        const icsBase64 = btoa(unescape(encodeURIComponent(icsContent)));

        // Send email to obchodnik
        try {
          await resend.emails.send({
            from: "go2dubai.online <info@go2dubai.online>",
            to: [obchodnik.email],
            subject: `Nová konzultace: ${lead.lead_name}`,
            html: `
              <h2>Nová konzultace naplánována</h2>
              <p><strong>Investor:</strong> ${lead.lead_name}</p>
              <p><strong>Email:</strong> ${lead.email || 'Neuvedeno'}</p>
              <p><strong>Telefon:</strong> ${lead.phone || 'Neuvedeno'}</p>
              <p><strong>Termín:</strong> ${new Date(slotData.start_time).toLocaleString('cs-CZ')}</p>
              ${investor_notes ? `<p><strong>Poznámky investora:</strong> ${investor_notes}</p>` : ''}
              <p>Pozvánka do kalendáře je přiložena.</p>
            `,
            attachments: [
              {
                filename: 'konzultace.ics',
                content: icsBase64,
              }
            ],
          });
          console.log("Email sent to obchodnik:", obchodnik.email);
        } catch (emailError) {
          console.error("Failed to send obchodnik email:", emailError);
        }

        // Send email to investor if email exists
        if (lead.email) {
          try {
            await resend.emails.send({
              from: "go2dubai.online <info@go2dubai.online>",
              to: [lead.email],
              subject: "Potvrzení konzultace - go2dubai.online",
              html: `
                <h2>Vaše konzultace byla potvrzena</h2>
                <p>Děkujeme za váš zájem o investice v Dubaji.</p>
                <p><strong>Termín:</strong> ${new Date(slotData.start_time).toLocaleString('cs-CZ')}</p>
                <p><strong>Konzultant:</strong> ${obchodnik.full_name || 'Obchodník ProDubai'}</p>
                <p>Pozvánka do kalendáře je přiložena.</p>
                <p>Těšíme se na setkání!</p>
                <p>S pozdravem,<br>Tým go2dubai.online</p>
              `,
              attachments: [
                {
                  filename: 'konzultace.ics',
                  content: icsBase64,
                }
              ],
            });
            console.log("Email sent to investor:", lead.email);
          } catch (emailError) {
            console.error("Failed to send investor email:", emailError);
          }
        }

        // Mark ICS as sent
        await supabase
          .from("consultation_bookings")
          .update({ ics_sent: true })
          .eq("id", booking.id);
      }
    }

    // Create notifications
    if (assignedObchodnikId) {
      await supabase.rpc('create_notification', {
        p_user_id: assignedObchodnikId,
        p_type: 'consultation_booked',
        p_title: 'Nová konzultace naplánována',
        p_message: `Konzultace s ${lead.lead_name} byla naplánována.`,
        p_data: { booking_id: booking.id, lead_id, lead_name: lead.lead_name }
      });
    }

    // Notify referrer if different from obchodnik
    if (lead.referrer_id && lead.referrer_id !== assignedObchodnikId) {
      await supabase.rpc('create_notification', {
        p_user_id: lead.referrer_id,
        p_type: 'consultation_booked',
        p_title: 'Konzultace vašeho leadu',
        p_message: `Pro ${lead.lead_name} byla naplánována konzultace.`,
        p_data: { booking_id: booking.id, lead_id, lead_name: lead.lead_name }
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking_id: booking.id,
        status: booking.status,
        assigned_obchodnik_id: assignedObchodnikId,
        message: assignedObchodnikId 
          ? "Konzultace byla úspěšně rezervována a potvrzena." 
          : "Rezervace vytvořena, čeká na přiřazení obchodníka."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in book-consultation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
