import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---------------- Helpers ----------------

function mapBudgetRange(range?: string): { min: number | null; max: number | null; label: string | null } {
  if (!range) return { min: null, max: null, label: null };
  const map: Record<string, { min: number; max: number | null; label: string }> = {
    "1-3m": { min: 1_000_000, max: 3_000_000, label: "1-3M AED" },
    "3-7m": { min: 3_000_000, max: 7_000_000, label: "3-7M AED" },
    "7-15m": { min: 7_000_000, max: 15_000_000, label: "7-15M AED" },
    "15m+": { min: 15_000_000, max: null, label: "15M+ AED" },
  };
  const m = map[range];
  return m ? { min: m.min, max: m.max, label: m.label } : { min: null, max: null, label: range };
}

function mapHorizon(h?: string): string | null {
  if (!h) return null;
  const m: Record<string, string> = {
    short: "do 3 měsíců",
    medium: "3-12 měsíců",
    long: "více než rok",
  };
  return m[h] || h;
}

function mapGoal(g?: string): string | null {
  if (!g) return null;
  const m: Record<string, string> = {
    rental: "pasivní příjem (pronájem)",
    appreciation: "růst kapitálu",
    both: "kombinace",
  };
  return m[g] || g;
}

async function findOrCreateLead(
  supabase: ReturnType<typeof createClient>,
  payload: {
    name: string;
    email: string;
    phone?: string | null;
    notes?: string | null;
    affiliate_code?: string | null;
    source_form?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
  },
): Promise<{ id: string; created: boolean }> {
  // Try existing by email
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("email", payload.email)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return { id: existing.id as string, created: false };
  }

  // Resolve referrer by affiliate code
  let referrer_id: string | null = null;
  if (payload.affiliate_code) {
    const { data: ref } = await supabase
      .from("profiles")
      .select("id")
      .eq("affiliate_code", payload.affiliate_code)
      .maybeSingle();
    referrer_id = (ref?.id as string) || null;
  }

  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      lead_name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      status: "new",
      lead_type: "external",
      source_form: payload.source_form || "prestondevelopment.eu",
      affiliate_code: payload.affiliate_code || null,
      referrer_id,
      notes: payload.notes || `Lead z prestondevelopment.eu`,
      utm_source: payload.utm_source || null,
      utm_medium: payload.utm_medium || null,
      utm_campaign: payload.utm_campaign || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: created.id as string, created: true };
}

// ---------------- Routes ----------------

async function handleGetEvents(supabase: ReturnType<typeof createClient>, url: URL) {
  const includeSlots = url.searchParams.get("include_slots") === "true";
  const onlyActive = url.searchParams.get("active") !== "false";

  let q = supabase.from("events").select("id, title, description, location_name, maps_url, image_url, is_active");
  if (onlyActive) q = q.eq("is_active", true);
  const { data: events, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;

  if (!includeSlots || !events?.length) return json(events ?? []);

  const ids = events.map((e: any) => e.id);
  const { data: slots } = await supabase
    .from("event_slots")
    .select("id, event_id, start_time, capacity, registered_count")
    .in("event_id", ids)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  const grouped = new Map<string, any[]>();
  (slots || []).forEach((s: any) => {
    const arr = grouped.get(s.event_id) || [];
    arr.push({
      id: s.id,
      start_time: s.start_time,
      capacity: s.capacity,
      registered_count: s.registered_count,
      available_spots: Math.max(0, s.capacity - s.registered_count),
    });
    grouped.set(s.event_id, arr);
  });

  return json(events.map((e: any) => ({ ...e, slots: grouped.get(e.id) || [] })));
}

async function handleGetEventSlots(supabase: ReturnType<typeof createClient>, eventId: string) {
  const { data, error } = await supabase
    .from("event_slots")
    .select("id, event_id, start_time, capacity, registered_count")
    .eq("event_id", eventId)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });
  if (error) throw error;
  return json(
    (data || []).map((s: any) => ({
      ...s,
      available_spots: Math.max(0, s.capacity - s.registered_count),
      is_available: s.registered_count < s.capacity,
    })),
  );
}

async function handleEventRegistration(
  supabase: ReturnType<typeof createClient>,
  body: any,
  refQuery: string | null,
) {
  const { name, email, phone, slot_id } = body;
  if (!name || !email || !slot_id) {
    return json({ success: false, error: "Missing required fields: name, email, slot_id" }, 400);
  }

  // Validate slot
  const { data: slot, error: slotErr } = await supabase
    .from("event_slots")
    .select("id, event_id, capacity, registered_count")
    .eq("id", slot_id)
    .single();
  if (slotErr || !slot) return json({ success: false, error: "Slot not found" }, 404);
  if (slot.registered_count >= slot.capacity) {
    return json({ success: false, error: "Slot is full" }, 409);
  }

  const affiliate_code = body.ref || refQuery || null;
  const lead = await findOrCreateLead(supabase, {
    name,
    email,
    phone,
    affiliate_code,
    source_form: "preston:event-registration",
    notes: `Registrace na event (${body.attendance_type || "alone"})${
      body.invitation_number ? `, pozvánka: ${body.invitation_number}` : ""
    }`,
  });

  // Set current_event_id
  await supabase.from("leads").update({ current_event_id: slot.event_id }).eq("id", lead.id);

  // Resolve referrer
  let referrer_id: string | null = null;
  if (affiliate_code) {
    const { data: ref } = await supabase
      .from("profiles")
      .select("id")
      .eq("affiliate_code", affiliate_code)
      .maybeSingle();
    referrer_id = (ref?.id as string) || null;
  }

  const { data: reg, error: regErr } = await supabase
    .from("event_registrations")
    .insert({ lead_id: lead.id, slot_id, referrer_id })
    .select("id")
    .single();
  if (regErr) return json({ success: false, error: regErr.message }, 400);

  return json({
    success: true,
    message: "Registration successful",
    registration_id: reg.id,
    lead_id: lead.id,
    invitation_number: body.invitation_number || null,
    attendance_type: body.attendance_type || "alone",
  });
}

async function handleQuestionnaire(supabase: ReturnType<typeof createClient>, body: any) {
  const { email, name, phone, lead_id } = body;
  if (!email && !lead_id) {
    return json({ success: false, error: "email or lead_id is required" }, 400);
  }

  let resolvedLeadId = lead_id;
  if (!resolvedLeadId) {
    const lead = await findOrCreateLead(supabase, {
      name: name || email,
      email,
      phone,
      source_form: "preston:questionnaire",
    });
    resolvedLeadId = lead.id;
  }

  // Detect new vs legacy format
  const isNew = body.primaryGoal !== undefined || body.budgetRange !== undefined;

  let qData: Record<string, any> = { lead_id: resolvedLeadId };

  if (isNew) {
    const budget = mapBudgetRange(body.budgetRange);
    qData = {
      ...qData,
      experience_level: body.experience || null,
      investment_horizon: mapHorizon(body.investmentHorizon),
      budget_min: budget.min,
      budget_max: budget.max,
      priority: mapGoal(body.primaryGoal),
      financing_type: body.financing || null,
      target_markets: body.markets || null,
      additional_notes: body.timeline || null,
      responses: body,
      completed_at: new Date().toISOString(),
    };
    if (budget.label) {
      await supabase.from("leads").update({ budget: budget.label }).eq("id", resolvedLeadId);
    }
    if (body.preferredContactTime) {
      await supabase
        .from("leads")
        .update({ preferred_contact_time: body.preferredContactTime })
        .eq("id", resolvedLeadId);
    }
  } else {
    qData = {
      ...qData,
      experience_level: body.experience_level || null,
      risk_tolerance: body.risk_tolerance || null,
      investment_horizon: body.investment_horizon || null,
      budget_min: body.budget_min || null,
      budget_max: body.budget_max || null,
      priority: body.priority || null,
      financing_type: body.financing_type || null,
      preferred_property_types: body.preferred_property_types || null,
      target_markets: body.target_markets || null,
      additional_notes: body.additional_notes || null,
      responses: body.responses || body,
      completed_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("investor_questionnaires")
    .upsert(qData, { onConflict: "lead_id" })
    .select("id")
    .single();
  if (error) return json({ success: false, error: error.message }, 400);

  return json({
    success: true,
    message: "Questionnaire created",
    questionnaire_id: data.id,
    lead_id: resolvedLeadId,
  });
}

async function handleGetConsultationSlots(supabase: ReturnType<typeof createClient>, url: URL) {
  const from = url.searchParams.get("from") || new Date().toISOString();
  const to = url.searchParams.get("to");
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);

  let q = supabase
    .from("consultation_slots")
    .select("id, start_time, end_time, capacity, booked_count, obchodnik_id")
    .eq("is_available", true)
    .gte("start_time", from)
    .order("start_time", { ascending: true })
    .limit(limit);
  if (to) q = q.lte("start_time", to);
  const { data: slots, error } = await q;
  if (error) throw error;

  const obchIds = [...new Set((slots || []).map((s: any) => s.obchodnik_id))];
  const { data: profs } = obchIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", obchIds)
    : { data: [] };
  const nameMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]));

  return json(
    (slots || []).map((s: any) => ({
      id: s.id,
      start_time: s.start_time,
      end_time: s.end_time,
      available_spots: Math.max(0, s.capacity - s.booked_count),
      obchodnik_name: nameMap.get(s.obchodnik_id) || null,
    })),
  );
}

async function handleConsultationBooking(supabase: ReturnType<typeof createClient>, body: any) {
  const { name, email, phone, slot_id, requested_time, investor_notes } = body;
  if (!name || !email) return json({ success: false, error: "name and email are required" }, 400);
  if (!slot_id && !requested_time) {
    return json({ success: false, error: "slot_id or requested_time is required" }, 400);
  }

  const lead = await findOrCreateLead(supabase, {
    name,
    email,
    phone,
    source_form: "preston:consultation",
    notes: investor_notes || null,
  });

  let assignedObch: string | null = null;
  if (slot_id) {
    const { data: s } = await supabase
      .from("consultation_slots")
      .select("obchodnik_id")
      .eq("id", slot_id)
      .single();
    assignedObch = (s?.obchodnik_id as string) || null;
  }

  const { data: booking, error } = await supabase
    .from("consultation_bookings")
    .insert({
      lead_id: lead.id,
      slot_id: slot_id || null,
      requested_time: requested_time || null,
      investor_notes: investor_notes || null,
      assigned_obchodnik_id: assignedObch,
      status: slot_id ? "confirmed" : "requested",
    })
    .select("id, status")
    .single();
  if (error) return json({ success: false, error: error.message }, 400);

  return json({
    success: true,
    message: "Consultation booked successfully",
    booking_id: booking.id,
    lead_id: lead.id,
    status: booking.status,
    scheduled_time: requested_time || null,
  });
}

async function handleCreateLead(
  supabase: ReturnType<typeof createClient>,
  body: any,
  refQuery: string | null,
) {
  const { name, email, phone } = body;
  if (!name || !email) return json({ success: false, error: "name and email are required" }, 400);
  const lead = await findOrCreateLead(supabase, {
    name,
    email,
    phone,
    affiliate_code: body.ref || refQuery || null,
    source_form: body.source || "prestondevelopment.eu",
    notes: body.notes || null,
    utm_source: body.utm_source,
    utm_medium: body.utm_medium,
    utm_campaign: body.utm_campaign,
  });
  return json({ success: true, lead_id: lead.id, message: lead.created ? "Lead created" : "Lead exists" });
}

async function handleGetProperties(supabase: ReturnType<typeof createClient>, url: URL) {
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
  const offset = Number(url.searchParams.get("offset") || 0);
  const featured = url.searchParams.get("featured");
  const areaId = url.searchParams.get("area_id");
  const developerId = url.searchParams.get("developer_id");
  const propertyType = url.searchParams.get("property_type");
  const minPrice = url.searchParams.get("min_price");
  const maxPrice = url.searchParams.get("max_price");

  let q = supabase
    .from("properties")
    .select(
      "id, name, slug, description, type, price_from, hero_image_url, area_id, developer_id, areas(id, name), developers(id, name)",
      { count: "exact" },
    )
    .range(offset, offset + limit - 1);

  if (featured === "true") q = q.eq("is_featured", true);
  if (areaId) q = q.eq("area_id", areaId);
  if (developerId) q = q.eq("developer_id", developerId);
  if (propertyType) q = q.eq("type", propertyType);
  if (minPrice) q = q.gte("price_from", Number(minPrice));
  if (maxPrice) q = q.lte("price_from", Number(maxPrice));

  const { data, error, count } = await q;
  if (error) throw error;

  return json({
    data: (data || []).map((p: any) => ({
      ...p,
      price_formatted: p.price_from ? `from ${Number(p.price_from).toLocaleString()} AED` : null,
    })),
    meta: { total: count || 0, limit, offset },
  });
}

async function handleGetPropertyBySlug(supabase: ReturnType<typeof createClient>, slug: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*, areas(*), developers(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return json({ error: "Property not found" }, 404);
  return json({
    ...data,
    price_formatted: data.price_from ? `from ${Number(data.price_from).toLocaleString()} AED` : null,
  });
}

async function handleGetAreas(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("areas")
    .select("id, name, city, country, description, image_url")
    .order("name");
  if (error) throw error;
  return json(data || []);
}

async function handleGetDevelopers(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("developers")
    .select("id, name, description, logo_url, website")
    .order("name");
  if (error) throw error;
  return json(data || []);
}

// ---------------- Router ----------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // API key auth
  const apiKey = req.headers.get("x-api-key");
  const validKey = Deno.env.get("PRESTON_API_KEY");
  if (!apiKey || apiKey !== validKey) {
    return json({ success: false, error: "INVALID_API_KEY", message: "Valid x-api-key header required" }, 401);
  }

  try {
    const url = new URL(req.url);
    // Strip the function prefix to get the relative path
    const path = url.pathname.replace(/^\/functions\/v1\/landing-pages-api/, "").replace(/^\/+/, "/");
    const segments = path.split("/").filter(Boolean);
    const refQuery = url.searchParams.get("ref");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const method = req.method;
    const body = method === "POST" ? await req.json().catch(() => ({})) : {};

    // Routing
    if (segments[0] === "events" && segments.length === 1 && method === "GET")
      return await handleGetEvents(supabase, url);
    if (segments[0] === "events" && segments[2] === "slots" && method === "GET")
      return await handleGetEventSlots(supabase, segments[1]);
    if (segments[0] === "event-registrations" && method === "POST")
      return await handleEventRegistration(supabase, body, refQuery);
    if (segments[0] === "questionnaires" && method === "POST")
      return await handleQuestionnaire(supabase, body);
    if (segments[0] === "consultation-slots" && method === "GET")
      return await handleGetConsultationSlots(supabase, url);
    if (segments[0] === "consultations" && method === "POST")
      return await handleConsultationBooking(supabase, body);
    if (segments[0] === "leads" && method === "POST")
      return await handleCreateLead(supabase, body, refQuery);
    if (segments[0] === "properties" && segments.length === 1 && method === "GET")
      return await handleGetProperties(supabase, url);
    if (segments[0] === "properties" && segments.length === 2 && method === "GET")
      return await handleGetPropertyBySlug(supabase, segments[1]);
    if (segments[0] === "areas" && method === "GET") return await handleGetAreas(supabase);
    if (segments[0] === "developers" && method === "GET") return await handleGetDevelopers(supabase);

    return json({ success: false, error: "NOT_FOUND", message: `No route for ${method} /${segments.join("/")}` }, 404);
  } catch (e: unknown) {
    console.error("landing-pages-api error:", e);
    return json(
      { success: false, error: "INTERNAL_ERROR", message: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});
