// src/kardex/kardex.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KardexService } from './kardex.service';
import { KardexController } from './kardex.controller';
import { KardexMovimiento } from './entities/kardex.entity';
import { Producto } from '../productos/entities/producto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([KardexMovimiento, Producto])],
  controllers: [KardexController],
  providers: [KardexService],
  exports: [KardexService] // Lo exportamos para que el módulo de Ventas y Compras puedan usarlo luego
})
export class KardexModule {}