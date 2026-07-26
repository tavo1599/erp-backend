import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from '../ventas/entities/venta.entity';
import { Compra } from '../compras/entities/compra.entity';
import { Proveedor } from '../proveedores/entities/proveedore.entity';
import { Empresa } from '../empresas/entities/empresa.entity';

/**
 * Generador de archivos PLE (Programa de Libros Electrónicos) de SUNAT.
 * Registro de Ventas (5.1 / libro 140100) y Registro de Compras (8.1 / libro 080100).
 *
 * IMPORTANTE: el formato PLE es estricto. Este generador arma la estructura estándar
 * pero SIEMPRE debe validarse con el "Programa Validador SUNAT (SVAP)" antes de usarlo
 * en real; puede requerir ajustes finos de campo.
 */
@Injectable()
export class PleService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Compra)
    private readonly compraRepository: Repository<Compra>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
  ) {}

  private money(n: any): string {
    return Number(n || 0).toFixed(2);
  }

  private fecha(f: any): string {
    if (!f) return '';
    const d = new Date(f);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  private validarPeriodo(periodo: string) {
    if (!/^\d{6}$/.test(periodo)) {
      throw new BadRequestException('Periodo inválido. Formato esperado: YYYYMM (ej: 202407)');
    }
  }

  private nombreArchivo(ruc: string, periodo: string, codLibro: string): string {
    // LE{RUC}{YYYYMM}00{codLibro}00{indOperaciones}{indContenido}{indMoneda}{indValorizacion}.txt
    return `LE${ruc}${periodo}00${codLibro}001111.txt`;
  }

  private rango(periodo: string) {
    const anio = Number(periodo.substring(0, 4));
    const mes = Number(periodo.substring(4, 6));
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    return { desde, hasta };
  }

  async registroVentas(empresaId: string, periodo: string) {
    this.validarPeriodo(periodo);
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');
    const { desde, hasta } = this.rango(periodo);

    const ventas = await this.ventaRepository
      .createQueryBuilder('v')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.estado_sunat != :anulada', { anulada: 'ANULADA' })
      .andWhere('DATE(v.fecha_emision) BETWEEN :desde AND :hasta', { desde, hasta })
      .orderBy('v.fecha_emision', 'ASC')
      .getMany();

    const per = `${periodo}00`;
    const lineas = ventas.map((v, i) => {
      const cuo = `M${String(i + 1).padStart(6, '0')}`;
      const tipoDocCli = v.cliente_numero_documento?.length === 11 ? '6' : '1';
      const campos = [
        per, // 1 periodo
        cuo, // 2 CUO
        String(i + 1), // 3 correlativo del asiento
        this.fecha(v.fecha_emision), // 4 fecha emisión
        this.fecha(v.fecha_vencimiento), // 5 fecha vencimiento
        v.tipo_comprobante, // 6 tipo comprobante (cat. 10)
        v.serie, // 7 serie
        String(v.correlativo), // 8 número
        '', // 9 número final (rango boletas)
        tipoDocCli, // 10 tipo doc cliente (cat. 06)
        v.cliente_numero_documento || '', // 11 número doc
        (v.cliente_razon_social || '').replace(/\|/g, ' '), // 12 razón social
        '0.00', // 13 valor exportación
        this.money(v.total_gravado), // 14 base imponible gravada
        '0.00', // 15 descuento base
        this.money(v.total_igv), // 16 IGV/IPM
        '0.00', // 17 descuento IGV
        this.money((v as any).total_exonerado), // 18 exonerado
        this.money((v as any).total_inafecto), // 19 inafecto
        '0.00', // 20 ISC
        '0.00', // 21 base arroz pilado
        '0.00', // 22 IVAP
        '0.00', // 23 ICBPER
        '0.00', // 24 otros tributos
        this.money(v.importe_total), // 25 importe total
        'PEN', // 26 moneda
        '1.000', // 27 tipo de cambio
        '', // 28 fecha doc modificado
        '', // 29 tipo doc modificado
        '', // 30 serie doc modificado
        '', // 31 número doc modificado
        '', // 32 identificación proyecto/contrato
        '', // 33 (reservado)
        '1', // 34 estado (1 = anotado en el periodo)
      ];
      return campos.join('|') + '|';
    });

    return {
      filename: this.nombreArchivo(empresa.ruc, periodo, '140100'),
      contenido: lineas.join('\r\n') + (lineas.length ? '\r\n' : ''),
      registros: lineas.length,
    };
  }

  async registroCompras(empresaId: string, periodo: string) {
    this.validarPeriodo(periodo);
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');
    const { desde, hasta } = this.rango(periodo);

    const compras = await this.compraRepository
      .createQueryBuilder('c')
      .leftJoin(Proveedor, 'p', 'p.id = c.proveedor_id')
      .where('c.empresa_id = :empresaId', { empresaId })
      .andWhere('c.estado != :anulada', { anulada: 'ANULADA' })
      .andWhere('c.fecha_compra BETWEEN :desde AND :hasta', { desde, hasta })
      .select([
        'c.fecha_compra AS fecha_compra',
        'c.tipo_documento AS tipo_documento',
        'c.serie_documento AS serie_documento',
        'c.numero_documento AS numero_documento',
        'c.total_gravado AS total_gravado',
        'c.total_igv AS total_igv',
        'c.importe_total AS importe_total',
        'p.ruc AS proveedor_ruc',
        'p.razon_social AS proveedor_razon',
      ])
      .orderBy('c.fecha_compra', 'ASC')
      .getRawMany();

    const per = `${periodo}00`;
    const lineas = compras.map((c, i) => {
      const cuo = `M${String(i + 1).padStart(6, '0')}`;
      const rucProv = c.proveedor_ruc || '';
      const tipoDocProv = rucProv.length === 11 ? '6' : '1';
      const campos = [
        per, // 1 periodo
        cuo, // 2 CUO
        String(i + 1), // 3 correlativo asiento
        this.fecha(c.fecha_compra), // 4 fecha emisión comprobante
        '', // 5 fecha vencimiento/pago
        c.tipo_documento, // 6 tipo comprobante (cat. 10)
        c.serie_documento || '', // 7 serie
        '', // 8 año emisión DUA (no aplica)
        c.numero_documento || '', // 9 número
        tipoDocProv, // 10 tipo doc proveedor
        rucProv, // 11 número doc proveedor
        (c.proveedor_razon || '').replace(/\|/g, ' '), // 12 razón social proveedor
        this.money(c.total_gravado), // 13 base imponible gravada (destino gravadas)
        this.money(c.total_igv), // 14 IGV
        '0.00', // 15 base gravada mixta
        '0.00', // 16 IGV mixta
        '0.00', // 17 base gravada no gravadas
        '0.00', // 18 IGV no gravadas
        '0.00', // 19 valor adquisiciones no gravadas
        '0.00', // 20 ISC
        '0.00', // 21 ICBPER
        '0.00', // 22 otros tributos
        this.money(c.importe_total), // 23 importe total
        'PEN', // 24 moneda
        '1.000', // 25 tipo de cambio
        '', // 26 fecha emisión doc modificado
        '', // 27 tipo doc modificado
        '', // 28 serie doc modificado
        '', // 29 número doc modificado
        '', // 30-... campos DUA / detracción (vacíos)
        '', '', '', '',
        '1', // estado (1 = anotado en el periodo)
      ];
      return campos.join('|') + '|';
    });

    return {
      filename: this.nombreArchivo(empresa.ruc, periodo, '080100'),
      contenido: lineas.join('\r\n') + (lineas.length ? '\r\n' : ''),
      registros: lineas.length,
    };
  }
}
