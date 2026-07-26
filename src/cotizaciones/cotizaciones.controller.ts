import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CotizacionesService } from './cotizaciones.service';
import { CotizacionesPdfService } from './cotizaciones-pdf.service';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('cotizaciones')
export class CotizacionesController {
  constructor(
    private readonly cotizacionesService: CotizacionesService,
    private readonly pdfService: CotizacionesPdfService,
  ) {}

  @Permiso('crear_ventas')
  @Post()
  crear(@Body() dto: CreateCotizacionDto, @Request() req: any) {
    return this.cotizacionesService.crear(dto, req.user.empresa_id);
  }

  @Permiso('ver_ventas')
  @Get()
  listar(@Query('estado') estado: string, @Request() req: any) {
    return this.cotizacionesService.listar(req.user.empresa_id, estado);
  }

  @Permiso('ver_ventas')
  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Request() req: any, @Res() res: Response): Promise<void> {
    const { cotizacion, empresa } = await this.cotizacionesService.obtenerParaPdf(
      id,
      req.user.empresa_id,
    );
    const pdf = await this.pdfService.generar(cotizacion, empresa);
    const codigo = `COT-${String(cotizacion.numero).padStart(6, '0')}`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${codigo}.pdf"`,
    });
    res.send(pdf);
  }

  @Permiso('ver_ventas')
  @Get(':id')
  obtener(@Param('id') id: string, @Request() req: any) {
    return this.cotizacionesService.obtener(id, req.user.empresa_id);
  }

  @Permiso('crear_ventas')
  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: CreateCotizacionDto,
    @Request() req: any,
  ) {
    return this.cotizacionesService.actualizar(id, dto, req.user.empresa_id);
  }

  @Permiso('crear_ventas')
  @Patch(':id/estado')
  cambiarEstado(
    @Param('id') id: string,
    @Body() body: { estado: string },
    @Request() req: any,
  ) {
    return this.cotizacionesService.cambiarEstado(id, req.user.empresa_id, body.estado);
  }

  @Permiso('crear_ventas')
  @Post(':id/convertir')
  convertir(@Param('id') id: string, @Request() req: any) {
    return this.cotizacionesService.convertirEnVenta(id, req.user.empresa_id, {
      usuario_id: req.user.sub,
      usuario_email: req.user.email,
      usuario_rol: req.user.rol,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    });
  }
}
