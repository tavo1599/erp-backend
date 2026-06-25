// src/dashboard/dashboard.controller.ts
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  resumen(@Request() req) {
    return this.dashboardService.resumen(req.user.empresa_id);
  }

  @Get('productos-mas-vendidos')
  productosMasVendidos(@Request() req, @Query('limite') limite?: string) {
    return this.dashboardService.productosMasVendidos(
      req.user.empresa_id,
      limite ? Number(limite) : 10,
    );
  }

  @Get('stock-bajo')
  stockBajo(@Request() req, @Query('umbral') umbral?: string) {
    return this.dashboardService.stockBajo(
      req.user.empresa_id,
      umbral ? Number(umbral) : 10,
    );
  }

  @Get('ventas-por-dia')
  ventasPorDia(@Request() req, @Query('dias') dias?: string) {
    return this.dashboardService.ventasPorDia(
      req.user.empresa_id,
      dias ? Number(dias) : 30,
    );
  }

  @Get('kpis')
  kpis(@Request() req) {
    return this.dashboardService.kpis(req.user.empresa_id);
  }

  @Get('rentabilidad')
  rentabilidad(@Request() req, @Query('limite') limite?: string) {
    return this.dashboardService.rentabilidadProductos(
      req.user.empresa_id,
      limite ? Number(limite) : 20,
    );
  }

  @Get('alertas')
  alertas(@Request() req) {
    return this.dashboardService.alertas(req.user.empresa_id);
  }

  @Get('segmentacion-clientes')
  segmentacionClientes(@Request() req) {
    return this.dashboardService.segmentacionClientes(req.user.empresa_id);
  }

  @Get('proyeccion-stock')
  proyeccionStock(@Request() req, @Query('dias') dias?: string) {
    return this.dashboardService.proyeccionStock(
      req.user.empresa_id,
      dias ? Number(dias) : 30,
    );
  }

  @Get('valorizacion-inventario')
  valorizacionInventario(@Request() req) {
    return this.dashboardService.valorizacionInventario(req.user.empresa_id);
  }
}