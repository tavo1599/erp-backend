import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('rol_permisos')
@Index(['empresa_id', 'rol', 'permiso'], { unique: true })
export class RolPermiso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar', length: 30 })
  rol: string; // ADMIN_EMPRESA, VENDEDOR, CONTADOR, SUPER_ADMIN

  @Column({ type: 'varchar', length: 50 })
  permiso: string; // crear_ventas, anular_ventas, etc.

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}