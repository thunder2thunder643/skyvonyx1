
create policy "users read own satellite images" on storage.objects for select to authenticated
  using (bucket_id = 'satellite-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users upload own satellite images" on storage.objects for insert to authenticated
  with check (bucket_id = 'satellite-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users update own satellite images" on storage.objects for update to authenticated
  using (bucket_id = 'satellite-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users delete own satellite images" on storage.objects for delete to authenticated
  using (bucket_id = 'satellite-images' and auth.uid()::text = (storage.foldername(name))[1]);
