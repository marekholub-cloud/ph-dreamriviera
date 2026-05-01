// Temporary admin-only bulk import endpoint.
// Reads multiple SQL batches from request body and executes them sequentially
// via the service role using a Postgres function we expose on demand.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(url, key);

    // Auth: require apikey header to equal the function's own service role key
    const apikey = req.headers.get('apikey') || '';
    const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (apikey !== key && auth !== key) {
      console.log('apikey tail:', apikey.slice(-12), 'expected tail:', key.slice(-12));
      return new Response(JSON.stringify({ error: 'forbidden', expectedTail: key.slice(-6) }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { batches } = await req.json() as { batches: string[] };
    if (!Array.isArray(batches) || batches.length === 0) {
      return new Response(JSON.stringify({ error: 'no batches' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Array<{ index: number; ok: boolean; error?: string }> = [];
    for (let i = 0; i < batches.length; i++) {
      const sql = batches[i];
      const { error } = await supabase.rpc('exec_admin_sql', { p_sql: sql });
      if (error) {
        results.push({ index: i, ok: false, error: error.message });
        return new Response(JSON.stringify({ results, stoppedAt: i }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      results.push({ index: i, ok: true });
    }

    return new Response(JSON.stringify({ results, total: batches.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
