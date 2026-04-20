alter table public.profiles
  add column if not exists language text not null default 'en',
  add column if not exists email_notifications boolean not null default true,
  add column if not exists marketplace_alerts boolean not null default true,
  add column if not exists message_notifications boolean not null default true;
