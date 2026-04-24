# Project

## Overview
Web-based task management and study planning application for university students. Built as final year project for BSc Computer Science at the University of Westminster (module 6COSC023W).

The app combines task management with weighted academic grade tracking, AI-powered study planning, and Monte Carlo grade prediction. It targets the gap between general productivity tools (Todoist, Notion) that ignore academic context and dated student tools (My Study Life) that lack intelligent planning.

## Architecture
Single-page React application backed by Supabase-as-a-service. Follows a layered pattern within the frontend:

- **Pages** — route-level views (Dashboard, Tasks, Calendar, Groups, etc.)
- **Services** — abstracts all database access away from UI components
- **Supabase Client** — handles auth, queries, storage, and edge function invocations

Every Supabase query lives in a service file. No page component talks to the database directly. This keeps concerns separated and makes the code easier to refactor.

Edge functions run separately on Deno for AI operations. The study planner reads tasks and events, calls the Anthropic API, and writes the plan back to the user's settings.

## Tech Stack
- React 18 with Vite (frontend framework and build tool)
- Tailwind CSS v4 (utility-first styling)
- React Router v6 (client-side routing)
- Supabase (PostgreSQL 15, Auth, Storage, Edge Functions)
- Anthropic Claude API (AI study planner via Edge Function)
- Render (static hosting with GitHub CI/CD)

## Setup Instructions
1. Clone the repository
2. Create a Supabase project at https://supabase.com
3. Copy `.env.example` to `.env` in the project root
4. Fill in your Supabase project URL and anon key (found in Supabase dashboard under Project Settings → API)
5. Run the SQL schema against your Supabase database from the SQL Editor:
   ```
   -- run contents of supabase/schema.sql
   ```
6. Install dependencies:
   ```
   npm install
   ```
7. (Optional, for AI planner) Deploy the edge function and set the Anthropic API key:
   ```
   npx supabase functions deploy generate-study-plan
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
8. Start the dev server:
   ```
   npm run dev
   ```
9. Open http://localhost:5173 in your browser

## Features
### Tasks
- Full CRUD with subtasks, notes, and dependencies
- Three deadline types: hard (fixed), soft (reminder), flexible (date range)
- Recurring tasks (daily, weekly, fortnightly, monthly)
- Templates for reusable task structures
- Archive keeps the score for grades; Delete removes permanently
- Circular dependency detection via recursive CTE

### Courses and Modules
- Course → Module → Task hierarchy
- Weighted target grades at both course and module level
- Module-level grade predictions

### Dashboard
- Stat cards (upcoming, completed, average grade, estimated hours)
- Eisenhower priority matrix (urgency × importance)
- Deadline chart and timeline
- Mini calendar
- Goals and motivation tracker with achievements

### Grade Prediction
- 1000-iteration Monte Carlo simulation
- Samples historical performance by task type using Box-Muller transform
- Reports P10 / Median / P90 percentiles and classification probabilities
- Impact analysis identifies highest-weight remaining tasks

### AI Study Planner
- Analyses your tasks, calendar events, and recent focus sessions
- Calls Claude Sonnet via a Supabase Edge Function
- Generates a day-by-day weekly study plan with study blocks and breaks
- Plan persists between sessions

### Groups
- Three role levels: admin, editor, viewer
- Email-based invitations with accept / decline
- Activity feed
- Per-member task completion tracking via `task_completions` junction table
- File uploads with signed URL downloads

### Calendar
- Month and week views
- Workload colour coding based on daily task density
- Multiple event types (lecture, tutorial, work, personal)
- Recurring events (daily, weekly, monthly)
- Sticky notes with four colours

### Pomodoro Timer
- Timestamp-based countdown (immune to React strict mode double-firing)
- Session tracking with planned and actual duration
- Task linking
- Daily and weekly statistics (resets Monday)

### Settings and Data
- Profile management
- Course and module management with linked-task warnings
- CSV exports for tasks, grades, and schedule
- Account deletion with typed confirmation

## Security Features
- Supabase Auth with bcrypt password hashing
- JWT-based session management
- Password complexity enforcement (minimum 8 characters, letter + number required)
- Password reset flow via email token with session-isolated recovery page
- Row Level Security on every user-owned table
- `SECURITY DEFINER` function (`get_user_group_ids`) to break circular RLS references
- Client-side filtering as defence in depth where strict RLS conflicts with triggers
- Parameterised queries (Supabase client prevents SQL injection)
- Input validation: length caps on titles (100 chars), score range confirmation above 100%, zero-divisor checks
- Destructive action confirmations: typed `DELETE` modal for account deletion, linked-task warnings for course / module deletion, score clear confirmation
- HTTPS enforced by Render (frontend) and Supabase (API)
- Rate limiting on authentication endpoints via Supabase defaults (30 requests / hour / IP)
- React auto-escapes all rendered content; no `dangerouslySetInnerHTML` used
- Cascade deletes preserve referential integrity; `ON DELETE SET NULL` on activity logs so user-authored events survive account deletion

## Database Schema
PostgreSQL 15 hosted on Supabase. 20+ tables in third normal form.

Main tables:
- `profiles` — user profile data linked to Supabase auth.users
- `courses` / `modules` / `tasks` — academic hierarchy
- `subtasks` / `task_notes` / `task_dependencies` — task extensions
- `task_completions` — per-user completion junction for group tasks
- `groups` / `group_members` / `group_activity` — collaboration
- `files` — group file uploads with storage paths
- `calendar_events` / `floating_notes` — calendar data
- `pomodoro_sessions` — focus session history
- `templates` — reusable task structures
- `user_settings` — user preferences and last study plan

Triggers handle: auto-admin on group creation, updated_at timestamps, module-course ownership enforcement, auto-status on group task completion, circular dependency prevention, cascade-aware member removal logging.

RLS policies enforce authorisation at the database layer. Every query carries the user's JWT; policies check `auth.uid()` against row ownership or group membership.

## Project Structure
```
src/
  components/         Layout, ProtectedRoute
  context/            AuthContext (session state)
  pages/              Dashboard, Tasks, TaskDetail, CreateTask, Groups,
                      GroupDetail, Calendar, Pomodoro, StudyPlanner,
                      GradePrediction, Templates, History, Settings,
                      Login, Register, ForgotPassword, ResetPassword
  services/           DAO layer: taskService, groupService, predictionService,
                      studyPlannerService, calendarService, fileService,
                      moduleService, templateService, authService,
                      pomodoroService, noteService, goalService, exportService
  index.css           Tailwind entry
  main.jsx            App root

supabase/
  functions/
    generate-study-plan/    Deno edge function calling the Anthropic API
  schema.sql                Full schema with triggers and RLS policies
```

## Testing
Manual integration testing across ~150 test cases covering:
- Authentication flows (signup, login, password reset, account deletion)
- Task CRUD, scoring, archiving, deletion
- Group management, invitations, role-based permissions
- Grade prediction edge cases (zero tasks, single task, extreme scores)
- Cross-feature integration (task → prediction, pomodoro → stats)
- Edge cases (long titles, special characters, past dates, rapid clicks)

Automated E2E testing with Playwright and unit tests for the Monte Carlo math are noted as future work.

## Known Limitations
- Formal user testing not conducted at scale (tested with 6 accounts)
- `group_members` RLS is permissive with client-side filtering — tightening caused transaction-ordering conflicts with the auto-admin trigger; proper fix documented as future hardening
- No offline mode or optimistic UI
- No pagination on large lists
- Monte Carlo prediction assumes a Gaussian distribution per task type, which may not hold for bimodal performers
- Shared group calendar was scoped out; `group_id` foreign key remains on calendar_events for future expansion
- No formal WCAG 2.1 accessibility audit

## Licence
Developed for academic purposes as part of a university assessment. Not intended for commercial use or redistribution.

## Acknowledgements
Built as my final year project at the University of Westminster. Thanks to my project supervisor for guidance throughout.
