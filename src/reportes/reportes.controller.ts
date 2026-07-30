import { Controller, Get, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportesService } from './reportes.service';
import { PleService } from './ple.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('reportes')
export class ReportesController {
  constructor(
    private readonly reportesService: ReportesService,
    private readonly pleService: PleService,
  ) {}

  @Permiso('ver_ventas')
  @Get('ple/ventas')
  async pleVentas(
    @Query('periodo') periodo: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, contenido } = await this.pleService.registroVentas(
      req.user.empresa_id,
      periodo,
    );
    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(contenido);
  }

  @Permiso('ver_compras')
  @Get('ple/compras')
  async pleCompras(
    @Query('periodo') periodo: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, contenido } = await this.pleService.registroCompras(
      req.user.empresa_id,
      periodo,
    );
    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(contenido);
  }

  @Permiso('ver_ventas')
  @Get('ventas')
  ventas(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Request() req: any,
  ) {
    return this.reportesService.reporteVentas(req.user.empresa_id, desde, hasta);
  }

  @Permiso('ver_compras')
  @Get('compras')
  compras(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Request() req: any,
  ) {
    return this.reportesService.reporteCompras(req.user.empresa_id, desde, hasta);
  }

  @Permiso('ver_ventas')
  @Get('igv')
  igv(@Query('desde') desde: string, @Query('hasta') hasta: string, @Request() req: any) {
    return this.reportesService.resumenIgv(req.user.empresa_id, desde, hasta);
  }

  @Permiso('ver_ventas')
  @Get('rentabilidad')
  rentabilidad(@Query('desde') desde: string, @Query('hasta') hasta: string, @Request() req: any) {
    return this.reportesService.rentabilidad(req.user.empresa_id, desde, hasta);
  }

  @Permiso('ver_ventas')
  @Get('tributario')
  tributario(@Query('desde') desde: string, @Query('hasta') hasta: string, @Request() req: any) {
    return this.reportesService.resumenTributario(req.user.empresa_id, desde, hasta);
  }

  @Permiso('ver_ventas')
  @Get('formas-pago')
  formasPago(@Query('desde') desde: string, @Query('hasta') hasta: string, @Request() req: any) {
    return this.reportesService.ventasPorFormaPago(req.user.empresa_id, desde, hasta);
  }

  @Permiso('ver_ventas')
  @Get('comparativo')
  comparativo(@Query('periodo') periodo: string, @Request() req: any) {
    return this.reportesService.comparativo(req.user.empresa_id, periodo);
  }
}
