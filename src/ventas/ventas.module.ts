// src/ventas/ventas.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { Venta } from './entities/venta.entity';
import { VentaDetalle } from './entities/venta-detalle.entity';
import { KardexModule } from '../kardex/kardex.module'; // Lo importamos para descontar stock luego
import { Empresa } from '../empresas/entities/empresa.entity';
import { SerieComprobante } from './entities/serie-comprobante.entity';

@Module({
  // Importamos las dos tablas de ventas y el módulo de Kardex
  imports: [
    TypeOrmModule.forFeature([Venta, VentaDetalle, SerieComprobante, Empresa]),
    KardexModule,
    HttpModule
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}