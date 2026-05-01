INSERT INTO public.user_roles (user_id, role)
VALUES ('6b009b13-abd3-4079-a3e5-5ce1a0afd7c7', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;