import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { CajaService } from './caja.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Permiso('crear_ventas')
  @Get('estado')
  estado(@Request() req: any) {
    return this.cajaService.estadoActual(req.user.empresa_id);
  }

  @Permiso('crear_ventas')
  @Post('abrir')
  abrir(@Body() body: { monto_inicial: number }, @Request() req: any) {
    return this.cajaService.abrir(req.user.empresa_id, req.user.email, body.monto_inicial);
  }

  @Permiso('crear_ventas')
  @Post('cerrar')
  cerrar(
    @Body() body: { monto_contado: number; observaciones?: string },
    @Request() req: any,
  ) {
    return this.cajaService.cerrar(req.user.empresa_id, body.monto_contado, body.observaciones);
  }

  @Permiso('ver_ventas')
  @Get('historial')
  historial(@Request() req: any) {
    return this.cajaService.historial(req.user.empresa_id);
  }
}
