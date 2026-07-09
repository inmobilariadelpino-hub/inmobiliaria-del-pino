-- ============================================================
-- Políticas de Storage para el bucket privado "documentos".
-- Solo los administradores activos (es_admin()) pueden leer,
-- subir, actualizar y borrar archivos. Reutiliza la función
-- es_admin() creada en migracion_admins.sql.
--
-- Requisito previo: crear el bucket "documentos" (privado) desde
-- el panel de Supabase (Storage → New bucket).
-- ============================================================

create policy "admins leen documentos"
  on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and es_admin());

create policy "admins suben documentos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and es_admin());

create policy "admins actualizan documentos"
  on storage.objects for update to authenticated
  using (bucket_id = 'documentos' and es_admin())
  with check (bucket_id = 'documentos' and es_admin());

create policy "admins borran documentos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and es_admin());
