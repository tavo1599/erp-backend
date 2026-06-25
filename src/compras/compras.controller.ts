// src/compras/compras.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Permiso('crear_compras')
  @Post()
  crear(@Body() dto: CreateCompraDto, @Request() req: any) {
    return this.comprasService.crearCompra(dto, req.user.empresa_id);
  }

  @Permiso('ver_compras')
  @Get()
  listar(@Request() req: any) {
    return this.comprasService.listarCompras(req.user.empresa_id);
  }

  @Permiso('ver_compras')
  @Get(':id')
  obtener(@Param('id') id: string, @Request() req: any) {
    return this.comprasService.obtenerCompra(id, req.user.empresa_id);
  }

  @Permiso('crear_compras')
  @Post(':id/anular')
  anular(@Param('id') id: string, @Request() req: any) {
    return this.comprasService.anularCompra(id, req.user.empresa_id);
  }
}