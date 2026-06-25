// src/ventas/entities/venta.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { VentaDetalle } from './venta-detalle.entity';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  // Datos del Cliente
  @Column({ type: 'varchar', length: 15 })
  cliente_numero_documento: string;

  @Column({ type: 'varchar' })
  cliente_razon_social: string;

  // Datos del Comprobante
  @Column({ type: 'varchar', length: 2 })
  tipo_comprobante: string;

  @Column({ type: 'varchar', length: 4 })
  serie: string;

  @Column({ type: 'integer' })
  correlativo: number;

  // Totales
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_gravado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
total_exonerado: number;

@Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
total_inafecto: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_igv: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importe_total: number;

  // Control SUNAT
  @Column({ type: 'varchar', default: 'PENDIENTE' })
  estado_sunat: string; // PENDIENTE, ACEPTADO, RECHAZADO

  // === NUEVOS CAMPOS: respuesta de SUNAT ===
  @Column({ type: 'varchar', nullable: true })
  sunat_codigo: string; // "0" = aceptada, otro = rechazo

  @Column({ type: 'text', nullable: true })
  sunat_descripcion: string; // "La Factura F001-... ha sido aceptada"

  @Column({ type: 'varchar', nullable: true })
  sunat_hash: string; // hash del XML firmado (para el QR)

  @Column({ type: 'text', nullable: true })
  sunat_xml_base64: string; // XML firmado en Base64

  @Column({ type: 'text', nullable: true })
  sunat_cdr_base64: string; // CDR (constancia) en Base64

  @Column({ type: 'varchar', nullable: true })
  nombre_archivo: string; // 20123456789-01-F001-00000001

  @CreateDateColumn()
  fecha_emision: Date;

  @OneToMany(() => VentaDetalle, (detalle) => detalle.venta, { cascade: true })
  detalles: VentaDetalle[];

  @Column({ type: 'varchar', default: 'CONTADO' })
  condicion_pago: string; // CONTADO o CREDITO

  @Column({ type: 'varchar', default: 'PAGADO' })
  estado_pago: string; // PAGADO, PENDIENTE, PARCIAL

  @Column({ type: 'date', nullable: true })
  fecha_vencimiento: Date | null; // para ventas a crédito@Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
descuento_total: number;
}