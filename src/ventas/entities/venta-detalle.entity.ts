// src/ventas/entities/venta-detalle.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Venta } from './venta.entity';

@Entity('venta_detalles')
export class VentaDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  producto_id: string; // El ID del producto que se está vendiendo

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_unitario: number; // Precio de venta del producto en ese momento

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number; // cantidad * precio_unitario

  // Relación: Muchos detalles pertenecen a una sola venta
  @ManyToOne(() => Venta, (venta) => venta.detalles)
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;
}