// src/ventas/entities/venta.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { VentaDetalle } from './venta-detalle.entity';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string; // Extraído del Token JWT

  // Datos del Cliente (Simplificado para el MVP)
  @Column({ type: 'varchar', length: 15 })
  cliente_numero_documento: string; // RUC o DNI

  @Column({ type: 'varchar' })
  cliente_razon_social: string;

  // Datos del Comprobante
  @Column({ type: 'varchar', length: 2 })
  tipo_comprobante: string; // '01' Factura, '03' Boleta

  @Column({ type: 'varchar', length: 4 })
  serie: string; // Ej: 'F001'

  @Column({ type: 'integer' })
  correlativo: number;

  // Totales
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_gravado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_igv: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importe_total: number;

  // Control SUNAT
  @Column({ type: 'varchar', default: 'PENDIENTE' })
  estado_sunat: string; // PENDIENTE, ACEPTADO, RECHAZADO

  @CreateDateColumn()
  fecha_emision: Date;

  // Relación Mágica: Una venta tiene muchos detalles. 
  // 'cascade: true' nos permite guardar la cabecera y los items al mismo tiempo.
  @OneToMany(() => VentaDetalle, (detalle) => detalle.venta, { cascade: true })
  detalles: VentaDetalle[];
}