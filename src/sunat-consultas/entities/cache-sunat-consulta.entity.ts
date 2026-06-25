import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('cache_sunat_consultas')
@Index(['tipo', 'numero_documento'], { unique: true })
export class CacheSunatConsulta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 4 })
  tipo: string; // 'RUC' | 'DNI'

  @Column({ type: 'varchar', length: 15 })
  numero_documento: string;

  @Column({ type: 'jsonb' })
  datos: any;

  @CreateDateColumn()
  fecha_consulta: Date;

  @Column({ type: 'timestamp' })
  fecha_expira: Date;

  @Column({ type: 'integer', default: 1 })
  veces_usado: number;
}