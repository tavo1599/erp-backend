-- ============================================================================
-- Migración: Caja (apertura y cierre en el POS)
-- ============================================================================
-- Tabla nueva. En DESARROLLO synchronize la crea sola; en PRODUCCIÓN corre esto.
-- ============================================================================

CREATE TABLE IF NOT EXISTS caja_sesiones (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id             uuid NOT NULL,
  usuario_email          varchar,
  monto_inicial          numeric(12,2) NOT NULL DEFAULT 0,
  total_ventas_efectivo  numeric(12,2) NOT NULL DEFAULT 0,
  monto_esperado         numeric(12,2) NOT NULL DEFAULT 0,
  monto_contado          numeric(12,2),
  diferencia             numeric(12,2),
  estado                 varchar NOT NULL DEFAULT 'ABIERTA',
  observaciones          text,
  fecha_apertura         timestamp NOT NULL DEFAULT now(),
  fecha_cierre           timestamp
);

CREATE INDEX IF NOT EXISTS idx_caja_empresa_estado ON caja_sesiones (empresa_id, estado);
