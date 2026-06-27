// src/resumenes/resumenes.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ResumenDiario } from './entities/resumen.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Venta } from '../ventas/entities/venta.entity';

@Injectable()
export class ResumenesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    @InjectRepository(ResumenDiario)
    private readonly resumenRepository: Repository<ResumenDiario>,
  ) {}

  // Enviar el resumen de las boletas de un día
  async enviarResumen(fecha: string, empresaId: string) {
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    // Buscar las boletas (tipo 03) aceptadas de esa fecha
    const boletas = await this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('v')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.tipo_comprobante = :tipo', { tipo: '03' })
      .andWhere('v.estado_sunat = :estado', { estado: 'ACEPTADO' })
      .andWhere('DATE(v.fecha_emision) = :fecha', { fecha })
      .getMany();

    if (boletas.length === 0) {
      throw new BadRequestException('No hay boletas aceptadas para esa fecha');
    }

    // Correlativo del resumen del día
    const resumenesHoy = await this.resumenRepository
      .createQueryBuilder('r')
      .where('r.empresa_id = :empresaId', { empresaId })
      .andWhere('DATE(r.fecha_creacion) = CURRENT_DATE')
      .getCount();
    const correlativoResumen = resumenesHoy + 1;

    const fechaGeneracion = new Date().toISOString().split('T')[0];

const payloadJava = {
      empresa: {
        ruc: empresa.ruc,
        razonSocial: empresa.razon_social,
        nombreComercial: empresa.nombre_comercial || empresa.razon_social,
        direccion: empresa.direccion || 'AV. PRINCIPAL 123',
        ubigeo: (empresa.ubigeo && /^\d{6}$/.test(empresa.ubigeo)) ? empresa.ubigeo : '150101',
        departamento: empresa.departamento || 'LIMA',
        provincia: empresa.provincia || 'LIMA',
        distrito: empresa.distrito || 'LIMA',
        codigoPais: 'PE',
        solUsuario: empresa.sol_usuario || 'MODDATOS',
        solClave: empresa.sol_clave || 'MODDATOS',
        ambiente: empresa.ambiente || 'beta',
      },
      fechaGeneracion: fechaGeneracion,
      fechaResumen: fecha,              // ← antes "fechaReferencia"
      correlativo: correlativoResumen,
      moneda: 'PEN',
      items: boletas.map((b, index) => ({   // ← antes "boletas"
        numero: index + 1,
        tipoDocumento: '03',
        serie: b.serie,
        correlativoInicio: b.correlativo,   // mismo correlativo (una boleta por item)
        correlativoFin: b.correlativo,
        tipoOperacion: '1',                 // 1=adicionar
        clienteTipoDocumento: b.cliente_numero_documento.length === 11 ? '6' : '1',
        clienteNumeroDocumento: b.cliente_numero_documento,
        totalGravado: Number(b.total_gravado),
        totalExonerado: 0,
        totalInafecto: 0,
        totalOtrosCargos: 0,
        totalIsc: 0,
        totalIgv: Number(b.total_igv),
        importeTotal: Number(b.importe_total),
      })),
    };

    console.log('=== PAYLOAD RESUMEN A JAVA ===');
    console.log(JSON.stringify(payloadJava, null, 2));

    let sunatData: any = null;
    let ticket: string | null = null;
    const motorJavaUrl = process.env.JAVA_MOTOR_URL || 'http://localhost:8089';
    try {
      const resp = await firstValueFrom(
        this.httpService.post(`${motorJavaUrl}/api/resumenes/enviar`, payloadJava),
      );
      sunatData = resp.data;
      ticket = sunatData?.ticket || null;
    } catch (error: any) {
      sunatData = error.response?.data || { message: error.message };
    }

    const identificador = `RC-${fechaGeneracion.replace(/-/g, '')}-${correlativoResumen}`;
    const nombreArchivo = `${empresa.ruc}-${identificador}`;

    const resumen = this.resumenRepository.create({
      empresa_id: empresaId,
      identificador,
      fecha_referencia: fecha,
      correlativo: correlativoResumen,
      cantidad_boletas: boletas.length,
      ticket,
      estado: ticket ? 'PENDIENTE' : 'RECHAZADO',
      sunat_descripcion: sunatData?.message || sunatData?.sunatDescription || null,
      nombre_archivo: nombreArchivo,
    });
    const guardado = await this.resumenRepository.save(resumen);

    if (ticket) {
      return {
        mensaje: 'Resumen diario enviado. Use el ticket para consultar el estado.',
        resumen_id: guardado.id,
        identificador,
        ticket,
        cantidad_boletas: boletas.length,
        estado: 'PENDIENTE',
      };
    } else {
      return {
        mensaje: 'No se pudo enviar el resumen',
        resumen_id: guardado.id,
        estado: 'RECHAZADO',
        error: sunatData?.message,
      };
    }
  }

  // Consultar estado del resumen
  async consultarEstado(resumenId: string, empresaId: string) {
    const resumen = await this.resumenRepository.findOne({
      where: { id: resumenId, empresa_id: empresaId },
    });
    if (!resumen) throw new BadRequestException('Resumen no encontrado');
    if (!resumen.ticket) throw new BadRequestException('Este resumen no tiene ticket');

    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    const empresaPayload = {
      ruc: empresa.ruc,
      razonSocial: empresa.razon_social,
      nombreComercial: empresa.nombre_comercial || empresa.razon_social,
      direccion: empresa.direccion || 'AV. PRINCIPAL 123',
      ubigeo: (empresa.ubigeo && /^\d{6}$/.test(empresa.ubigeo)) ? empresa.ubigeo : '150101',
      departamento: empresa.departamento || 'LIMA',
      provincia: empresa.provincia || 'LIMA',
      distrito: empresa.distrito || 'LIMA',
      codigoPais: 'PE',
      solUsuario: empresa.sol_usuario || 'MODDATOS',
      solClave: empresa.sol_clave || 'MODDATOS',
      ambiente: empresa.ambiente || 'beta',
    };

    let sunatData: any = null;
    const motorJavaUrl = process.env.JAVA_MOTOR_URL || 'http://localhost:8089';
try {
  const resp = await firstValueFrom(
    this.httpService.post(
      `${motorJavaUrl}/api/resumenes/estado?ticket=${resumen.ticket}`,
      empresaPayload,
      { timeout: 20000 },
    ),
  );
  sunatData = resp.data;
} catch (error: any) {
  sunatData = error.response?.data || { message: error.message };
}

    const codigo = sunatData?.sunatResponseCode;
    const aceptado = codigo === '0';
    const enProceso = codigo === '98' || !codigo;

    if (!enProceso) {
      resumen.estado = aceptado ? 'ACEPTADO' : 'RECHAZADO';
      resumen.sunat_codigo = codigo || null;
      resumen.sunat_descripcion = sunatData?.sunatDescription || sunatData?.message || null;
      await this.resumenRepository.save(resumen);
    }

    return {
      resumen_id: resumen.id,
      identificador: resumen.identificador,
      estado: enProceso ? 'EN_PROCESO' : resumen.estado,
      sunat_descripcion: sunatData?.sunatDescription || sunatData?.message,
    };
  }

  // Listar resúmenes
  async listar(empresaId: string) {
    const resumenes = await this.resumenRepository.find({
      where: { empresa_id: empresaId },
      order: { fecha_creacion: 'DESC' },
    });
    return resumenes.map((r) => ({
      id: r.id,
      identificador: r.identificador,
      fecha_referencia: r.fecha_referencia,
      cantidad_boletas: r.cantidad_boletas,
      estado: r.estado,
      fecha_creacion: r.fecha_creacion,
    }));
  }
}