// src/empresas/empresas.controller.ts
import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('empresas') // Esta es la URL: localhost:3000/empresas
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Post()
  create(@Body() createEmpresaDto: CreateEmpresaDto) {
    return this.empresasService.create(createEmpresaDto);
  }

// ¡Le ponemos el candado a esta ruta!
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    // Gracias al Guardián, ahora tenemos acceso a req.user (el token decodificado)
    console.log('El usuario que hace la petición es de la empresa:', req.user.empresa_id);
    return this.empresasService.findAll();
  }
}