// src/resumenes/resumenes.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ResumenesService } from './resumenes.service';
import { ResumenesController } from './resumenes.controller';
import { ResumenDiario } from './entities/resumen.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Venta } from '../ventas/entities/venta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResumenDiario, Empresa, Venta]),
    HttpModule,
  ],
  controllers: [ResumenesController],
  providers: [ResumenesService],
})
export class ResumenesModule {}