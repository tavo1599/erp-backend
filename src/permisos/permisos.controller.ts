import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PermisosService } from './permisos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';

@UseGuards(JwtAuthGuard)
@Controller('permisos')
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  // Obtener la matriz completa de permisos de mi empresa
  @Get('matriz')
  obtenerMatriz(@Request() req: any) {
    return this.permisosService.obtenerMatriz(req.user.empresa_id);
  }

  // Obtener los permisos activos del rol del usuario actual
  @Get('mios')
  async misPermisos(@Request() req: any) {
    const permisos = await this.permisosService.permisosDelRol(
      req.user.empresa_id,
      req.user.rol,
    );
    return { rol: req.user.rol, permisos };
  }

  // Actualizar un permiso específico (solo ADMIN_EMPRESA)
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPER_ADMIN)
  @Patch()
  actualizar(
    @Body() body: { rol: string; permiso: string; activo: boolean },
    @Request() req: any,
  ) {
    return this.permisosService.actualizar(
      req.user.empresa_id,
      body.rol,
      body.permiso,
      body.activo,
    );
  }
}