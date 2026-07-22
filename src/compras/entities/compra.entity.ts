// src/compras/entities/compra.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { CompraDetalle } from './compra-detalle.entity';

@Entity('compras')
export class Compra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  // Almacén al que ingresa la mercadería comprada (nullable para compras históricas).
  @Column({ type: 'uuid', nullable: true })
  almacen_id: string | null;

  @Column({ type: 'uuid' })
  proveedor_id: string;

  // Datos del documento que nos dio el proveedor
  @Column({ type: 'varchar', length: 2 })
  tipo_documento: string; // 01 factura, 03 boleta, etc.

  @Column({ type: 'varchar' })
  serie_documento: string; // la serie de la factura del proveedor

  @Column({ type: 'varchar' })
  numero_documento: string; // el número de la factura del proveedor

  @Column({ type: 'date' })
  fecha_compra: Date;

  // Totales
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_gravado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_igv: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importe_total: number;

  @Column({ type: 'varchar', default: 'REGISTRADA' })
  estado: string; // REGISTRADA, ANULADA

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => CompraDetalle, (detalle) => detalle.compra, { cascade: true })
  detalles: CompraDetalle[];

    @Column({ type: 'varchar', default: 'CONTADO' })
  condicion_pago: string;

  @Column({ type: 'varchar', default: 'PAGADO' })
  estado_pago: string;

  @Column({ type: 'date', nullable: true })
  fecha_vencimiento: Date | null;
}