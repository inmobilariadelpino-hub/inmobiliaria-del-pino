-- ============================================================
-- Migración: conceder permisos a los roles anon/authenticated
-- para las tablas del esquema, porque el proyecto se creó con
-- "Automatically expose new tables" desactivado.
-- ============================================================

-- Permisos base para el rol autenticado (usuarios logueados con Google)
grant usage on schema public to authenticated;

grant select, insert, update, delete on
  propiedades, inquilinos, contratos, ingresos, gastos, documentos,
  administradores
to authenticated;

-- Permiso mínimo para la comprobación pre-login: solo poder ejecutar
-- la función es_admin(). El rol anon no accede a la tabla.
grant execute on function es_admin() to authenticated;

-- El rol anon (peticiones sin login) no necesita nada, todo pasa por
-- authenticated con RLS.
