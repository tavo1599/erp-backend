import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Percepcion } from './percepcion.entity';

@Entity('percepcion_detalles')
export class PercepcionDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  percepcion_id: string;

  @Column({ type: 'varchar', default: '01' })
  tipo_doc_relacionado: string; // 01 = Factura

  @Column({ type: 'varchar' })
  num_doc_relacionado: string; // serie-número

  @Column({ type: 'date' })
  fecha_doc: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importe_doc: number;

  @Column({ type: 'date' })
  fecha_cobro: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importe_cobrado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_percibido: number;

  @ManyToOne(() => Percepcion, (percepcion) => percepcion.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'percepcion_id' })
  percepcion: Percepcion;
}
