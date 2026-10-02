-- Migration: 20261001000009_inspect_realtime.sql
-- Description: Read-only inspection functions for publication tables and RLS policies

CREATE OR REPLACE FUNCTION public.inspect_publication_tables()
RETURNS TABLE (
  pubname TEXT,
  schemaname TEXT,
  tablename TEXT,
  relreplident CHAR
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    t.pubname::TEXT,
    t.schemaname::TEXT,
    t.tablename::TEXT,
    c.relreplident
  FROM pg_publication_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = 'public'::regnamespace
  WHERE t.pubname = 'supabase_realtime'
  ORDER BY t.schemaname, t.tablename;
$$;

CREATE OR REPLACE FUNCTION public.inspect_table_replica_identity(p_tablename TEXT)
RETURNS TABLE (
  tablename TEXT,
  relreplident CHAR
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    c.relname::TEXT AS tablename,
    c.relreplident
  FROM pg_class c
  WHERE c.relname = p_tablename AND c.relnamespace = 'public'::regnamespace;
$$;

CREATE OR REPLACE FUNCTION public.inspect_policies(p_table TEXT)
RETURNS TABLE (
  policyname TEXT,
  cmd TEXT,
  qual TEXT,
  with_check TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    p.polname::TEXT AS policyname,
    CASE p.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
      ELSE p.polcmd::TEXT
    END AS cmd,
    pg_get_expr(p.polqual, p.polrelid) AS qual,
    pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  WHERE c.relname = p_table AND c.relnamespace = 'public'::regnamespace;
$$;

REVOKE ALL ON FUNCTION public.inspect_publication_tables() FROM public;
GRANT EXECUTE ON FUNCTION public.inspect_publication_tables() TO authenticated, anon;

REVOKE ALL ON FUNCTION public.inspect_table_replica_identity(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.inspect_table_replica_identity(TEXT) TO authenticated, anon;

REVOKE ALL ON FUNCTION public.inspect_policies(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.inspect_policies(TEXT) TO authenticated, anon;
