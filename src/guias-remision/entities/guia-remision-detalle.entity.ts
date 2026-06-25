import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GuiaRemision } from './guia-remision.entity';

@Entity('guia_remision_detalles')
export class GuiaRemisionDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  guia_id: string;

  @ManyToOne(() => GuiaRemision, (g) => g.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guia_id' })
  guia: GuiaRemision;

  @Column({ type: 'integer' })
  numero: number; // 1, 2, 3...

  @Column({ type: 'uuid', nullable: true })
  producto_id: string | null; // null si es producto manual

  @Column({ type: 'varchar', length: 50, nullable: true })
  codigo_producto: string | null;

  @Column({ type: 'varchar', length: 250 })
  descripcion: string;

  @Column({ type: 'varchar', length: 10, default: 'NIU' })
  unidad_medida: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  peso_unitario: number | null;
}