# ApnaCampus — Database Architecture & Schema Specification

## Schema Design Principles
1. **Row Level Security (RLS)** is enabled on **every** table with `DENY BY DEFAULT`.
2. All seed data lives in `supabase/seed.sql` with `is_seed = true`.
3. Soft deletes / privacy-respecting visibility settings govern user discovery.
4. No continuous GPS or exact coordinates are ever stored.

## Core Relational Tables Roadmap

### Phase 1: Profiles & Lookup Data
- `cities`: Predefined list of student hometowns and educational hubs.
- `colleges`: Demo colleges with city associations.
- `courses`: Academic courses (e.g., B.Tech, BCA, MBBS, MBA).
- `branches`: Branches / specializations (e.g., CSE, ECE, Mechanical).
- `profiles`: Extends `auth.users`, includes `home_city_id`, `current_city_id`, `college_id`, `course_id`, `branch_id`, `year_of_study`, `bio`, `is_active`, `is_seed`.
- `user_settings`: User privacy, discoverability, and notification category preferences.
- `college_suggestions`: Pending student-submitted college additions (avoids unvetted public table writes).

### Phase 3: Connections
- `connections`: Unified connection table with sender_id, receiver_id, status (`pending`, `accepted`, `rejected`, `blocked`), intro message, and pair uniqueness.

### Phase 4: Direct Chat
- `conversations`: 1-on-1 conversations between accepted connections.
- `conversation_participants`: Participant mapping and unread counters.
- `messages`: Chat messages with soft delete and rate limit enforcement.
- `hidden_messages`: "Delete for me" per-user message suppression.

### Phase 5: Campus & Hometown Communities
- `groups`: Official and student-created groups (types: college, hometown, course, branch, study, travel).
- `group_members`: Membership status and roles (`owner`, `admin`, `member`).
- `group_messages`: Real-time group discussion feed.

### Phase 6: Study Help
- `study_posts`: Course/year-tagged peer help questions.
- `study_replies`: Peer replies with helpfulness upvotes.
- `study_partner_profiles`: Opt-in, revocable study partner discovery records.

### Phase 7: Travel Coordination ("Going Home")
- `travel_groups`: Student travel boards (origin, destination, date, time window, vehicle mode, capacity). Auto-expire 24h post-date.
- `travel_group_members`: Approved travel companions.
