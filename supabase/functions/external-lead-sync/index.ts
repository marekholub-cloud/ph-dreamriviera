import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface LeadHistory {
  action: string;
  details?: string;
  timestamp: string;
  progress_step?: string;
}

interface IncomingLead {
  source_lead_id: string;
  source_domain: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  status?: string;
  budget_min?: number;
  budget_max?: number;
  investment_horizon?: string;
  investment_strategy?: string;
  preferred_property_types?: string[];
  experience_level?: string;
  financing_type?: string;
  notes?: string;
  warmth_level?: number;
  lead_score?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  history?: LeadHistory[];
}

interface SyncRequest {
  mode: 'full_sync' | 'incremental';
  leads: IncomingLead[];
}

// Map external status to internal status
function mapStatus(externalStatus?: string): string {
  const statusMap: Record<string, string> = {
    'new': 'new',
    'contacted': 'contacted',
    'qualified': 'qualified',
    'negotiation': 'qualified',
    'won': 'closed_won',
    'lost': 'closed_lost',
    'inactive': 'closed_lost',
  };
  return statusMap[externalStatus || 'new'] || 'new';
}

// Map external investment horizon to internal format
function mapInvestmentHorizon(external?: string): string | null {
  if (!external) return null;
  const horizonMap: Record<string, string> = {
    '0-3 months': 'do 3 měsíců',
    '3-6 months': '3-6 měsíců',
    '6-12 months': '6-12 měsíců',
    '12+ months': 'více než rok',
  };
  return horizonMap[external] || external;
}

// Map external investment strategy to internal format
function mapInvestmentStrategy(external?: string): string | null {
  if (!external) return null;
  const strategyMap: Record<string, string> = {
    'rental_income': 'pasivní příjem',
    'capital_growth': 'růst kapitálu',
    'personal_use': 'osobní užití',
    'mixed': 'kombinace',
  };
  return strategyMap[external] || external;
}

// Map external property types to internal format
function mapPropertyTypes(external?: string[]): string[] | null {
  if (!external || external.length === 0) return null;
  const typeMap: Record<string, string> = {
    'apartment': 'byt',
    'villa': 'vila',
    'penthouse': 'penthouse',
    'studio': 'studio',
    'townhouse': 'townhouse',
  };
  return external.map(t => typeMap[t] || t);
}

// Map progress step to interaction type
function mapProgressStepToInteraction(progressStep?: string): string {
  const stepMap: Record<string, string> = {
    'new_lead': 'lead_created',
    'contacted': 'contact_attempt',
    'meeting_scheduled': 'meeting_scheduled',
    'meeting_done': 'meeting_completed',
    'offer_sent': 'offer_sent',
    'negotiation': 'negotiation',
    'documents': 'documents_signed',
    'payment': 'payment_received',
    'closed_won': 'deal_closed',
    'closed_lost': 'deal_lost',
  };
  return stepMap[progressStep || ''] || 'note';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const validApiKey = Deno.env.get('DUBAJREALITY_API_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'MISSING_API_KEY', message: 'API key is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (apiKey !== validApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_API_KEY', message: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: SyncRequest = await req.json();

    if (!body.leads || !Array.isArray(body.leads)) {
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_REQUEST', message: 'Leads array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.leads.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'TOO_MANY_LEADS', message: 'Maximum 100 leads per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: Array<{ source_lead_id: string; status: string; crm_lead_id?: string; error?: string }> = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const lead of body.leads) {
      try {
        // Validate required fields
        if (!lead.source_lead_id || !lead.source_domain || !lead.first_name || !lead.last_name || !lead.email) {
          results.push({
            source_lead_id: lead.source_lead_id || 'unknown',
            status: 'error',
            error: 'Missing required fields (source_lead_id, source_domain, first_name, last_name, email)',
          });
          errors++;
          continue;
        }

        // Check if lead already exists by email or source_lead_id in notes
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id, notes')
          .or(`email.eq.${lead.email},notes.ilike.%source_id:${lead.source_lead_id}%`)
          .limit(1)
          .single();

        const leadName = `${lead.first_name} ${lead.last_name}`;
        const budgetString = lead.budget_min && lead.budget_max 
          ? `${lead.budget_min.toLocaleString()} - ${lead.budget_max.toLocaleString()} EUR`
          : lead.budget_min 
            ? `od ${lead.budget_min.toLocaleString()} EUR`
            : lead.budget_max 
              ? `do ${lead.budget_max.toLocaleString()} EUR`
              : null;

        // Calculate warmth level (1-100 to 1-10)
        const warmthLevel = lead.warmth_level 
          ? Math.min(Math.max(Math.round(lead.warmth_level / 10), 1), 10)
          : lead.lead_score 
            ? Math.min(Math.max(Math.round(lead.lead_score / 10), 1), 10)
            : 5;

        const leadData = {
          lead_name: leadName,
          email: lead.email,
          phone: lead.phone || lead.whatsapp || null,
          status: mapStatus(lead.status),
          budget: budgetString,
          investment_timeline: mapInvestmentHorizon(lead.investment_horizon),
          investment_goals: mapInvestmentStrategy(lead.investment_strategy),
          warmth_level: warmthLevel,
          lead_type: 'external',
          source_form: `${lead.source_domain}:${lead.source_lead_id}`,
          notes: `Synchronizováno z ${lead.source_domain}\nsource_id:${lead.source_lead_id}${lead.notes ? '\n\n' + lead.notes : ''}`,
          utm_source: lead.utm_source || null,
          utm_medium: lead.utm_medium || null,
          utm_campaign: lead.utm_campaign || null,
          utm_content: lead.utm_content || null,
          utm_term: lead.utm_term || null,
        };

        let crmLeadId: string;

        if (existingLead) {
          // Update existing lead
          const { data: updatedLead, error: updateError } = await supabase
            .from('leads')
            .update({
              ...leadData,
              notes: existingLead.notes 
                ? existingLead.notes + '\n\n--- Aktualizace z ' + lead.source_domain + ' ---\n' + (lead.notes || '')
                : leadData.notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingLead.id)
            .select('id')
            .single();

          if (updateError) throw updateError;
          crmLeadId = updatedLead.id;
          updated++;
          results.push({ source_lead_id: lead.source_lead_id, status: 'updated', crm_lead_id: crmLeadId });
        } else {
          // Create new lead
          const { data: newLead, error: insertError } = await supabase
            .from('leads')
            .insert(leadData)
            .select('id')
            .single();

          if (insertError) throw insertError;
          crmLeadId = newLead.id;
          created++;
          results.push({ source_lead_id: lead.source_lead_id, status: 'created', crm_lead_id: crmLeadId });
        }

        // Create questionnaire if investment data provided
        if (lead.budget_min || lead.budget_max || lead.investment_horizon || lead.preferred_property_types || lead.experience_level || lead.financing_type) {
          const questionnaireData = {
            lead_id: crmLeadId,
            budget_min: lead.budget_min || null,
            budget_max: lead.budget_max || null,
            investment_horizon: mapInvestmentHorizon(lead.investment_horizon),
            preferred_property_types: mapPropertyTypes(lead.preferred_property_types),
            experience_level: lead.experience_level || null,
            financing_type: lead.financing_type || null,
            priority: lead.investment_strategy || null,
          };

          // Upsert questionnaire
          await supabase
            .from('investor_questionnaires')
            .upsert(questionnaireData, { onConflict: 'lead_id' });
        }

        // Import history as interactions
        if (lead.history && lead.history.length > 0) {
          const interactions = lead.history.map(h => ({
            lead_id: crmLeadId,
            interaction_type: mapProgressStepToInteraction(h.progress_step),
            message: `${h.action}${h.details ? ': ' + h.details : ''}`,
            source_page: lead.source_domain,
            created_at: h.timestamp || new Date().toISOString(),
            metadata: { source: lead.source_domain, progress_step: h.progress_step },
          }));

          await supabase.from('lead_interactions').insert(interactions);
        }

      } catch (error: unknown) {
        console.error(`Error processing lead ${lead.source_lead_id}:`, error);
        results.push({
          source_lead_id: lead.source_lead_id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: body.leads.length,
          created,
          updated,
          skipped,
          errors,
        },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in external-lead-sync:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
