import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TransportistasService } from './transportistas.service';
import { CreateTransportistaDto } from './dto/create-transportista.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('transportistas')
export class TransportistasController {
  constructor(private readonly transportistasService: TransportistasService) {}

  @Get()
  listar(@Request() req) {
    return this.transportistasService.listar(req.user.empresa_id);
  }

  @Post()
  crear(@Body() dto: CreateTransportistaDto, @Request() req) {
    return this.transportistasService.crear(dto, req.user.empresa_id);
  }

  @Get(':id')
  obtener(@Param('id') id: string, @Request() req) {
    return this.transportistasService.obtener(id, req.user.empresa_id);
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTransportistaDto>,
    @Request() req,
  ) {
    return this.transportistasService.actualizar(id, dto, req.user.empresa_id);
  }

  @Delete(':id')
  desactivar(@Param('id') id: string, @Request() req) {
    return this.transportistasService.desactivar(id, req.user.empresa_id);
  }
}