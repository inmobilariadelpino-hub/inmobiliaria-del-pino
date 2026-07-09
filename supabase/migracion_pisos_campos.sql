-- ============================================================
-- Migración: añadir metros cuadrados y habitaciones a propiedades
-- ============================================================

alter table propiedades
  add column if not exists metros_cuadrados numeric(7,2),
  add column if not exists habitaciones smallint;
