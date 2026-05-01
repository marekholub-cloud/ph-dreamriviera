DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'marekholub@me.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User marekholub@me.com not found in auth.users';
  END IF;

  -- Ensure profile row exists
  INSERT INTO public.profiles (id, email)
  VALUES (v_user_id, 'marekholub@me.com')
  ON CONFLICT (id) DO NOTHING;

  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;