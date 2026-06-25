// src/clientes/clientes.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Permiso('crear_clientes')
  @Post()
  create(@Body() dto: CreateClienteDto, @Request() req: any) {
    return this.clientesService.create(dto, req.user.empresa_id);
  }

  @Permiso('ver_clientes')
  @Get()
  findAll(@Request() req: any, @Query('buscar') buscar?: string) {
    return this.clientesService.findAll(req.user.empresa_id, buscar);
  }

  @Permiso('ver_clientes')
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.clientesService.findOne(id, req.user.empresa_id);
  }

  @Permiso('editar_clientes')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateClienteDto>, @Request() req: any) {
    return this.clientesService.update(id, dto, req.user.empresa_id);
  }

  @Permiso('editar_clientes')
  @Delete(':id')
  desactivar(@Param('id') id: string, @Request() req: any) {
    return this.clientesService.desactivar(id, req.user.empresa_id);
  }
}