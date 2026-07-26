import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { RetencionesService } from './retenciones.service';
import { CreateRetencionDto } from './dto/create-retencion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('retenciones')
export class RetencionesController {
  constructor(private readonly retencionesService: RetencionesService) {}

  @Permiso('crear_ventas')
  @Post()
  emitir(@Body() dto: CreateRetencionDto, @Request() req: any) {
    return this.retencionesService.emitir(dto, req.user.empresa_id);
  }

  @Permiso('ver_ventas')
  @Get()
  listar(@Request() req: any) {
    return this.retencionesService.listar(req.user.empresa_id);
  }

  @Permiso('ver_ventas')
  @Get(':id')
  obtener(@Param('id') id: string, @Request() req: any) {
    return this.retencionesService.obtener(id, req.user.empresa_id);
  }

  @Permiso('descargar_pdf_xml')
  @Get(':id/xml')
  async descargarXml(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const r: any = await this.retencionesService.obtener(id, req.user.empresa_id);
    if (!r.sunat_xml_base64) throw new NotFoundException('Esta retención no tiene XML');
    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="${r.nombre_archivo || r.comprobante}.xml"`,
    });
    res.send(Buffer.from(r.sunat_xml_base64, 'base64'));
  }

  @Permiso('descargar_pdf_xml')
  @Get(':id/cdr')
  async descargarCdr(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const r: any = await this.retencionesService.obtener(id, req.user.empresa_id);
    if (!r.sunat_cdr_base64) throw new NotFoundException('Esta retención no tiene CDR');
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="R-${r.nombre_archivo || r.comprobante}.zip"`,
    });
    res.send(Buffer.from(r.sunat_cdr_base64, 'base64'));
  }
}
