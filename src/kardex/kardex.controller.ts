// src/kardex/kardex.controller.ts
import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { KardexService } from './kardex.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('kardex')
export class KardexController {
  constructor(private readonly kardexService: KardexService) {}

  // Ruta para ver todo el historial de un producto específico
  // URL: GET http://localhost:3000/kardex/producto/:id
  @Get('producto/:id')
  obtenerHistorial(@Param('id') productoId: string, @Request() req) {
    const empresaId = req.user.empresa_id;
    return this.kardexService.obtenerHistorialProducto(productoId, empresaId);
  }
}