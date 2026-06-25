// src/bajas/dto/create-baja.dto.ts
export class CreateBajaDto {
  tipo_documento: string;       // "01" factura, "07" NC, "08" ND
  serie_documento: string;      // "F001"
  correlativo_documento: number; // 7
  motivo: string;               // "Error en los datos del comprobante"
  fecha_emision_documento: string; // "2026-05-22" (fecha en que se emitió el doc)
}