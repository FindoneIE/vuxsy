alter table public.profiles
  add column if not exists business_seller boolean not null default false,
  add column if not exists company_name text,
  add column if not exists business_address text,
  add column if not exists vat_number text,
  add column if not exists website text,
  add column if not exists registration_number text;
