// src/empresas/empresas.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Patch,
  Delete,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  // ============================================================
  // Crear empresa con certificado (PÚBLICO - sin guards, lo usa super admin al onboarding)
  // ============================================================
  @Post()
  @UseInterceptors(FileInterceptor('certificado'))
  async create(
    @Body() createEmpresaDto: CreateEmpresaDto,
    @UploadedFile() certificado: Express.Multer.File,
    @Body('password_certificado') passwordCertificado: string,
  ) {
    if (!certificado) {
      throw new BadRequestException('Debe adjuntar el archivo .pfx en el campo "certificado"');
    }
    if (!passwordCertificado) {
      throw new BadRequestException('Debe enviar el campo "password_certificado"');
    }

    return this.empresasService.createConCertificado(
      createEmpresaDto,
      certificado,
      passwordCertificado,
    );
  }

  // ============================================================
  // Listar todas las empresas (super admin)
  // ============================================================
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req: any) {
    return this.empresasService.findAll();
  }

  // ============================================================
  // Obtener mi empresa actual (todos pueden ver datos básicos)
  // ============================================================
  @UseGuards(JwtAuthGuard)
  @Get('mi-empresa')
  miEmpresa(@Request() req: any) {
    return this.empresasService.obtener(req.user.empresa_id);
  }

  // ============================================================
  // Actualizar datos generales de mi empresa
  // ============================================================
  @UseGuards(JwtAuthGuard, PermisoGuard)
  @Permiso('editar_empresa')
  @Patch('mi-empresa')
  actualizarMiEmpresa(@Body() datos: any, @Request() req: any) {
    return this.empresasService.actualizar(req.user.empresa_id, datos);
  }

  // ============================================================
  // Actualizar credenciales SOL
  // ============================================================
  @UseGuards(JwtAuthGuard, PermisoGuard)
  @Permiso('editar_credenciales_sunat')
  @Patch('mi-empresa/credenciales-sol')
  actualizarCredencialesSol(
    @Body() body: { sol_usuario: string; sol_clave: string },
    @Request() req: any,
  ) {
    return this.empresasService.actualizarCredencialesSol(
      req.user.empresa_id,
      body.sol_usuario,
      body.sol_clave,
    );
  }

  // ============================================================
  // Actualizar certificado .pfx
  // ============================================================
  @UseGuards(JwtAuthGuard, PermisoGuard)
  @Permiso('editar_credenciales_sunat')
  @Post('mi-empresa/certificado')
  @UseInterceptors(FileInterceptor('archivo'))
  actualizarCertificado(
    @UploadedFile() archivo: Express.Multer.File,
    @Body('password_certificado') password: string,
    @Request() req: any,
  ) {
    return this.empresasService.actualizarCertificado(
      req.user.empresa_id,
      archivo,
      password,
    );
  }

  // ============================================================
  // PERSONALIZACIÓN PDF
  // ============================================================
  @UseGuards(JwtAuthGuard, PermisoGuard)
  @Permiso('personalizar_pdf')
  @Patch('mi-empresa/personalizacion-pdf')
  actualizarPersonalizacion(
    @Body() body: {
      color_pdf?: string;
      frase_pie_pdf?: string;
      cuentas_bancarias?: string;
    },
    @Request() req: any,
  ) {
    return this.empresasService.actualizarPersonalizacion(req.user.empresa_id, body);
  }

  // ============================================================
  // SUBIR LOGO
  // ============================================================
  @UseGuards(JwtAuthGuard, PermisoGuard)
  @Permiso('personalizar_pdf')
  @Post('mi-empresa/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req: any, file, callback) => {
          const empresaId = req.user?.empresa_id || 'sin-empresa';
          const ext = extname(file.originalname);
          callback(null, `${empresaId}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return callback(
            new BadRequestException('Solo se permiten imágenes PNG o JPG'),
            false,
          );
        }
        callback(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async subirLogo(
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const logoUrl = `/uploads/logos/${file.filename}`;
    await this.empresasService.actualizarLogo(req.user.empresa_id, logoUrl);
    return {
      mensaje: 'Logo subido correctamente',
      logo_url: logoUrl,
    };
  }

  // ============================================================
  // ELIMINAR LOGO
  // ============================================================
  @UseGuards(JwtAuthGuard, PermisoGuard)
  @Permiso('personalizar_pdf')
  @Delete('mi-empresa/logo')
  async eliminarLogo(@Request() req: any) {
    await this.empresasService.actualizarLogo(req.user.empresa_id, null);
    return { mensaje: 'Logo eliminado' };
  }

  // ============================================================
  // VISTA PREVIA PDF (sin guardar)
  // ============================================================
  @UseGuards(JwtAuthGuard, PermisoGuard)
  @Permiso('personalizar_pdf')
  @Post('mi-empresa/preview-pdf')
  async previewPdf(
    @Body() body: {
      color_pdf?: string;
      frase_pie_pdf?: string;
      cuentas_bancarias?: string;
    },
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.empresasService.generarPreviewPdf(
      req.user.empresa_id,
      body,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview.pdf"',
    });
    res.send(pdf);
  }

  @Patch('mi-empresa/cuenta-detraccion')
actualizarCuentaDetraccion(
  @Body() body: { cuenta_detraccion: string; cuenta_detraccion_cci?: string },
  @Request() req: any,
) {
  return this.empresasService.actualizarCuentaDetraccion(
    req.user.empresa_id,
    body.cuenta_detraccion,
    body.cuenta_detraccion_cci,
  );
}
}