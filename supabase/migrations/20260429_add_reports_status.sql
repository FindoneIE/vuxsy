alter table public.reports
  add column if not exists status text default 'pending';

update public.reports
set status = 'pending'
where status is null;
