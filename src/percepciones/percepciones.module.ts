import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PercepcionesService } from './percepciones.service';
import { PercepcionesController } from './percepciones.controller';
import { Percepcion } from './entities/percepcion.entity';
import { PercepcionDetalle } from './entities/percepcion-detalle.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { PermisosModule } from '../permisos/permisos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Percepcion, PercepcionDetalle, Empresa]),
    HttpModule,
    PermisosModule,
  ],
  controllers: [PercepcionesController],
  providers: [PercepcionesService],
})
export class PercepcionesModule {}
