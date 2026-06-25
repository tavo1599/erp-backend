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

  // Credenciales OAuth 2.0 para emitir Guías de Remisión Electrónicas
@Column({ type: 'varchar', length: 100, nullable: true })
sunat_client_id: string | null;

@Column({ type: 'varchar', length: 200, nullable: true })
sunat_client_secret: string | null;

@Column({ type: 'varchar', length: 50, nullable: true })
departamento: string;

@Column({ type: 'varchar', length: 50, nullable: true })
provincia: string;

@Column({ type: 'varchar', length: 50, nullable: true })
distrito: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'varchar', default: 'beta' })
  ambiente: string; // 'beta' o 'produccion'

    // Plan de suscripción
  @Column({ type: 'varchar', default: 'GRATUITO' })
  plan: string; // 'GRATUITO', 'BASICO', 'PRO'

  @Column({ type: 'date', nullable: true })
  fecha_inicio_suscripcion: Date;

  @Column({ type: 'date', nullable: true })
  fecha_fin_suscripcion: Date;

  @Column({ type: 'varchar', default: 'ACTIVA' })
  estado_suscripcion: string; // 'ACTIVA', 'SUSPENDIDA', 'CANCELADA'

  @Column({ type: 'integer', default: 1000 })
  limite_comprobantes_mes: number;

  @Column({ type: 'integer', default: 0 })
  comprobantes_emitidos_mes: number;

  @Column({ type: 'date', nullable: true })
  ultimo_reset_contador: Date;

  @CreateDateColumn()
  fecha_creacion: Date;

  // Personalización del PDF
@Column({ type: 'varchar', length: 250, nullable: true })
logo_url: string | null;

@Column({ type: 'varchar', length: 7, nullable: true })
color_pdf: string | null; // hex color, ej: '#c2643f'

@Column({ type: 'varchar', length: 500, nullable: true })
frase_pie_pdf: string | null;

@Column({ type: 'text', nullable: true })
cuentas_bancarias: string | null; // texto libre con cuentas
}