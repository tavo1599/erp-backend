// src/compras/entities/compra-detalle.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Compra } from './compra.entity';

@Entity('compra_detalles')
export class CompraDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  producto_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  costo_unitario: number; // a cuánto compraste cada unidad

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @ManyToOne(() => Compra, (compra) => compra.detalles)
  @JoinColumn({ name: 'compra_id' })
  compra: Compra;
}