// src/clientes/entities/cliente.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Unique } from 'typeorm';

@Entity('clientes')
@Unique(['empresa_id', 'numero_documento']) // no repetir el mismo doc en la misma empresa
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string; // multi-tenant

  @Column({ type: 'varchar', length: 1 })
  tipo_documento: string; // 6=RUC, 1=DNI, 0=sin doc, etc.

  @Column({ type: 'varchar', length: 15 })
  numero_documento: string;

  @Column({ type: 'varchar' })
  razon_social: string; // o nombre completo si es persona

  @Column({ type: 'varchar', nullable: true })
  direccion: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  telefono: string;

  @Column({ type: 'boolean', default: true })
  estado: boolean;

  @CreateDateColumn()
  created_at: Date;
}