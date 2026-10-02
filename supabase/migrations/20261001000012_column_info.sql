-- Migration: 20261001000012_column_info.sql
-- Description: Diagnostic helper to return column data type from information_schema

CREATE OR REPLACE FUNCTION public.check_column_type(p_table TEXT, p_column TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT data_type::TEXT
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = p_table
    AND column_name = p_column;
$$;

GRANT EXECUTE ON FUNCTION public.check_column_type(TEXT, TEXT) TO authenticated, anon;
