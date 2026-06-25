// src/proveedores/proveedores.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedoreDto } from './dto/create-proveedore.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  create(@Body() dto: CreateProveedoreDto, @Request() req) {
    return this.proveedoresService.create(dto, req.user.empresa_id);
  }

  @Get()
  findAll(@Request() req, @Query('buscar') buscar?: string) {
    return this.proveedoresService.findAll(req.user.empresa_id, buscar);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.proveedoresService.findOne(id, req.user.empresa_id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProveedoreDto>, @Request() req) {
    return this.proveedoresService.update(id, dto, req.user.empresa_id);
  }

  @Delete(':id')
  desactivar(@Param('id') id: string, @Request() req) {
    return this.proveedoresService.desactivar(id, req.user.empresa_id);
  }
}