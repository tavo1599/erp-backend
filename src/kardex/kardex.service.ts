// src/kardex/kardex.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { KardexMovimiento } from './entities/kardex.entity';
import { Producto } from '../productos/entities/producto.entity';

@Injectable()
export class KardexService {
  constructor(
    @InjectRepository(KardexMovimiento)
    private readonly kardexRepository: Repository<KardexMovimiento>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
  ) {}

  async registrarMovimiento(
    data: {
      producto_id: string;
      empresa_id: string;
      tipo_movimiento: 'INGRESO_COMPRA' | 'SALIDA_VENTA' | 'AJUSTE_INGRESO' | 'AJUSTE_SALIDA';
      cantidad: number;
      referencia_documento?: string;
    },
    manager?: EntityManager, // ← NUEVO: si viene, usa la transacción de quien lo llama
  ) {
    const { producto_id, empresa_id, tipo_movimiento, cantidad, referencia_documento } = data;

    // Si nos pasan un manager (transacción), usamos sus repositorios.
    // Si no, usamos los propios (modo independiente).
    const kardexRepo = manager ? manager.getRepository(KardexMovimiento) : this.kardexRepository;
    const productoRepo = manager ? manager.getRepository(Producto) : this.productoRepository;

    // 1. Buscar el producto y su stock actual
    const producto = await productoRepo.findOne({ where: { id: producto_id, empresa_id } });
    if (!producto) {
      throw new NotFoundException('El producto no existe en esta empresa.');
    }

    const stockAnterior = Number(producto.stock_actual);
    let stockPosterior = stockAnterior;

    // 2. Calcular el stock posterior según la operación
    if (tipo_movimiento === 'INGRESO_COMPRA' || tipo_movimiento === 'AJUSTE_INGRESO') {
      stockPosterior += Number(cantidad);
    } else if (tipo_movimiento === 'SALIDA_VENTA' || tipo_movimiento === 'AJUSTE_SALIDA') {
      stockPosterior -= Number(cantidad);
    }

    // 3. Crear el registro inmutable en el Kardex
    const nuevoMovimiento = kardexRepo.create({
      empresa_id,
      producto_id,
      tipo_movimiento,
      cantidad,
      stock_anterior: stockAnterior,
      stock_posterior: stockPosterior,
      referencia_documento,
    });
    await kardexRepo.save(nuevoMovimiento);

    // 4. Actualizar el stock en el producto
    producto.stock_actual = stockPosterior;
    await productoRepo.save(producto);

    return {
      mensaje: 'Movimiento de inventario procesado',
      producto: producto.nombre,
      stock_antes: stockAnterior,
      stock_ahora: stockPosterior,
    };
  }

  async obtenerHistorialProducto(productoId: string, empresaId: string) {
    return await this.kardexRepository.find({
      where: { producto_id: productoId, empresa_id: empresaId },
      order: { fecha_movimiento: 'DESC' },
    });
  }
}