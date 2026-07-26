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
import { PercepcionesService } from './percepciones.service';
import { CreatePercepcionDto } from './dto/create-percepcion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('percepciones')
export class PercepcionesController {
  constructor(private readonly percepcionesService: PercepcionesService) {}

  @Permiso('crear_ventas')
  @Post()
  emitir(@Body() dto: CreatePercepcionDto, @Request() req: any) {
    return this.percepcionesService.emitir(dto, req.user.empresa_id);
  }

  @Permiso('ver_ventas')
  @Get()
  listar(@Request() req: any) {
    return this.percepcionesService.listar(req.user.empresa_id);
  }

  @Permiso('ver_ventas')
  @Get(':id')
  obtener(@Param('id') id: string, @Request() req: any) {
    return this.percepcionesService.obtener(id, req.user.empresa_id);
  }

  @Permiso('descargar_pdf_xml')
  @Get(':id/xml')
  async descargarXml(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const p: any = await this.percepcionesService.obtener(id, req.user.empresa_id);
    if (!p.sunat_xml_base64) throw new NotFoundException('Esta percepción no tiene XML');
    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="${p.nombre_archivo || p.comprobante}.xml"`,
    });
    res.send(Buffer.from(p.sunat_xml_base64, 'base64'));
  }

  @Permiso('descargar_pdf_xml')
  @Get(':id/cdr')
  async descargarCdr(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const p: any = await this.percepcionesService.obtener(id, req.user.empresa_id);
    if (!p.sunat_cdr_base64) throw new NotFoundException('Esta percepción no tiene CDR');
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="R-${p.nombre_archivo || p.comprobante}.zip"`,
    });
    res.send(Buffer.from(p.sunat_cdr_base64, 'base64'));
  }
}
