import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Percepcion } from './entities/percepcion.entity';
import { PercepcionDetalle } from './entities/percepcion-detalle.entity';
import { CreatePercepcionDto } from './dto/create-percepcion.dto';
import { Empresa } from '../empresas/entities/empresa.entity';
import { fechaActualLima } from '../common/utils/fecha.util';
import { JAVA_MOTOR_URL, cabecerasMotor } from '../common/motor-java.util';

@Injectable()
export class PercepcionesService {
  constructor(
    @InjectRepository(Percepcion)
    private readonly percepcionRepository: Repository<Percepcion>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    private readonly httpService: HttpService,
  ) {}

  private tasaPorRegimen(regimen: string): number {
    if (regimen === '02') return 1;
    if (regimen === '03') return 0.5;
    return 2;
  }

  async emitir(dto: CreatePercepcionDto, empresaId: string) {
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    const regimen = dto.regimen || '01';
    const tasa = this.tasaPorRegimen(regimen);
    const fechaEmision = fechaActualLima();

    const ultima = await this.percepcionRepository.findOne({
      where: { empresa_id: empresaId, serie: dto.serie },
      order: { correlativo: 'DESC' },
    });
    const correlativo = (ultima?.correlativo || 0) + 1;

    let totalPercibido = 0;
    let totalCobrado = 0;
    const itemsPayload = dto.detalles.map((d, i) => {
      const importeCobrado = Number(d.importe_cobrado);
      const montoPercibido = Math.round(importeCobrado * (tasa / 100) * 100) / 100;
      totalPercibido += montoPercibido;
      totalCobrado += importeCobrado;
      return {
        numero: i + 1,
        tipoDocRelacionado: d.tipo_doc_relacionado || '01',
        numDocRelacionado: d.num_doc_relacionado,
        fechaDocRelacionado: d.fecha_doc,
        importeDocRelacionado: Number(d.importe_doc),
        monedaDocRelacionado: 'PEN',
        fechaCobro: d.fecha_cobro,
        numeroCobro: d.num_doc_relacionado,
        importeCobrado,
        monedaCobro: 'PEN',
        montoPercibido,
        monedaPercepcion: 'PEN',
      };
    });
    totalPercibido = Math.round(totalPercibido * 100) / 100;
    totalCobrado = Math.round(totalCobrado * 100) / 100;

    const clienteTipoDoc = dto.cliente_numero_documento.length === 11 ? '6' : '1';

    const payloadJava = {
      empresa: {
        ruc: empresa.ruc,
        razonSocial: empresa.razon_social,
        nombreComercial: empresa.nombre_comercial || empresa.razon_social,
        direccion: empresa.direccion,
        ubigeo: empresa.ubigeo || '150101',
        departamento: empresa.departamento || 'LIMA',
        provincia: empresa.provincia || 'LIMA',
        distrito: empresa.distrito || 'LIMA',
        codigoPais: 'PE',
        solUsuario: empresa.sol_usuario || 'MODDATOS',
        solClave: empresa.sol_clave || 'MODDATOS',
        ambiente: empresa.ambiente || 'beta',
      },
      serie: dto.serie,
      correlativo,
      fechaEmision,
      regimenPercepcion: regimen,
      tasaPercepcion: tasa,
      observaciones: dto.observaciones || '',
      moneda: 'PEN',
      clienteTipoDocumento: clienteTipoDoc,
      clienteNumeroDocumento: dto.cliente_numero_documento,
      clienteRazonSocial: dto.cliente_razon_social,
      clienteDireccion: dto.cliente_direccion || '-',
      items: itemsPayload,
    };

    let sunatData: any = null;
    try {
      const resp = await firstValueFrom(
        this.httpService.post(`${JAVA_MOTOR_URL}/api/percepciones/emitir`, payloadJava, {
          headers: cabecerasMotor(),
          timeout: 30000,
        }),
      );
      sunatData = resp.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      throw new BadRequestException(`Error al emitir la percepción en SUNAT: ${msg}`);
    }

    if (!sunatData?.success) {
      throw new BadRequestException(
        `SUNAT rechazó la percepción: ${sunatData?.sunatDescription || sunatData?.message || 'Error desconocido'}`,
      );
    }

    const percepcion = this.percepcionRepository.create({
      empresa_id: empresaId,
      serie: dto.serie,
      correlativo,
      fecha_emision: fechaEmision,
      regimen,
      tasa,
      cliente_numero_documento: dto.cliente_numero_documento,
      cliente_razon_social: dto.cliente_razon_social,
      moneda: 'PEN',
      total_percibido: totalPercibido,
      total_cobrado: totalCobrado,
      observaciones: dto.observaciones || null,
      estado_sunat: 'ACEPTADO',
      sunat_codigo: sunatData.sunatResponseCode || null,
      sunat_descripcion: sunatData.sunatDescription || null,
      sunat_hash: sunatData.hashCode || null,
      sunat_xml_base64: sunatData.xmlBase64 || null,
      sunat_cdr_base64: sunatData.cdrBase64 || null,
      nombre_archivo: sunatData.nombreArchivo || `${dto.serie}-${correlativo}`,
      detalles: dto.detalles.map((d) =>
        this.percepcionRepository.manager.create(PercepcionDetalle, {
          tipo_doc_relacionado: d.tipo_doc_relacionado || '01',
          num_doc_relacionado: d.num_doc_relacionado,
          fecha_doc: d.fecha_doc,
          importe_doc: Number(d.importe_doc),
          fecha_cobro: d.fecha_cobro,
          importe_cobrado: Number(d.importe_cobrado),
          monto_percibido: Math.round(Number(d.importe_cobrado) * (tasa / 100) * 100) / 100,
        }),
      ),
    });

    const guardada = await this.percepcionRepository.save(percepcion);
    return {
      mensaje: 'Percepción emitida y aceptada por SUNAT',
      percepcion_id: guardada.id,
      comprobante: `${dto.serie}-${String(correlativo).padStart(8, '0')}`,
      total_percibido: totalPercibido,
    };
  }

  async listar(empresaId: string) {
    const percepciones = await this.percepcionRepository.find({
      where: { empresa_id: empresaId },
      order: { created_at: 'DESC' },
    });
    return percepciones.map((p) => ({
      id: p.id,
      comprobante: `${p.serie}-${String(p.correlativo).padStart(8, '0')}`,
      fecha_emision: p.fecha_emision,
      cliente: p.cliente_razon_social,
      cliente_documento: p.cliente_numero_documento,
      total_percibido: Number(p.total_percibido),
      total_cobrado: Number(p.total_cobrado),
      estado_sunat: p.estado_sunat,
      tiene_xml: !!p.sunat_xml_base64,
      tiene_cdr: !!p.sunat_cdr_base64,
    }));
  }

  async obtener(id: string, empresaId: string) {
    const percepcion = await this.percepcionRepository.findOne({
      where: { id, empresa_id: empresaId },
      relations: ['detalles'],
    });
    if (!percepcion) throw new BadRequestException('Percepción no encontrada');
    return {
      ...percepcion,
      comprobante: `${percepcion.serie}-${String(percepcion.correlativo).padStart(8, '0')}`,
    };
  }
}
