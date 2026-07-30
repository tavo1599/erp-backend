-- ============================================================================
-- CONSOLIDADO de todos los cambios de BD de la sesión (idempotente, seguro re-correr)
-- Correr en el psql de erp_db (Dokploy → base de datos → Terminal):
--   psql -U erp_user -d erp_db
-- y pegar todo esto. Requiere PostgreSQL 13+.
-- ============================================================================

-- --- Stock por almacén / POS (columnas) ---
ALTER TABLE ventas    ADD COLUMN IF NOT EXISTS almacen_id    uuid;
ALTER TABLE compras   ADD COLUMN IF NOT EXISTS almacen_id    uuid;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo_barras varchar(60);

-- --- Cifrado de credenciales SUNAT (ensanchar por si el cifrado es más largo) ---
ALTER TABLE empresas  ALTER COLUMN sunat_client_secret TYPE varchar;

-- --- Cotizaciones ---
CREATE TABLE IF NOT EXISTS cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL, numero integer NOT NULL,
  cliente_id uuid, cliente_numero_documento varchar(15) NOT NULL,
  cliente_razon_social varchar NOT NULL, fecha_emision date NOT NULL,
  fecha_validez date, estado varchar NOT NULL DEFAULT 'PENDIENTE',
  total_gravado numeric(12,2) NOT NULL DEFAULT 0, total_igv numeric(12,2) NOT NULL DEFAULT 0,
  importe_total numeric(12,2) NOT NULL DEFAULT 0, observaciones text, venta_id uuid,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_empresa ON cotizaciones (empresa_id);
CREATE TABLE IF NOT EXISTS cotizacion_detalles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id uuid NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL, producto_nombre varchar NOT NULL,
  cantidad numeric(10,2) NOT NULL, precio_unitario numeric(12,2) NOT NULL,
  descuento_porcentaje numeric(5,2) NOT NULL DEFAULT 0, subtotal numeric(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cotizacion_detalles_cot ON cotizacion_detalles (cotizacion_id);

-- --- Transferencias entre almacenes ---
CREATE TABLE IF NOT EXISTS transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL, numero integer NOT NULL,
  almacen_origen_id uuid NOT NULL, almacen_destino_id uuid NOT NULL, observaciones text,
  usuario_email varchar, estado varchar NOT NULL DEFAULT 'COMPLETADA', created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transferencias_empresa ON transferencias (empresa_id);
CREATE TABLE IF NOT EXISTS transferencia_detalles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transferencia_id uuid NOT NULL REFERENCES transferencias(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL, producto_nombre varchar NOT NULL, cantidad numeric(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transferencia_detalles_t ON transferencia_detalles (transferencia_id);

-- --- Retenciones ---
CREATE TABLE IF NOT EXISTS retenciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL,
  serie varchar(4) NOT NULL, correlativo integer NOT NULL, fecha_emision date NOT NULL,
  regimen varchar NOT NULL DEFAULT '01', tasa numeric(5,2) NOT NULL DEFAULT 3,
  proveedor_numero_documento varchar(15) NOT NULL, proveedor_razon_social varchar NOT NULL,
  moneda varchar NOT NULL DEFAULT 'PEN', total_retenido numeric(12,2) NOT NULL DEFAULT 0,
  total_pagado numeric(12,2) NOT NULL DEFAULT 0, observaciones text,
  estado_sunat varchar NOT NULL DEFAULT 'PENDIENTE', sunat_codigo varchar, sunat_descripcion varchar,
  sunat_hash varchar, sunat_xml_base64 text, sunat_cdr_base64 text, nombre_archivo varchar,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_retenciones_empresa ON retenciones (empresa_id);
CREATE TABLE IF NOT EXISTS retencion_detalles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retencion_id uuid NOT NULL REFERENCES retenciones(id) ON DELETE CASCADE,
  tipo_doc_relacionado varchar NOT NULL DEFAULT '01', num_doc_relacionado varchar NOT NULL,
  fecha_doc date NOT NULL, importe_doc numeric(12,2) NOT NULL,
  fecha_pago date NOT NULL, importe_pagado numeric(12,2) NOT NULL, monto_retenido numeric(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_retencion_detalles_r ON retencion_detalles (retencion_id);

-- --- Percepciones ---
CREATE TABLE IF NOT EXISTS percepciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL,
  serie varchar(4) NOT NULL, correlativo integer NOT NULL, fecha_emision date NOT NULL,
  regimen varchar NOT NULL DEFAULT '01', tasa numeric(5,2) NOT NULL DEFAULT 2,
  cliente_numero_documento varchar(15) NOT NULL, cliente_razon_social varchar NOT NULL,
  moneda varchar NOT NULL DEFAULT 'PEN', total_percibido numeric(12,2) NOT NULL DEFAULT 0,
  total_cobrado numeric(12,2) NOT NULL DEFAULT 0, observaciones text,
  estado_sunat varchar NOT NULL DEFAULT 'PENDIENTE', sunat_codigo varchar, sunat_descripcion varchar,
  sunat_hash varchar, sunat_xml_base64 text, sunat_cdr_base64 text, nombre_archivo varchar,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_percepciones_empresa ON percepciones (empresa_id);
CREATE TABLE IF NOT EXISTS percepcion_detalles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  percepcion_id uuid NOT NULL REFERENCES percepciones(id) ON DELETE CASCADE,
  tipo_doc_relacionado varchar NOT NULL DEFAULT '01', num_doc_relacionado varchar NOT NULL,
  fecha_doc date NOT NULL, importe_doc numeric(12,2) NOT NULL,
  fecha_cobro date NOT NULL, importe_cobrado numeric(12,2) NOT NULL, monto_percibido numeric(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_percepcion_detalles_p ON percepcion_detalles (percepcion_id);

-- --- Caja (POS) ---
CREATE TABLE IF NOT EXISTS caja_sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL, usuario_email varchar,
  monto_inicial numeric(12,2) NOT NULL DEFAULT 0, total_ventas_efectivo numeric(12,2) NOT NULL DEFAULT 0,
  monto_esperado numeric(12,2) NOT NULL DEFAULT 0, monto_contado numeric(12,2), diferencia numeric(12,2),
  estado varchar NOT NULL DEFAULT 'ABIERTA', observaciones text,
  fecha_apertura timestamp NOT NULL DEFAULT now(), fecha_cierre timestamp
);
CREATE INDEX IF NOT EXISTS idx_caja_empresa_estado ON caja_sesiones (empresa_id, estado);
