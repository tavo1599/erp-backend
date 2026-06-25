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
import { ConductoresService } from './conductores.service';
import { CreateConductorDto } from './dto/create-conductor.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('conductores')
export class ConductoresController {
  constructor(private readonly conductoresService: ConductoresService) {}

  // GET /conductores
  // GET /conductores?transportista_id=xxx
  @Get()
  listar(
    @Query('transportista_id') transportistaId: string,
    @Request() req,
  ) {
    const filtros: any = {};
    if (transportistaId) filtros.transportista_id = transportistaId;
    return this.conductoresService.listar(req.user.empresa_id, filtros);
  }

  @Post()
  crear(@Body() dto: CreateConductorDto, @Request() req) {
    return this.conductoresService.crear(dto, req.user.empresa_id);
  }

  @Get(':id')
  obtener(@Param('id') id: string, @Request() req) {
    return this.conductoresService.obtener(id, req.user.empresa_id);
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: Partial<CreateConductorDto>,
    @Request() req,
  ) {
    return this.conductoresService.actualizar(id, dto, req.user.empresa_id);
  }

  @Delete(':id')
  desactivar(@Param('id') id: string, @Request() req) {
    return this.conductoresService.desactivar(id, req.user.empresa_id);
  }
}