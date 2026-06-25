import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductoDto } from './dto/create-producto.dto';
import { Producto } from './entities/producto.entity';
import { KardexService } from '../kardex/kardex.service';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
    private readonly kardexService: KardexService,
  ) {}

  async create(createProductoDto: CreateProductoDto, empresaId: string) {
    const nuevoProducto = this.productoRepository.create({
      ...createProductoDto,
      empresa_id: empresaId, // Inyectamos el ID que vino del token de forma segura
    });
    
    return await this.productoRepository.save(nuevoProducto);
  }

async findAll(empresaId: string, buscar?: string) {
  const query = this.productoRepository
    .createQueryBuilder('producto')
    .where('producto.empresa_id = :empresaId', { empresaId })
    .andWhere('producto.estado = true');  // ← AGREGAR si no está

  if (buscar) {
    query.andWhere(
      '(producto.nombre ILIKE :buscar OR producto.codigo_sunat ILIKE :buscar)',
      { buscar: `%${buscar}%` },
    );
  }
  query.orderBy('producto.nombre', 'ASC');
  return await query.getMany();
}

  async findOne(id: string, empresaId: string) {
    const producto = await this.productoRepository.findOne({
      where: { id, empresa_id: empresaId },
    });
    if (!producto) {
      throw new BadRequestException('Producto no encontrado');
    }
    return producto;
  }

  // Actualizar datos del producto (NO el stock, eso va por kardex)
  async update(id: string, dto: UpdateProductoDto, empresaId: string) {
    const producto = await this.findOne(id, empresaId);
    Object.assign(producto, dto);
    return await this.productoRepository.save(producto);
  }

  // Entrada de stock (compra/ajuste) → usa el kardex
  async entradaStock(id: string, cantidad: number, motivo: string, empresaId: string) {
    const producto = await this.findOne(id, empresaId);

    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    const resultado = await this.kardexService.registrarMovimiento({
      producto_id: id,
      empresa_id: empresaId,
      tipo_movimiento: 'INGRESO_COMPRA',
      cantidad,
      referencia_documento: motivo || 'Entrada de mercadería',
    });

    return {
      mensaje: 'Stock actualizado correctamente',
      producto: producto.nombre,
      stock_anterior: resultado.stock_antes,
      stock_actual: resultado.stock_ahora,
    };
  }

  // Desactivar producto
  async desactivar(id: string, empresaId: string) {
    const producto = await this.findOne(id, empresaId);
    producto.estado = false;
    await this.productoRepository.save(producto);
    return { mensaje: 'Producto desactivado', id };
  }

  async ajustarStock(
    id: string,
    tipo: 'INGRESO' | 'SALIDA',
    cantidad: number,
    motivo: string,
    empresaId: string,
  ) {
    const producto = await this.findOne(id, empresaId);

    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    // Si es salida, validar que haya stock suficiente
    if (tipo === 'SALIDA' && Number(producto.stock_actual) < cantidad) {
      throw new BadRequestException(
        `No se puede ajustar: stock actual (${producto.stock_actual}) menor a la cantidad (${cantidad})`,
      );
    }

    const tipoMovimiento = tipo === 'INGRESO' ? 'AJUSTE_INGRESO' : 'AJUSTE_SALIDA';

    const resultado = await this.kardexService.registrarMovimiento({
      producto_id: id,
      empresa_id: empresaId,
      tipo_movimiento: tipoMovimiento,
      cantidad,
      referencia_documento: `Ajuste: ${motivo}`,
    });

    return {
      mensaje: 'Ajuste de inventario registrado',
      producto: producto.nombre,
      tipo: tipoMovimiento,
      motivo,
      stock_anterior: resultado.stock_antes,
      stock_actual: resultado.stock_ahora,
    };
  }
}