import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('stock_almacen')
@Unique(['producto_id', 'almacen_id'])
export class StockAlmacen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  producto_id: string;

  @Column({ type: 'uuid' })
  almacen_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  stock_actual: number;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}