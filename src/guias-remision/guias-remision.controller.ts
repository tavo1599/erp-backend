import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { GuiasRemisionService } from './guias-remision.service';
import { CreateGuiaRemisionDto } from './dto/create-guia-remision.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PdfService } from '../ventas/pdf.service';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('guias-remision')
export class GuiasRemisionController {
  constructor(
    private readonly guiasService: GuiasRemisionService,
    private readonly pdfService: PdfService,
  ) {}

  @Permiso('crear_guias')
  @Post()
  emitir(@Body() dto: CreateGuiaRemisionDto, @Request() req: any) {
    return this.guiasService.emitirGuia(dto, req.user.empresa_id, {
      usuario_id: req.user.sub,
      usuario_email: req.user.email,
      usuario_rol: req.user.rol,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    });
  }

  @Permiso('ver_guias')
  @Get()
  listar(
    @Query('estado') estado: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Request() req: any,
  ) {
    return this.guiasService.listar(req.user.empresa_id, {
      estado,
      desde,
      hasta,
    });
  }

  @Permiso('descargar_pdf_xml')
  @Get(':id/pdf')
  async descargarPdf(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const datos = await this.guiasService.obtenerParaPdf(id, req.user.empresa_id);
    const pdf = await this.pdfService.generarGuiaA4(datos);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${datos.guia.nombre_archivo || 'guia'}.pdf"`,
    });
    res.send(pdf);
  }

  @Permiso('ver_guias')
  @Get(':id')
  obtener(@Param('id') id: string, @Request() req: any) {
    return this.guiasService.obtener(id, req.user.empresa_id);
  }

  @Permiso('descargar_pdf_xml')
  @Get(':id/xml')
  async descargarXml(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const guia = await this.guiasService.obtenerGuiaCompleta(id, req.user.empresa_id);

    if (!guia.sunat_xml_base64) {
      throw new NotFoundException('Esta guía no tiene XML disponible');
    }

    const xmlBuffer = Buffer.from(guia.sunat_xml_base64, 'base64');
    const nombreArchivo = `${guia.nombre_archivo}.xml`;

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
  ): Promise<void> {
    const guia = await this.guiasService.obtenerGuiaCompleta(id, req.user.empresa_id);

    if (!guia.sunat_cdr_base64) {
      throw new NotFoundException('Esta guía no tiene CDR disponible');
    }

    const cdrBuffer = Buffer.from(guia.sunat_cdr_base64, 'base64');
    const nombreArchivo = `R-${guia.nombre_archivo}.zip`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    });
    res.send(cdrBuffer);
  }

  @Permiso('anular_guias')
  @Post(':id/anular')
  anular(@Param('id') id: string, @Request() req: any) {
    return this.guiasService.anularGuia(id, req.user.empresa_id, {
      usuario_id: req.user.sub,
      usuario_email: req.user.email,
      usuario_rol: req.user.rol,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    });
  }
}