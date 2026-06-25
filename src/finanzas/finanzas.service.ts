// src/finanzas/finanzas.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CuentaPorCobrar } from './entities/cuenta-por-cobrar.entity';
import { CuentaPorPagar } from './entities/cuenta-por-pagar.entity';
import { MovimientoCaja } from './entities/movimiento-caja.entity';

@Injectable()
export class FinanzasService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CuentaPorCobrar)
    private readonly cobrarRepo: Repository<CuentaPorCobrar>,
    @InjectRepository(CuentaPorPagar)
    private readonly pagarRepo: Repository<CuentaPorPagar>,
    @InjectRepository(MovimientoCaja)
    private readonly cajaRepo: Repository<MovimientoCaja>,
  ) {}

  // ========== CREAR CUENTAS (las llaman ventas/compras) ==========

  // Crear cuenta por cobrar (cuando se vende a crédito) — usa el manager de la transacción
  async crearCuentaPorCobrar(
    data: {
      empresa_id: string;
      venta_id: string;
      cliente_documento: string;
      cliente_razon_social: string;
      comprobante: string;
      monto_total: number;
      fecha_vencimiento: Date | null;
    },
    manager: EntityManager,
  ) {
    const cuenta = manager.create(CuentaPorCobrar, {
      ...data,
      monto_pagado: 0,
      saldo_pendiente: data.monto_total,
      estado: 'PENDIENTE',
    });
    return await manager.save(cuenta);
  }

  // Crear cuenta por pagar (cuando se compra a crédito)
  async crearCuentaPorPagar(
    data: {
      empresa_id: string;
      compra_id: string;
      proveedor_razon_social: string;
      documento: string;
      monto_total: number;
      fecha_vencimiento: Date | null;
    },
    manager: EntityManager,
  ) {
    const cuenta = manager.create(CuentaPorPagar, {
      ...data,
      monto_pagado: 0,
      saldo_pendiente: data.monto_total,
      estado: 'PENDIENTE',
    });
    return await manager.save(cuenta);
  }

  // Registrar movimiento de caja (ingreso/egreso) — opcionalmente con manager
  async registrarCaja(
    data: {
      empresa_id: string;
      tipo: 'INGRESO' | 'EGRESO';
      concepto: string;
      monto: number;
      referencia?: string;
      metodo_pago?: string;
    },
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(MovimientoCaja) : this.cajaRepo;
    const mov = repo.create(data);
    return await repo.save(mov);
  }

  // ========== COBRAR (cliente paga una venta a crédito) ==========

  async registrarCobro(
    cuentaId: string,
    monto: number,
    metodoPago: string,
    empresaId: string,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const cuenta = await manager.findOne(CuentaPorCobrar, {
        where: { id: cuentaId, empresa_id: empresaId },
      });
      if (!cuenta) throw new BadRequestException('Cuenta por cobrar no encontrada');
      if (cuenta.estado === 'PAGADO') {
        throw new BadRequestException('Esta cuenta ya está pagada');
      }

      const saldo = Number(cuenta.saldo_pendiente);
      if (monto <= 0) throw new BadRequestException('El monto debe ser mayor a 0');
      if (monto > saldo) {
        throw new BadRequestException(`El monto (${monto}) excede el saldo pendiente (${saldo})`);
      }

      // Actualizar la cuenta
      cuenta.monto_pagado = Number(cuenta.monto_pagado) + monto;
      cuenta.saldo_pendiente = saldo - monto;
      cuenta.estado = cuenta.saldo_pendiente === 0 ? 'PAGADO' : 'PARCIAL';
      await manager.save(cuenta);

      // Registrar el ingreso en caja
      await this.registrarCaja(
        {
          empresa_id: empresaId,
          tipo: 'INGRESO',
          concepto: `Cobro de ${cuenta.comprobante} (${cuenta.cliente_razon_social})`,
          monto,
          referencia: cuenta.comprobante,
          metodo_pago: metodoPago,
        },
        manager,
      );

      return {
        mensaje: 'Cobro registrado',
        comprobante: cuenta.comprobante,
        monto_cobrado: monto,
        saldo_pendiente: cuenta.saldo_pendiente,
        estado: cuenta.estado,
      };
    });
  }

  // ========== PAGAR (pagas a un proveedor) ==========

  async registrarPagoProveedor(
    cuentaId: string,
    monto: number,
    metodoPago: string,
    empresaId: string,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const cuenta = await manager.findOne(CuentaPorPagar, {
        where: { id: cuentaId, empresa_id: empresaId },
      });
      if (!cuenta) throw new BadRequestException('Cuenta por pagar no encontrada');
      if (cuenta.estado === 'PAGADO') {
        throw new BadRequestException('Esta cuenta ya está pagada');
      }

      const saldo = Number(cuenta.saldo_pendiente);
      if (monto <= 0) throw new BadRequestException('El monto debe ser mayor a 0');
      if (monto > saldo) {
        throw new BadRequestException(`El monto (${monto}) excede el saldo pendiente (${saldo})`);
      }

      cuenta.monto_pagado = Number(cuenta.monto_pagado) + monto;
      cuenta.saldo_pendiente = saldo - monto;
      cuenta.estado = cuenta.saldo_pendiente === 0 ? 'PAGADO' : 'PARCIAL';
      await manager.save(cuenta);

      // Registrar el egreso en caja
      await this.registrarCaja(
        {
          empresa_id: empresaId,
          tipo: 'EGRESO',
          concepto: `Pago a ${cuenta.proveedor_razon_social} (${cuenta.documento})`,
          monto,
          referencia: cuenta.documento,
          metodo_pago: metodoPago,
        },
        manager,
      );

      return {
        mensaje: 'Pago registrado',
        documento: cuenta.documento,
        monto_pagado: monto,
        saldo_pendiente: cuenta.saldo_pendiente,
        estado: cuenta.estado,
      };
    });
  }

  // ========== CONSULTAS ==========

  // Cuentas por cobrar pendientes
  async cuentasPorCobrar(empresaId: string, soloPendientes = true) {
    const where: any = { empresa_id: empresaId };
    const query = this.cobrarRepo
      .createQueryBuilder('c')
      .where('c.empresa_id = :empresaId', { empresaId });
    if (soloPendientes) {
      query.andWhere('c.estado != :pagado', { pagado: 'PAGADO' });
    }
    query.orderBy('c.fecha_vencimiento', 'ASC');
    const cuentas = await query.getMany();

    const totalPorCobrar = cuentas.reduce((s, c) => s + Number(c.saldo_pendiente), 0);

    return {
      total_por_cobrar: Number(totalPorCobrar.toFixed(2)),
      cantidad: cuentas.length,
      cuentas: cuentas.map((c) => ({
        id: c.id,
        comprobante: c.comprobante,
        cliente: c.cliente_razon_social,
        monto_total: Number(c.monto_total),
        monto_pagado: Number(c.monto_pagado),
        saldo_pendiente: Number(c.saldo_pendiente),
        fecha_vencimiento: c.fecha_vencimiento,
        estado: c.estado,
      })),
    };
  }

  // Cuentas por pagar pendientes
  async cuentasPorPagar(empresaId: string, soloPendientes = true) {
    const query = this.pagarRepo
      .createQueryBuilder('c')
      .where('c.empresa_id = :empresaId', { empresaId });
    if (soloPendientes) {
      query.andWhere('c.estado != :pagado', { pagado: 'PAGADO' });
    }
    query.orderBy('c.fecha_vencimiento', 'ASC');
    const cuentas = await query.getMany();

    const totalPorPagar = cuentas.reduce((s, c) => s + Number(c.saldo_pendiente), 0);

    return {
      total_por_pagar: Number(totalPorPagar.toFixed(2)),
      cantidad: cuentas.length,
      cuentas: cuentas.map((c) => ({
        id: c.id,
        documento: c.documento,
        proveedor: c.proveedor_razon_social,
        monto_total: Number(c.monto_total),
        monto_pagado: Number(c.monto_pagado),
        saldo_pendiente: Number(c.saldo_pendiente),
        fecha_vencimiento: c.fecha_vencimiento,
        estado: c.estado,
      })),
    };
  }

  // Estado de caja (ingresos, egresos, saldo)
  async estadoCaja(empresaId: string, desde?: string, hasta?: string) {
    const query = this.cajaRepo
      .createQueryBuilder('m')
      .where('m.empresa_id = :empresaId', { empresaId });
    if (desde) query.andWhere('m.fecha >= :desde', { desde });
    if (hasta) query.andWhere('m.fecha <= :hasta', { hasta: hasta + ' 23:59:59' });
    query.orderBy('m.fecha', 'DESC');

    const movimientos = await query.getMany();

    let ingresos = 0;
    let egresos = 0;
    for (const m of movimientos) {
      if (m.tipo === 'INGRESO') ingresos += Number(m.monto);
      else egresos += Number(m.monto);
    }

    return {
      ingresos: Number(ingresos.toFixed(2)),
      egresos: Number(egresos.toFixed(2)),
      saldo: Number((ingresos - egresos).toFixed(2)),
      cantidad_movimientos: movimientos.length,
      movimientos: movimientos.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        concepto: m.concepto,
        monto: Number(m.monto),
        metodo_pago: m.metodo_pago,
        fecha: m.fecha,
      })),
    };
  }

  // Registrar un gasto/ingreso manual (no asociado a venta/compra)
  async movimientoManual(
    empresaId: string,
    tipo: 'INGRESO' | 'EGRESO',
    concepto: string,
    monto: number,
    metodoPago: string,
  ) {
    if (monto <= 0) throw new BadRequestException('El monto debe ser mayor a 0');
    const mov = await this.registrarCaja({
      empresa_id: empresaId,
      tipo,
      concepto,
      monto,
      metodo_pago: metodoPago,
    });
    return { mensaje: 'Movimiento registrado', id: mov.id };
  }
}