import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CajaSesion } from './entities/caja-sesion.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { VentaPago } from '../ventas/entities/venta-pago.entity';

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(CajaSesion)
    private readonly cajaRepository: Repository<CajaSesion>,
    private readonly dataSource: DataSource,
  ) {}

  private async ventasEfectivoDesde(empresaId: string, desde: Date): Promise<number> {
    const row = await this.dataSource
      .getRepository(VentaPago)
      .createQueryBuilder('vp')
      .innerJoin(Venta, 'v', 'v.id = vp.venta_id')
      .select('COALESCE(SUM(vp.monto), 0)', 'total')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('vp.metodo = :efectivo', { efectivo: 'EFECTIVO' })
      .andWhere('v.estado_sunat != :anulada', { anulada: 'ANULADA' })
      .andWhere('v.fecha_emision >= :desde', { desde })
      .getRawOne();
    return Number(row?.total || 0);
  }

  async abrir(empresaId: string, usuarioEmail: string | undefined, montoInicial: number) {
    const abierta = await this.cajaRepository.findOne({
      where: { empresa_id: empresaId, estado: 'ABIERTA' },
    });
    if (abierta) {
      throw new BadRequestException('Ya hay una caja abierta. Ciérrala antes de abrir otra.');
    }
    const caja = this.cajaRepository.create({
      empresa_id: empresaId,
      usuario_email: usuarioEmail || null,
      monto_inicial: Number(montoInicial) || 0,
      estado: 'ABIERTA',
    });
    return this.cajaRepository.save(caja);
  }

  async estadoActual(empresaId: string) {
    const caja = await this.cajaRepository.findOne({
      where: { empresa_id: empresaId, estado: 'ABIERTA' },
    });
    if (!caja) return { abierta: false };

    const ventasEfectivo = await this.ventasEfectivoDesde(empresaId, caja.fecha_apertura);
    const esperado = Number(caja.monto_inicial) + ventasEfectivo;
    return {
      abierta: true,
      caja: {
        id: caja.id,
        usuario_email: caja.usuario_email,
        monto_inicial: Number(caja.monto_inicial),
        ventas_efectivo: Number(ventasEfectivo.toFixed(2)),
        monto_esperado: Number(esperado.toFixed(2)),
        fecha_apertura: caja.fecha_apertura,
      },
    };
  }

  async cerrar(empresaId: string, montoContado: number, observaciones?: string) {
    const caja = await this.cajaRepository.findOne({
      where: { empresa_id: empresaId, estado: 'ABIERTA' },
    });
    if (!caja) throw new BadRequestException('No hay una caja abierta');

    const ventasEfectivo = await this.ventasEfectivoDesde(empresaId, caja.fecha_apertura);
    const esperado = Number(caja.monto_inicial) + ventasEfectivo;
    const contado = Number(montoContado) || 0;
    const diferencia = Number((contado - esperado).toFixed(2));

    caja.total_ventas_efectivo = Number(ventasEfectivo.toFixed(2));
    caja.monto_esperado = Number(esperado.toFixed(2));
    caja.monto_contado = contado;
    caja.diferencia = diferencia;
    caja.observaciones = observaciones || null;
    caja.estado = 'CERRADA';
    caja.fecha_cierre = new Date();

    await this.cajaRepository.save(caja);
    return {
      mensaje: 'Caja cerrada',
      monto_inicial: Number(caja.monto_inicial),
      ventas_efectivo: caja.total_ventas_efectivo,
      monto_esperado: caja.monto_esperado,
      monto_contado: contado,
      diferencia,
    };
  }

  async historial(empresaId: string) {
    const sesiones = await this.cajaRepository.find({
      where: { empresa_id: empresaId, estado: 'CERRADA' },
      order: { fecha_cierre: 'DESC' },
      take: 30,
    });
    return sesiones.map((c) => ({
      id: c.id,
      usuario_email: c.usuario_email,
      monto_inicial: Number(c.monto_inicial),
      ventas_efectivo: Number(c.total_ventas_efectivo),
      monto_esperado: Number(c.monto_esperado),
      monto_contado: c.monto_contado != null ? Number(c.monto_contado) : null,
      diferencia: c.diferencia != null ? Number(c.diferencia) : null,
      fecha_apertura: c.fecha_apertura,
      fecha_cierre: c.fecha_cierre,
    }));
  }
}
