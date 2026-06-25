import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DireccionesTrasladoService } from './direcciones-traslado.service';
import { CreateDireccionTrasladoDto } from './dto/create-direccion-traslado.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('direcciones-traslado')
export class DireccionesTrasladoController {
  constructor(
    private readonly direccionesService: DireccionesTrasladoService,
  ) {}

  // GET /direcciones-traslado
  // GET /direcciones-traslado?tipo=PARTIDA
  @Get()
  listar(@Query('tipo') tipo: string, @Request() req) {
    const filtros: any = {};
    if (tipo) filtros.tipo = tipo;
    return this.direccionesService.listar(req.user.empresa_id, filtros);
  }

  @Post()
  crear(@Body() dto: CreateDireccionTrasladoDto, @Request() req) {
    return this.direccionesService.crear(dto, req.user.empresa_id);
  }

  @Get(':id')
  obtener(@Param('id') id: string, @Request() req) {
    return this.direccionesService.obtener(id, req.user.empresa_id);
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDireccionTrasladoDto>,
    @Request() req,
  ) {
    return this.direccionesService.actualizar(id, dto, req.user.empresa_id);
  }

  @Delete(':id')
  desactivar(@Param('id') id: string, @Request() req) {
    return this.direccionesService.desactivar(id, req.user.empresa_id);
  }
}