import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductoDto } from './dto/create-producto.dto';
import { Producto } from './entities/producto.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
  ) {}

  async create(createProductoDto: CreateProductoDto, empresaId: string) {
    const nuevoProducto = this.productoRepository.create({
      ...createProductoDto,
      empresa_id: empresaId, // Inyectamos el ID que vino del token de forma segura
    });
    
    return await this.productoRepository.save(nuevoProducto);
  }

  async findAll(empresaId: string) {
    // Busca solo los productos que pertenezcan a este inquilino
    return await this.productoRepository.find({
      where: { empresa_id: empresaId }
    });
  }
}