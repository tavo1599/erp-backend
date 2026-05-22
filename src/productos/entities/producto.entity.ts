import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ¡La clave del Multi-Tenant!
  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar', nullable: true })
  codigo_sunat: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'varchar', length: 3, default: 'NIU' }) // NIU = Unidad (Catálogo 03 SUNAT)
  unidad_medida: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio_venta: number;

  @Column({ type: 'varchar', length: 2, default: '10' }) // 10 = Gravado con IGV
  tipo_igv: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stock_actual: number;

  @Column({ type: 'boolean', default: true })
  estado: boolean;

  @CreateDateColumn()
  created_at: Date;
}