alter table public.admin_audit_logs
  add column if not exists actor_email text null,
  add column if not exists details jsonb null;
