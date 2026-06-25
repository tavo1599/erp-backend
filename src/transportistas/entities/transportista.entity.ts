import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('transportistas')
export class Transportista {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar', length: 1, default: '6' })
  tipo_documento: string; // 6=RUC, 1=DNI

  @Column({ type: 'varchar', length: 15 })
  numero_documento: string;

  @Column({ type: 'varchar', length: 200 })
  razon_social: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  numero_mtc: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  fecha_creacion: Date;
}