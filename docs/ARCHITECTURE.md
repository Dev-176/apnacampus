# ApnaCampus — System Architecture & Component Design

## High-Level Architecture
ApnaCampus is built with an Android-first React Native Expo frontend and a Supabase backend:

- **Frontend**: Expo Router (file-based navigation), React Native, TanStack Query for remote state caching, Zustand for lightweight local UI state, and React Hook Form + Zod for robust input validation.
- **Backend**: Supabase Postgres with Row Level Security (RLS) on all tables, Supabase Auth with secure JWT session persistence in Android Keystore via `expo-secure-store`, Supabase Storage for avatar media with strict bucket RLS, and Supabase Realtime for instant messaging.
- **Privileged Backend**: Supabase Edge Functions execute administrative, moderation, and push notification tasks with service-role security, keeping mobile client bundles strictly unprivileged.

## Directory Responsibilities
```
app/            File-based routing (screens only)
components/     Reusable UI primitives (Buttons, Inputs, Cards, Badges, etc.)
features/       Domain modules (auth, profile, discover, chat, travel, etc.)
  └── [feature]/
        ├── api/       API hooks and queries (TanStack Query)
        ├── components/ Feature-specific UI
        └── types.ts   Feature TypeScript types
lib/            Core singletons (supabase.ts, queryClient.ts, env.ts)
services/       Shared business logic & service adapters
constants/      Theme tokens, system configuration, design system
docs/           Engineering specifications and guides
supabase/       Migrations, seed data, and Edge Functions
```

## Admin Architecture (Phase 10 Stubs)
- `admin_roles` table specifying `super_admin`, `moderator`, and `support`.
- RLS helper function `is_admin(role)` verifying role membership from auth JWT.
- Normal users have zero access to admin views or functions.
