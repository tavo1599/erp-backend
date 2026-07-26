import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from '../ventas/entities/venta.entity';
import { Compra } from '../compras/entities/compra.entity';
import { Proveedor } from '../proveedores/entities/proveedore.entity';

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
}
