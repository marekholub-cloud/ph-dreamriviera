
-- 1) Ensure handle_new_user trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Add 'host' to app_role enum if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'host'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'host';
  END IF;
END$$;
