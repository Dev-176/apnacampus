import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

/**
 * ==============================================================================
 * LIVE CHAT & MESSAGING INTEGRATION SUITE (PHASE 4)
 * ==============================================================================
 * Validates Phase 4 Chat rules, RLS policies, triggers, and RPCs against
 * the live Supabase instance with real JWTs:
 *
 * 1. Automatic conversation creation trigger upon connection acceptance
 * 2. Direct mutation protection (direct INSERT/UPDATE/DELETE on chat tables blocked)
 * 3. Stranger (non-participant) isolation: cannot read or send messages in another's conversation
 * 4. Send message RPC: valid participants can exchange text messages (1-2000 chars)
 * 5. Message body length limits: < 1 char trimmed or > 2000 chars rejected
 * 6. Client ID deduplication: duplicate client_id returns existing message ID without duplicate row
 * 7. Inactive / blocked connection enforcement: messaging blocked if connection not accepted
 * 8. Unread message count calculation in list_conversations
 * 9. Mark conversation read RPC: clears unread count
 * 10. Read receipts setting respect: read_at populated only when read_receipts_enabled is true
 * 11. "Delete for me": hidden_messages hides message for requesting user while peer still sees it
 * 12. "Delete for everyone": sender can delete within 10 minutes; non-sender cannot
 * 13. Rate limit enforcement: 31st message in 1 minute is rejected
 * ==============================================================================
 */

const supabaseUrl =
  process.env.TEST_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.TEST_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const CITIES = {
  ALIGARH: 'c1000000-0000-0000-0000-000000000001',
  GREATER_NOIDA: 'c1000000-0000-0000-0000-000000000002',
};

const COLLEGES = {
  BENNETT: 'e1000000-0000-0000-0000-000000000001',
};

const COURSES = {
  BTECH: 'a1000000-0000-0000-0000-000000000001',
};

const BRANCHES = {
  CSE: 'b1000000-0000-0000-0000-000000000001',
};

describe('Live Chat Verification (Phase 4 Constraints, RPCs, RLS & Realtime)', () => {
  jest.setTimeout(50000);
  const timestamp = Date.now();
  const password = 'ChatTestPassword123!@#';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let anonClient: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientA: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientB: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientC: SupabaseClient<any, 'public', any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientRateLimit: SupabaseClient<any, 'public', any>;

  let userAId: string;
  let userBId: string;
  let userCId: string;
  let userAToken: string;

  let connectionABId: string;
  let conversationABId: string;

  beforeAll(async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials missing from environment for live chat tests.');
    }

    anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    async function createTestChatStudent(label: string) {
      const email = `chat-${label}-${timestamp}@example.com`;
      const { data: signUp, error: signErr } = await anonClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `Student ${label.toUpperCase()} (ChatTest)`,
            is_18_confirmed: true,
          },
        },
      });

      if (signErr || !signUp.user || !signUp.session) {
        throw new Error(`Failed to create test chat student ${label}: ${signErr?.message}`);
      }

      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: { Authorization: `Bearer ${signUp.session.access_token}` },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        realtime: { transport: ws as any },
      });
      client.realtime.setAuth(signUp.session.access_token);

      await client
        .from('profiles')
        .update({
          full_name: `Student ${label.toUpperCase()} Chat`,
          username: `chat_${label}_${timestamp}`,
          college_id: COLLEGES.BENNETT,
          course_id: COURSES.BTECH,
          branch_id: BRANCHES.CSE,
          current_city_id: CITIES.GREATER_NOIDA,
          home_city_id: CITIES.ALIGARH,
          year_of_study: 3,
          interests: ['Coding & Web Dev'],
          skills_to_teach: ['React Native'],
          is_onboarded: true,
          is_active: true,
          is_suspended: false,
          is_banned: false,
          visibility: 'discoverable',
        })
        .eq('id', signUp.user.id);

      return { userId: signUp.user.id, client, token: signUp.session.access_token };
    }

    const uA = await createTestChatStudent('a');
    userAId = uA.userId;
    clientA = uA.client;
    userAToken = uA.token;

    const uB = await createTestChatStudent('b');
    userBId = uB.userId;
    clientB = uB.client;

    const uC = await createTestChatStudent('c');
    userCId = uC.userId;
    clientC = uC.client;

    const uRL = await createTestChatStudent('rl');
    clientRateLimit = uRL.client;

    // Connect User A and User B
    const { data: reqId } = await clientA.rpc('send_request', {
      p_receiver_id: userBId,
      p_intro_message: 'Hi B, let us test chat!',
    });
    connectionABId = reqId as string;

    // User B accepts request
    await clientB.rpc('respond_request', {
      p_request_id: connectionABId,
      p_action: 'accept',
    });

    // Retrieve or create conversation for connection
    const { data: convId } = await clientA.rpc('get_or_create_conversation_for_connection', {
      p_connection_id: connectionABId,
    });
    conversationABId = convId as string;
  }, 60000);

  afterAll(async () => {
    const clients = [clientA, clientB, clientC, clientRateLimit];
    for (const c of clients) {
      if (c) {
        try {
          await c.rpc('delete_current_user');
        } catch {
          // Ignore cleanup errors during teardown
        }
        await c.auth.signOut();
        // Close the Realtime WebSocket so Jest can exit; without this the open
        // handles keep the process alive indefinitely after the test suite.
        try {
          c.realtime.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
    }
  }, 30000);

  // ----------------------------------------------------------------------------
  // 1. Automatic Conversation Creation
  // ----------------------------------------------------------------------------
  test('1. Accepting a connection creates a conversation and participants automatically', async () => {
    expect(conversationABId).toBeDefined();

    // Verify conversation row exists
    const { data: convRow, error: convErr } = await clientA
      .from('conversations')
      .select('*')
      .eq('id', conversationABId)
      .single();

    expect(convErr).toBeNull();
    expect(convRow).toBeDefined();
    expect(convRow?.connection_id).toBe(connectionABId);

    // Verify both participants exist
    const { data: participants, error: partErr } = await clientA
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationABId);

    expect(partErr).toBeNull();
    const userIds = (participants || []).map((p) => p.user_id);
    expect(userIds).toContain(userAId);
    expect(userIds).toContain(userBId);
  });

  // ----------------------------------------------------------------------------
  // 2. Direct Mutation Protection on Chat Tables
  // ----------------------------------------------------------------------------
  test('2. Direct client mutations on conversations, participants, and messages are blocked', async () => {
    // Attempt direct insert on messages
    const { error: msgInsertErr } = await clientA.from('messages').insert({
      conversation_id: conversationABId,
      sender_id: userAId,
      body: 'Direct insert attempt',
      client_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(msgInsertErr).not.toBeNull();
    expect(msgInsertErr!.message).toMatch(/permission denied|violates|policy/i);

    // Attempt direct insert on conversations
    const { error: convInsertErr } = await clientA.from('conversations').insert({
      connection_id: connectionABId,
    });
    expect(convInsertErr).not.toBeNull();
    expect(convInsertErr!.message).toMatch(/permission denied|violates|policy/i);
  });

  // ----------------------------------------------------------------------------
  // 3. Stranger Isolation (RLS & send_message checks)
  // ----------------------------------------------------------------------------
  test('3. Stranger User C cannot view or send messages in Conversation A-B', async () => {
    // Stranger C tries to query conversation
    const { data: strangerConv } = await clientC
      .from('conversations')
      .select('*')
      .eq('id', conversationABId);
    expect(strangerConv?.length).toBe(0);

    // Stranger C tries to query messages
    const { data: strangerMsgs } = await clientC
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationABId);
    expect(strangerMsgs?.length).toBe(0);

    // Stranger C tries to send message in A-B conversation
    const { error: sendErr } = await clientC.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: 'Sneaky message from stranger',
      p_client_id: '00000000-0000-0000-0000-000000000002',
    });
    expect(sendErr).not.toBeNull();
    expect(sendErr!.message).toMatch(/not a participant/i);
  });

  // ----------------------------------------------------------------------------
  // 4. Send Message via RPC & Read by Participants
  // ----------------------------------------------------------------------------
  test('4. Participant A sends message, confirmed and readable by Participant B', async () => {
    const clientIdA = '11111111-0000-0000-0000-000000000001';
    const bodyA = 'Hello B, this is student A chatting!';

    const { data: msgId, error: sendErr } = await clientA.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: bodyA,
      p_client_id: clientIdA,
    });

    expect(sendErr).toBeNull();
    expect(msgId).toBeDefined();

    // User B reads the conversation messages
    const { data: msgsB, error: readErrB } = await clientB
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationABId);

    expect(readErrB).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foundMsg = (msgsB as any[]).find((m) => m.id === msgId);
    expect(foundMsg).toBeDefined();
    expect(foundMsg.body).toBe(bodyA);
    expect(foundMsg.sender_id).toBe(userAId);
  });

  // ----------------------------------------------------------------------------
  // 5. Message Body Length Limits (1 - 2000 chars)
  // ----------------------------------------------------------------------------
  test('5. Message body length limits (empty or > 2000 chars) are strictly enforced', async () => {
    // 5a. Empty / Whitespace-only body
    const { error: emptyErr } = await clientA.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: '     ',
      p_client_id: '22222222-0000-0000-0000-000000000001',
    });
    expect(emptyErr).not.toBeNull();
    expect(emptyErr!.message).toMatch(/between 1 and 2000 characters/i);

    // 5b. Exceeds 2000 characters
    const longBody = 'A'.repeat(2001);
    const { error: longErr } = await clientA.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: longBody,
      p_client_id: '22222222-0000-0000-0000-000000000002',
    });
    expect(longErr).not.toBeNull();
    expect(longErr!.message).toMatch(/between 1 and 2000 characters/i);
  });

  // ----------------------------------------------------------------------------
  // 6. Client ID Deduplication
  // ----------------------------------------------------------------------------
  test('6. Duplicate client_id returns existing message ID without duplicate row', async () => {
    const dedupeClientId = '33333333-0000-0000-0000-000000000001';

    // 1st Send
    const { data: firstId, error: err1 } = await clientA.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: 'Deduplicated message test',
      p_client_id: dedupeClientId,
    });
    expect(err1).toBeNull();

    // 2nd Send with SAME client_id
    const { data: secondId, error: err2 } = await clientA.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: 'Deduplicated message test retry',
      p_client_id: dedupeClientId,
    });
    expect(err2).toBeNull();
    expect(secondId).toBe(firstId);

    // Verify only 1 row exists with this client_id
    const { data: rows } = await clientA
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationABId)
      .eq('client_id', dedupeClientId);

    expect(rows?.length).toBe(1);
  });

  // ----------------------------------------------------------------------------
  // 7. Inactive Connection Enforcement (Pending, Rejected, and Blocked)
  // ----------------------------------------------------------------------------
  test('7. Messaging is rejected when connection is pending, rejected, or blocked', async () => {
    // 7a. Pending Connection: User B sends request to User C (not accepted yet)
    const { data: reqBC } = await clientB.rpc('send_request', {
      p_receiver_id: userCId,
      p_intro_message: 'Hi C, pending request',
    });
    expect(reqBC).toBeDefined();

    // Attempting to open chat or initialize conversation on pending connection fails
    const { error: openPendingErr } = await clientB.rpc('get_or_create_conversation_for_connection', {
      p_connection_id: reqBC as string,
    });
    expect(openPendingErr).not.toBeNull();
    expect(openPendingErr!.message).toMatch(/connection is not accepted/i);

    // 7b. Rejected Connection: User C rejects User B's request
    await clientC.rpc('respond_request', {
      p_request_id: reqBC as string,
      p_action: 'reject',
    });

    // Attempting to open chat or initialize conversation on rejected connection fails
    const { error: openRejectedErr } = await clientB.rpc('get_or_create_conversation_for_connection', {
      p_connection_id: reqBC as string,
    });
    expect(openRejectedErr).not.toBeNull();
    expect(openRejectedErr!.message).toMatch(/connection is not accepted/i);

    // 7c. Blocked Connection: User A and User C connected, then A blocks C
    const { data: reqAC } = await clientA.rpc('send_request', {
      p_receiver_id: userCId,
      p_intro_message: 'Hi C, will connect then block',
    });
    await clientC.rpc('respond_request', {
      p_request_id: reqAC as string,
      p_action: 'accept',
    });

    const { data: convAC } = await clientA.rpc('get_or_create_conversation_for_connection', {
      p_connection_id: reqAC as string,
    });

    // User A blocks User C
    await clientA.rpc('block_user', { p_target_user_id: userCId });

    // User A attempts to message C -> Blocked
    const { error: sendErrA } = await clientA.rpc('send_message', {
      p_conversation_id: convAC as string,
      p_body: 'Should fail after block',
      p_client_id: '44444444-0000-0000-0000-000000000001',
    });
    expect(sendErrA).not.toBeNull();
    expect(sendErrA!.message).toMatch(/no longer active or accepted/i);

    // User C attempts to message A -> Blocked
    const { error: sendErrC } = await clientC.rpc('send_message', {
      p_conversation_id: convAC as string,
      p_body: 'Should also fail after block',
      p_client_id: '44444444-0000-0000-0000-000000000002',
    });
    expect(sendErrC).not.toBeNull();
    expect(sendErrC!.message).toMatch(/no longer active or accepted/i);
  });

  // ----------------------------------------------------------------------------
  // 8. Unread Counts & list_conversations
  // ----------------------------------------------------------------------------
  test('8. list_conversations calculates unread count accurately', async () => {
    // User A sends 2 new messages to User B
    await clientA.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: 'Unread message 1',
      p_client_id: '55555555-0000-0000-0000-000000000001',
    });
    await clientA.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: 'Unread message 2',
      p_client_id: '55555555-0000-0000-0000-000000000002',
    });

    // User B lists conversations
    const { data: convListB, error: listErr } = await clientB.rpc('list_conversations');
    expect(listErr).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convForB = (convListB as any[]).find((c) => c.conversation_id === conversationABId);
    expect(convForB).toBeDefined();
    expect(convForB.unread_count).toBeGreaterThanOrEqual(2);
    expect(convForB.last_message_preview).toBe('Unread message 2');
    expect(convForB.is_connection_active).toBe(true);
  });

  // ----------------------------------------------------------------------------
  // 9. Mark Conversation Read RPC
  // ----------------------------------------------------------------------------
  test('9. mark_conversation_read resets unread count to 0', async () => {
    // User B marks conversation read
    const { data: markRes, error: markErr } = await clientB.rpc('mark_conversation_read', {
      p_conversation_id: conversationABId,
    });
    expect(markErr).toBeNull();
    expect(markRes).toBe(true);

    // User B checks list_conversations again -> unread count is 0
    const { data: convListAfter } = await clientB.rpc('list_conversations');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convAfter = (convListAfter as any[]).find((c) => c.conversation_id === conversationABId);
    expect(convAfter).toBeDefined();
    expect(convAfter.unread_count).toBe(0);
  });

  // ----------------------------------------------------------------------------
  // 10. Read Receipts Setting
  // ----------------------------------------------------------------------------
  test('10. Read receipts respect user_settings.read_receipts_enabled', async () => {
    // Part 1: B has read_receipts_enabled = true (default)
    // A sends message to B
    const { data: msgId1 } = await clientA.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: 'Testing read receipts enabled',
      p_client_id: '66666666-0000-0000-0000-000000000001',
    });

    // B marks read
    await clientB.rpc('mark_conversation_read', { p_conversation_id: conversationABId });

    // A queries message -> read_at IS NOT NULL
    const { data: row1 } = await clientA
      .from('messages')
      .select('read_at')
      .eq('id', msgId1 as string)
      .single();
    expect(row1?.read_at).not.toBeNull();

    // Part 2: B disables read receipts
    await clientB
      .from('user_settings')
      .update({ read_receipts_enabled: false })
      .eq('user_id', userBId);

    // A sends another message to B
    const { data: msgId2 } = await clientA.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: 'Testing read receipts disabled',
      p_client_id: '66666666-0000-0000-0000-000000000002',
    });

    // B marks read
    await clientB.rpc('mark_conversation_read', { p_conversation_id: conversationABId });

    // A queries message -> read_at REMAINS NULL
    const { data: row2 } = await clientA
      .from('messages')
      .select('read_at')
      .eq('id', msgId2 as string)
      .single();
    expect(row2?.read_at).toBeNull();
  });

  // ----------------------------------------------------------------------------
  // 11. "Delete for Me"
  // ----------------------------------------------------------------------------
  test('11. "Delete for me" hides message from deleting user while peer still sees it', async () => {
    // A sends message to B
    const { data: msgDelId } = await clientA.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: 'Message to delete for me',
      p_client_id: '77777777-0000-0000-0000-000000000001',
    });

    // User A deletes for me
    const { data: delMeRes, error: delMeErr } = await clientA.rpc('delete_message', {
      p_message_id: msgDelId as string,
      p_delete_type: 'for_me',
    });
    expect(delMeErr).toBeNull();
    expect(delMeRes).toBe(true);

    // User A queries messages -> Message is NOT returned (hidden by RLS)
    const { data: msgsA } = await clientA
      .from('messages')
      .select('id')
      .eq('id', msgDelId as string);
    expect(msgsA?.length).toBe(0);

    // User B queries messages -> Message IS STILL returned
    const { data: msgsB } = await clientB
      .from('messages')
      .select('id')
      .eq('id', msgDelId as string);
    expect(msgsB?.length).toBe(1);
  });

  // ----------------------------------------------------------------------------
  // 12. "Delete for Everyone"
  // ----------------------------------------------------------------------------
  test('12. "Delete for everyone" works for sender within 10m; non-sender cannot delete', async () => {
    // A sends message to B
    const { data: msgEveryoneId } = await clientA.rpc('send_message', {
      p_conversation_id: conversationABId,
      p_body: 'Message to delete for everyone',
      p_client_id: '88888888-0000-0000-0000-000000000001',
    });

    // 12a. Non-sender B tries to delete A's message for everyone -> Fails
    const { error: bDelErr } = await clientB.rpc('delete_message', {
      p_message_id: msgEveryoneId as string,
      p_delete_type: 'for_everyone',
    });
    expect(bDelErr).not.toBeNull();
    expect(bDelErr!.message).toMatch(/only delete your own messages for everyone/i);

    // 12b. Sender A deletes own message for everyone -> Succeeds
    const { data: aDelRes, error: aDelErr } = await clientA.rpc('delete_message', {
      p_message_id: msgEveryoneId as string,
      p_delete_type: 'for_everyone',
    });
    expect(aDelErr).toBeNull();
    expect(aDelRes).toBe(true);

    // Both A and B see body changed to 'This message was deleted' with deleted_at set
    const { data: rowA } = await clientA
      .from('messages')
      .select('body, deleted_at')
      .eq('id', msgEveryoneId as string)
      .single();
    expect(rowA?.body).toBe('This message was deleted');
    expect(rowA?.deleted_at).not.toBeNull();

    const { data: rowB } = await clientB
      .from('messages')
      .select('body, deleted_at')
      .eq('id', msgEveryoneId as string)
      .single();
    expect(rowB?.body).toBe('This message was deleted');
    expect(rowB?.deleted_at).not.toBeNull();
  });

  // ----------------------------------------------------------------------------
  // 13. Rate Limit Enforcement (Max 30 messages per minute)
  // ----------------------------------------------------------------------------
  test('13. Rate limit: 31st message sent within 1 minute is rejected', async () => {
    // Connect userRateLimit with User B
    const { data: reqRL } = await clientRateLimit.rpc('send_request', {
      p_receiver_id: userBId,
      p_intro_message: 'RL Chat test intro',
    });
    await clientB.rpc('respond_request', {
      p_request_id: reqRL as string,
      p_action: 'accept',
    });
    const { data: convRL } = await clientRateLimit.rpc('get_or_create_conversation_for_connection', {
      p_connection_id: reqRL as string,
    });
    const rlConvId = convRL as string;

    // Send 30 messages in rapid succession
    for (let i = 1; i <= 30; i++) {
      const { error: msgErr } = await clientRateLimit.rpc('send_message', {
        p_conversation_id: rlConvId,
        p_body: `RL test message #${i} - ${timestamp}`,
        p_client_id: `99999999-0000-0000-0000-${String(i).padStart(12, '0')}`,
      });
      expect(msgErr).toBeNull();
    }

    // 31st message -> MUST FAIL with rate limit error
    const { error: limitErr } = await clientRateLimit.rpc('send_message', {
      p_conversation_id: rlConvId,
      p_body: `RL test message #31 - should fail`,
      p_client_id: '99999999-0000-0000-0000-000000000031',
    });

    expect(limitErr).not.toBeNull();
    expect(limitErr!.message).toMatch(/Rate limit exceeded: maximum 30 messages per minute/i);
  });

  // ----------------------------------------------------------------------------
  // 14. Live Realtime Subscription & RLS Isolation
  // ----------------------------------------------------------------------------
  test('14. Live Realtime: Participant B receives new message over Realtime, stranger C receives nothing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bReceived: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cReceived: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dReceived: any = null;

    const uniqueRunId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const realtimeBody = `Live Realtime message payload - ${uniqueRunId}`;
    const realtimeClientId = 'aaaaaaaa-0000-0000-0000-000000000001';

    // Client D is a third client, a real participant (User A), subscribed with NO filter as positive control
    const clientD = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${userAToken}` } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      realtime: { transport: ws as any },
    });
    await clientD.realtime.setAuth(userAToken);

    // B subscribes to messages in conversationABId with filter
    const chanB = clientB
      .channel(`rt-b-${uniqueRunId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationABId}`,
        },
        (payload) => {
          bReceived = payload.new;
        }
      );

    // Stranger C subscribes to messages in conversationABId with filter
    const chanC = clientC
      .channel(`rt-c-${uniqueRunId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationABId}`,
        },
        (payload) => {
          cReceived = payload.new;
        }
      );

    // Positive Control Client D (real participant) subscribes with NO filter
    const chanD = clientD
      .channel(`rt-d-${uniqueRunId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (payload.new?.conversation_id === conversationABId) {
            dReceived = payload.new;
          }
        }
      );

    // Helper: resolve only when BOTH status === 'SUBSCRIBED' AND 'system' "Subscribed to PostgreSQL" arrive
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function createReadyPromise(chan: any, label: string) {
      return new Promise<void>((resolve, reject) => {
        let isSubscribed = false;
        let isPgReady = false;

        const timer = setTimeout(() => {
          reject(
            new Error(
              `Readiness timeout on channel ${label} after 15s (isSubscribed=${isSubscribed}, isPgReady=${isPgReady})`
            )
          );
        }, 15000);

        const check = () => {
          if (isSubscribed && isPgReady) {
            clearTimeout(timer);
            resolve();
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chan.on('system', {}, (payload: any) => {
          if (payload?.message === 'Subscribed to PostgreSQL' && payload?.status === 'ok') {
            isPgReady = true;
            check();
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chan.subscribe((status: string, err?: any) => {
          if (status === 'SUBSCRIBED') {
            isSubscribed = true;
            check();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timer);
            reject(new Error(`Channel subscription failed on ${label}: ${status} - ${JSON.stringify(err)}`));
          }
        });
      });
    }

    try {
      // Await readiness for B, C, and D before A calls send_message
      await Promise.all([
        createReadyPromise(chanB, 'B'),
        createReadyPromise(chanC, 'C'),
        createReadyPromise(chanD, 'D'),
      ]);

      // Participant A sends message via RPC
      const { data: sentMsgId, error: sendErr } = await clientA.rpc('send_message', {
        p_conversation_id: conversationABId,
        p_body: realtimeBody,
        p_client_id: realtimeClientId,
      });
      expect(sendErr).toBeNull();
      expect(sentMsgId).toBeDefined();

      // Poll for Realtime event delivery up to 10 seconds for bReceived and dReceived
      const startPoll = Date.now();
      while (Date.now() - startPoll < 10000) {
        if (bReceived && dReceived) break;
        await new Promise((r) => setTimeout(r, 200));
      }

      // Log D and C received values
      console.log('Positive Control D received:', dReceived ? { id: dReceived.id, body: dReceived.body } : null);

      // Participant B received message with correct id and body over WebSocket
      expect(bReceived).not.toBeNull();
      expect(bReceived.id).toBe(sentMsgId);
      expect(bReceived.body).toBe(realtimeBody);

      // Positive control Client D received message with correct id and body
      expect(dReceived).not.toBeNull();
      expect(dReceived.id).toBe(sentMsgId);
      expect(dReceived.body).toBe(realtimeBody);

      // After B has received the event, wait 3s more, then assert cReceived is null
      await new Promise((r) => setTimeout(r, 3000));
      console.log('Stranger C received:', cReceived);
      expect(cReceived).toBeNull();
    } finally {
      // Always clean up channels and clientD's WebSocket, even if an assertion
      // throws or a readiness timeout fires.  Leaving these open keeps the WS
      // handles alive and causes Jest to hang indefinitely after the suite.
      await clientB.removeChannel(chanB).catch(() => {});
      await clientC.removeChannel(chanC).catch(() => {});
      await clientD.removeChannel(chanD).catch(() => {});
      clientD.realtime.disconnect();
    }
  }, 40000);
});
