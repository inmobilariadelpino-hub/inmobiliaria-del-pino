-- ============================================================
-- Migración: gestión de administradores por email
-- Aplicar en Supabase después de esquema_v1.sql
-- ============================================================

-- Lista blanca de administradores. Solo estos emails pueden usar la app.
create table administradores (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nombre text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table administradores enable row level security;

-- Función auxiliar: ¿es admin activo el usuario autenticado?
create or replace function es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from administradores
    where lower(email) = lower(auth.jwt() ->> 'email')
      and activo
  );
$$;

-- Cualquier admin puede leer, añadir, editar o desactivar a otros admins
create policy "admins gestionan admins" on administradores
  for all to authenticated
  using (es_admin())
  with check (es_admin());

-- Reemplazar las políticas "acceso total autenticados" del esquema_v1
-- por una comprobación real de admin activo.
drop policy "acceso total autenticados" on propiedades;
drop policy "acceso total autenticados" on inquilinos;
drop policy "acceso total autenticados" on contratos;
drop policy "acceso total autenticados" on ingresos;
drop policy "acceso total autenticados" on gastos;
drop policy "acceso total autenticados" on documentos;

create policy "solo admins" on propiedades for all to authenticated using (es_admin()) with check (es_admin());
create policy "solo admins" on inquilinos  for all to authenticated using (es_admin()) with check (es_admin());
create policy "solo admins" on contratos   for all to authenticated using (es_admin()) with check (es_admin());
create policy "solo admins" on ingresos    for all to authenticated using (es_admin()) with check (es_admin());
create policy "solo admins" on gastos      for all to authenticated using (es_admin()) with check (es_admin());
create policy "solo admins" on documentos  for all to authenticated using (es_admin()) with check (es_admin());

-- Primer administrador (bootstrap). Se inserta como SECURITY DEFINER
-- salta RLS porque somos superuser en el SQL Editor.
insert into administradores (email, nombre)
values ('inmobilariadelpino@gmail.com', 'Administrador inicial')
on conflict (email) do nothing;
