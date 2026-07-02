// src/ventas/ventas.controller.ts
import { Controller, Post, Body, UseGuards, Request, Get, Param, Res, Query, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { VentasService } from './ventas.service';
import { PdfService } from './pdf.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('ventas')
export class VentasController {
  constructor(
    private readonly ventasService: VentasService,
    private readonly pdfService: PdfService,
  ) {}

  @Permiso('crear_ventas')
  @Post()
  create(@Body() createVentaDto: CreateVentaDto, @Request() req: any) {
    return this.ventasService.crearVentaInterna(createVentaDto, req.user.empresa_id, {
      usuario_id: req.user.sub,
      usuario_email: req.user.email,
      usuario_rol: req.user.rol,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    });
  }

  @Permiso('anular_ventas')
  @Post(':id/anular')
  anular(@Param('id') id: string, @Request() req: any) {
    return this.ventasService.anularVenta(id, req.user.empresa_id, {
      usuario_id: req.user.sub,
      usuario_email: req.user.email,
      usuario_rol: req.user.rol,
      ip: req.ip,
    });
  }

  @Permiso('ver_ventas')
  @Get()
  listar(
    @Query('estado') estado: string,
    @Query('tipo') tipo: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Request() req: any,
  ) {
    return this.ventasService.listarVentas(req.user.empresa_id, {
      estado,
      tipo_comprobante: tipo,
      desde,
      hasta,
    });
  }

  @Permiso('descargar_pdf_xml')
  @Get(':id/pdf')
  async descargarPdf(
    @Param('id') id: string,
    @Query('formato') formato: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const datos = await this.ventasService.obtenerVentaParaPdf(id, req.user.empresa_id);

    const pdf = formato === 'ticket'
      ? await this.pdfService.generarTicket(datos)
      : await this.pdfService.generarA4(datos);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${datos.venta.nombre_archivo || 'comprobante'}.pdf"`,
    });
    res.send(pdf);
  }

  @Permiso('ver_ventas')
@Get('proximo-correlativo')
proximoCorrelativo(
  @Query('tipo_comprobante') tipo: string,
  @Query('serie') serie: string,
  @Request() req: any,
) {
  return this.ventasService.obtenerProximoCorrelativo(
    tipo,
    serie,
    req.user.empresa_id,
  );
}

  @Permiso('ver_ventas')
  @Get(':id')
  obtener(@Param('id') id: string, @Request() req: any) {
    return this.ventasService.obtenerVenta(id, req.user.empresa_id);
  }

  @Permiso('ver_ventas')
  @Get('buscar/por-numero')
  buscarPorNumero(
    @Query('tipo') tipo: string,
    @Query('serie') serie: string,
    @Query('numero') numero: string,
    @Request() req: any,
  ) {
    return this.ventasService.buscarPorSerieNumero(
      req.user.empresa_id,
      tipo,
      serie,
      Number(numero),
    );
  }

  @Permiso('anular_ventas')
  @Post(':id/baja-sunat')
  enviarBajaSunat(
    @Param('id') id: string,
    @Body() body: { motivo?: string },
    @Request() req: any,
  ) {
    return this.ventasService.enviarBajaSunat(id, req.user.empresa_id, body?.motivo);
  }

  @Permiso('descargar_pdf_xml')
  @Get(':id/xml')
  async descargarXml(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const venta = await this.ventasService.obtenerVentaCompleta(id, req.user.empresa_id);

    if (!venta.sunat_xml_base64) {
      throw new NotFoundException('Este comprobante no tiene XML disponible');
    }

    const xmlBuffer = Buffer.from(venta.sunat_xml_base64, 'base64');
    const nombreArchivo = `${venta.nombre_archivo}.xml`;

    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    });
    res.send(xmlBuffer);
  }

  @Permiso('descargar_pdf_xml')
  @Get(':id/cdr')
  async descargarCdr(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const venta = await this.ventasService.obtenerVentaCompleta(id, req.user.empresa_id);

    if (!venta.sunat_cdr_base64) {
      throw new NotFoundException('Este comprobante no tiene CDR disponible');
    }

    const cdrBuffer = Buffer.from(venta.sunat_cdr_base64, 'base64');
    const nombreArchivo = `R-${venta.nombre_archivo}.zip`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    });
    res.send(cdrBuffer);
  }

  @Permiso('anular_ventas')
@Post(':id/marcar-anulacion')
marcarParaAnulacion(@Param('id') id: string, @Request() req: any) {
  return this.ventasService.marcarBoletaPendienteAnulacion(id, req.user.empresa_id, {
    usuario_id: req.user.sub,
    usuario_email: req.user.email,
    usuario_rol: req.user.rol,
    ip: req.ip,
  });
}
}