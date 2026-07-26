import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Retencion } from './retencion.entity';

@Entity('retencion_detalles')
export class RetencionDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  retencion_id: string;

  // Documento relacionado que se está pagando (ej: factura del proveedor)
  @Column({ type: 'varchar', default: '01' })
  tipo_doc_relacionado: string; // 01 = Factura

  @Column({ type: 'varchar' })
  num_doc_relacionado: string; // serie-número

  @Column({ type: 'date' })
  fecha_doc: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importe_doc: number;

  @Column({ type: 'date' })
  fecha_pago: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importe_pagado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_retenido: number;

  @ManyToOne(() => Retencion, (retencion) => retencion.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'retencion_id' })
  retencion: Retencion;
}
