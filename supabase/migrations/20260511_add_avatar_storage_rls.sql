drop policy if exists "Avatar files are readable by owner" on storage.objects;
drop policy if exists "Avatar files can be inserted by owner" on storage.objects;
drop policy if exists "Avatar files can be updated by owner" on storage.objects;
drop policy if exists "Avatar files can be deleted by owner" on storage.objects;

create policy "Avatar files are readable by owner"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Avatar files can be inserted by owner"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Avatar files can be updated by owner"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Avatar files can be deleted by owner"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
