// src/ventas/ventas.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { PdfService } from './pdf.service';
import { Venta } from './entities/venta.entity';
import { VentaDetalle } from './entities/venta-detalle.entity';
import { KardexModule } from '../kardex/kardex.module';
import { Empresa } from '../empresas/entities/empresa.entity';
import { SerieComprobante } from './entities/serie-comprobante.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { FinanzasModule } from '../finanzas/finanzas.module';
import { BajasModule } from '../bajas/bajas.module';
import { VentaPago } from './entities/venta-pago.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { PermisosModule } from '../permisos/permisos.module';
import { StockModule } from '../stock/stock.module';
import { Almacen } from '../almacenes/entities/almacen.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, VentaDetalle, VentaPago, SerieComprobante, Empresa, Producto, Cliente, Almacen]),
    KardexModule,
    HttpModule,
    FinanzasModule,
    BajasModule,
    AuditoriaModule,
    PermisosModule,
    StockModule,
  ],
  controllers: [VentasController],
  providers: [VentasService, PdfService],
})
export class VentasModule {}