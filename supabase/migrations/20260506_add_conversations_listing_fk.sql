do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversations_listing_id_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_listing_id_fkey
      foreign key (listing_id)
      references public.listings(id)
      on delete cascade;
  end if;
end $$;
