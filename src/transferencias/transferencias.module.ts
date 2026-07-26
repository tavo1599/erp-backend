import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferenciasService } from './transferencias.service';
import { TransferenciasController } from './transferencias.controller';
import { Transferencia } from './entities/transferencia.entity';
import { TransferenciaDetalle } from './entities/transferencia-detalle.entity';
import { Almacen } from '../almacenes/entities/almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { StockModule } from '../stock/stock.module';
import { PermisosModule } from '../permisos/permisos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transferencia, TransferenciaDetalle, Almacen, Producto]),
    StockModule,
    PermisosModule,
  ],
  controllers: [TransferenciasController],
  providers: [TransferenciasService],
})
export class TransferenciasModule {}
