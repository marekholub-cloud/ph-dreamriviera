import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, source } = await req.json();

    console.log('Newsletter subscription request received:', { email: email?.substring(0, 3) + '***', source });

    // Validate required fields
    if (!email || typeof email !== 'string') {
      console.error('Validation failed: email is required');
      return new Response(
        JSON.stringify({ error: 'Email je povinný' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Validation failed: invalid email format');
      return new Response(
        JSON.stringify({ error: 'Neplatný formát emailu' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and validate input lengths
    const sanitizedEmail = email.trim().toLowerCase().slice(0, 255);
    const sanitizedName = name ? String(name).trim().slice(0, 100) : null;
    const sanitizedSource = source ? String(source).trim().slice(0, 50) : 'website';

    // Create Supabase client with service role key for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already exists
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, is_active')
      .eq('email', sanitizedEmail)
      .maybeSingle();

    if (existing) {
      if (existing.is_active) {
        console.log('Email already subscribed:', sanitizedEmail.substring(0, 3) + '***');
        return new Response(
          JSON.stringify({ message: 'Tento email je již přihlášen k odběru' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Reactivate subscription
        const { error: updateError } = await supabase
          .from('newsletter_subscribers')
          .update({ is_active: true, name: sanitizedName })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error reactivating subscription:', updateError);
          throw updateError;
        }

        console.log('Subscription reactivated for:', sanitizedEmail.substring(0, 3) + '***');
        return new Response(
          JSON.stringify({ success: true, message: 'Odběr byl znovu aktivován' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert new subscriber
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: sanitizedEmail,
        name: sanitizedName,
        source: sanitizedSource,
        is_active: true,
      });

    if (insertError) {
      console.error('Error inserting subscriber:', insertError);
      throw insertError;
    }

    console.log('New subscriber added:', sanitizedEmail.substring(0, 3) + '***');

    return new Response(
      JSON.stringify({ success: true, message: 'Úspěšně přihlášeno k odběru' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in subscribe-newsletter function:', error);
    return new Response(
      JSON.stringify({ error: 'Nepodařilo se přihlásit k odběru. Zkuste to prosím později.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
