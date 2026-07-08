-- ============================================================
-- Gestión de pisos en alquiler — Esquema Fase 1
-- Para aplicar como migración inicial en Supabase (Postgres)
-- ============================================================

-- Documentos subidos (contratos, facturas, páginas del cuaderno)
create table documentos (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid, -- se enlaza tras crear propiedades (fk añadida abajo)
  tipo text not null check (tipo in ('contrato', 'factura', 'cuaderno', 'otro')),
  nombre_archivo text not null,
  storage_path text not null, -- ruta en Supabase Storage (bucket: documentos)
  estado_procesamiento text not null default 'pendiente'
    check (estado_procesamiento in ('pendiente', 'procesado', 'confirmado', 'error')),
  datos_extraidos jsonb, -- lo que extrae la IA, pendiente de confirmación
  creado_en timestamptz not null default now()
);

-- Pisos
create table propiedades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null, -- ej. "Piso Toledo"
  direccion text not null,
  ciudad text not null, -- Toledo, Pinto, Madrid
  notas text,
  creado_en timestamptz not null default now()
);

alter table documentos
  add constraint documentos_propiedad_fk
  foreign key (propiedad_id) references propiedades(id) on delete set null;

-- Inquilinos
create table inquilinos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  dni text,
  telefono text,
  email text,
  notas text,
  creado_en timestamptz not null default now()
);

-- Contratos de alquiler
create table contratos (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references propiedades(id),
  inquilino_id uuid not null references inquilinos(id),
  fecha_inicio date not null,
  fecha_fin date,
  renta_mensual numeric(10,2) not null,
  dia_pago smallint not null default 1 check (dia_pago between 1 and 31),
  fianza numeric(10,2),
  estado text not null default 'activo' check (estado in ('activo', 'finalizado')),
  documento_id uuid references documentos(id), -- contrato escaneado
  notas text,
  creado_en timestamptz not null default now()
);

-- Ingresos (rentas mensuales)
create table ingresos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id),
  periodo date not null, -- primer día del mes al que corresponde la renta
  importe numeric(10,2) not null,
  fecha_cobro date, -- null si aún no se ha cobrado
  metodo text check (metodo in ('transferencia', 'efectivo', 'otro')),
  estado text not null default 'pendiente' check (estado in ('pagado', 'pendiente')),
  origen text not null default 'manual' check (origen in ('manual', 'importado')),
  notas text,
  creado_en timestamptz not null default now(),
  unique (contrato_id, periodo) -- una renta por contrato y mes
);

-- Gastos / facturas
create table gastos (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references propiedades(id),
  proveedor text,
  concepto text not null,
  categoria text not null check (categoria in
    ('ibi', 'comunidad', 'reparacion', 'seguro', 'suministros', 'otro')),
  importe numeric(10,2) not null,
  fecha date not null,
  documento_id uuid references documentos(id), -- factura escaneada
  notas text,
  creado_en timestamptz not null default now()
);

-- ============================================================
-- Seguridad: solo usuarios autenticados (tu madre y tú) acceden
-- ============================================================
alter table propiedades enable row level security;
alter table inquilinos enable row level security;
alter table contratos enable row level security;
alter table ingresos enable row level security;
alter table gastos enable row level security;
alter table documentos enable row level security;

create policy "acceso total autenticados" on propiedades for all to authenticated using (true) with check (true);
create policy "acceso total autenticados" on inquilinos for all to authenticated using (true) with check (true);
create policy "acceso total autenticados" on contratos for all to authenticated using (true) with check (true);
create policy "acceso total autenticados" on ingresos for all to authenticated using (true) with check (true);
create policy "acceso total autenticados" on gastos for all to authenticated using (true) with check (true);
create policy "acceso total autenticados" on documentos for all to authenticated using (true) with check (true);

-- Nota: crear también en Supabase Storage un bucket privado llamado
-- "documentos" con política de acceso solo para usuarios autenticados.
