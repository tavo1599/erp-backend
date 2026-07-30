import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Venta } from '../ventas/entities/venta.entity';
import { VentaDetalle } from '../ventas/entities/venta-detalle.entity';
import { VentaPago } from '../ventas/entities/venta-pago.entity';
import { Compra } from '../compras/entities/compra.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Proveedor } from '../proveedores/entities/proveedore.entity';
import { Retencion } from '../retenciones/entities/retencion.entity';
import { Percepcion } from '../percepciones/entities/percepcion.entity';

export interface FilaResumen {
  cantidad: number;
  gravado: number;
  igv: number;
  total: number;
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Compra)
    private readonly compraRepository: Repository<Compra>,
    private readonly dataSource: DataSource,
  ) {}

  private resumir(filas: Array<{ gravado: number; igv: number; total: number }>): FilaResumen {
    return filas.reduce<FilaResumen>(
      (acc, f) => ({
        cantidad: acc.cantidad + 1,
        gravado: Number((acc.gravado + f.gravado).toFixed(2)),
        igv: Number((acc.igv + f.igv).toFixed(2)),
        total: Number((acc.total + f.total).toFixed(2)),
      }),
      { cantidad: 0, gravado: 0, igv: 0, total: 0 },
    );
  }

  async reporteVentas(empresaId: string, desde?: string, hasta?: string) {
    const qb = this.ventaRepository
      .createQueryBuilder('v')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat != :anulada', { anulada: 'ANULADA' })
      .orderBy('v.fecha_emision', 'ASC');

    if (desde && hasta) {
      qb.andWhere('DATE(v.fecha_emision) BETWEEN :desde AND :hasta', { desde, hasta });
    }

    const ventas = await qb.getMany();
    const filas = ventas.map((v) => ({
      fecha: v.fecha_emision,
      tipo: v.tipo_comprobante === '01' ? 'Factura' : 'Boleta',
      comprobante: `${v.serie}-${String(v.correlativo).padStart(8, '0')}`,
      cliente: v.cliente_razon_social,
      cliente_documento: v.cliente_numero_documento,
      gravado: Number(v.total_gravado),
      igv: Number(v.total_igv),
      total: Number(v.importe_total),
      estado: v.estado_sunat,
    }));

    return { resumen: this.resumir(filas), filas };
  }

  async reporteCompras(empresaId: string, desde?: string, hasta?: string) {
    const qb = this.compraRepository
      .createQueryBuilder('c')
      .leftJoin(Proveedor, 'p', 'p.id = c.proveedor_id')
      .where('c.empresa_id = :empresaId', { empresaId })
      .andWhere('c.estado != :anulada', { anulada: 'ANULADA' })
      .select([
        'c.fecha_compra AS fecha',
        'c.serie_documento AS serie',
        'c.numero_documento AS numero',
        'c.total_gravado AS gravado',
        'c.total_igv AS igv',
        'c.importe_total AS total',
        'c.estado AS estado',
        'p.razon_social AS proveedor',
      ])
      .orderBy('c.fecha_compra', 'ASC');

    if (desde && hasta) {
      qb.andWhere('c.fecha_compra BETWEEN :desde AND :hasta', { desde, hasta });
    }

    const raw = await qb.getRawMany();
    const filas = raw.map((r) => ({
      fecha: r.fecha,
      documento: `${r.serie}-${r.numero}`,
      proveedor: r.proveedor || '—',
      gravado: Number(r.gravado),
      igv: Number(r.igv),
      total: Number(r.total),
      estado: r.estado,
    }));

    return { resumen: this.resumir(filas), filas };
  }

  // ============================================================
  // R1: Resumen de IGV del periodo (débito vs crédito → a pagar)
  // ============================================================
  async resumenIgv(empresaId: string, desde: string, hasta: string) {
    const ventas = await this.ventaRepository
      .createQueryBuilder('v')
      .select('COALESCE(SUM(v.total_gravado), 0)', 'gravado')
      .addSelect('COALESCE(SUM(v.total_igv), 0)', 'igv')
      .addSelect('COUNT(*)', 'cantidad')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat != :anulada', { anulada: 'ANULADA' })
      .andWhere('DATE(v.fecha_emision) BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawOne();

    const compras = await this.compraRepository
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.total_gravado), 0)', 'gravado')
      .addSelect('COALESCE(SUM(c.total_igv), 0)', 'igv')
      .addSelect('COUNT(*)', 'cantidad')
      .where('c.empresa_id = :empresaId', { empresaId })
      .andWhere('c.estado != :anulada', { anulada: 'ANULADA' })
      .andWhere('c.fecha_compra BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawOne();

    const igvDebito = Number(ventas?.igv || 0);
    const igvCredito = Number(compras?.igv || 0);
    const resultado = Number((igvDebito - igvCredito).toFixed(2));

    return {
      ventas: {
        gravado: Number(Number(ventas?.gravado || 0).toFixed(2)),
        igv: Number(igvDebito.toFixed(2)),
        cantidad: Number(ventas?.cantidad || 0),
      },
      compras: {
        gravado: Number(Number(compras?.gravado || 0).toFixed(2)),
        igv: Number(igvCredito.toFixed(2)),
        cantidad: Number(compras?.cantidad || 0),
      },
      igv_debito: Number(igvDebito.toFixed(2)),
      igv_credito: Number(igvCredito.toFixed(2)),
      igv_a_pagar: resultado > 0 ? resultado : 0,
      saldo_a_favor: resultado < 0 ? Math.abs(resultado) : 0,
    };
  }

  // ============================================================
  // R2: Rentabilidad por producto (utilidad = venta - costo)
  // ============================================================
  async rentabilidad(empresaId: string, desde: string, hasta: string) {
    const filas = await this.dataSource
      .getRepository(VentaDetalle)
      .createQueryBuilder('det')
      .innerJoin(Venta, 'v', 'v.id = det.venta_id')
      .innerJoin(Producto, 'p', 'p.id = det.producto_id')
      .select('p.nombre', 'producto')
      .addSelect('SUM(det.cantidad)', 'cantidad')
      .addSelect('SUM(det.subtotal)', 'vendido')
      .addSelect('SUM(det.cantidad * p.precio_compra)', 'costo')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat = :aceptado', { aceptado: 'ACEPTADO' })
      .andWhere('DATE(v.fecha_emision) BETWEEN :desde AND :hasta', { desde, hasta })
      .groupBy('p.id')
      .addGroupBy('p.nombre')
      .orderBy('SUM(det.subtotal) - SUM(det.cantidad * p.precio_compra)', 'DESC')
      .getRawMany();

    let totVendido = 0;
    let totCosto = 0;
    const detalle = filas.map((f) => {
      const vendido = Number(f.vendido || 0);
      const costo = Number(f.costo || 0);
      const utilidad = vendido - costo;
      totVendido += vendido;
      totCosto += costo;
      return {
        producto: f.producto,
        cantidad: Number(f.cantidad || 0),
        vendido: Number(vendido.toFixed(2)),
        costo: Number(costo.toFixed(2)),
        utilidad: Number(utilidad.toFixed(2)),
        margen: vendido > 0 ? Number(((utilidad / vendido) * 100).toFixed(1)) : 0,
      };
    });

    const utilidadTotal = totVendido - totCosto;
    return {
      resumen: {
        vendido: Number(totVendido.toFixed(2)),
        costo: Number(totCosto.toFixed(2)),
        utilidad: Number(utilidadTotal.toFixed(2)),
        margen: totVendido > 0 ? Number(((utilidadTotal / totVendido) * 100).toFixed(1)) : 0,
      },
      detalle,
    };
  }

  // ============================================================
  // R3: Resumen tributario (detracciones, retenciones, percepciones)
  // ============================================================
  async resumenTributario(empresaId: string, desde: string, hasta: string) {
    const detr = await this.ventaRepository
      .createQueryBuilder('v')
      .select('COALESCE(SUM(v.monto_detraccion), 0)', 'total')
      .addSelect('COUNT(*)', 'cantidad')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.tiene_detraccion = true')
      .andWhere('v.estado_sunat != :anulada', { anulada: 'ANULADA' })
      .andWhere('DATE(v.fecha_emision) BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawOne();

    const ret = await this.dataSource
      .getRepository(Retencion)
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.total_retenido), 0)', 'total')
      .addSelect('COUNT(*)', 'cantidad')
      .where('r.empresa_id = :empresaId', { empresaId })
      .andWhere('r.fecha_emision BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawOne();

    const per = await this.dataSource
      .getRepository(Percepcion)
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.total_percibido), 0)', 'total')
      .addSelect('COUNT(*)', 'cantidad')
      .where('p.empresa_id = :empresaId', { empresaId })
      .andWhere('p.fecha_emision BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawOne();

    return {
      detracciones: { total: Number(Number(detr?.total || 0).toFixed(2)), cantidad: Number(detr?.cantidad || 0) },
      retenciones: { total: Number(Number(ret?.total || 0).toFixed(2)), cantidad: Number(ret?.cantidad || 0) },
      percepciones: { total: Number(Number(per?.total || 0).toFixed(2)), cantidad: Number(per?.cantidad || 0) },
    };
  }

  // ============================================================
  // Métricas clave de un periodo (usado por el comparativo)
  // ============================================================
  private async metricasPeriodo(empresaId: string, desde: string, hasta: string) {
    const ventas = await this.ventaRepository
      .createQueryBuilder('v')
      .select('COALESCE(SUM(v.importe_total), 0)', 'total')
      .addSelect('COALESCE(SUM(v.total_igv), 0)', 'igv')
      .addSelect('COUNT(*)', 'cantidad')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat != :anulada', { anulada: 'ANULADA' })
      .andWhere('DATE(v.fecha_emision) BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawOne();

    const compras = await this.compraRepository
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.importe_total), 0)', 'total')
      .addSelect('COALESCE(SUM(c.total_igv), 0)', 'igv')
      .where('c.empresa_id = :empresaId', { empresaId })
      .andWhere('c.estado != :anulada', { anulada: 'ANULADA' })
      .andWhere('c.fecha_compra BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawOne();

    const util = await this.dataSource
      .getRepository(VentaDetalle)
      .createQueryBuilder('det')
      .innerJoin(Venta, 'v', 'v.id = det.venta_id')
      .innerJoin(Producto, 'p', 'p.id = det.producto_id')
      .select('COALESCE(SUM(det.subtotal - det.cantidad * p.precio_compra), 0)', 'utilidad')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat = :aceptado', { aceptado: 'ACEPTADO' })
      .andWhere('DATE(v.fecha_emision) BETWEEN :desde AND :hasta', { desde, hasta })
      .getRawOne();

    const igvNeto = Number(ventas?.igv || 0) - Number(compras?.igv || 0);
    return {
      ventas_total: Number(Number(ventas?.total || 0).toFixed(2)),
      ventas_cantidad: Number(ventas?.cantidad || 0),
      compras_total: Number(Number(compras?.total || 0).toFixed(2)),
      igv_neto: Number(igvNeto.toFixed(2)),
      utilidad: Number(Number(util?.utilidad || 0).toFixed(2)),
    };
  }

  // ============================================================
  // R (extra): Comparativo mes vs mes anterior
  // ============================================================
  async comparativo(empresaId: string, periodo: string) {
    if (!/^\d{6}$/.test(periodo)) {
      throw new Error('Periodo inválido (YYYYMM)');
    }
    const anio = Number(periodo.substring(0, 4));
    const mes = Number(periodo.substring(4, 6));

    const rango = (a: number, m: number) => {
      const ultimo = new Date(a, m, 0).getDate();
      const mm = String(m).padStart(2, '0');
      return {
        desde: `${a}-${mm}-01`,
        hasta: `${a}-${mm}-${String(ultimo).padStart(2, '0')}`,
        etiqueta: `${a}-${mm}`,
      };
    };

    const actual = rango(anio, mes);
    const antAnio = mes === 1 ? anio - 1 : anio;
    const antMes = mes === 1 ? 12 : mes - 1;
    const anterior = rango(antAnio, antMes);

    const [mActual, mAnterior] = await Promise.all([
      this.metricasPeriodo(empresaId, actual.desde, actual.hasta),
      this.metricasPeriodo(empresaId, anterior.desde, anterior.hasta),
    ]);

    const variacion = (a: number, b: number) => {
      if (b === 0) return a > 0 ? 100 : 0;
      return Number((((a - b) / Math.abs(b)) * 100).toFixed(1));
    };

    return {
      actual: { periodo: actual.etiqueta, ...mActual },
      anterior: { periodo: anterior.etiqueta, ...mAnterior },
      variacion: {
        ventas_total: variacion(mActual.ventas_total, mAnterior.ventas_total),
        compras_total: variacion(mActual.compras_total, mAnterior.compras_total),
        utilidad: variacion(mActual.utilidad, mAnterior.utilidad),
      },
    };
  }

  // ============================================================
  // R (extra): Ventas por forma de pago
  // ============================================================
  async ventasPorFormaPago(empresaId: string, desde: string, hasta: string) {
    const filas = await this.dataSource
      .getRepository(VentaPago)
      .createQueryBuilder('vp')
      .innerJoin(Venta, 'v', 'v.id = vp.venta_id')
      .select('vp.metodo', 'metodo')
      .addSelect('COALESCE(SUM(vp.monto), 0)', 'total')
      .addSelect('COUNT(*)', 'cantidad')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat != :anulada', { anulada: 'ANULADA' })
      .andWhere('DATE(v.fecha_emision) BETWEEN :desde AND :hasta', { desde, hasta })
      .groupBy('vp.metodo')
      .orderBy('total', 'DESC')
      .getRawMany();

    return filas.map((f) => ({
      metodo: f.metodo,
      total: Number(Number(f.total).toFixed(2)),
      cantidad: Number(f.cantidad),
    }));
  }
}
