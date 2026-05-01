import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Action =
  | { action: 'update_email'; user_id: string; email: string }
  | { action: 'reset_password'; user_id: string; new_password?: string }
  | { action: 'delete_user'; user_id: string }
  | { action: 'set_roles'; user_id: string; roles: string[] };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'Authorization required' }, 401);

    const { data: { user: requester }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !requester) return json({ success: false, error: 'Invalid token' }, 401);

    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requester.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!adminRole) return json({ success: false, error: 'Admin access required' }, 403);

    const body = (await req.json()) as Action;
    if (!body || !body.action || !body.user_id) {
      return json({ success: false, error: 'Missing action or user_id' }, 400);
    }

    // Self-protection for delete
    if (body.action === 'delete_user' && body.user_id === requester.id) {
      return json({ success: false, error: 'Nemůžete smazat svůj vlastní účet.' }, 400);
    }

    switch (body.action) {
      case 'update_email': {
        if (!body.email || !/^\S+@\S+\.\S+$/.test(body.email)) {
          return json({ success: false, error: 'Neplatný e-mail.' }, 400);
        }
        const { error } = await supabase.auth.admin.updateUserById(body.user_id, {
          email: body.email,
          email_confirm: true,
        });
        if (error) return json({ success: false, error: error.message }, 400);
        await supabase.from('profiles').update({ email: body.email }).eq('id', body.user_id);
        return json({ success: true });
      }

      case 'reset_password': {
        // If a new password is provided, set it directly; otherwise send reset link
        if (body.new_password) {
          if (body.new_password.length < 6) {
            return json({ success: false, error: 'Heslo musí mít alespoň 6 znaků.' }, 400);
          }
          const { error } = await supabase.auth.admin.updateUserById(body.user_id, {
            password: body.new_password,
          });
          if (error) return json({ success: false, error: error.message }, 400);
          return json({ success: true, mode: 'set' });
        } else {
          const { data: target } = await supabase.auth.admin.getUserById(body.user_id);
          if (!target?.user?.email) {
            return json({ success: false, error: 'Uživatel nemá e-mail.' }, 400);
          }
          const { error } = await supabase.auth.resetPasswordForEmail(target.user.email);
          if (error) return json({ success: false, error: error.message }, 400);
          return json({ success: true, mode: 'email' });
        }
      }

      case 'delete_user': {
        const { error } = await supabase.auth.admin.deleteUser(body.user_id);
        if (error) return json({ success: false, error: error.message }, 400);
        return json({ success: true });
      }

      case 'set_roles': {
        const allowed = ['admin', 'senior_obchodnik', 'obchodnik', 'tipar', 'influencer_coordinator', 'host', 'user'];
        const roles = (body.roles || []).filter((r) => allowed.includes(r));
        // Replace roles atomically
        await supabase.from('user_roles').delete().eq('user_id', body.user_id);
        if (roles.length) {
          const { error } = await supabase
            .from('user_roles')
            .insert(roles.map((role) => ({ user_id: body.user_id, role })));
          if (error) return json({ success: false, error: error.message }, 400);
        }
        return json({ success: true });
      }

      default:
        return json({ success: false, error: 'Unknown action' }, 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('admin-manage-user error', msg);
    return json({ success: false, error: msg }, 500);
  }
});
