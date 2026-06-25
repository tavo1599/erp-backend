// src/resumenes/entities/resumen.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('resumenes_diarios')
export class ResumenDiario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar' })
  identificador: string; // RC-20260525-1

  @Column({ type: 'date' })
  fecha_referencia: string; // el día de las boletas

  @Column({ type: 'integer' })
  correlativo: number; // correlativo del resumen del día

  @Column({ type: 'integer' })
  cantidad_boletas: number;

  @Column({ type: 'varchar', nullable: true })
  ticket: string | null;

  @Column({ type: 'varchar', default: 'PENDIENTE' })
  estado: string; // PENDIENTE, ACEPTADO, RECHAZADO

  @Column({ type: 'varchar', nullable: true })
  sunat_codigo: string;

  @Column({ type: 'text', nullable: true })
  sunat_descripcion: string;

  @Column({ type: 'varchar', nullable: true })
  nombre_archivo: string;

  @CreateDateColumn()
  fecha_creacion: Date;
}