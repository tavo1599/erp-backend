// src/finanzas/finanzas.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('finanzas')
export class FinanzasController {
  constructor(private readonly finanzasService: FinanzasService) {}

  // Cuentas por cobrar
  @Permiso('ver_finanzas')
  @Get('cuentas-por-cobrar')
  cuentasPorCobrar(@Request() req: any, @Query('todas') todas?: string) {
    return this.finanzasService.cuentasPorCobrar(req.user.empresa_id, todas !== 'true');
  }

  // Registrar cobro de un cliente
  @Permiso('registrar_pagos')
  @Post('cuentas-por-cobrar/:id/cobrar')
  cobrar(
    @Param('id') id: string,
    @Body() body: { monto: number; metodo_pago: string },
    @Request() req: any,
  ) {
    return this.finanzasService.registrarCobro(
      id,
      body.monto,
      body.metodo_pago || 'EFECTIVO',
      req.user.empresa_id,
    );
  }

  // Cuentas por pagar
  @Permiso('ver_finanzas')
  @Get('cuentas-por-pagar')
  cuentasPorPagar(@Request() req: any, @Query('todas') todas?: string) {
    return this.finanzasService.cuentasPorPagar(req.user.empresa_id, todas !== 'true');
  }

  // Registrar pago a un proveedor
  @Permiso('registrar_pagos')
  @Post('cuentas-por-pagar/:id/pagar')
  pagar(
    @Param('id') id: string,
    @Body() body: { monto: number; metodo_pago: string },
    @Request() req: any,
  ) {
    return this.finanzasService.registrarPagoProveedor(
      id,
      body.monto,
      body.metodo_pago || 'EFECTIVO',
      req.user.empresa_id,
    );
  }

  // Estado de caja
  @Permiso('ver_finanzas')
  @Get('caja')
  caja(@Request() req: any, @Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.finanzasService.estadoCaja(req.user.empresa_id, desde, hasta);
  }

  // Movimiento manual (gasto o ingreso extra)
  @Permiso('registrar_pagos')
  @Post('caja/movimiento')
  movimiento(
    @Body() body: { tipo: 'INGRESO' | 'EGRESO'; concepto: string; monto: number; metodo_pago: string },
    @Request() req: any,
  ) {
    return this.finanzasService.movimientoManual(
      req.user.empresa_id,
      body.tipo,
      body.concepto,
      body.monto,
      body.metodo_pago || 'EFECTIVO',
    );
  }
}