import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('pagos_suscripcion')
export class PagoSuscripcion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  // Meses que cubre el pago (extiende la suscripción)
  @Column({ type: 'integer', default: 1 })
  meses: number;

  @Column({ type: 'varchar', default: 'EFECTIVO' })
  metodo: string;

  @Column({ type: 'date' })
  fecha_pago: string;

  // Hasta cuándo queda pagada la suscripción tras este pago
  @Column({ type: 'date', nullable: true })
  periodo_hasta: string | null;

  @Column({ type: 'varchar', nullable: true })
  registrado_por: string | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn()
  created_at: Date;
}
