import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { GuiaRemisionDetalle } from './guia-remision-detalle.entity';

@Entity('guias_remision')
export class GuiaRemision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  // ============ IDENTIFICACIÓN ============
  @Column({ type: 'varchar', length: 2 })
  tipo_guia: string; // 09=Remitente, 31=Transportista

  @Column({ type: 'varchar', length: 4 })
  serie: string;

  @Column({ type: 'integer' })
  correlativo: number;

  @CreateDateColumn()
  fecha_emision: Date;

  @Column({ type: 'date' })
  fecha_inicio_traslado: Date;

  // ============ VINCULACIÓN ============
  @Column({ type: 'uuid', nullable: true })
  venta_id: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  doc_relacionado_tipo: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  doc_relacionado_numero: string | null;

  // ============ MOTIVO ============
  @Column({ type: 'varchar', length: 2 })
  motivo_traslado: string;

  @Column({ type: 'varchar', length: 250 })
  descripcion_motivo: string;

  // ============ MODALIDAD ============
  @Column({ type: 'varchar', length: 2 })
  modalidad_transporte: string; // 01=Público, 02=Privado

  // ============ PESO ============
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  peso_bruto_total: number;

  @Column({ type: 'varchar', length: 3, default: 'KGM' })
  unidad_peso: string;

  // ============ DESTINATARIO ============
  @Column({ type: 'varchar', length: 1 })
  destinatario_tipo_documento: string;

  @Column({ type: 'varchar', length: 15 })
  destinatario_numero_documento: string;

  @Column({ type: 'varchar', length: 200 })
  destinatario_razon_social: string;

  // ============ PARTIDA ============
  @Column({ type: 'varchar', length: 6 })
  partida_ubigeo: string;

  @Column({ type: 'varchar', length: 250 })
  partida_direccion: string;

  // ============ LLEGADA ============
  @Column({ type: 'varchar', length: 6 })
  llegada_ubigeo: string;

  @Column({ type: 'varchar', length: 250 })
  llegada_direccion: string;

  // ============ TRANSPORTISTA (modalidad pública) ============
  @Column({ type: 'uuid', nullable: true })
  transportista_id: string | null;

  @Column({ type: 'varchar', length: 1, nullable: true })
  transportista_tipo_documento: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  transportista_numero_documento: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  transportista_razon_social: string | null;

  // ============ VEHÍCULO ============
  @Column({ type: 'uuid', nullable: true })
  vehiculo_id: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  numero_placa: string | null;

  // ============ CONDUCTOR (modalidad privada) ============
  @Column({ type: 'uuid', nullable: true })
  conductor_id: string | null;

  @Column({ type: 'varchar', length: 1, nullable: true })
  conductor_tipo_documento: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  conductor_numero_documento: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  conductor_nombre: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  conductor_licencia: string | null;

  // ============ RESPUESTA SUNAT ============
  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado_sunat: string; // PENDIENTE, ACEPTADO, RECHAZADO, ANULADA

  @Column({ type: 'varchar', length: 10, nullable: true })
  sunat_codigo: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  sunat_descripcion: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sunat_hash: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sunat_ticket: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  nombre_archivo: string | null;

  @Column({ type: 'text', nullable: true })
  sunat_xml_base64: string | null;

  @Column({ type: 'text', nullable: true })
  sunat_cdr_base64: string | null;

  // ============ OTROS ============
  @Column({ type: 'varchar', length: 500, nullable: true })
  observaciones: string | null;

  @OneToMany(() => GuiaRemisionDetalle, (d) => d.guia, { cascade: true })
  detalles: GuiaRemisionDetalle[];

  @CreateDateColumn()
  fecha_creacion: Date;
}