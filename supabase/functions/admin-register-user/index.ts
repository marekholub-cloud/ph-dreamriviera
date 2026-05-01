import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterUserRequest {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  roles: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user from the token
    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is an admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .single();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only admins can register users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RegisterUserRequest = await req.json();
    const { email, password, full_name, phone, roles } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating user:', email);

    // Create the user using admin API
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = authData.user.id;
    console.log('User created:', newUserId);

    // Update profile with additional info
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name,
        phone,
      })
      .eq('id', newUserId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Assign roles
    if (roles && roles.length > 0) {
      const roleInserts = roles.map((role) => ({
        user_id: newUserId,
        role,
      }));

      const { error: rolesError } = await supabase
        .from('user_roles')
        .insert(roleInserts);

      if (rolesError) {
        console.error('Error assigning roles:', rolesError);
      } else {
        console.log('Roles assigned:', roles);
      }

      // Generate affiliate code for tipar or obchodnik roles
      if (roles.includes('tipar') || roles.includes('obchodnik')) {
        const { data: newCode } = await supabase.rpc('generate_affiliate_code');
        if (newCode) {
          await supabase
            .from('profiles')
            .update({ affiliate_code: newCode })
            .eq('id', newUserId);
          console.log('Affiliate code generated:', newCode);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          email: authData.user.email,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin register user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
