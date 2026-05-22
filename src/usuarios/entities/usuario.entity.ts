import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  password_hash: string; // Aquí guardaremos la contraseña encriptada, NUNCA en texto plano

  @Column({ type: 'varchar' })
  nombre: string;

  @CreateDateColumn()
  created_at: Date;
}