import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Retencion } from './entities/retencion.entity';
import { RetencionDetalle } from './entities/retencion-detalle.entity';
import { CreateRetencionDto } from './dto/create-retencion.dto';
import { Empresa } from '../empresas/entities/empresa.entity';
import { fechaActualLima } from '../common/utils/fecha.util';
import { JAVA_MOTOR_URL, cabecerasMotor } from '../common/motor-java.util';

@Injectable()
export class RetencionesService {
  constructor(
    @InjectRepository(Retencion)
    private readonly retencionRepository: Repository<Retencion>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    private readonly httpService: HttpService,
  ) {}

  async emitir(dto: CreateRetencionDto, empresaId: string) {
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    const regimen = dto.regimen || '01';
    const tasa = regimen === '02' ? 6 : 3;
    const fechaEmision = fechaActualLima();

    // Correlativo por empresa + serie
    const ultima = await this.retencionRepository.findOne({
      where: { empresa_id: empresaId, serie: dto.serie },
      order: { correlativo: 'DESC' },
    });
    const correlativo = (ultima?.correlativo || 0) + 1;

    // Calcular montos por ítem
    let totalRetenido = 0;
    let totalPagado = 0;
    const itemsPayload = dto.detalles.map((d, i) => {
      const importePagado = Number(d.importe_pagado);
      const montoRetenido = Math.round(importePagado * (tasa / 100) * 100) / 100;
      totalRetenido += montoRetenido;
      totalPagado += importePagado;
      return {
        numero: i + 1,
        tipoDocRelacionado: d.tipo_doc_relacionado || '01',
        numDocRelacionado: d.num_doc_relacionado,
        fechaDocRelacionado: d.fecha_doc,
        importeDocRelacionado: Number(d.importe_doc),
        monedaDocRelacionado: 'PEN',
        fechaPago: d.fecha_pago,
        numeroPago: d.num_doc_relacionado,
        importePagado,
        monedaPago: 'PEN',
        montoRetenido,
        monedaRetencion: 'PEN',
      };
    });
    totalRetenido = Math.round(totalRetenido * 100) / 100;
    totalPagado = Math.round(totalPagado * 100) / 100;

    const proveedorTipoDoc = dto.proveedor_numero_documento.length === 11 ? '6' : '1';

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
      regimenRetencion: regimen,
      tasaRetencion: tasa,
      observaciones: dto.observaciones || '',
      moneda: 'PEN',
      proveedorTipoDocumento: proveedorTipoDoc,
      proveedorNumeroDocumento: dto.proveedor_numero_documento,
      proveedorRazonSocial: dto.proveedor_razon_social,
      proveedorDireccion: dto.proveedor_direccion || '-',
      items: itemsPayload,
    };

    let sunatData: any = null;
    try {
      const resp = await firstValueFrom(
        this.httpService.post(`${JAVA_MOTOR_URL}/api/retenciones/emitir`, payloadJava, {
          headers: cabecerasMotor(),
          timeout: 30000,
        }),
      );
      sunatData = resp.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      throw new BadRequestException(`Error al emitir la retención en SUNAT: ${msg}`);
    }

    if (!sunatData?.success) {
      throw new BadRequestException(
        `SUNAT rechazó la retención: ${sunatData?.sunatDescription || sunatData?.message || 'Error desconocido'}`,
      );
    }

    // Guardar
    const retencion = this.retencionRepository.create({
      empresa_id: empresaId,
      serie: dto.serie,
      correlativo,
      fecha_emision: fechaEmision,
      regimen,
      tasa,
      proveedor_numero_documento: dto.proveedor_numero_documento,
      proveedor_razon_social: dto.proveedor_razon_social,
      moneda: 'PEN',
      total_retenido: totalRetenido,
      total_pagado: totalPagado,
      observaciones: dto.observaciones || null,
      estado_sunat: 'ACEPTADO',
      sunat_codigo: sunatData.sunatResponseCode || null,
      sunat_descripcion: sunatData.sunatDescription || null,
      sunat_hash: sunatData.hashCode || null,
      sunat_xml_base64: sunatData.xmlBase64 || null,
      sunat_cdr_base64: sunatData.cdrBase64 || null,
      nombre_archivo: sunatData.nombreArchivo || `${dto.serie}-${correlativo}`,
      detalles: dto.detalles.map((d) =>
        this.retencionRepository.manager.create(RetencionDetalle, {
          tipo_doc_relacionado: d.tipo_doc_relacionado || '01',
          num_doc_relacionado: d.num_doc_relacionado,
          fecha_doc: d.fecha_doc,
          importe_doc: Number(d.importe_doc),
          fecha_pago: d.fecha_pago,
          importe_pagado: Number(d.importe_pagado),
          monto_retenido: Math.round(Number(d.importe_pagado) * (tasa / 100) * 100) / 100,
        }),
      ),
    });

    const guardada = await this.retencionRepository.save(retencion);
    return {
      mensaje: 'Retención emitida y aceptada por SUNAT',
      retencion_id: guardada.id,
      comprobante: `${dto.serie}-${String(correlativo).padStart(8, '0')}`,
      total_retenido: totalRetenido,
    };
  }

  async listar(empresaId: string) {
    const retenciones = await this.retencionRepository.find({
      where: { empresa_id: empresaId },
      order: { created_at: 'DESC' },
    });
    return retenciones.map((r) => ({
      id: r.id,
      comprobante: `${r.serie}-${String(r.correlativo).padStart(8, '0')}`,
      fecha_emision: r.fecha_emision,
      proveedor: r.proveedor_razon_social,
      proveedor_documento: r.proveedor_numero_documento,
      total_retenido: Number(r.total_retenido),
      total_pagado: Number(r.total_pagado),
      estado_sunat: r.estado_sunat,
      tiene_xml: !!r.sunat_xml_base64,
      tiene_cdr: !!r.sunat_cdr_base64,
    }));
  }

  async obtener(id: string, empresaId: string) {
    const retencion = await this.retencionRepository.findOne({
      where: { id, empresa_id: empresaId },
      relations: ['detalles'],
    });
    if (!retencion) throw new BadRequestException('Retención no encontrada');
    return {
      ...retencion,
      comprobante: `${retencion.serie}-${String(retencion.correlativo).padStart(8, '0')}`,
    };
  }
}
