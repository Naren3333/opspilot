create extension if not exists vector;
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(target_workspace_id uuid, allowed_roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  industry text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'analyst')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_secrets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('mock', 'openai-compatible', 'ollama')),
  base_url text not null,
  chat_model text not null,
  embedding_model text not null,
  encrypted_api_key text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  format text not null check (format in ('pdf', 'md', 'txt')),
  summary text not null default '',
  status text not null check (status in ('queued', 'indexing', 'indexed', 'failed')),
  storage_path text,
  extracted_text text not null default '',
  chunk_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  title text not null,
  content text not null,
  token_count integer not null default 0,
  embedding vector(1536),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ticket_number integer not null,
  subject text not null,
  summary text not null,
  body text not null,
  status text not null check (status in ('open', 'pending', 'resolved')),
  priority text not null check (priority in ('low', 'normal', 'high', 'urgent')),
  requester text not null,
  assignee text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (workspace_id, ticket_number)
);

create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  prompt_version text not null,
  status text not null check (status in ('queued', 'running', 'awaiting_approval', 'completed', 'failed')),
  provider text not null,
  model text not null,
  latency_ms integer not null default 0,
  prompt text not null,
  response text not null default '',
  citations jsonb not null default '[]'::jsonb,
  tool_actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz
);

create table if not exists public.tool_calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  action text not null check (action in ('searchDocs', 'searchTickets', 'draftReply', 'createTicket', 'updateTicketPriority', 'assignTicket')),
  status text not null check (status in ('proposed', 'approved', 'rejected', 'executed')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  tool_call_id uuid not null references public.tool_calls(id) on delete cascade,
  title text not null,
  summary text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'expired')),
  requested_by text not null,
  decided_by text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  decided_at timestamptz
);

create table if not exists public.eval_cases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  prompt text not null,
  expected jsonb not null default '[]'::jsonb,
  requires_citation boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  case_id uuid not null references public.eval_cases(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  score numeric(5,2),
  notes text not null default '',
  output text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor text not null,
  event text not null,
  target text not null,
  detail text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger set_workspace_secrets_updated_at
before update on public.workspace_secrets
for each row execute function public.set_updated_at();

create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger set_tickets_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_secrets enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.agent_runs enable row level security;
alter table public.tool_calls enable row level security;
alter table public.approval_requests enable row level security;
alter table public.eval_cases enable row level security;
alter table public.eval_runs enable row level security;
alter table public.audit_logs enable row level security;

create policy "workspace members can read workspaces"
on public.workspaces for select
using (public.is_workspace_member(id));

create policy "owners can update workspaces"
on public.workspaces for update
using (public.has_workspace_role(id, array['owner']));

create policy "workspace members can read members"
on public.workspace_members for select
using (public.is_workspace_member(workspace_id));

create policy "owners can manage members"
on public.workspace_members for all
using (public.has_workspace_role(workspace_id, array['owner']))
with check (public.has_workspace_role(workspace_id, array['owner']));

create policy "workspace members can read secrets"
on public.workspace_secrets for select
using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "owners can manage secrets"
on public.workspace_secrets for all
using (public.has_workspace_role(workspace_id, array['owner']))
with check (public.has_workspace_role(workspace_id, array['owner']));

create policy "workspace members can read documents"
on public.documents for select
using (public.is_workspace_member(workspace_id));

create policy "admins and owners can manage documents"
on public.documents for all
using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "workspace members can read document chunks"
on public.document_chunks for select
using (public.is_workspace_member(workspace_id));

create policy "admins and owners can manage document chunks"
on public.document_chunks for all
using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "workspace members can read tickets"
on public.tickets for select
using (public.is_workspace_member(workspace_id));

create policy "workspace members can write tickets"
on public.tickets for all
using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "workspace members can read comments"
on public.ticket_comments for select
using (
  exists (
    select 1
    from public.tickets
    where tickets.id = ticket_comments.ticket_id
      and public.is_workspace_member(tickets.workspace_id)
  )
);

create policy "workspace members can write comments"
on public.ticket_comments for insert
with check (
  exists (
    select 1
    from public.tickets
    where tickets.id = ticket_comments.ticket_id
      and public.has_workspace_role(tickets.workspace_id, array['owner', 'admin'])
  )
);

create policy "workspace members can read conversations"
on public.conversations for select
using (public.is_workspace_member(workspace_id));

create policy "workspace members can manage conversations"
on public.conversations for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "workspace members can read messages"
on public.messages for select
using (public.is_workspace_member(workspace_id));

create policy "workspace members can manage messages"
on public.messages for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "workspace members can read runs"
on public.agent_runs for select
using (public.is_workspace_member(workspace_id));

create policy "workspace members can manage runs"
on public.agent_runs for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "workspace members can read tool calls"
on public.tool_calls for select
using (public.is_workspace_member(workspace_id));

create policy "workspace members can manage tool calls"
on public.tool_calls for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "workspace members can read approvals"
on public.approval_requests for select
using (public.is_workspace_member(workspace_id));

create policy "owners and admins can manage approvals"
on public.approval_requests for all
using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "workspace members can read eval cases"
on public.eval_cases for select
using (public.is_workspace_member(workspace_id));

create policy "owners and admins can manage eval cases"
on public.eval_cases for all
using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "workspace members can read eval runs"
on public.eval_runs for select
using (public.is_workspace_member(workspace_id));

create policy "owners and admins can manage eval runs"
on public.eval_runs for all
using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "workspace members can read audit logs"
on public.audit_logs for select
using (public.is_workspace_member(workspace_id));

create policy "workspace members can append audit logs"
on public.audit_logs for insert
with check (public.is_workspace_member(workspace_id));
