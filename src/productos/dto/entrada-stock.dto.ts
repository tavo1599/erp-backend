// src/productos/dto/entrada-stock.dto.ts
export class EntradaStockDto {
  cantidad: number;
  motivo?: string; // "Compra", "Ajuste de inventario", etc.
}