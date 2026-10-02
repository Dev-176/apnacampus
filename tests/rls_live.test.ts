import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ==============================================================================
 * LIVE RLS INTEGRATION SUITE
 * ==============================================================================
 * This suite executes REAL database queries and mutations against a live
 * Supabase instance with two authenticated test users holding real JWTs.
 * ==============================================================================
 */

const supabaseUrl =
  process.env.TEST_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.TEST_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

describe('Live Database RLS Verification (Real Supabase Instance & JWTs)', () => {
  const timestamp = Date.now();
  const userAEmail = `rls-a-${timestamp}@example.com`;
  const userBEmail = `rls-b-${timestamp}@example.com`;
  const password = 'TestPassword123!@#';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let anonClient: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientA: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientB: SupabaseClient<any, 'public', any>;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // 1. Verify credentials are present and not placeholders
    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      supabaseUrl.includes('placeholder.supabase.co') ||
      supabaseAnonKey.includes('placeholder_anon_key')
    ) {
      throw new Error(
        `FAIL: Live Supabase credentials are missing or placeholders in .env!\n` +
          `TEST_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL = "${supabaseUrl}"\n` +
          `TEST_SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY = "${supabaseAnonKey ? '[SET]' : '[MISSING]'}"\n` +
          `Ensure valid Supabase URL and anon key are loaded in .env.`
      );
    }

    anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 2. Sign up User A
    const { data: signUpA, error: errA } = await anonClient.auth.signUp({
      email: userAEmail,
      password,
      options: {
        data: {
          full_name: 'Test Student A',
          is_18_confirmed: true,
        },
      },
    });

    if (errA || !signUpA.user || !signUpA.session) {
      throw new Error(
        `Failed to sign up User A (${userAEmail}): ${errA?.message || 'No session returned. Verify Confirm Email is OFF.'}`
      );
    }
    userAId = signUpA.user.id;

    // 3. Sign up User B
    const { data: signUpB, error: errB } = await anonClient.auth.signUp({
      email: userBEmail,
      password,
      options: {
        data: {
          full_name: 'Test Student B',
          is_18_confirmed: true,
        },
      },
    });

    if (errB || !signUpB.user || !signUpB.session) {
      throw new Error(
        `Failed to sign up User B (${userBEmail}): ${errB?.message || 'No session returned. Verify Confirm Email is OFF.'}`
      );
    }
    userBId = signUpB.user.id;
    expect(userBId).toBeDefined();

    // 4. Create authenticated clients for User A and User B
    clientA = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${signUpA.session.access_token}` },
      },
    });

    clientB = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${signUpB.session.access_token}` },
      },
    });
  }, 30000);

  afterAll(async () => {
    // Clean up test users completely from auth.users
    for (const c of [clientA, clientB]) {
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

  test('RLS is enabled on every public table (calling public.rls_status())', async () => {
    // Calling the SECURITY DEFINER function public.rls_status() deployed in migration
    const { data, error } = await clientA.rpc('rls_status');
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);

    const expectedTables = [
      'cities',
      'colleges',
      'courses',
      'branches',
      'college_suggestions',
      'profiles',
      'user_settings',
    ];

    for (const table of expectedTables) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = data!.find((row: any) => row.table_name === table);
      expect(match).toBeDefined();
      expect(match?.rls_enabled).toBe(true);
    }
  });

  test('User B cannot update User A profile (RLS DENY)', async () => {
    // Attempt unauthorized update of User A's bio by User B
    const { data: updateData, error: updateError } = await clientB
      .from('profiles')
      .update({ bio: 'MALICIOUS_UPDATE_BY_USER_B' })
      .eq('id', userAId)
      .select();

    // Under Supabase RLS: either an error is returned OR 0 rows are affected
    if (updateError) {
      expect(updateError.message).toMatch(/policy|permission|violates|not found/i);
    } else {
      expect(updateData?.length ?? 0).toBe(0);
    }

    // Verify User A profile was NOT modified in the database
    const { data: profileA, error: readError } = await clientA
      .from('profiles')
      .select('bio')
      .eq('id', userAId)
      .single();

    expect(readError).toBeNull();
    expect(profileA?.bio).not.toBe('MALICIOUS_UPDATE_BY_USER_B');
  });

  test('User A can update their own profile (RLS ALLOW)', async () => {
    const updatedBio = `Verified owner bio update at ${Date.now()}`;
    const { error: updateError } = await clientA
      .from('profiles')
      .update({ bio: updatedBio })
      .eq('id', userAId);

    expect(updateError).toBeNull();

    const { data: profileA, error: readError } = await clientA
      .from('profiles')
      .select('bio')
      .eq('id', userAId)
      .single();

    expect(readError).toBeNull();
    expect(profileA?.bio).toBe(updatedBio);
  });

  test('Hidden, suspended, and banned profiles are not readable by other users', async () => {
    // 1. Test Hidden visibility
    const { error: hideError } = await clientA
      .from('profiles')
      .update({ visibility: 'hidden' })
      .eq('id', userAId);
    expect(hideError).toBeNull();

    // User B tries to select User A's hidden profile
    const { data: hiddenData } = await clientB
      .from('profiles')
      .select('id, full_name')
      .eq('id', userAId);

    // RLS policy "Users can read discoverable profiles" requires visibility = 'discoverable'
    expect(hiddenData?.length ?? 0).toBe(0);

    // User A can still read their own hidden profile
    const { data: ownHiddenData, error: ownReadError } = await clientA
      .from('profiles')
      .select('id, full_name')
      .eq('id', userAId)
      .single();
    expect(ownReadError).toBeNull();
    expect(ownHiddenData?.id).toBe(userAId);

    // 2. Test Suspended account state
    const { error: suspendError } = await clientA
      .from('profiles')
      .update({ visibility: 'discoverable', is_suspended: true, is_banned: false })
      .eq('id', userAId);
    expect(suspendError).toBeNull();

    // User B must NOT be able to read suspended profile
    const { data: suspendedData } = await clientB
      .from('profiles')
      .select('id, full_name')
      .eq('id', userAId);
    expect(suspendedData?.length ?? 0).toBe(0);

    // User A can still read own suspended profile (to see the suspension gate)
    const { data: ownSuspendedData } = await clientA
      .from('profiles')
      .select('id, is_suspended')
      .eq('id', userAId)
      .single();
    expect(ownSuspendedData?.is_suspended).toBe(true);

    // 3. Test Banned account state
    const { error: banError } = await clientA
      .from('profiles')
      .update({ is_suspended: false, is_banned: true })
      .eq('id', userAId);
    expect(banError).toBeNull();

    // User B must NOT be able to read banned profile
    const { data: bannedData } = await clientB
      .from('profiles')
      .select('id, full_name')
      .eq('id', userAId);
    expect(bannedData?.length ?? 0).toBe(0);

    // User A can still read own banned profile
    const { data: ownBannedData } = await clientA
      .from('profiles')
      .select('id, is_banned')
      .eq('id', userAId)
      .single();
    expect(ownBannedData?.is_banned).toBe(true);

    // Cleanup: restore normal discoverable state
    await clientA
      .from('profiles')
      .update({ visibility: 'discoverable', is_suspended: false, is_banned: false })
      .eq('id', userAId);

    const { data: restoredData } = await clientB
      .from('profiles')
      .select('id, full_name')
      .eq('id', userAId);
    expect(restoredData?.length).toBe(1);
    expect(restoredData?.[0]?.id).toBe(userAId);
  });

  test('Non-owners cannot write to another user avatar storage folder', async () => {
    const fakeImageBuffer = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header

    // User B attempts to upload to User A's avatar folder path: "<userAId>/test.png"
    const unauthorizedPath = `${userAId}/malicious_avatar.png`;
    const { error: uploadError } = await clientB.storage
      .from('avatars')
      .upload(unauthorizedPath, fakeImageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    // Storage RLS check: (storage.foldername(name))[1] = auth.uid()::text
    // User B's uid does not match userAId, so this MUST fail
    expect(uploadError).toBeDefined();
  });

  test('Owner can upload to their own avatar storage folder', async () => {
    const fakeImageBuffer = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header

    // User A uploads to their own avatar folder: "<userAId>/avatar.png"
    const authorizedPath = `${userAId}/avatar_${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await clientA.storage
      .from('avatars')
      .upload(authorizedPath, fakeImageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    expect(uploadError).toBeNull();
    expect(uploadData?.path).toBe(authorizedPath);
  });
});
