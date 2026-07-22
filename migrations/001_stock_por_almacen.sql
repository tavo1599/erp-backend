-- ============================================================================
-- Migración: Stock por almacén — columnas faltantes en ventas y compras
-- ============================================================================
-- Estado en producción (erp_db) ya verificado:
--   - Tabla stock_almacen              EXISTE (id, producto_id, almacen_id,
--                                       stock_actual, fecha_actualizacion;
--                                       UNIQUE uq_producto_almacen).
--   - kardex_movimientos.almacen_id    EXISTE.
--   - ventas.almacen_id                FALTA  → se agrega aquí.
--   - compras.almacen_id               FALTA  → se agrega aquí.
--   - Datos de stock_almacen ya cuadran con productos.stock_actual (no se toca).
--
-- En DESARROLLO con synchronize:true, TypeORM crea estas columnas solo; este
-- script es para PRODUCCIÓN (synchronize apagado). Es idempotente.
-- Requiere PostgreSQL 13+ (gen_random_uuid nativo).
-- ============================================================================

-- 1. Columnas que faltan (nullable → seguras, el código viejo las ignora)
ALTER TABLE ventas  ADD COLUMN IF NOT EXISTS almacen_id uuid;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS almacen_id uuid;

-- 2. (Opcional / otros entornos) Asegurar un almacén principal por empresa.
--    En producción no hace nada (todas ya tienen). Necesario porque ventas y
--    compras trabajan por almacén.
INSERT INTO almacenes (id, empresa_id, nombre, es_principal, activo, fecha_creacion)
SELECT gen_random_uuid(), e.id, 'Almacén Principal', true, true, now()
FROM empresas e
WHERE NOT EXISTS (SELECT 1 FROM almacenes a WHERE a.empresa_id = e.id);

-- 3. (Opcional / otros entornos) Sembrar stock por almacén para productos que
--    aún no tengan fila, colocando su stock actual en el almacén principal.
--    No borra ni pisa nada existente.
INSERT INTO stock_almacen (id, producto_id, almacen_id, stock_actual, fecha_actualizacion)
SELECT gen_random_uuid(), p.id, a.id, p.stock_actual, now()
FROM productos p
JOIN LATERAL (
  SELECT al.id FROM almacenes al
  WHERE al.empresa_id = p.empresa_id AND al.activo = true
  ORDER BY al.es_principal DESC, al.fecha_creacion ASC
  LIMIT 1
) a ON true
WHERE COALESCE(p.stock_actual, 0) <> 0
  AND NOT EXISTS (SELECT 1 FROM stock_almacen s WHERE s.producto_id = p.id);

-- Verificación (opcional): no debería devolver filas
-- SELECT p.id, p.nombre, p.stock_actual, COALESCE(SUM(s.stock_actual),0) AS suma
-- FROM productos p LEFT JOIN stock_almacen s ON s.producto_id = p.id
-- GROUP BY p.id, p.nombre, p.stock_actual
-- HAVING p.stock_actual <> COALESCE(SUM(s.stock_actual),0);
