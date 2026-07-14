import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('almacenes')
export class Almacen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  encargado_nombre: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  encargado_telefono: string | null;

  @Column({ type: 'boolean', default: false })
  es_principal: boolean;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  fecha_creacion: Date;
}