import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { RetencionesService } from './retenciones.service';
import { RetencionesController } from './retenciones.controller';
import { Retencion } from './entities/retencion.entity';
import { RetencionDetalle } from './entities/retencion-detalle.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { PermisosModule } from '../permisos/permisos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Retencion, RetencionDetalle, Empresa]),
    HttpModule,
    PermisosModule,
  ],
  controllers: [RetencionesController],
  providers: [RetencionesService],
})
export class RetencionesModule {}
