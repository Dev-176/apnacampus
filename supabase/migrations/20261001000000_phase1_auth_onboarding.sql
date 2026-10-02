-- ApnaCampus Phase 1: Auth, Profiles, Lookup Tables, and RLS Policies
-- Migration: 20261001000000_phase1_auth_onboarding.sql

-- 1. Cities lookup table
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  region TEXT,
  is_popular_hometown BOOLEAN NOT NULL DEFAULT false,
  is_popular_destination BOOLEAN NOT NULL DEFAULT false,
  is_seed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_state ON public.cities(state);
CREATE INDEX IF NOT EXISTS idx_cities_region ON public.cities(region);

-- 2. Colleges lookup table
CREATE TABLE IF NOT EXISTS public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  city_id UUID REFERENCES public.cities(id) ON DELETE RESTRICT,
  is_seed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_colleges_city_id ON public.colleges(city_id);
CREATE INDEX IF NOT EXISTS idx_colleges_name ON public.colleges(name);

-- 3. Courses lookup table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  duration_years INTEGER NOT NULL DEFAULT 4,
  is_seed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Branches lookup table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_seed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, name)
);

CREATE INDEX IF NOT EXISTS idx_branches_course_id ON public.branches(course_id);

-- 5. College Suggestions (Pending requests for unlisted colleges)
CREATE TABLE IF NOT EXISTS public.college_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  college_name TEXT NOT NULL,
  city_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Profiles table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE,
  avatar_url TEXT,
  home_city_id UUID REFERENCES public.cities(id) ON DELETE RESTRICT,
  current_city_id UUID REFERENCES public.cities(id) ON DELETE RESTRICT,
  college_id UUID REFERENCES public.colleges(id) ON DELETE RESTRICT,
  course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT,
  year_of_study INTEGER CHECK (year_of_study BETWEEN 1 AND 6),
  interests TEXT[] NOT NULL DEFAULT '{}',
  skills_to_teach TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  is_18_confirmed BOOLEAN NOT NULL DEFAULT false,
  date_of_birth DATE,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_onboarded BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  is_seed BOOLEAN NOT NULL DEFAULT false,
  visibility TEXT NOT NULL DEFAULT 'discoverable' CHECK (visibility IN ('discoverable', 'connections_only', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_home_city ON public.profiles(home_city_id);
CREATE INDEX IF NOT EXISTS idx_profiles_current_city ON public.profiles(current_city_id);
CREATE INDEX IF NOT EXISTS idx_profiles_college ON public.profiles(college_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 7. User Settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discoverable BOOLEAN NOT NULL DEFAULT true,
  allow_connection_requests_from TEXT NOT NULL DEFAULT 'everyone' CHECK (allow_connection_requests_from IN ('everyone', 'same_college', 'same_city')),
  allow_messages_from TEXT NOT NULL DEFAULT 'connections' CHECK (allow_messages_from IN ('connections', 'everyone')),
  read_receipts_enabled BOOLEAN NOT NULL DEFAULT true,
  notifications_connections BOOLEAN NOT NULL DEFAULT true,
  notifications_messages BOOLEAN NOT NULL DEFAULT true,
  notifications_groups BOOLEAN NOT NULL DEFAULT true,
  notifications_study BOOLEAN NOT NULL DEFAULT true,
  notifications_travel BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- AUTOMATED PROFILE & SETTINGS TRIGGER ON AUTH.USERS INSERT
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_is_18 BOOLEAN;
BEGIN
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Student');
  v_is_18 := COALESCE((new.raw_user_meta_data->>'is_18_confirmed')::boolean, false);

  -- Create profile row
  INSERT INTO public.profiles (
    id,
    full_name,
    is_18_confirmed,
    is_verified,
    is_onboarded,
    is_active,
    is_seed
  ) VALUES (
    new.id,
    v_full_name,
    v_is_18,
    false,
    false,
    true,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create user settings row
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — STRICT DENY BY DEFAULT
-- ==============================================================================

-- 1. Cities
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on cities" ON public.cities;
CREATE POLICY "Allow public read on cities"
  ON public.cities FOR SELECT
  USING (true);

-- 2. Colleges
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on colleges" ON public.colleges;
CREATE POLICY "Allow public read on colleges"
  ON public.colleges FOR SELECT
  USING (true);

-- 3. Courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on courses" ON public.courses;
CREATE POLICY "Allow public read on courses"
  ON public.courses FOR SELECT
  USING (true);

-- 4. Branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on branches" ON public.branches;
CREATE POLICY "Allow public read on branches"
  ON public.branches FOR SELECT
  USING (true);

-- 5. College Suggestions
ALTER TABLE public.college_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create college suggestions" ON public.college_suggestions;
CREATE POLICY "Users can create college suggestions"
  ON public.college_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read their own college suggestions" ON public.college_suggestions;
CREATE POLICY "Users can read their own college suggestions"
  ON public.college_suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can read discoverable profiles" ON public.profiles;
CREATE POLICY "Users can read discoverable profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND is_suspended = false
    AND is_banned = false
    AND visibility = 'discoverable'
  );

DROP POLICY IF EXISTS "Users can update only their own profile" ON public.profiles;
CREATE POLICY "Users can update only their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 7. User Settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own settings" ON public.user_settings;
CREATE POLICY "Users can read own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- STORAGE BUCKET: AVATARS
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage Objects Policies (Supabase storage.objects has RLS pre-enabled by default)

DROP POLICY IF EXISTS "Public can view avatar objects" ON storage.objects;
CREATE POLICY "Public can view avatar objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
