import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AlmacenesService } from './almacenes.service';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard)
@Controller('almacenes')
export class AlmacenesController {
  constructor(private readonly almacenesService: AlmacenesService) {}

  @Permiso('ver_almacenes')
  @Get()
  listar(@Request() req: any) {
    return this.almacenesService.listar(req.user.empresa_id);
  }

  @Permiso('ver_almacenes')
  @Get('principal')
  obtenerPrincipal(@Request() req: any) {
    return this.almacenesService.obtenerPrincipal(req.user.empresa_id);
  }

  @Permiso('ver_almacenes')
  @Get(':id')
  obtener(@Param('id') id: string, @Request() req: any) {
    return this.almacenesService.obtener(id, req.user.empresa_id);
  }

  @Permiso('crear_almacenes')
  @Post()
  crear(@Body() dto: CreateAlmacenDto, @Request() req: any) {
    return this.almacenesService.crear(dto, req.user.empresa_id);
  }

  @Permiso('editar_almacenes')
  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateAlmacenDto,
    @Request() req: any,
  ) {
    return this.almacenesService.actualizar(id, dto, req.user.empresa_id);
  }

  @Permiso('editar_almacenes')
  @Delete(':id')
  desactivar(@Param('id') id: string, @Request() req: any) {
    return this.almacenesService.desactivar(id, req.user.empresa_id);
  }
}