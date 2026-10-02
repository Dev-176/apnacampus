-- Migration: 20261001000011_realtime_diagnostics_part3.sql
-- Description: Diagnostic functions for replication slot health and publication flags

CREATE OR REPLACE FUNCTION public.check_replication_slots()
RETURNS TABLE (
  slot_name TEXT,
  active BOOLEAN,
  restart_lsn TEXT,
  confirmed_flush_lsn TEXT,
  current_lsn TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    slot_name::TEXT,
    active,
    restart_lsn::TEXT,
    confirmed_flush_lsn::TEXT,
    pg_current_wal_lsn()::TEXT AS current_lsn
  FROM pg_replication_slots;
$$;

GRANT EXECUTE ON FUNCTION public.check_replication_slots() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.check_publication_flags()
RETURNS TABLE (
  pubname TEXT,
  pubinsert BOOLEAN,
  pubupdate BOOLEAN,
  pubdelete BOOLEAN,
  pubtruncate BOOLEAN,
  pubviaroot BOOLEAN,
  messages_relkind TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    p.pubname::TEXT,
    p.pubinsert,
    p.pubupdate,
    p.pubdelete,
    p.pubtruncate,
    p.pubviaroot,
    c.relkind::TEXT AS messages_relkind
  FROM pg_publication p
  LEFT JOIN pg_class c ON c.oid = 'public.messages'::regclass
  WHERE p.pubname = 'supabase_realtime';
$$;

GRANT EXECUTE ON FUNCTION public.check_publication_flags() TO authenticated, anon;
