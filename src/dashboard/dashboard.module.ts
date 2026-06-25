// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Venta } from '../ventas/entities/venta.entity';
import { VentaDetalle } from '../ventas/entities/venta-detalle.entity';
import { Compra } from '../compras/entities/compra.entity';
import { Producto } from '../productos/entities/producto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Venta, VentaDetalle, Compra, Producto])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}