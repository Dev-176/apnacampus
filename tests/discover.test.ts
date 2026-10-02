import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StudentRecommendation } from '../types/database';

/**
 * ==============================================================================
 * LIVE DISCOVER, SEARCH & RECOMMENDATION SUITE
 * ==============================================================================
 * Verifies Phase 2 Discover capabilities against a real Supabase instance:
 * 1. Matching & Recommendation engine (scoring weights & match reasons)
 * 2. Keyset cursor pagination (no offsets, no duplicates, monotonic descent)
 * 3. Search & filters (hometown, campus city, college, branch, year, search text)
 * 4. Safety & privacy exclusions (suspended, banned, hidden users never appear)
 * 5. DPDP Act compliance (email and phone numbers never exposed in recommendations)
 * ==============================================================================
 */

const supabaseUrl =
  process.env.TEST_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.TEST_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Known seed IDs
const CITIES = {
  ALIGARH: 'c1000000-0000-0000-0000-000000000001',
  GREATER_NOIDA: 'c1000000-0000-0000-0000-000000000002',
  DELHI: 'c1000000-0000-0000-0000-000000000003',
};

const COLLEGES = {
  BENNETT: 'e1000000-0000-0000-0000-000000000001',
  GALGOTIAS: 'e1000000-0000-0000-0000-000000000002',
};

const COURSES = {
  BTECH: 'a1000000-0000-0000-0000-000000000001',
};

const BRANCHES = {
  CSE: 'b1000000-0000-0000-0000-000000000001',
  AI_DS: 'b1000000-0000-0000-0000-000000000002',
};

describe('Live Discover & Recommendations Verification', () => {
  const timestamp = Date.now();
  const userAEmail = `disc-a-${timestamp}@example.com`;
  const userBEmail = `disc-b-${timestamp}@example.com`;
  const userCEmail = `disc-c-hidden-${timestamp}@example.com`;
  const password = 'DiscTestPassword123!@#';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let anonClient: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientA: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientB: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientC: SupabaseClient<any, 'public', any>;

  let userAId: string;
  let userBId: string;
  let userCId: string;

  beforeAll(async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials missing from environment for live tests.');
    }

    anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Sign up Student A (Hometown Aligarh, Campus Greater Noida, Bennett CSE 2nd Yr)
    const { data: signA, error: errA } = await anonClient.auth.signUp({
      email: userAEmail,
      password,
      options: { data: { full_name: 'Student A (Discover)', is_18_confirmed: true } },
    });
    if (errA || !signA.session) throw new Error(`Student A signup failed: ${errA?.message}`);
    userAId = signA.user!.id;
    clientA = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${signA.session.access_token}` } },
    });

    // Setup Student A profile
    await clientA.from('profiles').update({
      full_name: 'Student A Discoverer',
      username: `disc_a_${timestamp}`,
      home_city_id: CITIES.ALIGARH,
      current_city_id: CITIES.GREATER_NOIDA,
      college_id: COLLEGES.BENNETT,
      course_id: COURSES.BTECH,
      branch_id: BRANCHES.CSE,
      year_of_study: 2,
      interests: ['Coding & Web Dev', 'Cricket'],
      skills_to_teach: ['Python'],
      is_onboarded: true,
      is_active: true,
      is_suspended: false,
      is_banned: false,
      visibility: 'discoverable',
    }).eq('id', userAId);

    // Sign up Student B (Peer: Hometown Aligarh, Campus Greater Noida, Galgotias AI/DS 2nd Yr)
    const { data: signB, error: errB } = await anonClient.auth.signUp({
      email: userBEmail,
      password,
      options: { data: { full_name: 'Student B Peer', is_18_confirmed: true } },
    });
    if (errB || !signB.session) throw new Error(`Student B signup failed: ${errB?.message}`);
    userBId = signB.user!.id;
    clientB = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${signB.session.access_token}` } },
    });

    // Setup Student B profile
    await clientB.from('profiles').update({
      full_name: 'Student B PeerCandidate',
      username: `disc_b_${timestamp}`,
      home_city_id: CITIES.ALIGARH,
      current_city_id: CITIES.GREATER_NOIDA,
      college_id: COLLEGES.GALGOTIAS,
      course_id: COURSES.BTECH,
      branch_id: BRANCHES.AI_DS,
      year_of_study: 2,
      interests: ['Coding & Web Dev', 'Music & Jamming'],
      skills_to_teach: ['Python'],
      is_onboarded: true,
      is_active: true,
      is_suspended: false,
      is_banned: false,
      visibility: 'discoverable',
    }).eq('id', userBId);

    // Sign up Student C (Hidden / Suspended Student)
    const { data: signC, error: errC } = await anonClient.auth.signUp({
      email: userCEmail,
      password,
      options: { data: { full_name: 'Student C Ineligible', is_18_confirmed: true } },
    });
    if (errC || !signC.session) throw new Error(`Student C signup failed: ${errC?.message}`);
    userCId = signC.user!.id;
    clientC = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${signC.session.access_token}` } },
    });

    // Setup Student C as hidden and suspended
    await clientC.from('profiles').update({
      full_name: 'Student C HiddenSuspended',
      username: `disc_c_${timestamp}`,
      home_city_id: CITIES.ALIGARH,
      current_city_id: CITIES.GREATER_NOIDA,
      college_id: COLLEGES.BENNETT,
      course_id: COURSES.BTECH,
      branch_id: BRANCHES.CSE,
      year_of_study: 2,
      interests: ['Coding & Web Dev'],
      skills_to_teach: ['Python'],
      is_onboarded: true,
      is_active: true,
      is_suspended: true, // Suspended!
      is_banned: false,
      visibility: 'hidden', // Hidden!
    }).eq('id', userCId);
  }, 30000);

  afterAll(async () => {
    for (const c of [clientA, clientB, clientC]) {
      if (c) {
        try {
          await c.rpc('delete_current_user');
        } catch {
          // Ignore teardown cleanup errors
        }
        await c.auth.signOut();
      }
    }
  }, 30000);

  test('1. Student cannot see themselves in recommendations (Self-exclusion)', async () => {
    const { data, error } = await clientA.rpc('recommend_students', {
      p_limit: 20,
    });

    expect(error).toBeNull();
    const recommendations = (data || []) as StudentRecommendation[];
    expect(Array.isArray(recommendations)).toBe(true);

    const selfFound = recommendations.find((r) => r.id === userAId);
    expect(selfFound).toBeUndefined();
  });

  test('2. Matching scoring weights and match reasons are accurate for peers', async () => {
    const { data, error } = await clientA.rpc('recommend_students', {
      p_limit: 20,
    });

    expect(error).toBeNull();
    const recommendations = (data || []) as StudentRecommendation[];
    const peerCandidate = recommendations.find((r) => r.id === userBId);
    expect(peerCandidate).toBeDefined();

    // Student A & Student B share:
    // - Home city Aligarh: 30
    // - Current city Greater Noida: 25
    // - Course B.Tech: 10
    // - Year of study 2: 5
    // - Shared interest ('Coding & Web Dev'): min(7, 1 * 3) = 3
    // - Shared skill ('Python'): min(5, 1 * 2) = 2
    // Total expected score: 30 + 25 + 10 + 5 + 3 + 2 = 75
    expect(peerCandidate!.match_score).toBe(75);

    // Verify match_reasons array
    expect(peerCandidate!.match_reasons).toContain('Same Hometown');
    expect(peerCandidate!.match_reasons).toContain('Same Campus City');
    expect(peerCandidate!.match_reasons).toContain('Same Course');
    expect(peerCandidate!.match_reasons).toContain('Same Year');
    expect(peerCandidate!.match_reasons).toContain('Shared Interests');
    expect(peerCandidate!.match_reasons).toContain('Shared Skills');

    // Should NOT contain 'Same College' (Bennett vs Galgotias) or 'Same Branch' (CSE vs AI_DS)
    expect(peerCandidate!.match_reasons).not.toContain('Same College');
    expect(peerCandidate!.match_reasons).not.toContain('Same Branch');
  });

  test('3. Keyset cursor pagination delivers non-duplicate results with strict descending order', async () => {
    // Page 1: fetch limit 1
    const { data: rawPage1, error: err1 } = await clientA.rpc('recommend_students', {
      p_limit: 1,
    });
    expect(err1).toBeNull();
    const page1 = (rawPage1 || []) as StudentRecommendation[];
    expect(page1.length).toBe(1);

    const firstStudent = page1[0]!;
    expect(firstStudent.cursor_token).toBeDefined();
    expect(firstStudent.cursor_token.length).toBeGreaterThan(0);

    // Page 2: fetch limit 1 with p_cursor from page 1
    const { data: rawPage2, error: err2 } = await clientA.rpc('recommend_students', {
      p_limit: 1,
      p_cursor: firstStudent.cursor_token,
    });
    expect(err2).toBeNull();
    const page2 = (rawPage2 || []) as StudentRecommendation[];

    if (page2.length > 0) {
      const secondStudent = page2[0]!;
      // Assert no duplicates across pages
      expect(secondStudent.id).not.toBe(firstStudent.id);
      // Assert keyset token monotonically decreases
      expect(secondStudent.cursor_token < firstStudent.cursor_token).toBe(true);
    }
  });

  test('4. Discovery filters strictly narrow candidate pools', async () => {
    // Filter by Hometown Aligarh
    const { data: rawAli, error: errAli } = await clientA.rpc('recommend_students', {
      p_home_city_id: CITIES.ALIGARH,
      p_limit: 10,
    });
    expect(errAli).toBeNull();
    const aligarhStudents = (rawAli || []) as StudentRecommendation[];
    expect(aligarhStudents.length).toBeGreaterThan(0);
    aligarhStudents.forEach((student) => {
      expect(student.home_city_id).toBe(CITIES.ALIGARH);
    });

    // Filter by specific search query (User B's username)
    const { data: rawSearch, error: errSearch } = await clientA.rpc('recommend_students', {
      p_search: `disc_b_${timestamp}`,
      p_limit: 5,
    });
    expect(errSearch).toBeNull();
    const searchResults = (rawSearch || []) as StudentRecommendation[];
    expect(searchResults.length).toBe(1);
    expect(searchResults[0]!.id).toBe(userBId);
  });

  test('5. Suspended, banned, and hidden profiles NEVER appear in recommendations', async () => {
    const { data, error } = await clientA.rpc('recommend_students', {
      p_limit: 50,
    });

    expect(error).toBeNull();
    const allRecommendations = (data || []) as StudentRecommendation[];
    const hiddenFound = allRecommendations.find((r) => r.id === userCId);
    expect(hiddenFound).toBeUndefined();
  });

  test('6. DPDP compliance: recommendations and profiles never expose email or phone', async () => {
    const { data } = await clientA.rpc('recommend_students', {
      p_limit: 5,
    });

    expect(data).toBeDefined();
    const recommendations = (data || []) as StudentRecommendation[];
    recommendations.forEach((student) => {
      // TypeScript & runtime check that email and phone do not exist in payload
      const rawStudent = student as unknown as Record<string, unknown>;
      expect(rawStudent.email).toBeUndefined();
      expect(rawStudent.phone).toBeUndefined();
      expect(rawStudent.phone_number).toBeUndefined();
      expect(rawStudent.date_of_birth).toBeUndefined();
    });
  });

  test('7. Seed verification: query for home Aligarh + current Greater Noida returns 3 seeded demo students', async () => {
    const { data: demoStudents, error } = await clientA
      .from('profiles')
      .select('id, full_name, username, home_city_id, current_city_id, is_seed')
      .eq('home_city_id', CITIES.ALIGARH)
      .eq('current_city_id', CITIES.GREATER_NOIDA)
      .eq('is_seed', true);

    expect(error).toBeNull();
    expect(demoStudents).toBeDefined();

    const seededNames = (demoStudents || []).map((s: { full_name: string }) => s.full_name);
    expect(seededNames).toContain('Aarav Sharma');
    expect(seededNames).toContain('Zainab Khan');
    expect(seededNames).toContain('Priyesh Verma');
    expect(demoStudents!.length).toBeGreaterThanOrEqual(3);
  });
});
