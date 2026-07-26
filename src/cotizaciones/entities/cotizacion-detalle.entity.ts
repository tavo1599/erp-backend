import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cotizacion } from './cotizacion.entity';

@Entity('cotizacion_detalles')
export class CotizacionDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cotizacion_id: string;

  @Column({ type: 'uuid' })
  producto_id: string;

  // Snapshot del nombre por si el producto cambia después
  @Column({ type: 'varchar' })
  producto_nombre: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_unitario: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  descuento_porcentaje: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @ManyToOne(() => Cotizacion, (cotizacion) => cotizacion.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cotizacion_id' })
  cotizacion: Cotizacion;
}
