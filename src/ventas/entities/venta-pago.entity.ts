import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Venta } from './venta.entity';

@Entity('venta_pagos')
export class VentaPago {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  venta_id: string;

  @ManyToOne(() => Venta)
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @Column({ type: 'varchar' })
  metodo: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'varchar', nullable: true })
  referencia: string;

  @CreateDateColumn()
  fecha_creacion: Date;
}