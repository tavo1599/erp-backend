import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { RetencionDetalle } from './retencion-detalle.entity';

@Entity('retenciones')
export class Retencion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar', length: 4 })
  serie: string; // ej: R001

  @Column({ type: 'integer' })
  correlativo: number;

  @Column({ type: 'date' })
  fecha_emision: string;

  // 01 = Tasa 3% (régimen general), 02 = Tasa 6%
  @Column({ type: 'varchar', default: '01' })
  regimen: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 3 })
  tasa: number;

  @Column({ type: 'varchar', length: 15 })
  proveedor_numero_documento: string;

  @Column({ type: 'varchar' })
  proveedor_razon_social: string;

  @Column({ type: 'varchar', default: 'PEN' })
  moneda: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_retenido: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_pagado: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  // SUNAT
  @Column({ type: 'varchar', default: 'PENDIENTE' })
  estado_sunat: string;

  @Column({ type: 'varchar', nullable: true })
  sunat_codigo: string | null;

  @Column({ type: 'varchar', nullable: true })
  sunat_descripcion: string | null;

  @Column({ type: 'varchar', nullable: true })
  sunat_hash: string | null;

  @Column({ type: 'text', nullable: true })
  sunat_xml_base64: string | null;

  @Column({ type: 'text', nullable: true })
  sunat_cdr_base64: string | null;

  @Column({ type: 'varchar', nullable: true })
  nombre_archivo: string | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => RetencionDetalle, (detalle) => detalle.retencion, {
    cascade: true,
  })
  detalles: RetencionDetalle[];
}
