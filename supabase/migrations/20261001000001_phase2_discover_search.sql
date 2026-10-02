-- ApnaCampus Phase 2 Migration: RLS Status Security Definer, Search Indexes, and Recommend Students RPC
-- Migration: 20261001000001_phase2_discover_search.sql

-- ==============================================================================
-- 1. SECURITY DEFINER: rls_status()
-- Returns relrowsecurity for all tables in the public schema. Callable only by authenticated users.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.rls_status()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    c.relname::TEXT AS table_name,
    c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY c.relname;
$$;

REVOKE ALL ON FUNCTION public.rls_status() FROM public;
GRANT EXECUTE ON FUNCTION public.rls_status() TO authenticated;

-- ==============================================================================
-- 2. EXTENSIONS & INDEXES FOR DISCOVERY & SEARCH
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN indexes for fuzzy student name & username search
CREATE INDEX IF NOT EXISTS idx_profiles_trgm_name ON public.profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_trgm_username ON public.profiles USING gin (username gin_trgm_ops);

-- B-Tree and GIN indexes for discovery filters
CREATE INDEX IF NOT EXISTS idx_profiles_course_id ON public.profiles(course_id);
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_year_of_study ON public.profiles(year_of_study);
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON public.profiles USING gin (interests);
CREATE INDEX IF NOT EXISTS idx_profiles_skills_to_teach ON public.profiles USING gin (skills_to_teach);

-- ==============================================================================
-- 3. MATCHING & RECOMMENDATION ENGINE: recommend_students()
-- ==============================================================================
-- Point Weights:
--   Home city: 30
--   Current city: 25
--   College: 20
--   Course: 10
--   Branch: 8
--   Year: 5
--   Shared interests: up to 7 (e.g. 3 pts per shared interest, capped at 7)
--   Shared skills: up to 5 (e.g. 2 pts per shared skill, capped at 5)
--   Mutual connections: up to 10 (0 until Phase 3)
-- Excludes: self, inactive, suspended, banned, and non-discoverable profiles.
-- Keyset pagination: (p_cursor = score_id composite string).

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
  p_sort_by TEXT DEFAULT 'relevance'
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
        0 -- mutual connections (0 until Phase 3)
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
        CASE WHEN cardinality(ARRAY(SELECT unnest(p.skills_to_teach) INTERSECT SELECT unnest(COALESCE(v_me.skills_to_teach, '{}')))) > 0 THEN 'Shared Skills' ELSE NULL END
      ], NULL) AS match_reasons,
      0::INT AS mutual_connections_count
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
      -- Dynamic optional filters
      AND (p_home_city_id IS NULL OR p.home_city_id = p_home_city_id)
      AND (p_current_city_id IS NULL OR p.current_city_id = p_current_city_id)
      AND (p_college_id IS NULL OR p.college_id = p_college_id)
      AND (p_course_id IS NULL OR p.course_id = p_course_id)
      AND (p_branch_id IS NULL OR p.branch_id = p_branch_id)
      AND (p_year_of_study IS NULL OR p.year_of_study = p_year_of_study)
      AND (p_interest IS NULL OR p_interest = ANY(p.interests))
      AND (p_skill IS NULL OR p_skill = ANY(p.skills_to_teach))
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
      -- Keyset pagination token: 4-digit zero-padded score + '_' + UUID
      LPAD(sc.match_score::TEXT, 4, '0') || '_' || sc.id::TEXT AS cursor_token
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
    CASE WHEN p_sort_by = 'same_hometown' THEN oc.home_city_id = v_me.home_city_id END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'same_college' THEN oc.college_id = v_me.college_id END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'same_course' THEN oc.course_id = v_me.course_id END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'same_branch' THEN oc.branch_id = v_me.branch_id END DESC NULLS LAST,
    oc.cursor_token DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.recommend_students FROM public;
GRANT EXECUTE ON FUNCTION public.recommend_students TO authenticated;
