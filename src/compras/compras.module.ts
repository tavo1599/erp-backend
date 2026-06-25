// src/compras/compras.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { Compra } from './entities/compra.entity';
import { CompraDetalle } from './entities/compra-detalle.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Proveedor } from '../proveedores/entities/proveedore.entity';
import { KardexModule } from '../kardex/kardex.module';
import { FinanzasModule } from '../finanzas/finanzas.module';
import { PermisosModule } from '../permisos/permisos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compra, CompraDetalle, Producto, Proveedor]),
    KardexModule,
    FinanzasModule,
    PermisosModule,
  ],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}