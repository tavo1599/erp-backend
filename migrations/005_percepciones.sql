-- ============================================================================
-- Migración: Comprobantes de Percepción
-- ============================================================================
-- Tablas nuevas. En DESARROLLO synchronize las crea solo; en PRODUCCIÓN corre esto.
-- Requiere PostgreSQL 13+.
-- ============================================================================

CREATE TABLE IF NOT EXISTS percepciones (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id                 uuid NOT NULL,
  serie                      varchar(4) NOT NULL,
  correlativo                integer NOT NULL,
  fecha_emision              date NOT NULL,
  regimen                    varchar NOT NULL DEFAULT '01',
  tasa                       numeric(5,2) NOT NULL DEFAULT 2,
  cliente_numero_documento   varchar(15) NOT NULL,
  cliente_razon_social       varchar NOT NULL,
  moneda                     varchar NOT NULL DEFAULT 'PEN',
  total_percibido            numeric(12,2) NOT NULL DEFAULT 0,
  total_cobrado              numeric(12,2) NOT NULL DEFAULT 0,
  observaciones              text,
  estado_sunat               varchar NOT NULL DEFAULT 'PENDIENTE',
  sunat_codigo               varchar,
  sunat_descripcion          varchar,
  sunat_hash                 varchar,
  sunat_xml_base64           text,
  sunat_cdr_base64           text,
  nombre_archivo             varchar,
  created_at                 timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_percepciones_empresa ON percepciones (empresa_id);

CREATE TABLE IF NOT EXISTS percepcion_detalles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  percepcion_id         uuid NOT NULL REFERENCES percepciones(id) ON DELETE CASCADE,
  tipo_doc_relacionado  varchar NOT NULL DEFAULT '01',
  num_doc_relacionado   varchar NOT NULL,
  fecha_doc             date NOT NULL,
  importe_doc           numeric(12,2) NOT NULL,
  fecha_cobro           date NOT NULL,
  importe_cobrado       numeric(12,2) NOT NULL,
  monto_percibido       numeric(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_percepcion_detalles_p ON percepcion_detalles (percepcion_id);
