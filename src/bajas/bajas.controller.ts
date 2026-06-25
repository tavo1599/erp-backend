// src/bajas/bajas.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { BajasService } from './bajas.service';
import { CreateBajaDto } from './dto/create-baja.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('bajas')
export class BajasController {
  constructor(private readonly bajasService: BajasService) {}

  // Enviar la comunicación de baja
  @Post()
  enviar(@Body() dto: CreateBajaDto, @Request() req) {
    return this.bajasService.enviarBaja(dto, req.user.empresa_id);
  }

    @Get()
  listar(@Request() req) {
    return this.bajasService.listarBajas(req.user.empresa_id);
  }

  // Consultar el estado de una baja (con su ticket)
  @Get(':id/estado')
  consultarEstado(@Param('id') id: string, @Request() req) {
    return this.bajasService.consultarEstado(id, req.user.empresa_id);
  }

    @Get(':id')
  obtener(@Param('id') id: string, @Request() req) {
    return this.bajasService.obtenerBaja(id, req.user.empresa_id);
  }
}