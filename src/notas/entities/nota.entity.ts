// src/notas/entities/nota.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('notas')
export class Nota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar', length: 2 })
  tipo_nota: string; // 07=crédito, 08=débito

  @Column({ type: 'varchar', length: 4 })
  serie: string;

  @Column({ type: 'integer' })
  correlativo: number;

  // Documento afectado
  @Column({ type: 'varchar', length: 2 })
  tipo_comprobante_afectado: string; // 01 o 03

  @Column({ type: 'varchar' })
  comprobante_afectado: string; // F001-00000001

  @Column({ type: 'varchar', length: 2 })
  codigo_motivo: string;

  @Column({ type: 'varchar' })
  descripcion_motivo: string;

  // Cliente
  @Column({ type: 'varchar', length: 15 })
  cliente_numero_documento: string;

  @Column({ type: 'varchar' })
  cliente_razon_social: string;

  // Totales
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_gravado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_igv: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importe_total: number;

  // Control SUNAT
  @Column({ type: 'varchar', default: 'PENDIENTE' })
  estado_sunat: string;

  @Column({ type: 'varchar', nullable: true })
  sunat_codigo: string;

  @Column({ type: 'text', nullable: true })
  sunat_descripcion: string;

  @Column({ type: 'varchar', nullable: true })
  sunat_hash: string;

  @Column({ type: 'text', nullable: true })
  sunat_xml_base64: string;

  @Column({ type: 'text', nullable: true })
  sunat_cdr_base64: string;

  @Column({ type: 'varchar', nullable: true })
  nombre_archivo: string;

  @CreateDateColumn()
  fecha_emision: Date;
}