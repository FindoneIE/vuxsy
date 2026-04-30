alter table public.profiles
  add column role text not null default 'user';

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

update public.profiles
set role = 'admin'
where lower(email) = 'emartinsbox@gmail.com';
