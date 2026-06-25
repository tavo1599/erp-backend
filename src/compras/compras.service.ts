// src/compras/compras.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCompraDto } from './dto/create-compra.dto';
import { Compra } from './entities/compra.entity';
import { CompraDetalle } from './entities/compra-detalle.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Proveedor } from '../proveedores/entities/proveedore.entity';
import { KardexService } from '../kardex/kardex.service';
import { FinanzasService } from '../finanzas/finanzas.service';

interface ItemCompra {
  producto: Producto;
  cantidad: number;
  costoUnitario: number;
}

@Injectable()
export class ComprasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly kardexService: KardexService,
    private readonly finanzasService: FinanzasService,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
  ) {}

  async crearCompra(dto: CreateCompraDto, empresaId: string) {
    const { proveedor_id, tipo_documento, serie_documento, numero_documento, fecha_compra, detalles } = dto;
    const condicionPago = dto.condicion_pago || 'CONTADO';
    const diasCredito = dto.dias_credito || 0;

    if (!detalles || detalles.length === 0) {
      throw new BadRequestException('La compra debe tener al menos un producto');
    }

    // Validar proveedor
    const proveedor = await this.proveedorRepository.findOne({
      where: { id: proveedor_id, empresa_id: empresaId },
    });
    if (!proveedor) throw new BadRequestException('Proveedor no encontrado');

    // Resolver productos
    const items: ItemCompra[] = [];
    for (const d of detalles) {
      const producto = await this.productoRepository.findOne({
        where: { id: d.producto_id, empresa_id: empresaId },
      });
      if (!producto) throw new BadRequestException(`Producto no encontrado: ${d.producto_id}`);
      items.push({
        producto,
        cantidad: Number(d.cantidad),
        costoUnitario: Number(d.costo_unitario),
      });
    }

    // Calcular totales (el costo incluye IGV)
    let totalConIgv = 0;
    for (const it of items) totalConIgv += it.cantidad * it.costoUnitario;
    const totalGravadoSinIgv = totalConIgv / 1.18;
    const totalIgv = totalGravadoSinIgv * 0.18;
    const importeTotal = totalConIgv;

    // Guardar compra + entrada de stock, todo en una transacción
// Guardar compra + entrada de stock, todo en una transacción
    const compraGuardada = await this.dataSource.transaction(async (manager) => {
      // 1. Calcular fecha de vencimiento PRIMERO (antes de crear la compra)
      let fechaVencimiento: Date | null = null;
      if (condicionPago === 'CREDITO' && diasCredito > 0) {
        fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito);
      }

      // 2. Crear la compra con sus detalles
      const itemsDetalle = items.map((it) =>
        manager.create(CompraDetalle, {
          producto_id: it.producto.id,
          cantidad: it.cantidad,
          costo_unitario: it.costoUnitario,
          subtotal: it.cantidad * it.costoUnitario,
        }),
      );

      const nuevaCompra = manager.create(Compra, {
        empresa_id: empresaId,
        proveedor_id,
        tipo_documento,
        serie_documento,
        numero_documento,
        fecha_compra: new Date(fecha_compra),
        total_gravado: Number(totalGravadoSinIgv.toFixed(2)),
        total_igv: Number(totalIgv.toFixed(2)),
        importe_total: Number(importeTotal.toFixed(2)),
        estado: 'REGISTRADA',
        condicion_pago: condicionPago,
        estado_pago: condicionPago === 'CONTADO' ? 'PAGADO' : 'PENDIENTE',
        fecha_vencimiento: fechaVencimiento,
        detalles: itemsDetalle,
      });

      const guardada = await manager.save(nuevaCompra);

      // 3. Entrada de stock por cada producto (vía kardex)
      for (const it of items) {
        await this.kardexService.registrarMovimiento(
          {
            producto_id: it.producto.id,
            empresa_id: empresaId,
            tipo_movimiento: 'INGRESO_COMPRA',
            cantidad: it.cantidad,
            referencia_documento: `Compra ${serie_documento}-${numero_documento}`,
          },
          manager,
        );
      }

      // 4. Finanzas: contado → sale de caja; crédito → cuenta por pagar
      const docCompra = `${serie_documento}-${numero_documento}`;
      const montoCompra = Number(importeTotal.toFixed(2));

      if (condicionPago === 'CONTADO') {
        await this.finanzasService.registrarCaja(
          {
            empresa_id: empresaId,
            tipo: 'EGRESO',
            concepto: `Compra al contado ${docCompra}`,
            monto: montoCompra,
            referencia: docCompra,
            metodo_pago: 'EFECTIVO',
          },
          manager,
        );
      } else {
        await this.finanzasService.crearCuentaPorPagar(
          {
            empresa_id: empresaId,
            compra_id: guardada.id,
            proveedor_razon_social: proveedor.razon_social,
            documento: docCompra,
            monto_total: montoCompra,
            fecha_vencimiento: fechaVencimiento,
          },
          manager,
        );
      }

      return guardada;
    });

    return {
      mensaje: 'Compra registrada y stock actualizado',
      compra_id: compraGuardada.id,
      documento: `${serie_documento}-${numero_documento}`,
      proveedor: proveedor.razon_social,
      importe_total: Number(importeTotal.toFixed(2)),
    };
  }

async listarCompras(empresaId: string) {
    const compras = await this.dataSource.getRepository(Compra).find({
      where: { empresa_id: empresaId },
      order: { fecha_compra: 'DESC' },
    });

    // Tipamos el array
    const resultado: Array<{
      id: string;
      documento: string;
      proveedor: string;
      importe_total: number;
      estado: string;
      fecha_compra: Date;
    }> = [];

    for (const c of compras) {
      const proveedor = await this.proveedorRepository.findOne({ where: { id: c.proveedor_id } });
      resultado.push({
        id: c.id,
        documento: `${c.serie_documento}-${c.numero_documento}`,
        proveedor: proveedor?.razon_social || 'Proveedor eliminado',
        importe_total: Number(c.importe_total),
        estado: c.estado,
        fecha_compra: c.fecha_compra,
      });
    }
    return resultado;
  }

async obtenerCompra(id: string, empresaId: string) {
    const compra = await this.dataSource.manager.findOne(Compra, {
      where: { id, empresa_id: empresaId },
      relations: ['detalles'],
    });
    if (!compra) throw new BadRequestException('Compra no encontrada');

    const proveedor = await this.proveedorRepository.findOne({ where: { id: compra.proveedor_id } });

    // Tipamos el array
    const detalles: Array<{
      producto_nombre: string;
      cantidad: number;
      costo_unitario: number;
      subtotal: number;
    }> = [];

    for (const d of compra.detalles) {
      const producto = await this.productoRepository.findOne({ where: { id: d.producto_id } });
      detalles.push({
        producto_nombre: producto?.nombre || 'Producto eliminado',
        cantidad: Number(d.cantidad),
        costo_unitario: Number(d.costo_unitario),
        subtotal: Number(d.subtotal),
      });
    }

    return {
      id: compra.id,
      documento: `${compra.serie_documento}-${compra.numero_documento}`,
      tipo_documento: compra.tipo_documento,
      proveedor: proveedor?.razon_social,
      totales: {
        gravado: Number(compra.total_gravado),
        igv: Number(compra.total_igv),
        total: Number(compra.importe_total),
      },
      estado: compra.estado,
      fecha_compra: compra.fecha_compra,
      detalles,
    };
  }

  async anularCompra(id: string, empresaId: string) {
  return await this.dataSource.transaction(async (manager) => {
    const compra = await manager.findOne(Compra, {
      where: { id, empresa_id: empresaId },
      relations: ['detalles'],
    });
    if (!compra) throw new BadRequestException('Compra no encontrada');
    if (compra.estado === 'ANULADA') {
      throw new BadRequestException('Esta compra ya está anulada');
    }

    // 1. Revertir el stock: lo que entró, ahora sale (ajuste de salida)
    for (const detalle of compra.detalles) {
      // Verificar que haya stock suficiente para revertir
      const producto = await manager.findOne(Producto, {
        where: { id: detalle.producto_id },
      });
      if (producto && Number(producto.stock_actual) < Number(detalle.cantidad)) {
        throw new BadRequestException(
          `No se puede anular: el producto "${producto.nombre}" ya no tiene stock suficiente (se vendió parte de lo comprado)`,
        );
      }

      await this.kardexService.registrarMovimiento(
        {
          producto_id: detalle.producto_id,
          empresa_id: empresaId,
          tipo_movimiento: 'AJUSTE_SALIDA',
          cantidad: Number(detalle.cantidad),
          referencia_documento: `Anulación compra ${compra.serie_documento}-${compra.numero_documento}`,
        },
        manager,
      );
    }

    // 2. Revertir finanzas
    if (compra.condicion_pago === 'CONTADO') {
      // Fue contado → el dinero salió de caja, lo devolvemos (entra a caja)
      await this.finanzasService.registrarCaja(
        {
          empresa_id: empresaId,
          tipo: 'INGRESO',
          concepto: `Reverso por anulación de compra ${compra.serie_documento}-${compra.numero_documento}`,
          monto: Number(compra.importe_total),
          referencia: `${compra.serie_documento}-${compra.numero_documento}`,
          metodo_pago: 'EFECTIVO',
        },
        manager,
      );
    } else {
      // Fue crédito → eliminar/anular la cuenta por pagar
      await manager
        .createQueryBuilder()
        .update('cuentas_por_pagar')
        .set({ estado: 'ANULADA', saldo_pendiente: 0 })
        .where('compra_id = :id', { id: compra.id })
        .execute();
    }

    // 3. Marcar la compra como anulada
    compra.estado = 'ANULADA';
    await manager.save(compra);

    return {
      mensaje: 'Compra anulada. Se revirtió el stock y las finanzas.',
      compra_id: compra.id,
    };
  });
}
}