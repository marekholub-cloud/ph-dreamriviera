CREATE OR REPLACE FUNCTION public.exec_admin_sql(p_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE p_sql;
END;
$$;

REVOKE ALL ON FUNCTION public.exec_admin_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_admin_sql(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_admin_sql(text) TO service_role;