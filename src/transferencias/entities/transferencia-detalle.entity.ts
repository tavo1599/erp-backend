import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Transferencia } from './transferencia.entity';

@Entity('transferencia_detalles')
export class TransferenciaDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  transferencia_id: string;

  @Column({ type: 'uuid' })
  producto_id: string;

  @Column({ type: 'varchar' })
  producto_nombre: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @ManyToOne(() => Transferencia, (transferencia) => transferencia.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'transferencia_id' })
  transferencia: Transferencia;
}
