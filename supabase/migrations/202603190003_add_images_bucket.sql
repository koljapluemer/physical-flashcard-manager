insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

create policy "images_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "images_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
-- No SELECT policy needed: bucket is public, objects are served via CDN URL without auth
