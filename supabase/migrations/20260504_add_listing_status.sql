alter table public.listings
  add column if not exists status text;

update public.listings
set status = 'active'
where status is null;

update public.listings
set status = 'archived'
where status in ('sold', 'expired');

update public.listings
set status = 'active'
where status not in ('active', 'paused', 'archived', 'draft', 'pending', 'rejected');

alter table public.listings
  alter column status set default 'active',
  alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listings_status_check'
  ) then
    alter table public.listings
      add constraint listings_status_check
      check (status in ('active', 'paused', 'archived', 'draft', 'pending', 'rejected'));
  end if;
end $$;

alter table public.listings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listings'
      and policyname = 'Listings are publicly readable when active'
  ) then
    create policy "Listings are publicly readable when active"
      on public.listings
      for select
      using (status = 'active');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listings'
      and policyname = 'Listings are readable by owner'
  ) then
    create policy "Listings are readable by owner"
      on public.listings
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listings'
      and policyname = 'Listings can be created by owner'
  ) then
    create policy "Listings can be created by owner"
      on public.listings
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listings'
      and policyname = 'Listings can be updated by owner'
  ) then
    create policy "Listings can be updated by owner"
      on public.listings
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listings'
      and policyname = 'Listings can be deleted by owner'
  ) then
    create policy "Listings can be deleted by owner"
      on public.listings
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;
