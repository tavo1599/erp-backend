-- ============================================================================
-- Migración: Cotizaciones / Proformas
-- ============================================================================
-- Tablas nuevas. En DESARROLLO synchronize las crea solo; en PRODUCCIÓN
-- (synchronize off) corre este script en psql (erp_db).
-- Requiere PostgreSQL 13+ (gen_random_uuid nativo).
-- ============================================================================

CREATE TABLE IF NOT EXISTS cotizaciones (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id                uuid NOT NULL,
  numero                    integer NOT NULL,
  cliente_id                uuid,
  cliente_numero_documento  varchar(15) NOT NULL,
  cliente_razon_social      varchar NOT NULL,
  fecha_emision             date NOT NULL,
  fecha_validez             date,
  estado                    varchar NOT NULL DEFAULT 'PENDIENTE',
  total_gravado             numeric(12,2) NOT NULL DEFAULT 0,
  total_igv                 numeric(12,2) NOT NULL DEFAULT 0,
  importe_total             numeric(12,2) NOT NULL DEFAULT 0,
  observaciones             text,
  venta_id                  uuid,
  created_at                timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_empresa ON cotizaciones (empresa_id);

CREATE TABLE IF NOT EXISTS cotizacion_detalles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id         uuid NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  producto_id           uuid NOT NULL,
  producto_nombre       varchar NOT NULL,
  cantidad              numeric(10,2) NOT NULL,
  precio_unitario       numeric(12,2) NOT NULL,
  descuento_porcentaje  numeric(5,2) NOT NULL DEFAULT 0,
  subtotal              numeric(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cotizacion_detalles_cot ON cotizacion_detalles (cotizacion_id);
