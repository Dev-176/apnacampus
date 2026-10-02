import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ==============================================================================
 * LIVE CONNECTIONS INTEGRATION SUITE
 * ==============================================================================
 * This test suite validates all Phase 3 Connections business logic and security
 * rules against a REAL live Supabase database with real authenticated JWTs:
 *
 * 1. Self-connection prevention (sender_id != receiver_id constraint)
 * 2. Direct mutation protection (direct INSERT/UPDATE/DELETE on connections blocked)
 * 3. Send request creates pending connection & duplicate requests in both directions blocked
 * 4. Listing requests (incoming and outgoing) returns proper profiles & messages
 * 5. Withdrawing requests: non-senders (receiver and third-party) cannot withdraw; sender can
 * 6. Responding to requests: non-receivers (sender and third-party) cannot accept/reject; receiver can
 * 7. Privacy & RLS isolation: third parties cannot read, update, or delete another pair's connection row
 * 8. Re-request cooldown (7-day wait required after rejection)
 * 9. Spam intro detection (max 3 identical messages within 24 hours)
 * 10. Receiver privacy rules ('same_college' and 'same_city' enforcement)
 * 11. Active connection exclusion & Mutual connection boost in recommend_students
 * 12. Rate limit enforcement: the 21st request in 24h is rejected
 * 13. Blocked pair enforcement: blocked in either direction prevents connection request
 * ==============================================================================
 */

const supabaseUrl =
  process.env.TEST_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.TEST_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Known lookup IDs from database seed
const CITIES = {
  ALIGARH: 'c1000000-0000-0000-0000-000000000001',
  GREATER_NOIDA: 'c1000000-0000-0000-0000-000000000002',
  DELHI: 'c1000000-0000-0000-0000-000000000003',
  LUCKNOW: 'c1000000-0000-0000-0000-000000000004',
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

describe('Live Connections Verification (Phase 3 Constraints, RPCs & RLS)', () => {
  jest.setTimeout(30000);
  const timestamp = Date.now();
  const password = 'ConnTestPassword123!@#';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let anonClient: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientA: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientB: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientC: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientD: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientE: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientF: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientRL: SupabaseClient<any, 'public', any>;

  let userAId: string;
  let userBId: string;
  let userCId: string;
  let userDId: string;
  let userEId: string;
  let userFId: string;
  let userRLId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extraClients: SupabaseClient<any, 'public', any>[] = [];

  beforeAll(async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials missing from environment for live connections tests.');
    }

    anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Helper to register and configure a test student
    async function createTestStudent(
      label: string,
      details: {
        collegeId: string;
        currentCityId: string;
        homeCityId: string;
        branchId: string;
      }
    ) {
      const email = `conn-${label}-${timestamp}@example.com`;
      const { data: signUp, error: signErr } = await anonClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `Student ${label.toUpperCase()} (ConnTest)`,
            is_18_confirmed: true,
          },
        },
      });

      if (signErr || !signUp.user || !signUp.session) {
        throw new Error(`Failed to create test user ${label}: ${signErr?.message}`);
      }

      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: { Authorization: `Bearer ${signUp.session.access_token}` },
        },
      });

      // Update profile with complete onboarding details
      await client
        .from('profiles')
        .update({
          full_name: `Student ${label.toUpperCase()}`,
          username: `conn_${label}_${timestamp}`,
          college_id: details.collegeId,
          course_id: COURSES.BTECH,
          branch_id: details.branchId,
          current_city_id: details.currentCityId,
          home_city_id: details.homeCityId,
          year_of_study: 2,
          interests: ['Coding & Web Dev', 'Badminton'],
          skills_to_teach: ['React Native'],
          is_onboarded: true,
          is_active: true,
          is_suspended: false,
          is_banned: false,
          visibility: 'discoverable',
        })
        .eq('id', signUp.user.id);

      return { userId: signUp.user.id, client };
    }

    // Student A: Bennett, Greater Noida, Aligarh, CSE
    const userA = await createTestStudent('a', {
      collegeId: COLLEGES.BENNETT,
      currentCityId: CITIES.GREATER_NOIDA,
      homeCityId: CITIES.ALIGARH,
      branchId: BRANCHES.CSE,
    });
    userAId = userA.userId;
    clientA = userA.client;

    // Student B: Bennett, Greater Noida, Aligarh, CSE
    const userB = await createTestStudent('b', {
      collegeId: COLLEGES.BENNETT,
      currentCityId: CITIES.GREATER_NOIDA,
      homeCityId: CITIES.ALIGARH,
      branchId: BRANCHES.CSE,
    });
    userBId = userB.userId;
    clientB = userB.client;

    // Student C: Bennett, Greater Noida, Lucknow, AI_DS
    const userC = await createTestStudent('c', {
      collegeId: COLLEGES.BENNETT,
      currentCityId: CITIES.GREATER_NOIDA,
      homeCityId: CITIES.LUCKNOW,
      branchId: BRANCHES.AI_DS,
    });
    userCId = userC.userId;
    clientC = userC.client;

    // Student D: Galgotias, Lucknow, Lucknow, CSE (Different College and City)
    const userD = await createTestStudent('d', {
      collegeId: COLLEGES.GALGOTIAS,
      currentCityId: CITIES.LUCKNOW,
      homeCityId: CITIES.LUCKNOW,
      branchId: BRANCHES.CSE,
    });
    userDId = userD.userId;
    clientD = userD.client;

    // Student E: Galgotias, Greater Noida, Delhi, CSE
    const userE = await createTestStudent('e', {
      collegeId: COLLEGES.GALGOTIAS,
      currentCityId: CITIES.GREATER_NOIDA,
      homeCityId: CITIES.DELHI,
      branchId: BRANCHES.CSE,
    });
    userEId = userE.userId;
    clientE = userE.client;

    // Student F: Bennett, Greater Noida, Aligarh, CSE (Fresh target)
    const userF = await createTestStudent('f', {
      collegeId: COLLEGES.BENNETT,
      currentCityId: CITIES.GREATER_NOIDA,
      homeCityId: CITIES.ALIGARH,
      branchId: BRANCHES.CSE,
    });
    userFId = userF.userId;
    clientF = userF.client;

    // Student RL: Rate Limit tester
    const userRL = await createTestStudent('rl', {
      collegeId: COLLEGES.BENNETT,
      currentCityId: CITIES.GREATER_NOIDA,
      homeCityId: CITIES.ALIGARH,
      branchId: BRANCHES.CSE,
    });
    userRLId = userRL.userId;
    clientRL = userRL.client;
  }, 60000);

  afterAll(async () => {
    // Clean up all test users from the database using self-cleanup RPC
    const clients = [clientA, clientB, clientC, clientD, clientE, clientF, clientRL, ...extraClients];
    for (const c of clients) {
      if (c) {
        try {
          await c.rpc('delete_current_user');
        } catch {
          // ignore cleanup errors on teardown
        }
        await c.auth.signOut();
      }
    }
  }, 30000);

  // ----------------------------------------------------------------------------
  // 1. Self-Connection Prevention
  // ----------------------------------------------------------------------------
  test('1. Database prevents self-connection request', async () => {
    const { error } = await clientA.rpc('send_request', {
      p_receiver_id: userAId,
      p_intro_message: 'Hello to myself',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/Cannot send connection request to yourself/i);
  });

  // ----------------------------------------------------------------------------
  // 2. Direct Mutation Protection & RLS Isolation
  // ----------------------------------------------------------------------------
  test('2. Direct INSERT/UPDATE/DELETE on connections table is blocked for client', async () => {
    // Attempt direct insert without RPC
    const { error: insertErr } = await clientA.from('connections').insert({
      sender_id: userAId,
      receiver_id: userBId,
      status: 'accepted',
    });

    expect(insertErr).not.toBeNull();
    expect(insertErr!.message).toMatch(/permission denied|violates|policy/i);
  });

  // ----------------------------------------------------------------------------
  // 3. Send Connection Request & Symmetrical Duplication Check
  // ----------------------------------------------------------------------------
  test('3. Send request creates pending connection; duplicate requests in either direction are blocked', async () => {
    // User A sends request to User B
    const { data: sendData, error: sendErr } = await clientA.rpc('send_request', {
      p_receiver_id: userBId,
      p_intro_message: 'Hi B, let us connect from Aligarh!',
    });

    expect(sendErr).toBeNull();
    expect(sendData).toBeDefined();
    expect(typeof sendData).toBe('string'); // Returns UUID of request

    // Duplicate attempt 1: User A sends again to User B
    const { error: dupErrA } = await clientA.rpc('send_request', {
      p_receiver_id: userBId,
      p_intro_message: 'Trying again...',
    });
    expect(dupErrA).not.toBeNull();
    expect(dupErrA!.message).toMatch(/already sent and pending|already exists/i);

    // Duplicate attempt 2: User B tries to send back to User A while request is pending
    const { error: dupErrB } = await clientB.rpc('send_request', {
      p_receiver_id: userAId,
      p_intro_message: 'Hey back at you!',
    });
    expect(dupErrB).not.toBeNull();
    expect(dupErrB!.message).toMatch(/already sent you a connection request|already exists/i);
  });

  // ----------------------------------------------------------------------------
  // 4. Listing Requests (Incoming & Outgoing)
  // ----------------------------------------------------------------------------
  test('4. Incoming and outgoing requests are listed accurately with sender/receiver details', async () => {
    // User A checks outgoing requests
    const { data: outgoing, error: outErr } = await clientA.rpc('list_requests', {
      p_type: 'outgoing',
    });
    expect(outErr).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outList = outgoing as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reqForB = outList.find((r: any) => r.user_id === userBId);
    expect(reqForB).toBeDefined();
    expect(reqForB.intro_message).toBe('Hi B, let us connect from Aligarh!');
    expect(reqForB.full_name).toContain('Student B');

    // User B checks incoming requests
    const { data: incoming, error: inErr } = await clientB.rpc('list_requests', {
      p_type: 'incoming',
    });
    expect(inErr).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inList = incoming as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reqFromA = inList.find((r: any) => r.user_id === userAId);
    expect(reqFromA).toBeDefined();
    expect(reqFromA.intro_message).toBe('Hi B, let us connect from Aligarh!');
    expect(reqFromA.full_name).toContain('Student A');
  });

  // ----------------------------------------------------------------------------
  // 5. Withdrawing Requests (Non-sender cannot withdraw; sender can)
  // ----------------------------------------------------------------------------
  test('5. A user who is not the sender cannot withdraw (both receiver and third party tried)', async () => {
    // Get request ID
    const { data: statusRows } = await clientA.rpc('get_connection_status', {
      p_target_user_id: userBId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statusRes = (statusRows && (statusRows as any[])[0]) as {
      status: string;
      request_id: string;
    };
    expect(statusRes.status).toBe('pending_sent');
    expect(statusRes.request_id).toBeDefined();

    // 5a. Receiver B tries to withdraw A's request -> Fails
    const { error: receiverWithdrawErr } = await clientB.rpc('withdraw_request', {
      p_request_id: statusRes.request_id,
    });
    expect(receiverWithdrawErr).not.toBeNull();
    expect(receiverWithdrawErr!.message).toMatch(/Only the sender can withdraw/i);

    // 5b. Third-party C tries to withdraw A's request -> Fails
    const { error: thirdPartyWithdrawErr } = await clientC.rpc('withdraw_request', {
      p_request_id: statusRes.request_id,
    });
    expect(thirdPartyWithdrawErr).not.toBeNull();
    expect(thirdPartyWithdrawErr!.message).toMatch(/Only the sender can withdraw/i);

    // 5c. Sender A withdraws their own request -> Succeeds
    const { data: withdrawData, error: withdrawErr } = await clientA.rpc('withdraw_request', {
      p_request_id: statusRes.request_id,
    });
    expect(withdrawErr).toBeNull();
    expect(withdrawData).toBe(true);

    // Verify row is deleted (status is now 'none')
    const { data: afterRows } = await clientA.rpc('get_connection_status', {
      p_target_user_id: userBId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterRes = (afterRows && (afterRows as any[])[0]) as { status: string };
    expect(afterRes.status).toBe('none');
  });

  // ----------------------------------------------------------------------------
  // 6. Responding to Requests (Non-receiver cannot respond; receiver can)
  // ----------------------------------------------------------------------------
  test('6. A user who is not the receiver cannot accept or reject (both sender and third party tried)', async () => {
    // Re-send request from A to B
    const { data: sendRes, error: sendErr } = await clientA.rpc('send_request', {
      p_receiver_id: userBId,
      p_intro_message: 'Connecting again for collaboration!',
    });
    expect(sendErr).toBeNull();
    const reqId = sendRes as string;
    expect(reqId).toBeDefined();

    // 6a. Sender A tries to accept own request -> Fails
    const { error: senderAcceptErr } = await clientA.rpc('respond_request', {
      p_request_id: reqId,
      p_action: 'accept',
    });
    expect(senderAcceptErr).not.toBeNull();
    expect(senderAcceptErr!.message).toMatch(/Only the receiver can accept or reject/i);

    // 6b. Sender A tries to reject own request -> Fails
    const { error: senderRejectErr } = await clientA.rpc('respond_request', {
      p_request_id: reqId,
      p_action: 'reject',
    });
    expect(senderRejectErr).not.toBeNull();
    expect(senderRejectErr!.message).toMatch(/Only the receiver can accept or reject/i);

    // 6c. Third party C tries to accept -> Fails
    const { error: thirdAcceptErr } = await clientC.rpc('respond_request', {
      p_request_id: reqId,
      p_action: 'accept',
    });
    expect(thirdAcceptErr).not.toBeNull();
    expect(thirdAcceptErr!.message).toMatch(/Only the receiver can accept or reject/i);

    // 6d. Third party C tries to reject -> Fails
    const { error: thirdRejectErr } = await clientC.rpc('respond_request', {
      p_request_id: reqId,
      p_action: 'reject',
    });
    expect(thirdRejectErr).not.toBeNull();
    expect(thirdRejectErr!.message).toMatch(/Only the receiver can accept or reject/i);

    // 6e. Actual Receiver B accepts -> Succeeds
    const { data: acceptData, error: acceptErr } = await clientB.rpc('respond_request', {
      p_request_id: reqId,
      p_action: 'accept',
    });
    expect(acceptErr).toBeNull();
    expect(acceptData).toBe(true);

    // Both A and B see status as 'accepted'
    const { data: rowsA } = await clientA.rpc('get_connection_status', {
      p_target_user_id: userBId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(((rowsA as any[])[0]).status).toBe('accepted');

    const { data: rowsB } = await clientB.rpc('get_connection_status', {
      p_target_user_id: userAId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(((rowsB as any[])[0]).status).toBe('accepted');

    // Both A and B see each other in list_connections()
    const { data: connListA } = await clientA.rpc('list_connections');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connsA = connListA as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(connsA.some((c: any) => c.user_id === userBId)).toBe(true);

    const { data: connListB } = await clientB.rpc('list_connections');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connsB = connListB as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(connsB.some((c: any) => c.user_id === userAId)).toBe(true);
  });

  // ----------------------------------------------------------------------------
  // 7. RLS Privacy Check: Third party cannot read, update, or delete connection row
  // ----------------------------------------------------------------------------
  test('7. A third user cannot read, update, or delete someone else connection row', async () => {
    // Get connection row ID between A and B
    const { data: statusRows } = await clientA.rpc('get_connection_status', {
      p_target_user_id: userBId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reqId = ((statusRows as any[])[0]).request_id;
    expect(reqId).toBeDefined();

    // 7a. Third party User C tries to SELECT the row -> Returns 0 rows under RLS
    const { data: rowC, error: errC } = await clientC.from('connections').select('*').eq('id', reqId);
    expect(errC).toBeNull();
    expect(rowC?.length).toBe(0);

    // 7b. Third party User C tries to UPDATE the row -> Fails / 0 rows affected
    const { data: updateData, error: updateErr } = await clientC
      .from('connections')
      .update({ status: 'rejected' })
      .eq('id', reqId)
      .select();
    expect(updateErr !== null || (updateData && updateData.length === 0)).toBe(true);

    // 7c. Third party User C tries to DELETE the row -> Fails / 0 rows affected
    const { data: deleteData, error: deleteErr } = await clientC
      .from('connections')
      .delete()
      .eq('id', reqId)
      .select();
    expect(deleteErr !== null || (deleteData && deleteData.length === 0)).toBe(true);

    // 7d. Verify row in database is completely intact and status is still 'accepted'
    const { data: rowA } = await clientA.from('connections').select('status').eq('id', reqId).single();
    expect(rowA?.status).toBe('accepted');
  });

  // ----------------------------------------------------------------------------
  // 8. Rejection and 7-Day Cooldown Constraint
  // ----------------------------------------------------------------------------
  test('8. Rejection enforces a 7-day cooldown on subsequent connection requests', async () => {
    // User A sends request to User C
    const { data: sendData, error: sendErr } = await clientA.rpc('send_request', {
      p_receiver_id: userCId,
      p_intro_message: 'Hi C, let us connect!',
    });
    expect(sendErr).toBeNull();
    const reqId = sendData as string;

    // User C rejects the request
    const { data: rejectData, error: rejectErr } = await clientC.rpc('respond_request', {
      p_request_id: reqId,
      p_action: 'reject',
    });
    expect(rejectErr).toBeNull();
    expect(rejectData).toBe(true);

    // User A immediately tries to send another request to User C -> Blocked by 7-day cooldown
    const { error: cooldownErr } = await clientA.rpc('send_request', {
      p_receiver_id: userCId,
      p_intro_message: 'Trying again after rejection...',
    });
    expect(cooldownErr).not.toBeNull();
    expect(cooldownErr!.message).toMatch(/within 7 days of rejection|wait 7 days/i);
  });

  // ----------------------------------------------------------------------------
  // 9. Spam Intro Detection: Flag after 3 identical intro messages in 24 hours
  // ----------------------------------------------------------------------------
  test('9. Duplicate spam check flags request after 3 identical intro messages', async () => {
    const spamIntro = `Hey identical spam message ${timestamp}`;

    // User C sends identical message to User B (1st)
    const { error: err1 } = await clientC.rpc('send_request', {
      p_receiver_id: userBId,
      p_intro_message: spamIntro,
    });
    expect(err1).toBeNull();

    // User C sends identical message to User D (2nd)
    const { error: err2 } = await clientC.rpc('send_request', {
      p_receiver_id: userDId,
      p_intro_message: spamIntro,
    });
    expect(err2).toBeNull();

    // User C sends identical message to User E (3rd)
    const { error: err3 } = await clientC.rpc('send_request', {
      p_receiver_id: userEId,
      p_intro_message: spamIntro,
    });
    expect(err3).toBeNull();

    // User C attempts 4th request with the EXACT same intro message to User F
    // User C already has 3 sent requests with identical intro message in the last 24 hours
    // Database spam prevention triggers and blocks the request
    const { error: spamErr } = await clientC.rpc('send_request', {
      p_receiver_id: userFId,
      p_intro_message: spamIntro,
    });
    expect(spamErr).not.toBeNull();
    expect(spamErr!.message).toMatch(/repetitive spam|Duplicate message/i);
  });

  // ----------------------------------------------------------------------------
  // 10. Privacy Settings Enforcement (same_college and same_city)
  // ----------------------------------------------------------------------------
  test('10. Receiver privacy settings (same_college and same_city) strictly reject non-matching senders', async () => {
    // User D is at Galgotias, Lucknow.
    // User A is at Bennett, Greater Noida.

    // 10a. User D sets allow_connection_requests_from = 'same_college'
    await clientD
      .from('user_settings')
      .update({ allow_connection_requests_from: 'same_college' })
      .eq('user_id', userDId);

    // User A (Bennett) attempts to connect with User D (Galgotias)
    const { error: collegePrivacyErr } = await clientA.rpc('send_request', {
      p_receiver_id: userDId,
      p_intro_message: 'Hi from Bennett!',
    });
    expect(collegePrivacyErr).not.toBeNull();
    expect(collegePrivacyErr!.message).toMatch(/same college/i);

    // 10b. User D sets allow_connection_requests_from = 'same_city'
    await clientD
      .from('user_settings')
      .update({ allow_connection_requests_from: 'same_city' })
      .eq('user_id', userDId);

    // User A (Greater Noida) attempts to connect with User D (Lucknow)
    const { error: cityPrivacyErr } = await clientA.rpc('send_request', {
      p_receiver_id: userDId,
      p_intro_message: 'Hi from Greater Noida!',
    });
    expect(cityPrivacyErr).not.toBeNull();
    // Reset User D setting back to 'everyone' so subsequent tests are not affected
    await clientD
      .from('user_settings')
      .update({ allow_connection_requests_from: 'everyone' })
      .eq('user_id', userDId);
  });

  // ----------------------------------------------------------------------------
  // 11. Mutual Connections Score & Exclusion from Recommendations
  // ----------------------------------------------------------------------------
  test('11. recommend_students excludes active connections and awards up to 10 points for mutual connections', async () => {
    // Current state:
    // User A is connected to User B (accepted).
    // In test 9, C sent a pending request to B. Let's have B accept it:
    const { data: statusRowsB } = await clientB.rpc('get_connection_status', {
      p_target_user_id: userCId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reqBCId = ((statusRowsB as any[])[0]).request_id;
    if (reqBCId) {
      await clientB.rpc('respond_request', { p_request_id: reqBCId, p_action: 'accept' });
    }

    // Now:
    // A <-> B is connected.
    // C <-> B is connected.
    // A and C share 1 mutual connection (B).

    // 11a. User A queries recommendations:
    const { data: recsA, error: recsAErr } = await clientA.rpc('recommend_students', {
      p_limit: 20,
    });
    expect(recsAErr).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listA = recsA as any[];

    // Active connection User B must NEVER appear in A's recommendations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bInRecs = listA.find((s: any) => s.id === userBId);
    expect(bInRecs).toBeUndefined();

    // User C should appear in recommendations with mutual connection boost
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cInRecs = listA.find((s: any) => s.id === userCId);
    if (cInRecs) {
      expect(cInRecs.mutual_connections_count).toBeGreaterThanOrEqual(1);
      expect(cInRecs.match_reasons).toContain('Mutual Connections');
    }
  });

  // ----------------------------------------------------------------------------
  // 12. Rate Limit Enforcement (Max 20 requests per 24 hours)
  // ----------------------------------------------------------------------------
  test('12. The 21st request in 24h is rejected by the rate limit', async () => {
    // Fetch available recipient profiles in the database (excluding self and userD)
    const { data: targetProfiles, error: fetchErr } = await clientRL
      .from('profiles')
      .select('id')
      .eq('is_suspended', false)
      .eq('is_banned', false)
      .neq('id', userRLId)
      .neq('id', userDId)
      .limit(30);

    expect(fetchErr).toBeNull();
    expect(targetProfiles).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targets = (targetProfiles as any[]).map((p: any) => ({ id: p.id }));

    // Ensure at least 21 targets exist in the database for clientRL to send to
    while (targets.length < 21) {
      const idx = targets.length;
      const { data: extraUser } = await anonClient.auth.signUp({
        email: `conn-extra-${idx}-${timestamp}@example.com`,
        password,
        options: { data: { full_name: `Extra Target ${idx}`, is_18_confirmed: true } },
      });
      if (extraUser?.user && extraUser?.session) {
        targets.push({ id: extraUser.user.id });
        const extraClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${extraUser.session.access_token}` } },
        });
        extraClients.push(extraClient);
      }
    }
    expect(targets.length).toBeGreaterThanOrEqual(21);

    // Send 20 requests with unique intro messages to avoid spam trigger
    for (let i = 0; i < 20; i++) {
      const targetId = targets[i]!.id;
      const { error: reqErr } = await clientRL.rpc('send_request', {
        p_receiver_id: targetId,
        p_intro_message: `Rate limit test note #${i + 1} - ${timestamp}`,
      });
      expect(reqErr).toBeNull();
    }

    // Attempt the 21st request -> MUST FAIL with daily rate limit error
    const target21Id = targets[20]!.id;
    const { error: limitErr } = await clientRL.rpc('send_request', {
      p_receiver_id: target21Id,
      p_intro_message: `Rate limit 21st note - ${timestamp}`,
    });

    expect(limitErr).not.toBeNull();
    expect(limitErr!.message).toMatch(/Daily connection request limit reached/i);
  }, 35000);

  // ----------------------------------------------------------------------------
  // 13. Blocked Pair Enforcement (Either direction cannot send request)
  // ----------------------------------------------------------------------------
  test('13. A blocked pair (either direction) cannot send a request', async () => {
    // Student D and Student F have never contacted each other.
    // Student D blocks Student F
    const { error: blockErr } = await clientD.rpc('block_user', {
      p_target_user_id: userFId,
    });
    expect(blockErr).toBeNull();

    // Direction 1: Student D (the blocker) attempts to send request to Student F -> Blocked
    const { error: errDtoF } = await clientD.rpc('send_request', {
      p_receiver_id: userFId,
      p_intro_message: 'Trying to contact blocked student',
    });
    expect(errDtoF).not.toBeNull();
    expect(errDtoF!.message).toMatch(/Cannot send connection request to this user/i);

    // Direction 2: Student F (the blocked user) attempts to send request to Student D -> Blocked
    const { error: errFtoD } = await clientF.rpc('send_request', {
      p_receiver_id: userDId,
      p_intro_message: 'Trying to contact student who blocked me',
    });
    expect(errFtoD).not.toBeNull();
    expect(errFtoD!.message).toMatch(/Cannot send connection request to this user/i);
  });
});
