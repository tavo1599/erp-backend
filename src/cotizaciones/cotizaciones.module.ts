import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CotizacionesService } from './cotizaciones.service';
import { CotizacionesPdfService } from './cotizaciones-pdf.service';
import { CotizacionesController } from './cotizaciones.controller';
import { Cotizacion } from './entities/cotizacion.entity';
import { CotizacionDetalle } from './entities/cotizacion-detalle.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { VentasModule } from '../ventas/ventas.module';
import { PermisosModule } from '../permisos/permisos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cotizacion, CotizacionDetalle, Producto, Cliente, Empresa]),
    VentasModule,
    PermisosModule,
  ],
  controllers: [CotizacionesController],
  providers: [CotizacionesService, CotizacionesPdfService],
})
export class CotizacionesModule {}
