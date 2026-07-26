-- ============================================================================
-- Migración: Transferencias entre almacenes
-- ============================================================================
-- Tablas nuevas. En DESARROLLO synchronize las crea solo; en PRODUCCIÓN
-- (synchronize off) corre este script en psql (erp_db).
-- Requiere PostgreSQL 13+ (gen_random_uuid nativo).
-- ============================================================================

CREATE TABLE IF NOT EXISTS transferencias (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          uuid NOT NULL,
  numero              integer NOT NULL,
  almacen_origen_id   uuid NOT NULL,
  almacen_destino_id  uuid NOT NULL,
  observaciones       text,
  usuario_email       varchar,
  estado              varchar NOT NULL DEFAULT 'COMPLETADA',
  created_at          timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transferencias_empresa ON transferencias (empresa_id);

CREATE TABLE IF NOT EXISTS transferencia_detalles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transferencia_id  uuid NOT NULL REFERENCES transferencias(id) ON DELETE CASCADE,
  producto_id       uuid NOT NULL,
  producto_nombre   varchar NOT NULL,
  cantidad          numeric(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transferencia_detalles_t ON transferencia_detalles (transferencia_id);
