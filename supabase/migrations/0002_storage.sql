-- Storage bucket for chat media (images/files/videos) and avatars.
-- Public read (so message bubbles / avatars can just use the returned URL
-- directly), writes restricted to authenticated users into their own folder.

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

create policy "chat-media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'chat-media');

create policy "authenticated users can upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can update their own files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
