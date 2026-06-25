// src/finanzas/entities/cuenta-por-cobrar.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('cuentas_por_cobrar')
export class CuentaPorCobrar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'uuid' })
  venta_id: string; // la venta que generó esta deuda

  @Column({ type: 'varchar' })
  cliente_documento: string;

  @Column({ type: 'varchar' })
  cliente_razon_social: string;

  @Column({ type: 'varchar' })
  comprobante: string; // F001-00000007

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_total: number; // cuánto debe en total

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monto_pagado: number; // cuánto ha pagado

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  saldo_pendiente: number; // lo que falta

  @Column({ type: 'date', nullable: true })
  fecha_vencimiento: Date | null;

  @Column({ type: 'varchar', default: 'PENDIENTE' })
  estado: string; // PENDIENTE, PARCIAL, PAGADO

  @CreateDateColumn()
  created_at: Date;
}