drop policy if exists "Allow upload 1va6avm_0" on storage.objects;
drop policy if exists "Allow authenticated uploads" on storage.objects;

drop policy if exists "Listing files can be inserted by owner" on storage.objects;

create policy "Listing files can be inserted by owner"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'listings'
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
    and exists (
      select 1
      from public.listings l
      where l.id = ((storage.foldername(name))[2])::uuid
        and l.user_id = auth.uid()
    )
  );
