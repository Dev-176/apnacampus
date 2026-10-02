-- ApnaCampus Seed Data
-- Non-negotiable rule: Seed data lives ONLY in supabase/seed.sql, every row flagged is_seed = true.

-- 1. Cities Seed (12 primary hometowns and educational hubs)
INSERT INTO public.cities (id, name, state, region, is_popular_hometown, is_popular_destination, is_seed)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Aligarh', 'Uttar Pradesh', NULL, true, false, true),
  ('c1000000-0000-0000-0000-000000000002', 'Greater Noida', 'Uttar Pradesh', 'NCR', false, true, true),
  ('c1000000-0000-0000-0000-000000000003', 'Delhi', 'Delhi', 'NCR', true, true, true),
  ('c1000000-0000-0000-0000-000000000004', 'Lucknow', 'Uttar Pradesh', NULL, true, true, true),
  ('c1000000-0000-0000-0000-000000000005', 'Agra', 'Uttar Pradesh', NULL, true, false, true),
  ('c1000000-0000-0000-0000-000000000006', 'Jaipur', 'Rajasthan', NULL, true, true, true),
  ('c1000000-0000-0000-0000-000000000007', 'Kanpur', 'Uttar Pradesh', NULL, true, false, true),
  ('c1000000-0000-0000-0000-000000000008', 'Meerut', 'Uttar Pradesh', NULL, true, false, true),
  ('c1000000-0000-0000-0000-000000000009', 'Noida', 'Uttar Pradesh', 'NCR', false, true, true),
  ('c1000000-0000-0000-0000-000000000010', 'Ghaziabad', 'Uttar Pradesh', 'NCR', true, true, true),
  ('c1000000-0000-0000-0000-000000000011', 'Gurugram', 'Haryana', 'NCR', false, true, true),
  ('c1000000-0000-0000-0000-000000000012', 'Faridabad', 'Haryana', 'NCR', true, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  state = EXCLUDED.state,
  region = EXCLUDED.region,
  is_popular_hometown = EXCLUDED.is_popular_hometown,
  is_popular_destination = EXCLUDED.is_popular_destination,
  is_seed = true;

-- 2. Demo Colleges Seed
INSERT INTO public.colleges (id, name, short_name, city_id, is_seed)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Bennett University', 'BU', 'c1000000-0000-0000-0000-000000000002', true),
  ('e1000000-0000-0000-0000-000000000002', 'Galgotias University', 'GU', 'c1000000-0000-0000-0000-000000000002', true),
  ('e1000000-0000-0000-0000-000000000003', 'Sharda University', 'SU', 'c1000000-0000-0000-0000-000000000002', true),
  ('e1000000-0000-0000-0000-000000000004', 'Shiv Nadar University', 'SNU', 'c1000000-0000-0000-0000-000000000002', true),
  ('e1000000-0000-0000-0000-000000000005', 'Indian Institute of Technology Delhi', 'IITD', 'c1000000-0000-0000-0000-000000000003', true),
  ('e1000000-0000-0000-0000-000000000006', 'Jamia Millia Islamia', 'JMI', 'c1000000-0000-0000-0000-000000000003', true),
  ('e1000000-0000-0000-0000-000000000007', 'Aligarh Muslim University', 'AMU', 'c1000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  city_id = EXCLUDED.city_id,
  is_seed = true;

-- 3. Courses Seed
INSERT INTO public.courses (id, name, duration_years, is_seed)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'B.Tech', 4, true),
  ('a1000000-0000-0000-0000-000000000002', 'BCA', 3, true),
  ('a1000000-0000-0000-0000-000000000003', 'B.Sc (Hons)', 3, true),
  ('a1000000-0000-0000-0000-000000000004', 'MBBS', 5, true),
  ('a1000000-0000-0000-0000-000000000005', 'MBA', 2, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration_years = EXCLUDED.duration_years,
  is_seed = true;

-- 4. Branches Seed
INSERT INTO public.branches (id, course_id, name, is_seed)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Computer Science and Engineering', true),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'AI & Data Science', true),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Electronics and Communication', true),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Mechanical Engineering', true),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'Civil Engineering', true),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'General', true),
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003', 'Computer Science', true),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000004', 'Medicine & Surgery', true),
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000005', 'Finance & Marketing', true)
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  name = EXCLUDED.name,
  is_seed = true;
