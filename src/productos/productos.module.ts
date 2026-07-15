import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Producto } from './entities/producto.entity';
import { KardexModule } from '../kardex/kardex.module';
import { PermisosModule } from '../permisos/permisos.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { KardexMovimiento } from '../kardex/entities/kardex.entity';
import { Almacen } from '../almacenes/entities/almacen.entity';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Producto, KardexMovimiento, Almacen]),
    KardexModule,
    PermisosModule,
    AuditoriaModule,
    StockModule,
  ],
  controllers: [ProductosController],
  providers: [ProductosService],
})
export class ProductosModule {}