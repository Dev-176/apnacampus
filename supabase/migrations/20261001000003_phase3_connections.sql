-- ApnaCampus Phase 3 Migration: Connections Table, Constraints, RLS, and RPCs
-- Migration: 20261001000003_phase3_connections.sql

-- ==============================================================================
-- 1. ENUM & TABLE DEFINITION
-- ==============================================================================

DO $$ BEGIN
  CREATE TYPE public.connection_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.connection_status NOT NULL DEFAULT 'pending',
  intro_message TEXT CHECK (intro_message IS NULL OR char_length(intro_message) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT check_no_self_connection CHECK (sender_id != receiver_id)
);

-- Exactly one row per pair regardless of direction
CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_pair ON public.connections (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id)
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_connections_sender ON public.connections (sender_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_receiver ON public.connections (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_rate_limit ON public.connections (sender_id, created_at);

-- ==============================================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Read policy: users can only see rows where they are the sender or receiver
DROP POLICY IF EXISTS "Users can view their own connections" ON public.connections;
CREATE POLICY "Users can view their own connections"
ON public.connections FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Deny direct client writes: all mutations must go through SECURITY DEFINER RPCs
REVOKE INSERT, UPDATE, DELETE ON public.connections FROM public, anon, authenticated;
GRANT SELECT ON public.connections TO authenticated;

-- ==============================================================================
-- 3. STORED PROCEDURE: send_request
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.send_request(
  p_receiver_id UUID,
  p_intro_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_sender_id UUID;
  v_trimmed_intro TEXT;
  v_existing_id UUID;
  v_existing_sender UUID;
  v_existing_status public.connection_status;
  v_existing_responded_at TIMESTAMPTZ;
  v_daily_count INT;
  v_identical_count INT;
  v_allow_from TEXT;
  v_new_request_id UUID;
BEGIN
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 1. No self-connection
  IF v_sender_id = p_receiver_id THEN
    RAISE EXCEPTION 'Cannot send connection request to yourself';
  END IF;

  -- 2. Validate receiver exists and is discoverable/active
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_receiver_id
      AND is_active = true
      AND is_suspended = false
      AND is_banned = false
  ) THEN
    RAISE EXCEPTION 'Recipient student profile not found or inactive';
  END IF;

  -- Clean intro message
  v_trimmed_intro := NULLIF(TRIM(p_intro_message), '');
  IF v_trimmed_intro IS NOT NULL AND char_length(v_trimmed_intro) > 200 THEN
    RAISE EXCEPTION 'Intro message cannot exceed 200 characters';
  END IF;

  -- 3. Check existing connection between the pair
  SELECT id, sender_id, status, responded_at
  INTO v_existing_id, v_existing_sender, v_existing_status, v_existing_responded_at
  FROM public.connections
  WHERE (sender_id = LEAST(v_sender_id, p_receiver_id) AND receiver_id = GREATEST(v_sender_id, p_receiver_id))
     OR (sender_id = GREATEST(v_sender_id, p_receiver_id) AND receiver_id = LEAST(v_sender_id, p_receiver_id));

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_status = 'blocked' THEN
      RAISE EXCEPTION 'Cannot send connection request to this user';
    ELSIF v_existing_status = 'accepted' THEN
      RAISE EXCEPTION 'You are already connected with this student';
    ELSIF v_existing_status = 'pending' THEN
      IF v_existing_sender = v_sender_id THEN
        RAISE EXCEPTION 'Connection request already sent and pending';
      ELSE
        RAISE EXCEPTION 'This student has already sent you a connection request. Check your incoming requests.';
      END IF;
    ELSIF v_existing_status = 'rejected' THEN
      -- Re-request cooldown of 7 days
      IF v_existing_responded_at IS NOT NULL AND v_existing_responded_at > (now() - interval '7 days') THEN
        RAISE EXCEPTION 'Cannot re-request connection within 7 days of rejection';
      END IF;
    END IF;
  END IF;

  -- 4. Rate limit: max 20 new requests per user per day
  SELECT COUNT(*) INTO v_daily_count
  FROM public.connections
  WHERE sender_id = v_sender_id
    AND created_at >= (now() - interval '24 hours');

  IF v_daily_count >= 20 THEN
    RAISE EXCEPTION 'Daily connection request limit reached (max 20 per day)';
  END IF;

  -- 5. Spam prevention: reject identical intro message sent repeatedly (flag after 3 identical)
  IF v_trimmed_intro IS NOT NULL THEN
    SELECT COUNT(*) INTO v_identical_count
    FROM public.connections
    WHERE sender_id = v_sender_id
      AND intro_message = v_trimmed_intro;

    IF v_identical_count >= 3 THEN
      RAISE EXCEPTION 'Intro message flagged as repetitive spam. Please personalize your message.';
    END IF;
  END IF;

  -- 6. Respect receiver's "who can send me requests" setting from user_settings
  SELECT allow_connection_requests_from INTO v_allow_from
  FROM public.user_settings
  WHERE user_id = p_receiver_id;

  IF v_allow_from = 'same_college' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles s, public.profiles r
      WHERE s.id = v_sender_id AND r.id = p_receiver_id
        AND s.college_id IS NOT NULL AND s.college_id = r.college_id
    ) THEN
      RAISE EXCEPTION 'This student only accepts connection requests from the same college';
    END IF;
  ELSIF v_allow_from = 'same_city' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles s, public.profiles r
      WHERE s.id = v_sender_id AND r.id = p_receiver_id
        AND (
          (s.current_city_id IS NOT NULL AND s.current_city_id = r.current_city_id)
          OR (s.home_city_id IS NOT NULL AND s.home_city_id = r.home_city_id)
        )
    ) THEN
      RAISE EXCEPTION 'This student only accepts connection requests from the same city';
    END IF;
  END IF;

  -- 7. Insert or update (if cooldown expired from previous rejection)
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.connections
    SET sender_id = v_sender_id,
        receiver_id = p_receiver_id,
        status = 'pending',
        intro_message = v_trimmed_intro,
        created_at = now(),
        updated_at = now(),
        responded_at = NULL
    WHERE id = v_existing_id
    RETURNING id INTO v_new_request_id;
  ELSE
    INSERT INTO public.connections (sender_id, receiver_id, status, intro_message)
    VALUES (v_sender_id, p_receiver_id, 'pending', v_trimmed_intro)
    RETURNING id INTO v_new_request_id;
  END IF;

  RETURN v_new_request_id;
END;
$$;

-- ==============================================================================
-- 4. STORED PROCEDURE: respond_request
-- ==============================================================================

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
  ELSE
    RAISE EXCEPTION 'Invalid response action. Expected accept or reject';
  END IF;
END;
$$;

-- ==============================================================================
-- 5. STORED PROCEDURE: withdraw_request
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.withdraw_request(
  p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_sender_id UUID;
  v_status public.connection_status;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT sender_id, status
  INTO v_sender_id, v_status
  FROM public.connections
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection request not found';
  END IF;

  IF v_sender_id != v_user_id THEN
    RAISE EXCEPTION 'Only the sender can withdraw this connection request';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Can only withdraw pending connection requests';
  END IF;

  -- Withdrawing a pending request deletes the row
  DELETE FROM public.connections WHERE id = p_request_id;
  RETURN TRUE;
END;
$$;

-- ==============================================================================
-- 6. STORED PROCEDURE: list_requests (Incoming & Outgoing)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.list_requests(
  p_type TEXT
)
RETURNS TABLE (
  request_id UUID,
  intro_message TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  college_name TEXT,
  course_name TEXT,
  branch_name TEXT,
  year_of_study INT,
  home_city_name TEXT,
  current_city_name TEXT
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

  IF p_type = 'incoming' THEN
    RETURN QUERY
    SELECT
      c.id AS request_id,
      c.intro_message,
      c.created_at,
      p.id AS user_id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.bio,
      col.name AS college_name,
      cr.name AS course_name,
      br.name AS branch_name,
      p.year_of_study,
      hc.name AS home_city_name,
      cc.name AS current_city_name
    FROM public.connections c
    JOIN public.profiles p ON p.id = c.sender_id
    LEFT JOIN public.colleges col ON col.id = p.college_id
    LEFT JOIN public.courses cr ON cr.id = p.course_id
    LEFT JOIN public.branches br ON br.id = p.branch_id
    LEFT JOIN public.cities hc ON hc.id = p.home_city_id
    LEFT JOIN public.cities cc ON cc.id = p.current_city_id
    WHERE c.receiver_id = v_user_id
      AND c.status = 'pending'
      AND p.is_active = true
      AND p.is_suspended = false
      AND p.is_banned = false
    ORDER BY c.created_at DESC;

  ELSIF p_type = 'outgoing' THEN
    RETURN QUERY
    SELECT
      c.id AS request_id,
      c.intro_message,
      c.created_at,
      p.id AS user_id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.bio,
      col.name AS college_name,
      cr.name AS course_name,
      br.name AS branch_name,
      p.year_of_study,
      hc.name AS home_city_name,
      cc.name AS current_city_name
    FROM public.connections c
    JOIN public.profiles p ON p.id = c.receiver_id
    LEFT JOIN public.colleges col ON col.id = p.college_id
    LEFT JOIN public.courses cr ON cr.id = p.course_id
    LEFT JOIN public.branches br ON br.id = p.branch_id
    LEFT JOIN public.cities hc ON hc.id = p.home_city_id
    LEFT JOIN public.cities cc ON cc.id = p.current_city_id
    WHERE c.sender_id = v_user_id
      AND c.status = 'pending'
      AND p.is_active = true
      AND p.is_suspended = false
      AND p.is_banned = false
    ORDER BY c.created_at DESC;

  ELSE
    RAISE EXCEPTION 'Invalid type. Expected incoming or outgoing';
  END IF;
END;
$$;

-- ==============================================================================
-- 7. STORED PROCEDURE: list_connections
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.list_connections()
RETURNS TABLE (
  connection_id UUID,
  connected_at TIMESTAMPTZ,
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  college_name TEXT,
  course_name TEXT,
  branch_name TEXT,
  year_of_study INT,
  home_city_name TEXT,
  current_city_name TEXT
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
    c.id AS connection_id,
    COALESCE(c.responded_at, c.updated_at) AS connected_at,
    p.id AS user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.bio,
    col.name AS college_name,
    cr.name AS course_name,
    br.name AS branch_name,
    p.year_of_study,
    hc.name AS home_city_name,
    cc.name AS current_city_name
  FROM public.connections c
  JOIN public.profiles p ON p.id = (CASE WHEN c.sender_id = v_user_id THEN c.receiver_id ELSE c.sender_id END)
  LEFT JOIN public.colleges col ON col.id = p.college_id
  LEFT JOIN public.courses cr ON cr.id = p.course_id
  LEFT JOIN public.branches br ON br.id = p.branch_id
  LEFT JOIN public.cities hc ON hc.id = p.home_city_id
  LEFT JOIN public.cities cc ON cc.id = p.current_city_id
  WHERE (c.sender_id = v_user_id OR c.receiver_id = v_user_id)
    AND c.status = 'accepted'
    AND p.is_active = true
    AND p.is_suspended = false
    AND p.is_banned = false
  ORDER BY c.responded_at DESC NULLS LAST;
END;
$$;

-- ==============================================================================
-- 8. STORED PROCEDURE: get_connection_status (For profile & discovery cards)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_connection_status(
  p_target_user_id UUID
)
RETURNS TABLE (
  status TEXT,
  request_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_row RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 'none'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT id, sender_id, receiver_id, connections.status
  INTO v_row
  FROM public.connections
  WHERE (sender_id = v_user_id AND receiver_id = p_target_user_id)
     OR (sender_id = p_target_user_id AND receiver_id = v_user_id);

  IF v_row.id IS NULL THEN
    RETURN QUERY SELECT 'none'::TEXT, NULL::UUID;
  ELSIF v_row.status = 'accepted' THEN
    RETURN QUERY SELECT 'accepted'::TEXT, v_row.id;
  ELSIF v_row.status = 'pending' THEN
    IF v_row.sender_id = v_user_id THEN
      RETURN QUERY SELECT 'pending_sent'::TEXT, v_row.id;
    ELSE
      RETURN QUERY SELECT 'pending_received'::TEXT, v_row.id;
    END IF;
  ELSIF v_row.status = 'rejected' THEN
    RETURN QUERY SELECT 'rejected'::TEXT, v_row.id;
  ELSIF v_row.status = 'blocked' THEN
    RETURN QUERY SELECT 'blocked'::TEXT, v_row.id;
  ELSE
    RETURN QUERY SELECT 'none'::TEXT, NULL::UUID;
  END IF;
END;
$$;

-- ==============================================================================
-- 9. UPDATE RECOMMEND_STUDENTS (Mutual Connections & Active Connections Exclusion)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.recommend_students(
  p_limit INT DEFAULT 10,
  p_cursor TEXT DEFAULT NULL,
  p_home_city_id UUID DEFAULT NULL,
  p_current_city_id UUID DEFAULT NULL,
  p_college_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_year_of_study INT DEFAULT NULL,
  p_interest TEXT DEFAULT NULL,
  p_skill TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance',
  p_region TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  home_city_id UUID,
  home_city_name TEXT,
  home_city_state TEXT,
  home_city_region TEXT,
  current_city_id UUID,
  current_city_name TEXT,
  current_city_state TEXT,
  current_city_region TEXT,
  college_id UUID,
  college_name TEXT,
  college_short_name TEXT,
  course_id UUID,
  course_name TEXT,
  branch_id UUID,
  branch_name TEXT,
  year_of_study INT,
  interests TEXT[],
  skills_to_teach TEXT[],
  is_verified BOOLEAN,
  is_seed BOOLEAN,
  match_score INT,
  match_reasons TEXT[],
  mutual_connections_count INT,
  cursor_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_me RECORD;
BEGIN
  -- Fetch requesting authenticated user's profile
  SELECT
    p.home_city_id,
    p.current_city_id,
    p.college_id,
    p.course_id,
    p.branch_id,
    p.year_of_study,
    p.interests,
    p.skills_to_teach
  INTO v_me
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN QUERY
  WITH scored_candidates AS (
    SELECT
      p.id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.bio,
      p.home_city_id,
      hc.name AS home_city_name,
      hc.state AS home_city_state,
      hc.region AS home_city_region,
      p.current_city_id,
      cc.name AS current_city_name,
      cc.state AS current_city_state,
      cc.region AS current_city_region,
      p.college_id,
      col.name AS college_name,
      col.short_name AS college_short_name,
      p.course_id,
      cr.name AS course_name,
      p.branch_id,
      br.name AS branch_name,
      p.year_of_study,
      p.interests,
      p.skills_to_teach,
      p.is_verified,
      p.is_seed,
      -- Real mutual connections count
      COALESCE(
        (
          SELECT COUNT(DISTINCT CASE WHEN c1.sender_id = auth.uid() THEN c1.receiver_id ELSE c1.sender_id END)::INT
          FROM public.connections c1
          JOIN public.connections c2 ON (
            CASE WHEN c1.sender_id = auth.uid() THEN c1.receiver_id ELSE c1.sender_id END
            =
            CASE WHEN c2.sender_id = p.id THEN c2.receiver_id ELSE c2.sender_id END
          )
          WHERE (c1.sender_id = auth.uid() OR c1.receiver_id = auth.uid())
            AND (c2.sender_id = p.id OR c2.receiver_id = p.id)
            AND c1.status = 'accepted'
            AND c2.status = 'accepted'
        ),
        0
      )::INT AS mutual_connections_count,
      -- Score calculation
      (
        (CASE WHEN v_me.home_city_id IS NOT NULL AND p.home_city_id = v_me.home_city_id THEN 30 ELSE 0 END) +
        (CASE WHEN v_me.current_city_id IS NOT NULL AND p.current_city_id = v_me.current_city_id THEN 25 ELSE 0 END) +
        (CASE WHEN v_me.college_id IS NOT NULL AND p.college_id = v_me.college_id THEN 20 ELSE 0 END) +
        (CASE WHEN v_me.course_id IS NOT NULL AND p.course_id = v_me.course_id THEN 10 ELSE 0 END) +
        (CASE WHEN v_me.branch_id IS NOT NULL AND p.branch_id = v_me.branch_id THEN 8 ELSE 0 END) +
        (CASE WHEN v_me.year_of_study IS NOT NULL AND p.year_of_study = v_me.year_of_study THEN 5 ELSE 0 END) +
        LEAST(7, COALESCE(cardinality(ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(COALESCE(v_me.interests, '{}')))) * 3, 0)) +
        LEAST(5, COALESCE(cardinality(ARRAY(SELECT unnest(p.skills_to_teach) INTERSECT SELECT unnest(COALESCE(v_me.skills_to_teach, '{}')))) * 2, 0)) +
        LEAST(10, COALESCE(
          (
            SELECT COUNT(DISTINCT CASE WHEN c1.sender_id = auth.uid() THEN c1.receiver_id ELSE c1.sender_id END)::INT * 5
            FROM public.connections c1
            JOIN public.connections c2 ON (
              CASE WHEN c1.sender_id = auth.uid() THEN c1.receiver_id ELSE c1.sender_id END
              =
              CASE WHEN c2.sender_id = p.id THEN c2.receiver_id ELSE c2.sender_id END
            )
            WHERE (c1.sender_id = auth.uid() OR c1.receiver_id = auth.uid())
              AND (c2.sender_id = p.id OR c2.receiver_id = p.id)
              AND c1.status = 'accepted'
              AND c2.status = 'accepted'
          ),
          0
        ))
      )::INT AS match_score,
      -- Match reasons array
      ARRAY_REMOVE(ARRAY[
        CASE WHEN v_me.home_city_id IS NOT NULL AND p.home_city_id = v_me.home_city_id THEN 'Same Hometown' ELSE NULL END,
        CASE WHEN v_me.current_city_id IS NOT NULL AND p.current_city_id = v_me.current_city_id THEN 'Same Campus City' ELSE NULL END,
        CASE WHEN v_me.college_id IS NOT NULL AND p.college_id = v_me.college_id THEN 'Same College' ELSE NULL END,
        CASE WHEN v_me.course_id IS NOT NULL AND p.course_id = v_me.course_id THEN 'Same Course' ELSE NULL END,
        CASE WHEN v_me.branch_id IS NOT NULL AND p.branch_id = v_me.branch_id THEN 'Same Branch' ELSE NULL END,
        CASE WHEN v_me.year_of_study IS NOT NULL AND p.year_of_study = v_me.year_of_study THEN 'Same Year' ELSE NULL END,
        CASE WHEN cardinality(ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(COALESCE(v_me.interests, '{}')))) > 0 THEN 'Shared Interests' ELSE NULL END,
        CASE WHEN cardinality(ARRAY(SELECT unnest(p.skills_to_teach) INTERSECT SELECT unnest(COALESCE(v_me.skills_to_teach, '{}')))) > 0 THEN 'Shared Skills' ELSE NULL END,
        CASE WHEN EXISTS (
          SELECT 1 FROM public.connections c1
          JOIN public.connections c2 ON (
            CASE WHEN c1.sender_id = auth.uid() THEN c1.receiver_id ELSE c1.sender_id END
            =
            CASE WHEN c2.sender_id = p.id THEN c2.receiver_id ELSE c2.sender_id END
          )
          WHERE (c1.sender_id = auth.uid() OR c1.receiver_id = auth.uid())
            AND (c2.sender_id = p.id OR c2.receiver_id = p.id)
            AND c1.status = 'accepted'
            AND c2.status = 'accepted'
        ) THEN 'Mutual Connections' ELSE NULL END
      ], NULL) AS match_reasons
    FROM public.profiles p
    LEFT JOIN public.cities hc ON p.home_city_id = hc.id
    LEFT JOIN public.cities cc ON p.current_city_id = cc.id
    LEFT JOIN public.colleges col ON p.college_id = col.id
    LEFT JOIN public.courses cr ON p.course_id = cr.id
    LEFT JOIN public.branches br ON p.branch_id = br.id
    WHERE
      p.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
      AND p.is_active = true
      AND p.is_suspended = false
      AND p.is_banned = false
      AND p.visibility = 'discoverable'
      -- EXCLUDE pending, accepted, or blocked connections
      AND NOT EXISTS (
        SELECT 1 FROM public.connections conn
        WHERE ((conn.sender_id = auth.uid() AND conn.receiver_id = p.id)
           OR (conn.receiver_id = auth.uid() AND conn.sender_id = p.id))
          AND conn.status IN ('pending', 'accepted', 'blocked')
      )
      -- Dynamic optional filters
      AND (p_home_city_id IS NULL OR p.home_city_id = p_home_city_id)
      AND (p_current_city_id IS NULL OR p.current_city_id = p_current_city_id)
      AND (p_college_id IS NULL OR p.college_id = p_college_id)
      AND (p_course_id IS NULL OR p.course_id = p_course_id)
      AND (p_branch_id IS NULL OR p.branch_id = p_branch_id)
      AND (p_year_of_study IS NULL OR p.year_of_study = p_year_of_study)
      AND (p_interest IS NULL OR p_interest = ANY(p.interests))
      AND (p_skill IS NULL OR p_skill = ANY(p.skills_to_teach))
      AND (p_region IS NULL OR cc.region = p_region)
      AND (
        p_search IS NULL
        OR p.full_name ILIKE '%' || p_search || '%'
        OR p.username ILIKE '%' || p_search || '%'
        OR col.name ILIKE '%' || p_search || '%'
      )
  ),
  ordered_candidates AS (
    SELECT
      sc.*,
      -- Keyset pagination token: sort prefix + zero-padded score + '_' + UUID
      CASE
        WHEN p_sort_by = 'same_hometown' THEN (CASE WHEN v_me.home_city_id IS NOT NULL AND sc.home_city_id = v_me.home_city_id THEN '1_' ELSE '0_' END)
        WHEN p_sort_by = 'same_college' THEN (CASE WHEN v_me.college_id IS NOT NULL AND sc.college_id = v_me.college_id THEN '1_' ELSE '0_' END)
        WHEN p_sort_by = 'same_course' THEN (CASE WHEN v_me.course_id IS NOT NULL AND sc.course_id = v_me.course_id THEN '1_' ELSE '0_' END)
        WHEN p_sort_by = 'same_branch' THEN (CASE WHEN v_me.branch_id IS NOT NULL AND sc.branch_id = v_me.branch_id THEN '1_' ELSE '0_' END)
        WHEN p_sort_by = 'mutual_connections' THEN (CASE WHEN sc.mutual_connections_count > 0 THEN '1_' ELSE '0_' END)
        ELSE ''
      END || LPAD(sc.match_score::TEXT, 4, '0') || '_' || sc.id::TEXT AS cursor_token
    FROM scored_candidates sc
  )
  SELECT
    oc.id,
    oc.full_name,
    oc.username,
    oc.avatar_url,
    oc.bio,
    oc.home_city_id,
    oc.home_city_name,
    oc.home_city_state,
    oc.home_city_region,
    oc.current_city_id,
    oc.current_city_name,
    oc.current_city_state,
    oc.current_city_region,
    oc.college_id,
    oc.college_name,
    oc.college_short_name,
    oc.course_id,
    oc.course_name,
    oc.branch_id,
    oc.branch_name,
    oc.year_of_study,
    oc.interests,
    oc.skills_to_teach,
    oc.is_verified,
    oc.is_seed,
    oc.match_score,
    oc.match_reasons,
    oc.mutual_connections_count,
    oc.cursor_token
  FROM ordered_candidates oc
  WHERE
    p_cursor IS NULL OR oc.cursor_token < p_cursor
  ORDER BY
    oc.cursor_token DESC
  LIMIT p_limit;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.send_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_requests(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_connection_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recommend_students(INT, TEXT, UUID, UUID, UUID, UUID, UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
