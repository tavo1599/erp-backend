import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('direcciones_traslado')
export class DireccionTraslado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  // Nombre descriptivo para identificarla: "Almacén Principal", "Sucursal Lima Sur"
  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 6 })
  ubigeo: string;

  @Column({ type: 'varchar', length: 250 })
  direccion: string;

  @Column({ type: 'varchar', length: 50 })
  departamento: string;

  @Column({ type: 'varchar', length: 50 })
  provincia: string;

  @Column({ type: 'varchar', length: 50 })
  distrito: string;

  // Tipo: PARTIDA, LLEGADA, AMBOS (por defecto)
  @Column({ type: 'varchar', length: 10, default: 'AMBOS' })
  tipo: string;

  // Si es predeterminada (para autocompletar al crear nueva guía)
  @Column({ type: 'boolean', default: false })
  es_predeterminada: boolean;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  fecha_creacion: Date;
}