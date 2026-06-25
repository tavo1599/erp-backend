import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', default: 'ADMIN_EMPRESA' })
rol: string;

  @Column({ type: 'varchar' })
  password_hash: string; // Aquí guardaremos la contraseña encriptada, NUNCA en texto plano

  @Column({ type: 'varchar' })
  nombre: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'varchar', nullable: true })
refresh_token: string | null;

@Column({ type: 'timestamp', nullable: true })
refresh_token_expira: Date | null;

@Column({ type: 'integer', default: 0 })
intentos_fallidos: number;

@Column({ type: 'timestamp', nullable: true })
bloqueado_hasta: Date | null;
}