-- Clean up accumulated test users from prior test runs
DELETE FROM auth.users
WHERE email LIKE 'disc-%'
   OR email LIKE 'conn-%'
   OR email LIKE 'rls-%';
