create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url text not null default '',
  storage_path text null,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.listing_images
  add column if not exists image_url text,
  add column if not exists storage_path text,
  add column if not exists sort_order int,
  add column if not exists is_primary boolean,
  add column if not exists created_at timestamptz;

alter table public.listing_images enable row level security;

create index if not exists listing_images_listing_id_idx
  on public.listing_images (listing_id);

create index if not exists listing_images_is_primary_idx
  on public.listing_images (is_primary);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listing_images'
      and column_name = 'storage_path_600'
  ) then
    update public.listing_images
    set storage_path = coalesce(storage_path, storage_path_600)
    where storage_path is null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listing_images'
      and column_name = 'storage_path_1800'
  ) then
    update public.listing_images
    set storage_path = coalesce(storage_path, storage_path_1800)
    where storage_path is null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listing_images'
      and policyname = 'Listing images are publicly readable'
  ) then
    create policy "Listing images are publicly readable"
      on public.listing_images
      for select
      to public
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listing_images'
      and policyname = 'Listing images can be created by owner'
  ) then
    create policy "Listing images can be created by owner"
      on public.listing_images
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.listings l
          where l.id = listing_id
            and l.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listing_images'
      and policyname = 'Listing images can be updated by owner'
  ) then
    create policy "Listing images can be updated by owner"
      on public.listing_images
      for update
      to authenticated
      using (
        exists (
          select 1 from public.listings l
          where l.id = listing_id
            and l.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.listings l
          where l.id = listing_id
            and l.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'listing_images'
      and policyname = 'Listing images can be deleted by owner'
  ) then
    create policy "Listing images can be deleted by owner"
      on public.listing_images
      for delete
      to authenticated
      using (
        exists (
          select 1 from public.listings l
          where l.id = listing_id
            and l.user_id = auth.uid()
        )
      );
  end if;
end $$;
