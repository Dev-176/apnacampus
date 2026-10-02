-- Migration: 20261001000010_realtime_diagnostics_part2.sql
-- Description: Helper functions for checking grants and policy evaluation as a specific user

CREATE OR REPLACE FUNCTION public.check_grants()
RETURNS TABLE (
  fn_priv BOOLEAN,
  hidden_priv BOOLEAN,
  messages_priv BOOLEAN,
  participants_priv BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    has_function_privilege('authenticated', 'public.is_conversation_participant(uuid,uuid)', 'execute') AS fn_priv,
    has_table_privilege('authenticated', 'public.hidden_messages', 'select') AS hidden_priv,
    has_table_privilege('authenticated', 'public.messages', 'select') AS messages_priv,
    has_table_privilege('authenticated', 'public.conversation_participants', 'select') AS participants_priv;
$$;

GRANT EXECUTE ON FUNCTION public.check_grants() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.test_policy_as_user(p_user_id UUID, p_msg_id UUID)
RETURNS TABLE (
  found_id UUID,
  msg_body TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Simulate authenticated user session with request.jwt.claims
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id::text, 'role', 'authenticated')::text, true);
  
  RETURN QUERY
  SELECT m.id, m.body
  FROM public.messages m
  WHERE m.id = p_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_policy_as_user(UUID, UUID) TO authenticated, anon;
