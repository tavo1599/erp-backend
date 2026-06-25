// src/notas/notas.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { NotasService } from './notas.service';
import { NotasController } from './notas.controller';
import { Nota } from './entities/nota.entity';
import { SerieComprobante } from '../ventas/entities/serie-comprobante.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Producto } from '../productos/entities/producto.entity';
import { PdfService } from '../ventas/pdf.service';
import { PermisosModule } from '../permisos/permisos.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Nota, SerieComprobante, Empresa, Producto, Empresa, Producto]),
    HttpModule,
    PermisosModule,
  ],
  controllers: [NotasController],
  providers: [NotasService, PdfService],
})
export class NotasModule {}