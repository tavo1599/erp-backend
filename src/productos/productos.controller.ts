import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { EntradaStockDto } from './dto/entrada-stock.dto';
import { AjusteStockDto } from './dto/ajuste-stock.dto';
import { PermisoGuard } from '../permisos/permiso.guard';
import { Permiso } from '../permisos/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisoGuard)
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Permiso('crear_productos')
  @Post()
  create(@Body() createProductoDto: CreateProductoDto, @Request() req: any) {
    const empresaId = req.user.empresa_id;
    return this.productosService.create(createProductoDto, empresaId);
  }

  @Permiso('ver_productos')
  @Get()
  findAll(@Request() req: any) {
    const empresaId = req.user.empresa_id;
    return this.productosService.findAll(empresaId);
  }

  @Permiso('ver_productos')
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.productosService.findOne(id, req.user.empresa_id);
  }

  @Permiso('editar_productos')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto, @Request() req: any) {
    return this.productosService.update(id, dto, req.user.empresa_id);
  }

  @Permiso('editar_productos')
  @Post(':id/entrada-stock')
  entradaStock(@Param('id') id: string, @Body() dto: EntradaStockDto, @Request() req: any) {
    return this.productosService.entradaStock(
      id,
      dto.cantidad,
      dto.motivo || 'Entrada de mercadería',
      req.user.empresa_id,
    );
  }

  @Permiso('editar_productos')
  @Post(':id/ajuste-stock')
  ajustarStock(@Param('id') id: string, @Body() dto: AjusteStockDto, @Request() req: any) {
    return this.productosService.ajustarStock(
      id,
      dto.tipo,
      dto.cantidad,
      dto.motivo,
      req.user.empresa_id,
    );
  }

  @Permiso('eliminar_productos')
  @Delete(':id')
  desactivar(@Param('id') id: string, @Request() req: any) {
    return this.productosService.desactivar(id, req.user.empresa_id);
  }
}