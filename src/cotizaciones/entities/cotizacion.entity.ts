import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { CotizacionDetalle } from './cotizacion-detalle.entity';

@Entity('cotizaciones')
export class Cotizacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  // Correlativo por empresa (se muestra como COT-000001)
  @Column({ type: 'integer' })
  numero: number;

  @Column({ type: 'uuid', nullable: true })
  cliente_id: string | null;

  @Column({ type: 'varchar', length: 15 })
  cliente_numero_documento: string;

  @Column({ type: 'varchar' })
  cliente_razon_social: string;

  @Column({ type: 'date' })
  fecha_emision: string;

  @Column({ type: 'date', nullable: true })
  fecha_validez: string | null;

  // PENDIENTE | ACEPTADA | RECHAZADA | CONVERTIDA | ANULADA
  @Column({ type: 'varchar', default: 'PENDIENTE' })
  estado: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_gravado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_igv: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  importe_total: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  // Si se convirtió en venta, guardamos su id
  @Column({ type: 'uuid', nullable: true })
  venta_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => CotizacionDetalle, (detalle) => detalle.cotizacion, {
    cascade: true,
  })
  detalles: CotizacionDetalle[];
}
