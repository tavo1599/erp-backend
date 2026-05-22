// src/ventas/ventas.controller.ts
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  create(@Body() createVentaDto: CreateVentaDto, @Request() req) {
    const empresaId = req.user.empresa_id;
    return this.ventasService.crearVentaInterna(createVentaDto, empresaId);
  }
}