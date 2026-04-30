alter table public.listing_reports
  add column if not exists reporter_id uuid references auth.users(id) on delete cascade,
  add column if not exists message text,
  alter column status set default 'pending';

update public.listing_reports
set reporter_id = user_id
where reporter_id is null and user_id is not null;

create policy if not exists "Reports can be created by authenticated users"
  on public.listing_reports
  for insert
  with check (auth.uid() = reporter_id or auth.uid() = user_id);

create policy if not exists "Reporters can view their reports"
  on public.listing_reports
  for select
  using (auth.uid() = reporter_id or auth.uid() = user_id);
