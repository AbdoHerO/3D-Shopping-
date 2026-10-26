-- Public bucket for product photos; only admins can upload, replace or delete.
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "admins upload product images" on storage.objects
  for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
create policy "admins update product images" on storage.objects
  for update to authenticated using (bucket_id = 'products' and public.is_admin());
create policy "admins delete product images" on storage.objects
  for delete to authenticated using (bucket_id = 'products' and public.is_admin());
