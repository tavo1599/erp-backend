// src/sunat-consultas/sunat-consultas.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SunatConsultasService } from './sunat-consultas.service';

@UseGuards(JwtAuthGuard)
@Controller('sunat-consultas')
export class SunatConsultasController {
  constructor(private readonly service: SunatConsultasService) {}

  @Get('ruc/:ruc')
  consultarRuc(@Param('ruc') ruc: string) {
    return this.service.consultarRuc(ruc);
  }

  @Get('dni/:dni')
  consultarDni(@Param('dni') dni: string) {
    return this.service.consultarDni(dni);
  }

  @UseGuards(JwtAuthGuard)
@Get('cache/estadisticas')
estadisticasCache() {
  return this.service.estadisticasCache();
}
}