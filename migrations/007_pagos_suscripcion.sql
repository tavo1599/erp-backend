-- ============================================================================
-- Migración: Pagos de suscripción (panel super admin)
-- ============================================================================
-- Tabla nueva. En DESARROLLO synchronize la crea sola; en PRODUCCIÓN corre esto.
-- ============================================================================

CREATE TABLE IF NOT EXISTS pagos_suscripcion (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL,
  monto           numeric(12,2) NOT NULL,
  meses           integer NOT NULL DEFAULT 1,
  metodo          varchar NOT NULL DEFAULT 'EFECTIVO',
  fecha_pago      date NOT NULL,
  periodo_hasta   date,
  registrado_por  varchar,
  notas           text,
  created_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_suscripcion_empresa ON pagos_suscripcion (empresa_id);
