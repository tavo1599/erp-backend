import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, DataSource } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { KardexMovimiento } from '../kardex/entities/kardex.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ContextoUsuario } from '../auditoria/auditoria.types';
import { StockService } from '../stock/stock.service';
import { Almacen } from '../almacenes/entities/almacen.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(KardexMovimiento)
    private readonly kardexRepository: Repository<KardexMovimiento>,
    @InjectRepository(Almacen)
    private readonly almacenRepository: Repository<Almacen>,
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
    private readonly stockService: StockService,
  ) {}

  async findAll(empresaId: string, buscar?: string): Promise<Producto[]> {
    const where: any = { empresa_id: empresaId, estado: true };

    if (buscar && buscar.trim() !== '') {
      where.nombre = ILike(`%${buscar.trim()}%`);
    }

    return await this.productoRepository.find({
      where,
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string, empresaId: string): Promise<Producto> {
    const producto = await this.productoRepository.findOne({
      where: { id, empresa_id: empresaId },
    });

    if (!producto) {
      throw new BadRequestException(`Producto con id ${id} no encontrado`);
    }

    return producto;
  }

  async create(createProductoDto: CreateProductoDto, empresaId: string) {
    const nuevoProducto = this.productoRepository.create({
      ...createProductoDto,
      empresa_id: empresaId, // Inyectamos el ID que vino del token de forma segura
    });

    const productoGuardado = await this.productoRepository.save(nuevoProducto);

    // Si tiene stock inicial, registrarlo en el almacén principal
    const stockInicial = Number(createProductoDto.stock_actual || 0);
    if (stockInicial > 0) {
      const almacenPrincipal = await this.almacenRepository.findOne({
        where: {
          empresa_id: empresaId,
          es_principal: true,
          activo: true,
        },
      });

      if (almacenPrincipal) {
        await this.stockService.sumarStock(
          productoGuardado.id,
          almacenPrincipal.id,
          stockInicial,
        );
      }
    }

    return productoGuardado;
  }

  async update(id: string, updateProductoDto: UpdateProductoDto, empresaId: string) {
    const producto = await this.findOne(id, empresaId);
    Object.assign(producto, updateProductoDto);
    return this.productoRepository.save(producto);
  }

  // Desactivar producto (soft delete)
  async desactivar(id: string, empresaId: string) {
    const producto = await this.findOne(id, empresaId);
    producto.estado = false;
    await this.productoRepository.save(producto);
    return { mensaje: 'Producto desactivado' };
  }

  // Registrar entrada de stock (compra, ingreso manual, etc.)
  async entradaStock(
    id: string,
    cantidad: number,
    motivo: string,
    empresaId: string,
    contexto?: ContextoUsuario,
  ) {
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }
    if (!motivo || motivo.trim() === '') {
      throw new BadRequestException('Debes indicar el motivo de la entrada');
    }

    // Todo en una sola transacción: actualiza producto + guarda kardex
    return await this.dataSource.transaction(async (manager) => {
      const producto = await manager.findOne(Producto, {
        where: { id, empresa_id: empresaId },
      });
      if (!producto) throw new BadRequestException('Producto no encontrado');

      const stockAnterior = Number(producto.stock_actual);
      const stockNuevo = stockAnterior + cantidad;

      // 1) Actualizar el stock del producto
      producto.stock_actual = stockNuevo;
      await manager.save(producto);

      // 1.b) Reflejar también en el stock por almacén (principal por defecto),
      //      para mantener el invariante SUM(stock_almacen) == producto.stock_actual.
      const almacenPrincipal = await manager.findOne(Almacen, {
        where: { empresa_id: empresaId, es_principal: true, activo: true },
      });
      if (almacenPrincipal) {
        await this.stockService.sumarStock(producto.id, almacenPrincipal.id, cantidad, manager);
      }

      // 2) Registrar movimiento en el kardex
      const movimiento = manager.create(KardexMovimiento, {
        empresa_id: empresaId,
        producto_id: producto.id,
        tipo_movimiento: 'ENTRADA',
        motivo: motivo.trim(),
        cantidad,
        stock_antes: stockAnterior,
        stock_despues: stockNuevo,
        referencia: 'Entrada manual',
      });
      await manager.save(movimiento);

      // Auditoría
      if (contexto) {
        await this.auditoriaService.registrar({
          empresa_id: empresaId,
          usuario_id: contexto.usuario_id,
          usuario_email: contexto.usuario_email,
          usuario_rol: contexto.usuario_rol,
          accion: 'ENTRADA_STOCK',
          recurso: 'producto',
          recurso_id: producto.id,
          datos_despues: {
            producto: producto.nombre,
            cantidad,
            motivo: motivo.trim(),
            stock_antes: stockAnterior,
            stock_despues: stockNuevo,
          },
          ip: contexto.ip,
          user_agent: contexto.user_agent,
        });
      }

      return {
        mensaje: 'Entrada de stock registrada',
        producto_id: producto.id,
        cantidad,
        stock_actual: stockNuevo,
      };
    });
  }

  // Ajustar stock (positivo o negativo, para conteos, mermas, etc.)
  async ajustarStock(
    id: string,
    tipo: string,
    cantidad: number,
    motivo: string,
    empresaId: string,
    contexto?: ContextoUsuario,
  ) {
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }
    if (!motivo || motivo.trim() === '') {
      throw new BadRequestException('Debes indicar el motivo del ajuste');
    }
    if (!['POSITIVO', 'NEGATIVO'].includes(tipo)) {
      throw new BadRequestException('El tipo debe ser POSITIVO o NEGATIVO');
    }

    return await this.dataSource.transaction(async (manager) => {
      const producto = await manager.findOne(Producto, {
        where: { id, empresa_id: empresaId },
      });
      if (!producto) throw new BadRequestException('Producto no encontrado');

      const stockAnterior = Number(producto.stock_actual);
      const stockNuevo =
        tipo === 'POSITIVO'
          ? stockAnterior + cantidad
          : stockAnterior - cantidad;

      if (stockNuevo < 0) {
        throw new BadRequestException(
          `El ajuste dejaría stock negativo. Stock actual: ${stockAnterior}, ajuste: -${cantidad}`,
        );
      }

      // 1) Actualizar stock del producto
      producto.stock_actual = stockNuevo;
      await manager.save(producto);

      // 1.b) Reflejar en el stock por almacén (principal por defecto) para
      //      mantener el invariante con producto.stock_actual.
      const almacenPrincipal = await manager.findOne(Almacen, {
        where: { empresa_id: empresaId, es_principal: true, activo: true },
      });
      if (almacenPrincipal) {
        if (tipo === 'POSITIVO') {
          await this.stockService.sumarStock(producto.id, almacenPrincipal.id, cantidad, manager);
        } else {
          await this.stockService.restarStock(producto.id, almacenPrincipal.id, cantidad, manager);
        }
      }

      // 2) Registrar movimiento en el kardex
      const movimiento = manager.create(KardexMovimiento, {
        empresa_id: empresaId,
        producto_id: producto.id,
        tipo_movimiento: tipo === 'POSITIVO' ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
        motivo: motivo.trim(),
        cantidad,
        stock_antes: stockAnterior,
        stock_despues: stockNuevo,
        referencia: 'Ajuste manual',
      });
      await manager.save(movimiento);

      // Auditoría
      if (contexto) {
        await this.auditoriaService.registrar({
          empresa_id: empresaId,
          usuario_id: contexto.usuario_id,
          usuario_email: contexto.usuario_email,
          usuario_rol: contexto.usuario_rol,
          accion: 'AJUSTE_STOCK',
          recurso: 'producto',
          recurso_id: producto.id,
          datos_despues: {
            producto: producto.nombre,
            tipo,
            cantidad,
            motivo: motivo.trim(),
            stock_antes: stockAnterior,
            stock_despues: stockNuevo,
          },
          ip: contexto.ip,
          user_agent: contexto.user_agent,
        });
      }

      return {
        mensaje: `Ajuste ${tipo === 'POSITIVO' ? 'positivo' : 'negativo'} de stock registrado`,
        producto_id: producto.id,
        tipo,
        cantidad,
        stock_actual: stockNuevo,
      };
    });
  }

  // ============================================================
  // STOCK POR ALMACÉN (Fase 2)
  // ============================================================

  /**
   * Obtiene el desglose de stock de un producto por almacén.
   */
  async obtenerStockPorAlmacen(productoId: string, empresaId: string) {
    // Validar que el producto pertenece a la empresa
    const producto = await this.productoRepository.findOne({
      where: { id: productoId, empresa_id: empresaId },
    });
    if (!producto) {
      throw new BadRequestException('Producto no encontrado');
    }

    return this.stockService.obtenerStockPorAlmacen(productoId);
  }
}