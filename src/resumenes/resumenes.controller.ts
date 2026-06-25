// src/resumenes/resumenes.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ResumenesService } from './resumenes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('resumenes')
export class ResumenesController {
  constructor(private readonly resumenesService: ResumenesService) {}

  // Enviar resumen de boletas de una fecha
  @Post()
  enviar(@Body() body: { fecha: string }, @Request() req) {
    return this.resumenesService.enviarResumen(body.fecha, req.user.empresa_id);
  }

  @Get()
  listar(@Request() req) {
    return this.resumenesService.listar(req.user.empresa_id);
  }

  @Get(':id/estado')
  consultarEstado(@Param('id') id: string, @Request() req) {
    return this.resumenesService.consultarEstado(id, req.user.empresa_id);
  }
}