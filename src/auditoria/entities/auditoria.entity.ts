import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('auditoria')
export class Auditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  empresa_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  usuario_id: string | null;

  @Column({ type: 'varchar' })
  usuario_email: string;

  @Column({ type: 'varchar' })
  usuario_rol: string;

  @Column({ type: 'varchar' })
  @Index()
  accion: string; // 'EMITIR_VENTA', 'ANULAR_VENTA', 'CREAR_PRODUCTO', etc.

  @Column({ type: 'varchar', nullable: true })
  recurso: string | null; // tipo de recurso: 'venta', 'producto', etc.

  @Column({ type: 'varchar', nullable: true })
  recurso_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  datos_antes: any;

  @Column({ type: 'jsonb', nullable: true })
  datos_despues: any;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', nullable: true })
  user_agent: string | null;

  @CreateDateColumn()
  @Index()
  fecha: Date;
}