// src/catalogos/catalogos.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CatalogosService } from './catalogos.service';

@UseGuards(JwtAuthGuard)
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get()
  getTodos() {
    return this.catalogosService.getTodos();
  }

  @Get('unidades-medida')
  getUnidadesMedida() {
    return this.catalogosService.getUnidadesMedida();
  }

  @Get('tipos-afectacion-igv')
  getTiposAfectacionIgv() {
    return this.catalogosService.getTiposAfectacionIgv();
  }

  @Get('tipos-documento')
  getTiposDocumento() {
    return this.catalogosService.getTiposDocumento();
  }

  @Get('tipos-comprobante')
  getTiposComprobante() {
    return this.catalogosService.getTiposComprobante();
  }

  @Get('monedas')
  getMonedas() {
    return this.catalogosService.getMonedas();
  }

  @Get('motivos-nota-credito')
  getMotivosNotaCredito() {
    return this.catalogosService.getMotivosNotaCredito();
  }

  @Get('motivos-nota-debito')
  getMotivosNotaDebito() {
    return this.catalogosService.getMotivosNotaDebito();
  }

  @Get('condiciones-pago')
  getCondicionesPago() {
    return this.catalogosService.getCondicionesPago();
  }

  @Get('metodos-pago')
  getMetodosPago() {
    return this.catalogosService.getMetodosPago();
  }
}