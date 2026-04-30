create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid null references auth.users(id) on delete set null,
  actor_email text null,
  action text not null,
  target_type text null,
  target_id text null,
  details jsonb null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_actor_id_idx on public.admin_audit_logs (actor_id);
create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs (action);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);

alter table public.admin_audit_logs enable row level security;
