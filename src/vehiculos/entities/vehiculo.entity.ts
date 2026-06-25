import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('vehiculos')
export class Vehiculo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar', length: 10 })
  placa: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  marca: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modelo: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  certificado_mtc: string | null;

  // Si el vehículo pertenece a un transportista externo
  @Column({ type: 'uuid', nullable: true })
  transportista_id: string | null;

  // true = vehículo de mi empresa, false = de un transportista
  @Column({ type: 'boolean', default: true })
  es_propio: boolean;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  fecha_creacion: Date;
}