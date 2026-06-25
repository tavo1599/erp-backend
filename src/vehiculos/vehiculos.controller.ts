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
import { VehiculosService } from './vehiculos.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('vehiculos')
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

  // GET /vehiculos
  // GET /vehiculos?transportista_id=xxx  (vehículos de un transportista)
  // GET /vehiculos?es_propio=true        (solo vehículos propios)
  @Get()
  listar(
    @Query('transportista_id') transportistaId: string,
    @Query('es_propio') esPropio: string,
    @Request() req,
  ) {
    const filtros: any = {};
    if (transportistaId) filtros.transportista_id = transportistaId;
    if (esPropio === 'true') filtros.es_propio = true;
    if (esPropio === 'false') filtros.es_propio = false;
    return this.vehiculosService.listar(req.user.empresa_id, filtros);
  }

  @Post()
  crear(@Body() dto: CreateVehiculoDto, @Request() req) {
    return this.vehiculosService.crear(dto, req.user.empresa_id);
  }

  @Get(':id')
  obtener(@Param('id') id: string, @Request() req) {
    return this.vehiculosService.obtener(id, req.user.empresa_id);
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: Partial<CreateVehiculoDto>,
    @Request() req,
  ) {
    return this.vehiculosService.actualizar(id, dto, req.user.empresa_id);
  }

  @Delete(':id')
  desactivar(@Param('id') id: string, @Request() req) {
    return this.vehiculosService.desactivar(id, req.user.empresa_id);
  }
}