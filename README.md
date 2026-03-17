# OpsPilot

OpsPilot is a recruiter-ready support operations SaaS demo built with `Next.js`, `TypeScript`, and a hybrid AI provider layer.

It is designed to show product thinking and backend depth in one project:

- approval-gated AI actions
- document ingestion and retrieval
- internal ticketing workflows
- trace and eval dashboards
- workspace-scoped provider settings
- Supabase-ready schema plus a zero-config demo mode

## Stack

- Frontend and app shell: `Next.js 16`, App Router, Tailwind CSS
- AI provider layer: OpenAI-compatible providers, Ollama, or mock/demo mode
- Data model: Supabase-ready SQL schema in [`supabase/migrations/0001_opspilot_init.sql`](./supabase/migrations/0001_opspilot_init.sql)
- Local fallback: seeded in-memory workspace data so the app works immediately without credentials
- Tests: `Vitest` for unit/integration, `Playwright` for e2e smoke coverage

## Project structure

- `app/` routes, layouts, and API handlers
- `components/` product UI and interactive client components
- `lib/` data access, services, provider abstractions, auth helpers
- `db/` shared table contracts and constants
- `supabase/` migration and seed SQL for real deployments
- `tests/` unit, integration, and e2e coverage

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

If you do nothing else, the app runs in demo mode using the seeded `northstar-support` workspace.

## Environment notes

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable Supabase auth and storage flows.
- `OPS_ENCRYPTION_KEY` is used to encrypt workspace API keys before storing them.
- `OPENAI_*` values enable a cloud model by default.
- `OLLAMA_*` values support local development once Ollama is installed.
- `CRON_SECRET` protects the worker drain route when you trigger it from a scheduled job.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run check
```

## Supabase setup

Apply the migration and optional seed:

```sql
\i supabase/migrations/0001_opspilot_init.sql
\i supabase/seed.sql
```

The migration creates the workspace, ticketing, agent trace, approval, eval, and audit tables, plus row-level security helpers.

## OAuth login setup

OpsPilot's `/login` page supports GitHub, Google, and magic-link sign-in through Supabase Auth.

1. In your Supabase project, open `Authentication -> Providers`.
2. Enable `GitHub` and/or `Google`.
3. Add these redirect URLs:

```text
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

4. Set your Supabase site URL to your local or deployed app URL.
5. Make sure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` are set in `.env.local`.

If the providers are not enabled yet, the OAuth buttons still render but Supabase will reject the sign-in attempt until the provider credentials are configured.

## What is implemented

- `/login` with GitHub, Google, magic-link flow, and a demo bypass
- `/onboarding` workspace creation
- `/w/[slug]/chat` streaming AI chat over seeded support data
- `/w/[slug]/tickets` and `/w/[slug]/tickets/[id]`
- `/w/[slug]/documents` with upload plus worker-driven indexing
- `/w/[slug]/approvals`
- `/w/[slug]/admin/traces`
- `/w/[slug]/admin/evals`
- `/w/[slug]/settings/providers`
- `/api/chat`, `/api/documents/upload`, `/api/tickets`, `/api/tickets/[id]/reply-draft`
- `/api/approvals/[id]/approve`, `/api/approvals/[id]/reject`
- `/api/evals/run`, `/api/worker/drain`

## Current implementation note

The app is fully usable today in demo mode. The Supabase migration and auth/storage wiring are included, but the seeded in-memory workspace remains the default runtime path until you connect your own Supabase project and provider keys.
