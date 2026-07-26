import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { TransferenciaDetalle } from './transferencia-detalle.entity';

@Entity('transferencias')
export class Transferencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  // Correlativo por empresa (se muestra como TRA-000001)
  @Column({ type: 'integer' })
  numero: number;

  @Column({ type: 'uuid' })
  almacen_origen_id: string;

  @Column({ type: 'uuid' })
  almacen_destino_id: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ type: 'varchar', nullable: true })
  usuario_email: string | null;

  @Column({ type: 'varchar', default: 'COMPLETADA' })
  estado: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => TransferenciaDetalle, (detalle) => detalle.transferencia, {
    cascade: true,
  })
  detalles: TransferenciaDetalle[];
}
