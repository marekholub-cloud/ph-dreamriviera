import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Batch size for processing leads (default 10–20 is recommended)
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_PER_PAGE = 10;
const BATCH_DELAY_MS = 100; // Small delay between batches to prevent overload

// External API fetch robustness
const FETCH_TIMEOUT_MS = 12_000;
const MAX_FETCH_RETRIES = 2;

interface ExternalLead {
  source_lead_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status?: string;
  budget_min?: number;
  budget_max?: number;
  investment_horizon?: string;
  investment_strategy?: string;
  preferred_property_types?: string[];
  target_markets?: string[];
  notes?: string;
  warmth_level?: number;
  lead_score?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at?: string;
  updated_at?: string;
  history?: Array<{
    step: string;
    timestamp: string;
    note?: string;
  }>;
}

interface ApiResponse {
  success: boolean;
  leads?: ExternalLead[];
  total?: number;
  page?: number;
  per_page?: number;
  error?: string;
}

// Map external status to internal status
function mapStatus(externalStatus: string | undefined): string {
  const statusMap: Record<string, string> = {
    'new': 'new',
    'contacted': 'contacted',
    'qualified': 'qualified',
    'negotiation': 'qualified',
    'closed_won': 'closed_won',
    'closed_lost': 'closed_lost',
    'nurturing': 'contacted',
  };
  return statusMap[externalStatus?.toLowerCase() || ''] || 'new';
}

// Map external investment horizon
function mapInvestmentHorizon(horizon: string | undefined): string | null {
  const horizonMap: Record<string, string> = {
    'immediate': '0-3 months',
    '0-3_months': '0-3 months',
    '3-6_months': '3-6 months',
    '6-12_months': '6-12 months',
    '12+_months': '12+ months',
    'long_term': '12+ months',
  };
  return horizonMap[horizon?.toLowerCase() || ''] || null;
}

// Map external investment strategy
function mapInvestmentStrategy(strategy: string | undefined): string | null {
  const strategyMap: Record<string, string> = {
    'rental_income': 'rental',
    'rental': 'rental',
    'capital_appreciation': 'appreciation',
    'appreciation': 'appreciation',
    'mixed': 'mixed',
    'personal_use': 'personal',
    'personal': 'personal',
  };
  return strategyMap[strategy?.toLowerCase() || ''] || null;
}

// Map external property types
function mapPropertyTypes(types: string[] | undefined): string[] {
  if (!types || types.length === 0) return [];
  
  const typeMap: Record<string, string> = {
    'apartment': 'Apartment',
    'villa': 'Villa',
    'townhouse': 'Townhouse',
    'penthouse': 'Penthouse',
    'studio': 'Studio',
    'land': 'Land',
    'commercial': 'Commercial',
  };
  
  return types.map(t => typeMap[t.toLowerCase()] || t).filter(Boolean);
}

// Map history step to interaction type
function mapProgressStepToInteraction(step: string): string {
  const stepMap: Record<string, string> = {
    'form_submitted': 'form_submission',
    'email_sent': 'email_sent',
    'email_opened': 'email_opened',
    'call_made': 'call',
    'meeting_scheduled': 'meeting_scheduled',
    'meeting_completed': 'meeting_completed',
    'proposal_sent': 'proposal_sent',
    'contract_signed': 'contract_signed',
    'brochure_downloaded': 'brochure_download',
    'property_viewed': 'property_view',
  };
  return stepMap[step.toLowerCase()] || 'note';
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? parseInt(value, 10)
      : NaN;

  if (!Number.isFinite(parsed)) return fallback;
  const n = Math.trunc(parsed);
  return Math.min(max, Math.max(min, n));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type FetchJsonResult =
  | { ok: true; status: number; json: unknown }
  | { ok: false; status: number; text: string };

async function fetchJsonWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  retries: number,
): Promise<FetchJsonResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, status: res.status, text };
      }

      const json = await res.json();
      return { ok: true, status: res.status, json };
    } catch (err) {
      lastError = err;
      console.error(`External API fetch attempt ${attempt + 1}/${retries + 1} failed:`, err);

      if (attempt < retries) {
        await sleep(300 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

// Process a single lead
async function processLead(
  supabase: SupabaseClient,
  externalLead: ExternalLead
): Promise<{ source_lead_id: string; status: string; error?: string }> {
  try {
    // Check if lead already exists by email or source_lead_id in notes
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id, notes')
      .or(`email.eq.${externalLead.email},notes.ilike.%source_lead_id:${externalLead.source_lead_id}%`)
      .limit(1);

    const existingLead = existingLeads?.[0] as { id: string; notes: string } | undefined;
    const fullName = `${externalLead.first_name} ${externalLead.last_name}`.trim();

    // Prepare lead data
    const leadData = {
      lead_name: fullName,
      email: externalLead.email,
      phone: externalLead.phone || null,
      status: mapStatus(externalLead.status),
      budget: externalLead.budget_min && externalLead.budget_max 
        ? `${externalLead.budget_min}-${externalLead.budget_max}` 
        : externalLead.budget_min?.toString() || externalLead.budget_max?.toString() || null,
      warmth_level: Math.min(10, Math.max(1, Math.round((externalLead.warmth_level || 5) / 10))),
      lead_level: externalLead.lead_score ? Math.ceil(externalLead.lead_score / 20) : null,
      notes: externalLead.notes 
        ? `${externalLead.notes}\n\n[source_lead_id:${externalLead.source_lead_id}]`
        : `[source_lead_id:${externalLead.source_lead_id}]`,
      source_form: 'dubajreality_sync',
      lead_type: 'external',
      utm_source: externalLead.utm_source || 'dubajreality',
      utm_medium: externalLead.utm_medium || null,
      utm_campaign: externalLead.utm_campaign || null,
      updated_at: new Date().toISOString(),
    };

    let leadId: string;
    let resultStatus: string;

    if (existingLead) {
      // Update existing lead
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update(leadData as Record<string, unknown>)
        .eq('id', existingLead.id)
        .select('id')
        .single();

      if (updateError) throw updateError;
      leadId = (updatedLead as { id: string }).id;
      resultStatus = 'updated';
    } else {
      // Create new lead
      const { data: newLead, error: insertError } = await supabase
        .from('leads')
        .insert({
          ...leadData,
          created_at: externalLead.created_at || new Date().toISOString(),
        } as Record<string, unknown>)
        .select('id')
        .single();

      if (insertError) throw insertError;
      leadId = (newLead as { id: string }).id;
      resultStatus = 'created';
    }

    // Upsert investor questionnaire if we have investment data
    if (externalLead.investment_horizon || externalLead.investment_strategy || 
        externalLead.preferred_property_types?.length || externalLead.budget_min) {
      
      const questionnaireData = {
        lead_id: leadId,
        investment_horizon: mapInvestmentHorizon(externalLead.investment_horizon),
        priority: mapInvestmentStrategy(externalLead.investment_strategy),
        preferred_property_types: mapPropertyTypes(externalLead.preferred_property_types),
        target_markets: externalLead.target_markets || ['Dubai'],
        budget_min: externalLead.budget_min || null,
        budget_max: externalLead.budget_max || null,
      };

      await supabase
        .from('investor_questionnaires')
        .upsert(questionnaireData as Record<string, unknown>, { onConflict: 'lead_id' });
    }

    // Import history as interactions (limit to last 5 to reduce DB calls)
    if (externalLead.history && externalLead.history.length > 0) {
      const recentHistory = externalLead.history.slice(-5);
      
      for (const h of recentHistory) {
        const interaction = {
          lead_id: leadId,
          interaction_type: mapProgressStepToInteraction(h.step),
          message: h.note || `Imported: ${h.step}`,
          created_at: h.timestamp,
          source_page: 'dubajreality_sync',
          metadata: { original_step: h.step, imported: true },
        };

        const { data: existing } = await supabase
          .from('lead_interactions')
          .select('id')
          .eq('lead_id', leadId)
          .eq('created_at', interaction.created_at)
          .eq('interaction_type', interaction.interaction_type)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('lead_interactions').insert(interaction as Record<string, unknown>);
        }
      }
    }

    return { source_lead_id: externalLead.source_lead_id, status: resultStatus };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error processing lead ${externalLead.source_lead_id}:`, error);
    return { source_lead_id: externalLead.source_lead_id, status: 'error', error: errorMessage };
  }
}

// Process leads in batches
async function processLeadsInBatches(
  supabase: SupabaseClient,
  leads: ExternalLead[],
  batchSize: number,
): Promise<{
  created: number;
  updated: number;
  errors: number;
  details: Array<{ source_lead_id: string; status: string; error?: string }>;
}> {
  const results = {
    created: 0,
    updated: 0,
    errors: 0,
    details: [] as Array<{ source_lead_id: string; status: string; error?: string }>,
  };

  // Split leads into batches
  const batches: ExternalLead[][] = [];
  for (let i = 0; i < leads.length; i += batchSize) {
    batches.push(leads.slice(i, i + batchSize));
  }

  console.log(`Processing ${leads.length} leads in ${batches.length} batches of ${batchSize}`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} leads)`);

    // Process batch sequentially to avoid overwhelming the database
    for (const lead of batch) {
      const result = await processLead(supabase, lead);
      results.details.push(result);

      if (result.status === 'created') results.created++;
      else if (result.status === 'updated') results.updated++;
      else if (result.status === 'error') results.errors++;
    }

    // Small delay between batches to prevent resource exhaustion
    if (batchIndex < batches.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return results;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiUrl = Deno.env.get('DUBAJREALITY_API_URL');
    const apiKey = Deno.env.get('DUBAJREALITY_API_KEY');
    
    if (!apiUrl) {
      console.error('Missing DUBAJREALITY_API_URL');
      return new Response(
        JSON.stringify({ success: false, error: 'API URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!apiKey) {
      console.error('Missing DUBAJREALITY_API_KEY');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for optional filters
    let filters: Record<string, string> = {};
    let batchSize = DEFAULT_BATCH_SIZE;
    let perPage = DEFAULT_PER_PAGE;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        filters = body.filters || {};

        batchSize = clampInt(body.batch_size, 5, 50, DEFAULT_BATCH_SIZE);
        perPage = clampInt(filters.per_page, 1, 50, DEFAULT_PER_PAGE);
      } catch {
        // No body or invalid JSON, use defaults
      }
    }

    console.log('Starting pull sync from go2dubai.online...');
    console.log('API URL:', apiUrl);
    console.log('Filters:', JSON.stringify(filters));
    console.log('Batch size:', batchSize, 'Per page:', perPage);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch leads from external API with smaller page size
    const queryParams = new URLSearchParams();
    if (filters.since) queryParams.set('updated_since', filters.since);
    if (filters.status) queryParams.set('status', filters.status);
    if (filters.page) queryParams.set('page', filters.page);
    queryParams.set('per_page', String(perPage));

    const fetchUrl = `${apiUrl}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    console.log('Fetching from:', fetchUrl);

    const fetchStartedAt = Date.now();
    let apiData: ApiResponse;

    try {
      const fetchResult = await fetchJsonWithRetry(
        fetchUrl,
        {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        },
        FETCH_TIMEOUT_MS,
        MAX_FETCH_RETRIES,
      );

      if (!fetchResult.ok) {
        console.error('API error:', fetchResult.status, fetchResult.text);
        return new Response(
          JSON.stringify({
            success: false,
            error: `External API error: ${fetchResult.status}`,
            details: fetchResult.text,
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      apiData = fetchResult.json as ApiResponse;
      console.log(`External API fetch OK in ${Date.now() - fetchStartedAt}ms`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout');

      console.error('External API network error:', err);
      return new Response(
        JSON.stringify({
          success: false,
          error: isTimeout ? 'External API request timed out' : 'External API network error',
          details: msg,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!apiData.success || !apiData.leads) {
      console.error('API returned error:', apiData.error);
      return new Response(
        JSON.stringify({ success: false, error: apiData.error || 'No leads returned' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Received ${apiData.leads.length} leads from API`);

    // Process leads in batches
    const results = await processLeadsInBatches(supabase, apiData.leads, batchSize);

    console.log('Sync completed:', {
      total: apiData.leads.length,
      created: results.created,
      updated: results.updated,
      errors: results.errors,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronized ${apiData.leads.length} leads in batches of ${batchSize}`,
        results: {
          total: apiData.leads.length,
          created: results.created,
          updated: results.updated,
          skipped: 0,
          errors: results.errors,
        },
        details: results.details,
        pagination: {
          total: apiData.total,
          page: apiData.page,
          per_page: apiData.per_page,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pull sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
