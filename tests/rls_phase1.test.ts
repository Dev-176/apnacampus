import * as fs from 'fs';
import * as path from 'path';

/**
 * ==============================================================================
 * STATIC CHECKS: Phase 1 Schema & SQL Policy Declarations
 * ==============================================================================
 * WARNING: These are STATIC TEXT / SCHEMA CHECKS, NOT live RLS verification.
 * They verify that SQL migration definitions contain the required syntax,
 * constraints, and policies.
 *
 * TODO (Live RLS Verification Gap):
 * 1. Docker is not installed on this host, preventing local `supabase start`.
 * 2. Remote Supabase project is not linked yet via `supabase link`.
 * 3. True RLS verification requires executing mutations against a live Postgres
 *    instance using two authenticated users with real JWTs.
 * 4. See `tests/rls_live.test.ts` for the live test suite that verifies:
 *    - RLS is enabled on every table (querying pg_class.relrowsecurity)
 *    - User B cannot update User A's profile
 *    - Hidden and suspended profiles are not readable by other users
 *    - Non-owners cannot write to another user's avatar storage folder
 * ==============================================================================
 */

describe('Static Checks: Phase 1 Schema & Policy Declarations (NOT RLS Verification)', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20261001000000_phase1_auth_onboarding.sql'
  );

  let migrationSQL: string;

  beforeAll(() => {
    migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  });

  const tables = [
    'cities',
    'colleges',
    'courses',
    'branches',
    'college_suggestions',
    'profiles',
    'user_settings',
  ];

  test.each(tables)('static check: table "%s" has ROW LEVEL SECURITY enabled declaration', (tableName) => {
    const rlsRegex = new RegExp(
      `ALTER\\s+TABLE\\s+(?:public\\.)?${tableName}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      'i'
    );
    expect(rlsRegex.test(migrationSQL)).toBe(true);
  });

  it('static check: storage.objects has re-runnable avatar policies declared and does not alter system table', () => {
    expect(migrationSQL).toContain('DROP POLICY IF EXISTS "Public can view avatar objects" ON storage.objects');
    expect(migrationSQL).toContain('DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects');
    expect(migrationSQL).toContain('CREATE POLICY "Users can upload their own avatar"');
    // Supabase pre-enables RLS on storage.objects; migration must NOT alter table storage.objects
    expect(migrationSQL).not.toContain('ALTER TABLE storage.objects');
  });

  it('static check: profile update policy enforces auth.uid() = id', () => {
    const profileUpdatePolicyRegex = /CREATE\s+POLICY\s+"Users can update only their own profile"[\s\S]*?WITH\s+CHECK\s*\(\s*auth\.uid\(\)\s*=\s*id\s*\)/i;
    expect(profileUpdatePolicyRegex.test(migrationSQL)).toBe(true);
  });

  it('static check: avatars storage bucket policy requires matching user folder in path', () => {
    const storageFolderCheckRegex = /(?:\(storage\.foldername\(name\)\)\[1\]\s*=\s*auth\.uid\(\)::text|auth\.uid\(\)::text\s*=\s*\(storage\.foldername\(name\)\)\[1\])/i;
    expect(storageFolderCheckRegex.test(migrationSQL)).toBe(true);
  });

  it('static check: trigger creates profile row on auth.users insert with is_verified default false', () => {
    const triggerRegex = /CREATE\s+TRIGGER\s+on_auth_user_created[\s\S]*?AFTER\s+INSERT\s+ON\s+auth\.users/i;
    expect(triggerRegex.test(migrationSQL)).toBe(true);
    expect(migrationSQL).toContain('is_verified');
  });

  it('static check: cities table has region column declared', () => {
    expect(migrationSQL).toContain('region TEXT');
    expect(migrationSQL).toContain('idx_cities_region');
  });
});
