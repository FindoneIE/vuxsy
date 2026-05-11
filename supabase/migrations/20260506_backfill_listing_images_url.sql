do $$
begin
  alter table public.listing_images
    add column if not exists image_url text;

  update public.listing_images
  set image_url = storage_path
  where image_url is null
    and storage_path is not null
    and storage_path like 'http%';
end $$;
