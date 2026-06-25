// src/admin/admin.controller.ts
import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import { CreateEmpresaDto } from '../empresas/dto/create-empresa.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('empresas')
  listarEmpresas() {
    return this.adminService.listarEmpresas();
  }

  @Post('empresas')
  crearEmpresa(@Body() dto: CreateEmpresaDto) {
    return this.adminService.crearEmpresaConAdmin(dto);
  }

  @Patch('empresas/:id')
  actualizarEmpresa(@Param('id') id: string, @Body() datos: any) {
    return this.adminService.actualizarEmpresa(id, datos);
  }

  @Patch('empresas/:id/estado')
  cambiarEstado(
    @Param('id') id: string,
    @Body() body: { estado: 'ACTIVA' | 'SUSPENDIDA' | 'CANCELADA' },
  ) {
    return this.adminService.cambiarEstadoEmpresa(id, body.estado);
  }

  @Get('kpis')
  kpis() {
    return this.adminService.kpisGlobales();
  }
}