import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// 1. Protegemos TODAS las rutas de productos con el candado
@UseGuards(JwtAuthGuard) 
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  create(@Body() createProductoDto: CreateProductoDto, @Request() req) {
    // 2. Extraemos el empresa_id del token y se lo pasamos al servicio
    const empresaId = req.user.empresa_id; 
    return this.productosService.create(createProductoDto, empresaId);
  }

  @Get()
  findAll(@Request() req) {
    // 3. Solo devolvemos los productos de la empresa que está haciendo la petición
    const empresaId = req.user.empresa_id;
    return this.productosService.findAll(empresaId);
  }
}