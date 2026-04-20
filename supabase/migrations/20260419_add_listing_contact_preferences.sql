alter table public.listings
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists allow_messages boolean not null default true,
  add column if not exists allow_email boolean not null default false,
  add column if not exists allow_phone boolean not null default false,
  add column if not exists show_email_publicly boolean not null default false,
  add column if not exists show_phone_publicly boolean not null default false;
