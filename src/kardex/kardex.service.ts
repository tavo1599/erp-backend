// src/kardex/kardex.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async registrarMovimiento(data: {
    producto_id: string;
    empresa_id: string;
    tipo_movimiento: 'INGRESO_COMPRA' | 'SALIDA_VENTA' | 'AJUSTE_INGRESO' | 'AJUSTE_SALIDA';
    cantidad: number;
    referencia_documento?: string;
  }) {
    const { producto_id, empresa_id, tipo_movimiento, cantidad, referencia_documento } = data;

    // 1. Buscar el producto y su stock actual
    const producto = await this.productoRepository.findOne({ where: { id: producto_id, empresa_id } });
    if (!producto) {
      throw new NotFoundException('El producto no existe en esta empresa.');
    }

    const stockAnterior = Number(producto.stock_actual);
    let stockPosterior = stockAnterior;

    // 2. Calcular el stock posterior según la operación
    if (tipo_movimiento === 'INGRESO_COMPRA' || tipo_movimiento === 'AJUSTE_INGRESO') {
      stockPosterior += cantidad;
    } else if (tipo_movimiento === 'SALIDA_VENTA' || tipo_movimiento === 'AJUSTE_SALIDA') {
      stockPosterior -= cantidad;
    }

    // 3. Crear el registro inmutable en el Kardex
    const nuevoMovimiento = this.kardexRepository.create({
      empresa_id,
      producto_id,
      tipo_movimiento,
      cantidad,
      stock_anterior: stockAnterior,
      stock_posterior: stockPosterior,
      referencia_documento,
    });
    await this.kardexRepository.save(nuevoMovimiento);

    // 4. Actualizar el stock en el catálogo maestro del producto
    producto.stock_actual = stockPosterior;
    await this.productoRepository.save(producto);

    return {
      mensaje: 'Movimiento de inventario procesado',
      producto: producto.nombre,
      stock_antes: stockAnterior,
      stock_ahora: stockPosterior
    };
  }

  // Método para consultar el historial/Kardex de un producto específico
  async obtenerHistorialProducto(productoId: string, empresaId: string) {
    return await this.kardexRepository.find({
      where: { producto_id: productoId, empresa_id: empresaId },
      order: { fecha_movimiento: 'DESC' } // El movimiento más reciente primero
    });
  }
}