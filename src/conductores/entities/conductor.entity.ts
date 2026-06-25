import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('conductores')
export class Conductor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar', length: 1, default: '1' })
  tipo_documento: string; // 1=DNI generalmente

  @Column({ type: 'varchar', length: 15 })
  numero_documento: string;

  @Column({ type: 'varchar', length: 100 })
  nombres: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  apellidos: string | null;

  @Column({ type: 'varchar', length: 20 })
  licencia_conducir: string;

  // Si pertenece a un transportista externo
  @Column({ type: 'uuid', nullable: true })
  transportista_id: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  fecha_creacion: Date;
}