import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Empresa } from '../../empresas/entities/empresa.entity';
import { Usuario } from './usuario.entity';

@Entity('empresa_usuarios')
export class EmpresaUsuario {
  
  @PrimaryColumn('uuid')
  empresa_id: string;

  @PrimaryColumn('uuid')
  usuario_id: string;

  @Column({ type: 'varchar' })
  rol: string; // Ej: 'ADMIN', 'VENDEDOR', 'LOGISTICA'

  // Relaciones con las otras tablas
  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}