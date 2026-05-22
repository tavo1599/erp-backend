// src/kardex/entities/kardex.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('kardex_movimientos')
export class KardexMovimiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'uuid' })
  producto_id: string;

  @Column({ type: 'varchar' }) 
  // Ej: 'INGRESO_COMPRA', 'SALIDA_VENTA', 'AJUSTE_INGRESO', 'AJUSTE_SALIDA'
  tipo_movimiento: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  stock_anterior: number; // El stock antes de que ocurriera el movimiento

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  stock_posterior: number; // El stock resultante

  @Column({ type: 'varchar', nullable: true })
  referencia_documento: string; // Ej: 'Factura F001-42' o 'Ajuste Manual por merma'

  @CreateDateColumn()
  fecha_movimiento: Date;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;
}