import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { GuiasRemisionService } from './guias-remision.service';
import { GuiasRemisionController } from './guias-remision.controller';
import { GuiaRemision } from './entities/guia-remision.entity';
import { GuiaRemisionDetalle } from './entities/guia-remision-detalle.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Transportista } from '../transportistas/entities/transportista.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { Conductor } from '../conductores/entities/conductor.entity';
import { SerieComprobante } from '../ventas/entities/serie-comprobante.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { PdfService } from '../ventas/pdf.service';
import { PermisosModule } from '../permisos/permisos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuiaRemision,
      GuiaRemisionDetalle,
      Empresa,
      Producto,
      Transportista,
      Vehiculo,
      Conductor,
      SerieComprobante,
    ]),
    HttpModule,
    AuditoriaModule,
    PermisosModule,
  ],
  controllers: [GuiasRemisionController],
  providers: [GuiasRemisionService, PdfService],
  exports: [GuiasRemisionService],
})
export class GuiasRemisionModule {}