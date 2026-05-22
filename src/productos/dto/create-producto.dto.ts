export class CreateProductoDto {
  codigo_sunat?: string;
  nombre: string;         // Ej: "Laptop Lenovo ThinkPad" o "Tóner HP 85A"
  unidad_medida?: string;
  precio_venta: number;
  tipo_igv?: string;
}