import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('empresas') // Este será el nombre de la tabla en PostgreSQL
export class Empresa {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 11, unique: true })
  ruc: string;

  @Column({ type: 'varchar' })
  razon_social: string;

  @Column({ type: 'varchar', nullable: true })
  nombre_comercial: string;

  @Column({ type: 'varchar', nullable: true })
  direccion: string;

  @Column({ type: 'varchar', length: 6, nullable: true })
  ubigeo: string;

  @Column({ type: 'boolean', default: true })
  estado: boolean;

  @Column({ type: 'varchar', nullable: true })
  sol_usuario: string;

  @Column({ type: 'varchar', nullable: true })
  sol_clave: string;

  @Column({ type: 'varchar', length: 15, default: 'LIMA' })
  departamento: string;

  @Column({ type: 'varchar', length: 15, default: 'LIMA' })
  provincia: string;

  @Column({ type: 'varchar', length: 15, default: 'LIMA' })
  distrito: string;

  @CreateDateColumn()
  created_at: Date;
}