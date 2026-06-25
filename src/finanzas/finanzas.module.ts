// src/finanzas/finanzas.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanzasService } from './finanzas.service';
import { FinanzasController } from './finanzas.controller';
import { CuentaPorCobrar } from './entities/cuenta-por-cobrar.entity';
import { CuentaPorPagar } from './entities/cuenta-por-pagar.entity';
import { MovimientoCaja } from './entities/movimiento-caja.entity';
import { PermisosModule } from '../permisos/permisos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CuentaPorCobrar, CuentaPorPagar, MovimientoCaja]),
    PermisosModule,
  ],
  controllers: [FinanzasController],
  providers: [FinanzasService],
  exports: [FinanzasService],
})
export class FinanzasModule {}