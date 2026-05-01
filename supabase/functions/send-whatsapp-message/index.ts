import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  phone: string;
  message: string;
  name?: string;
}

// Format phone number to international format
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }
  
  // If doesn't start with +, assume Czech number
  if (!cleaned.startsWith('+')) {
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    // Add Czech prefix
    cleaned = '+420' + cleaned;
  }
  
  return cleaned;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, name }: WhatsAppRequest = await req.json();

    console.log("WhatsApp request received:", { phone, name, messageLength: message?.length });

    // Validate required fields
    if (!phone) {
      console.error("Missing phone number");
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!message) {
      console.error("Missing message");
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get Twilio credentials
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    console.log("Twilio config loaded:", { 
      hasAccountSid: !!accountSid, 
      hasAuthToken: !!authToken, 
      whatsAppNumber: twilioWhatsAppNumber 
    });

    if (!accountSid || !authToken || !twilioWhatsAppNumber) {
      console.error("Missing Twilio configuration");
      return new Response(
        JSON.stringify({ error: "Twilio configuration missing" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format the recipient phone number
    const formattedPhone = formatPhoneNumber(phone);
    const toNumber = `whatsapp:${formattedPhone}`;
    
    // Ensure fromNumber has whatsapp: prefix
    const fromNumber = twilioWhatsAppNumber.startsWith('whatsapp:') 
      ? twilioWhatsAppNumber 
      : `whatsapp:${twilioWhatsAppNumber}`;

    console.log("Sending WhatsApp message:", { from: fromNumber, to: toNumber });

    // Send message via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', toNumber);
    formData.append('From', fromNumber);
    formData.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Twilio API error:", result);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send WhatsApp message", 
          details: result.message || result.error_message 
        }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("WhatsApp message sent successfully:", { sid: result.sid, status: result.status });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: result.sid,
        status: result.status 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-whatsapp-message function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
