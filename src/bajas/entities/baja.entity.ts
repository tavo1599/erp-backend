// src/bajas/entities/baja.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('bajas')
export class Baja {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar' })
  identificador: string; // RA-20260524-1

  @Column({ type: 'integer' })
  correlativo: number; // correlativo de la baja del día

  // Documento que se anula
  @Column({ type: 'varchar', length: 2 })
  tipo_documento: string; // 01, 07, 08

  @Column({ type: 'varchar', length: 4 })
  serie_documento: string;

  @Column({ type: 'integer' })
  correlativo_documento: number;

  @Column({ type: 'varchar' })
  motivo: string;

  // Control SUNAT (asíncrono con ticket)
  @Column({ type: 'varchar', nullable: true })
  ticket: string | null;

  @Column({ type: 'varchar', default: 'PENDIENTE' })
  estado: string; // PENDIENTE, ACEPTADO, RECHAZADO

  @Column({ type: 'varchar', nullable: true })
  sunat_codigo: string;

  @Column({ type: 'text', nullable: true })
  sunat_descripcion: string;

  @Column({ type: 'text', nullable: true })
  sunat_cdr_base64: string;

  @Column({ type: 'varchar', nullable: true })
  nombre_archivo: string;

  @CreateDateColumn()
  fecha_creacion: Date;
}