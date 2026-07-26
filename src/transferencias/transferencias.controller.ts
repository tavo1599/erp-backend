import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TransferenciasService } from './transferencias.service';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('transferencias')
export class TransferenciasController {
  constructor(private readonly transferenciasService: TransferenciasService) {}

  @Permiso('editar_almacenes')
  @Post()
  crear(@Body() dto: CreateTransferenciaDto, @Request() req: any) {
    return this.transferenciasService.crear(dto, req.user.empresa_id, req.user.email);
  }

  @Permiso('ver_almacenes')
  @Get()
  listar(@Request() req: any) {
    return this.transferenciasService.listar(req.user.empresa_id);
  }

  @Permiso('ver_almacenes')
  @Get(':id')
  obtener(@Param('id') id: string, @Request() req: any) {
    return this.transferenciasService.obtener(id, req.user.empresa_id);
  }
}
