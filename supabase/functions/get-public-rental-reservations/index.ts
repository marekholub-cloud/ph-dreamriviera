import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const BLOCKING_STATUSES = ["pending", "confirmed"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyId, startDate, endDate, roomId } = await req.json();

    if (!UUID_REGEX.test(propertyId ?? "")) {
      return new Response(JSON.stringify({ error: "Invalid propertyId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (roomId && !UUID_REGEX.test(roomId)) {
      return new Response(JSON.stringify({ error: "Invalid roomId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!DATE_REGEX.test(startDate ?? "") || !DATE_REGEX.test(endDate ?? "")) {
      return new Response(JSON.stringify({ error: "Invalid date range" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing backend configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: property, error: propertyError } = await supabase
      .from("rental_properties")
      .select("id")
      .eq("id", propertyId)
      .eq("status", "active")
      .maybeSingle();

    if (propertyError) {
      throw propertyError;
    }

    if (!property) {
      return new Response(JSON.stringify({ reservations: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let query = supabase
      .from("rental_reservations")
      .select("check_in_date,check_out_date,booking_status,room_id")
      .eq("property_id", propertyId)
      .in("booking_status", BLOCKING_STATUSES)
      .lt("check_in_date", endDate)
      .gt("check_out_date", startDate);

    // If a specific room is requested, only return reservations that block this room:
    // either reservations for the same room, or whole-property reservations (room_id IS NULL).
    if (roomId) {
      query = query.or(`room_id.eq.${roomId},room_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ reservations: data ?? [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("get-public-rental-reservations error:", error);

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
