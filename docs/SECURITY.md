# ApnaCampus — Security & Privacy Architecture

## Security Invariants

### 1. Zero Service-Role Key Exposure
- The mobile application bundle strictly contains only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- CI/CD build pipelines and static analysis tools reject builds containing `SUPABASE_SERVICE_ROLE_KEY`.
- All privileged operations (account deletion, push notification dispatching, content moderation, ban enforcement) run inside isolated Supabase Edge Functions.

### 2. Row Level Security (RLS) Deny-by-Default
- Every table has RLS explicitly enabled.
- Queries default to empty results unless an explicit permissive policy evaluates to true for `auth.uid()`.
- Automated test suites verify cross-user write and read restrictions for all endpoints.

### 3. Student Privacy & India DPDP Act Compliance
- **18+ by Design**: Mandatory age confirmation / DOB verification at signup. Minors require parental verification under the DPDP Act and are excluded during MVP.
- **No Continuous Tracking / Exact Coordinates**: Locations are strictly predefined lookup cities/areas. No GPS coordinates stored or rendered.
- **Silent Blocking**: Blocked users receive zero notification and their requests/messages silently fail or become invisible.
- **Reporter Anonymity**: When a user reports content or an account, the reporter's identity is strictly hidden from the reported party.
- **Account Deletion Retention**: Account deletion removes auth credentials, avatar assets, and personally identifiable profile records, anonymizing messages according to retention schedules.
