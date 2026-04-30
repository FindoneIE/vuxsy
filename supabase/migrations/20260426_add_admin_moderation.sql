create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists listing_reports_listing_id_idx on public.listing_reports (listing_id);
create index if not exists listing_reports_user_id_idx on public.listing_reports (user_id);
create index if not exists listing_reports_status_idx on public.listing_reports (status);

alter table public.listing_reports enable row level security;

create table if not exists public.user_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists user_warnings_user_id_idx on public.user_warnings (user_id);

alter table public.user_warnings enable row level security;

alter table public.profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_at timestamptz;
