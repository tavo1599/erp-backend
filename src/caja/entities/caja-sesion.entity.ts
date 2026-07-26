import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('caja_sesiones')
export class CajaSesion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar', nullable: true })
  usuario_email: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monto_inicial: number;

  // Se calculan al cerrar
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_ventas_efectivo: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monto_esperado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_contado: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia: number | null;

  @Column({ type: 'varchar', default: 'ABIERTA' })
  estado: string; // ABIERTA | CERRADA

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @CreateDateColumn()
  fecha_apertura: Date;

  @Column({ type: 'timestamp', nullable: true })
  fecha_cierre: Date | null;
}
