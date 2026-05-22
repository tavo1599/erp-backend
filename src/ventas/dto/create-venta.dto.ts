// src/ventas/dto/create-venta.dto.ts

class VentaDetalleDto {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
}

export class CreateVentaDto {
  cliente_numero_documento: string;
  cliente_razon_social: string;
  tipo_comprobante: string; // '01' o '03'
  serie: string; // 'F001' o 'B001'
  detalles: VentaDetalleDto[];
}