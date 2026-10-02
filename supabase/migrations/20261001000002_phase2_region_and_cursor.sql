-- ApnaCampus Phase 2: Add p_region and refine keyset pagination cursor ordering in recommend_students
-- Migration: 20261001000002_phase2_region_and_cursor.sql

DROP FUNCTION IF EXISTS public.recommend_students(INT, TEXT, UUID, UUID, UUID, UUID, UUID, INT, TEXT, TEXT, TEXT, TEXT);

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

REVOKE ALL ON FUNCTION public.recommend_students FROM public;
GRANT EXECUTE ON FUNCTION public.recommend_students TO authenticated;
