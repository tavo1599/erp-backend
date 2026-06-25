// src/productos/dto/ajuste-stock.dto.ts
export class AjusteStockDto {
  tipo: 'INGRESO' | 'SALIDA'; // INGRESO suma, SALIDA resta
  cantidad: number;
  motivo: string; // "Merma", "Conteo físico", "Producto dañado", etc.
}