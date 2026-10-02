-- ==============================================================================
-- Migration: 20261001000007_fix_chat_rls_recursion.sql
-- Description: Fix infinite recursion in conversation_participants RLS policies
-- ==============================================================================

-- Security definer helper to check conversation participation without RLS recursion
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conv_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conv_id AND user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated;

-- 1. Conversation Participants RLS
DROP POLICY IF EXISTS "Participants can view conversation participants" ON public.conversation_participants;
CREATE POLICY "Participants can view conversation participants"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid())
  );

-- 2. Conversations RLS
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_participant(id, auth.uid())
  );

-- 3. Messages RLS
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.hidden_messages hm
      WHERE hm.message_id = messages.id
        AND hm.user_id = auth.uid()
    )
  );
