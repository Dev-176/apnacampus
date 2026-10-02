-- ==============================================================================
-- Migration: 20261001000004_phase4_chat.sql
-- Description: Phase 4 Real-time 1-on-1 Chat, Messages, RLS & Account Cleanup
-- ==============================================================================

-- 1. Helper function: delete_current_user (for self-cleanup in tests & DPDP compliance)
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM auth.users WHERE id = v_user_id;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;

-- 2. Update respond_request to support 'block'
CREATE OR REPLACE FUNCTION public.respond_request(
  p_request_id UUID,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_receiver_id UUID;
  v_status public.connection_status;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT receiver_id, status
  INTO v_receiver_id, v_status
  FROM public.connections
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection request not found';
  END IF;

  IF v_receiver_id != v_user_id THEN
    RAISE EXCEPTION 'Only the receiver can accept or reject this connection request';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Connection request is no longer pending';
  END IF;

  IF p_action = 'accept' THEN
    UPDATE public.connections
    SET status = 'accepted',
        responded_at = now(),
        updated_at = now()
    WHERE id = p_request_id;
    RETURN TRUE;
  ELSIF p_action = 'reject' THEN
    UPDATE public.connections
    SET status = 'rejected',
        responded_at = now(),
        updated_at = now()
    WHERE id = p_request_id;
    RETURN TRUE;
  ELSIF p_action = 'block' THEN
    UPDATE public.connections
    SET status = 'blocked',
        responded_at = now(),
        updated_at = now()
    WHERE id = p_request_id;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Invalid response action. Expected accept, reject, or block';
  END IF;
END;
$$;

-- 3. Stored Procedure: block_user (bi-directional blocking)
CREATE OR REPLACE FUNCTION public.block_user(
  p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_existing_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.connections
  WHERE (sender_id = LEAST(v_user_id, p_target_user_id) AND receiver_id = GREATEST(v_user_id, p_target_user_id))
     OR (sender_id = GREATEST(v_user_id, p_target_user_id) AND receiver_id = LEAST(v_user_id, p_target_user_id));

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.connections
    SET status = 'blocked',
        updated_at = now(),
        responded_at = now()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.connections (sender_id, receiver_id, status)
    VALUES (v_user_id, p_target_user_id, 'blocked');
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(UUID) TO authenticated;

-- ==============================================================================
-- 4. CONVERSATIONS & PARTICIPANTS TABLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID UNIQUE NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON public.conversation_participants(conversation_id);

-- Trigger to automatically create conversation when connection is accepted
CREATE OR REPLACE FUNCTION public.handle_connection_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  IF new.status = 'accepted' AND (old.status IS NULL OR old.status IS DISTINCT FROM 'accepted') THEN
    SELECT id INTO v_conv_id FROM public.conversations WHERE connection_id = new.id;
    IF v_conv_id IS NULL THEN
      INSERT INTO public.conversations (connection_id)
      VALUES (new.id)
      RETURNING id INTO v_conv_id;

      INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES
        (v_conv_id, new.sender_id),
        (v_conv_id, new.receiver_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_connection_accepted ON public.connections;
CREATE TRIGGER trg_connection_accepted
  AFTER INSERT OR UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_connection_accepted();

-- Backfill any existing accepted connections
DO $$
DECLARE
  r RECORD;
  v_cid UUID;
BEGIN
  FOR r IN SELECT id, sender_id, receiver_id FROM public.connections WHERE status = 'accepted' LOOP
    SELECT id INTO v_cid FROM public.conversations WHERE connection_id = r.id;
    IF v_cid IS NULL THEN
      INSERT INTO public.conversations (connection_id)
      VALUES (r.id)
      RETURNING id INTO v_cid;

      INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (v_cid, r.sender_id), (v_cid, r.receiver_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- ==============================================================================
-- 5. MESSAGES & HIDDEN_MESSAGES TABLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
  client_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT body_length_check CHECK (char_length(TRIM(body)) >= 1 AND char_length(body) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_conv_client_id ON public.messages(conversation_id, client_id);

CREATE TABLE IF NOT EXISTS public.hidden_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hidden_messages_user ON public.hidden_messages(user_id, message_id);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS: only participants can SELECT
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

-- Conversation Participants RLS: participants can view fellow participants
DROP POLICY IF EXISTS "Participants can view conversation participants" ON public.conversation_participants;
CREATE POLICY "Participants can view conversation participants"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Messages RLS: participants can view messages that are not hidden for them
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.hidden_messages hm
      WHERE hm.message_id = messages.id
        AND hm.user_id = auth.uid()
    )
  );

-- Hidden Messages RLS: user manages only their own hidden message records
DROP POLICY IF EXISTS "Users can manage own hidden messages" ON public.hidden_messages;
CREATE POLICY "Users can manage own hidden messages"
  ON public.hidden_messages FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Revoke direct mutations on conversations, participants, and messages
REVOKE INSERT, UPDATE, DELETE ON public.conversations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.conversation_participants FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.messages FROM anon, authenticated;

-- ==============================================================================
-- 7. CHAT RPCS (SEND_MESSAGE, DELETE_MESSAGE, MARK_READ, LIST_CONVERSATIONS)
-- ==============================================================================

-- 7a. send_message RPC
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_body TEXT,
  p_client_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_sender_id UUID;
  v_conn_status public.connection_status;
  v_recent_msg_count INT;
  v_existing_msg_id UUID;
  v_new_msg_id UUID;
  v_trimmed_body TEXT;
BEGIN
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 1. Validate participant
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = v_sender_id
  ) THEN
    RAISE EXCEPTION 'You are not a participant in this conversation';
  END IF;

  -- 2. Validate connection is still active and accepted (not rejected or blocked)
  SELECT c.status INTO v_conn_status
  FROM public.conversations conv
  JOIN public.connections c ON c.id = conv.connection_id
  WHERE conv.id = p_conversation_id;

  IF v_conn_status IS NULL OR v_conn_status != 'accepted' THEN
    RAISE EXCEPTION 'Cannot send message: connection is no longer active or accepted';
  END IF;

  -- 3. Validate body length (1-2000)
  v_trimmed_body := TRIM(p_body);
  IF char_length(v_trimmed_body) < 1 OR char_length(p_body) > 2000 THEN
    RAISE EXCEPTION 'Message body must be between 1 and 2000 characters';
  END IF;

  -- 4. Rate limiting: max 30 messages per minute
  SELECT COUNT(*) INTO v_recent_msg_count
  FROM public.messages
  WHERE sender_id = v_sender_id
    AND created_at >= (now() - interval '1 minute');

  IF v_recent_msg_count >= 30 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 30 messages per minute';
  END IF;

  -- 5. Deduplication by client_id
  SELECT id INTO v_existing_msg_id
  FROM public.messages
  WHERE conversation_id = p_conversation_id
    AND client_id = p_client_id;

  IF v_existing_msg_id IS NOT NULL THEN
    RETURN v_existing_msg_id;
  END IF;

  -- 6. Insert message
  INSERT INTO public.messages (conversation_id, sender_id, body, client_id)
  VALUES (p_conversation_id, v_sender_id, v_trimmed_body, p_client_id)
  RETURNING id INTO v_new_msg_id;

  -- 7. Update conversation metadata
  UPDATE public.conversations
  SET last_message_at = now(),
      last_message_preview = SUBSTRING(v_trimmed_body FROM 1 FOR 100),
      updated_at = now()
  WHERE id = p_conversation_id;

  RETURN v_new_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT, UUID) TO authenticated;

-- 7b. delete_message RPC
CREATE OR REPLACE FUNCTION public.delete_message(
  p_message_id UUID,
  p_delete_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_sender_id UUID;
  v_created_at TIMESTAMPTZ;
  v_conv_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT conversation_id, sender_id, created_at
  INTO v_conv_id, v_sender_id, v_created_at
  FROM public.messages
  WHERE id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Ensure user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = v_conv_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_delete_type = 'for_me' THEN
    INSERT INTO public.hidden_messages (message_id, user_id)
    VALUES (p_message_id, v_user_id)
    ON CONFLICT DO NOTHING;
    RETURN TRUE;
  ELSIF p_delete_type = 'for_everyone' THEN
    IF v_sender_id != v_user_id THEN
      RAISE EXCEPTION 'You can only delete your own messages for everyone';
    END IF;

    IF v_created_at < (now() - interval '10 minutes') THEN
      RAISE EXCEPTION 'Messages can only be deleted for everyone within 10 minutes of sending';
    END IF;

    UPDATE public.messages
    SET deleted_at = now(),
        body = 'This message was deleted'
    WHERE id = p_message_id;

    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Invalid delete type. Expected for_me or for_everyone';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_message(UUID, TEXT) TO authenticated;

-- 7c. mark_conversation_read RPC
CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_read_receipts_enabled BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update participant last read timestamp
  UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id;

  -- Check if user has read receipts enabled
  SELECT COALESCE(read_receipts_enabled, true) INTO v_read_receipts_enabled
  FROM public.user_settings
  WHERE user_id = v_user_id;

  -- If user enables read receipts, update read_at on messages received from peer
  IF v_read_receipts_enabled THEN
    UPDATE public.messages
    SET read_at = now()
    WHERE conversation_id = p_conversation_id
      AND sender_id != v_user_id
      AND read_at IS NULL;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;

-- 7d. list_conversations RPC
CREATE OR REPLACE FUNCTION public.list_conversations()
RETURNS TABLE (
  conversation_id UUID,
  other_user_id UUID,
  other_full_name TEXT,
  other_username TEXT,
  other_avatar_url TEXT,
  other_college_name TEXT,
  other_branch_name TEXT,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INT,
  is_connection_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    conv.id AS conversation_id,
    other_p.id AS other_user_id,
    other_p.full_name AS other_full_name,
    other_p.username AS other_username,
    other_p.avatar_url AS other_avatar_url,
    col.name AS other_college_name,
    br.name AS other_branch_name,
    conv.last_message_preview,
    conv.last_message_at,
    (
      SELECT COUNT(*)::INT
      FROM public.messages m
      WHERE m.conversation_id = conv.id
        AND m.sender_id != v_user_id
        AND m.created_at > my_cp.last_read_at
        AND m.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.hidden_messages hm
          WHERE hm.message_id = m.id AND hm.user_id = v_user_id
        )
    ) AS unread_count,
    (conn.status = 'accepted') AS is_connection_active
  FROM public.conversations conv
  JOIN public.conversation_participants my_cp
    ON my_cp.conversation_id = conv.id AND my_cp.user_id = v_user_id
  JOIN public.conversation_participants other_cp
    ON other_cp.conversation_id = conv.id AND other_cp.user_id != v_user_id
  JOIN public.profiles other_p
    ON other_p.id = other_cp.user_id
  JOIN public.connections conn
    ON conn.id = conv.connection_id
  LEFT JOIN public.colleges col ON col.id = other_p.college_id
  LEFT JOIN public.branches br ON br.id = other_p.branch_id
  WHERE other_p.is_active = true
    AND other_p.is_suspended = false
    AND other_p.is_banned = false
  ORDER BY COALESCE(conv.last_message_at, conv.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_conversations() TO authenticated;

-- 7e. get_or_create_conversation_for_connection RPC
CREATE OR REPLACE FUNCTION public.get_or_create_conversation_for_connection(
  p_connection_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_conv_id UUID;
  v_sender_id UUID;
  v_receiver_id UUID;
  v_status public.connection_status;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT sender_id, receiver_id, status
  INTO v_sender_id, v_receiver_id, v_status
  FROM public.connections
  WHERE id = p_connection_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;

  IF v_user_id != v_sender_id AND v_user_id != v_receiver_id THEN
    RAISE EXCEPTION 'You are not a member of this connection';
  END IF;

  IF v_status != 'accepted' THEN
    RAISE EXCEPTION 'Cannot open chat: connection is not accepted';
  END IF;

  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE connection_id = p_connection_id;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (connection_id)
    VALUES (p_connection_id)
    RETURNING id INTO v_conv_id;

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conv_id, v_sender_id), (v_conv_id, v_receiver_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation_for_connection(UUID) TO authenticated;

-- ==============================================================================
-- 8. REALTIME REPLICATION ENABLEMENT
-- ==============================================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END;
$$;
