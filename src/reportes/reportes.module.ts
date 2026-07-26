import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesService } from './reportes.service';
import { PleService } from './ple.service';
import { ReportesController } from './reportes.controller';
import { Venta } from '../ventas/entities/venta.entity';
import { Compra } from '../compras/entities/compra.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { PermisosModule } from '../permisos/permisos.module';

@Module({
  imports: [TypeOrmModule.forFeature([Venta, Compra, Empresa]), PermisosModule],
  controllers: [ReportesController],
  providers: [ReportesService, PleService],
})
export class ReportesModule {}
