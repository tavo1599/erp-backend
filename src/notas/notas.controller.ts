// src/notas/notas.controller.ts
import { Controller, Post, Get, Body, UseGuards, Request, Query, Param, Res } from '@nestjs/common';
import { NotasService } from './notas.service';
import { CreateNotaDto } from './dto/create-nota.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';
import { PdfService } from '../ventas/pdf.service';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('notas')
export class NotasController {
  constructor(
    private readonly notasService: NotasService,
    private readonly pdfService: PdfService,
  ) {}

  @Permiso('crear_notas')
  @Post()
  crear(@Body() dto: CreateNotaDto, @Request() req: any) {
    return this.notasService.crearNota(dto, req.user.empresa_id);
  }

  @Permiso('ver_notas')
  @Get()
  listar(
    @Request() req: any,
    @Query('tipo_nota') tipoNota?: string,
    @Query('estado') estado?: string,
  ) {
    return this.notasService.listarNotas(req.user.empresa_id, {
      tipo_nota: tipoNota,
      estado,
    });
  }

  @Permiso('ver_notas')
  @Get(':id')
  obtener(@Param('id') id: string, @Request() req: any) {
    return this.notasService.obtenerNota(id, req.user.empresa_id);
  }

  @Permiso('descargar_pdf_xml')
  @Get(':id/pdf')
  async descargarPdf(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const datos = await this.notasService.obtenerNotaParaPdf(id, req.user.empresa_id);
    const pdf = await this.pdfService.generarNotaA4(datos);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${datos.nota.nombre_archivo || 'nota'}.pdf"`,
    });
    res.send(pdf);
  }
}