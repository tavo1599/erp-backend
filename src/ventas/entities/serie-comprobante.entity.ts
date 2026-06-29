// src/ventas/entities/serie-comprobante.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('series_comprobantes')
@Unique(['empresa_id', 'tipo_comprobante', 'serie', 'ambiente'])
export class SerieComprobante {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar', length: 2 }) // '01' Factura, '03' Boleta, '07' NC, '08' ND
  tipo_comprobante: string;

  @Column({ type: 'varchar', length: 4 }) // 'F001', 'B001'
  serie: string;

  @Column({ type: 'varchar', length: 20, default: 'beta' })
  ambiente: string; // 'beta' o 'produccion'

  @Column({ type: 'integer', default: 0 })
  ultimo_correlativo: number;
}