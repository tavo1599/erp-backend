// src/productos/dto/update-producto.dto.ts
export class UpdateProductoDto {
  codigo_sunat?: string;
  nombre?: string;
  unidad_medida?: string;
  precio_venta?: number;
  tipo_igv?: string;
}