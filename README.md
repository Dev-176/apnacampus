# ApnaCampus

> **"Apne Shehar Se, Apne Campus Tak."**

ApnaCampus is a production-grade mobile community app built for Indian college students who move to new cities for higher education. It enables students to discover peers from their hometown studying at colleges nearby, form campus communities, collaborate on study challenges, and coordinate safe homeward travel.

---

## Tech Stack
- **Frontend**: Expo SDK + React Native + Expo Router + TypeScript (strict)
- **Backend**: Supabase (Postgres, Auth, Realtime, Storage, Edge Functions)
- **State Management**: TanStack Query (server state), Zustand (local UI state)
- **Forms**: React Hook Form + Zod validation
- **Styling**: Design system tokens in `constants/theme.ts` (Deep teal `#005F60`, Warm saffron `#FF9933`)

---

## Project Structure
```
app/            Expo Router routes only
components/     Reusable UI primitives
features/       Domain feature modules (auth, profile, discover, connections, chat, groups, travel, etc.)
lib/            Supabase client, query client, env validation
services/       Shared service modules
constants/      Theme tokens, colors, typography, spacing
docs/           Engineering specifications (SETUP.md, DATABASE.md, ARCHITECTURE.md, SECURITY.md)
supabase/       Migrations, seed data, and Edge Functions
```

---

## Getting Started
See [SETUP.md](docs/SETUP.md) for full setup instructions, running on an Android emulator, and configuring Supabase.
