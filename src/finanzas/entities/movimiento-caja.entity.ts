// src/finanzas/entities/movimiento-caja.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('movimientos_caja')
export class MovimientoCaja {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empresa_id: string;

  @Column({ type: 'varchar', length: 10 })
  tipo: string; // INGRESO o EGRESO

  @Column({ type: 'varchar' })
  concepto: string; // "Cobro de F001-7", "Pago a proveedor", "Gasto operativo"

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'varchar', nullable: true })
  referencia: string; // comprobante relacionado, si aplica

  @Column({ type: 'varchar', nullable: true })
  metodo_pago: string; // EFECTIVO, TRANSFERENCIA, YAPE, etc.

  @CreateDateColumn()
  fecha: Date;
}