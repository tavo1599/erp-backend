// src/finanzas/entities/cuenta-por-pagar.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('cuentas_por_pagar')
export class CuentaPorPagar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'uuid' })
  compra_id: string;

  @Column({ type: 'varchar' })
  proveedor_razon_social: string;

  @Column({ type: 'varchar' })
  documento: string; // factura del proveedor

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_total: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monto_pagado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  saldo_pendiente: number;

  @Column({ type: 'date', nullable: true })
  fecha_vencimiento: Date | null;

  @Column({ type: 'varchar', default: 'PENDIENTE' })
  estado: string;

  @CreateDateColumn()
  created_at: Date;
}