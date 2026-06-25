import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GuiaRemision } from './entities/guia-remision.entity';
import { GuiaRemisionDetalle } from './entities/guia-remision-detalle.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Transportista } from '../transportistas/entities/transportista.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { Conductor } from '../conductores/entities/conductor.entity';
import { SerieComprobante } from '../ventas/entities/serie-comprobante.entity';
import { CreateGuiaRemisionDto } from './dto/create-guia-remision.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

interface ContextoUsuario {
  usuario_id: string;
  usuario_email: string;
  usuario_rol: string;
  ip?: string;
  user_agent?: string;
}

@Injectable()
export class GuiasRemisionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
    private readonly auditoriaService: AuditoriaService,
    @InjectRepository(GuiaRemision)
    private readonly guiaRepository: Repository<GuiaRemision>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Transportista)
    private readonly transportistaRepository: Repository<Transportista>,
    @InjectRepository(Vehiculo)
    private readonly vehiculoRepository: Repository<Vehiculo>,
    @InjectRepository(Conductor)
    private readonly conductorRepository: Repository<Conductor>,
  ) {}

  async emitirGuia(
    dto: CreateGuiaRemisionDto,
    empresaId: string,
    contexto?: ContextoUsuario,
  ) {
    // ============================================================
    // PASO 0: Validar coherencia según modalidad
    // ============================================================
    if (dto.modalidad_transporte === '01') {
      // Pública → requiere transportista
      if (!dto.transportista_id) {
        throw new BadRequestException(
          'En modalidad PÚBLICA debes seleccionar un transportista',
        );
      }
    } else if (dto.modalidad_transporte === '02') {
      // Privada → requiere vehículo y conductor
      if (!dto.vehiculo_id && !dto.numero_placa) {
        throw new BadRequestException(
          'En modalidad PRIVADA debes indicar el vehículo o la placa',
        );
      }
      if (!dto.conductor_id) {
        throw new BadRequestException(
          'En modalidad PRIVADA debes seleccionar un conductor',
        );
      }
    }

    if (!dto.detalles || dto.detalles.length === 0) {
      throw new BadRequestException('La guía debe tener al menos un producto');
    }

    // ============================================================
    // PASO 1: Validar empresa
    // ============================================================
    const empresa = await this.empresaRepository.findOne({
      where: { id: empresaId },
    });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    // ============================================================
    // PASO 2: Resolver transportista (si modalidad pública)
    // ============================================================
    let transportistaData: Partial<Transportista> = {};
    if (dto.transportista_id) {
      const t = await this.transportistaRepository.findOne({
        where: { id: dto.transportista_id, empresa_id: empresaId, activo: true },
      });
      if (!t) throw new BadRequestException('Transportista no encontrado');
      transportistaData = t;
    }

    // ============================================================
    // PASO 3: Resolver vehículo
    // ============================================================
    let placa = dto.numero_placa || null;
    if (dto.vehiculo_id) {
      const v = await this.vehiculoRepository.findOne({
        where: { id: dto.vehiculo_id, empresa_id: empresaId, activo: true },
      });
      if (!v) throw new BadRequestException('Vehículo no encontrado');
      placa = v.placa;
    }

    // ============================================================
    // PASO 4: Resolver conductor (si modalidad privada)
    // ============================================================
    let conductorData: Partial<Conductor> = {};
    if (dto.conductor_id) {
      const c = await this.conductorRepository.findOne({
        where: { id: dto.conductor_id, empresa_id: empresaId, activo: true },
      });
      if (!c) throw new BadRequestException('Conductor no encontrado');
      conductorData = c;
    }

    // ============================================================
    // PASO 5: Resolver items (con productos si tienen producto_id)
    // ============================================================
    const itemsResueltos: {
      producto_id: string | null;
      codigo: string;
      descripcion: string;
      unidad_medida: string;
      cantidad: number;
      peso_unitario: number;
    }[] = [];
    for (const item of dto.detalles) {
      let codigo = item.codigo_producto || '';
      let descripcion = item.descripcion;
      let unidad = item.unidad_medida || 'NIU';
      let peso = item.peso_unitario || 0;

      if (item.producto_id) {
        const producto = await this.productoRepository.findOne({
          where: { id: item.producto_id, empresa_id: empresaId },
        });
        if (!producto) {
          throw new BadRequestException(`Producto no encontrado: ${item.producto_id}`);
        }
        codigo = producto.codigo_sunat || item.producto_id.substring(0, 8);
        descripcion = producto.nombre;
        unidad = producto.unidad_medida || 'NIU';
        peso = Number(producto.peso_unitario) || peso;
      }

      itemsResueltos.push({
        producto_id: item.producto_id || null,
        codigo,
        descripcion,
        unidad_medida: unidad,
        cantidad: Number(item.cantidad),
        peso_unitario: peso,
      });
    }

    // ============================================================
    // PASO 6: Obtener correlativo
    // ============================================================
    const serieExistente = await this.dataSource.manager.findOne(SerieComprobante, {
      where: {
        empresa_id: empresaId,
        tipo_comprobante: dto.tipo_guia,
        serie: dto.serie,
      },
    });
    const correlativo = (serieExistente?.ultimo_correlativo || 0) + 1;

    // ============================================================
    // PASO 7: Construir payload Java
    // ============================================================
    const nombreArchivo = `${empresa.ruc}-${dto.tipo_guia}-${dto.serie}-${String(correlativo).padStart(8, '0')}`;

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
        clientId: empresa.sunat_client_id || null,
        clientSecret: empresa.sunat_client_secret || null,
      },
      tipoGuia: dto.tipo_guia,
      serie: dto.serie.toUpperCase(),
      correlativo,
      fechaEmision: new Date().toISOString().split('T')[0],
      fechaInicioTraslado: dto.fecha_inicio_traslado,
      motivoTraslado: dto.motivo_traslado,
      descripcionMotivo: dto.descripcion_motivo,
      modalidadTransporte: dto.modalidad_transporte,
      pesoBrutoTotal: dto.peso_bruto_total,
      unidadPeso: dto.unidad_peso || 'KGM',
      destinatarioTipoDocumento: dto.destinatario_tipo_documento,
      destinatarioNumeroDocumento: dto.destinatario_numero_documento,
      destinatarioRazonSocial: dto.destinatario_razon_social,
      partidaUbigeo: dto.partida_ubigeo,
      partidaDireccion: dto.partida_direccion,
      llegadaUbigeo: dto.llegada_ubigeo,
      llegadaDireccion: dto.llegada_direccion,
      // Transportista
      transportistaTipoDocumento: transportistaData.tipo_documento || null,
      transportistaNumeroDocumento: transportistaData.numero_documento || null,
      transportistaRazonSocial: transportistaData.razon_social || null,
      // Vehículo
      numeroPlaca: placa,
      // Conductor
      conductorTipoDocumento: conductorData.tipo_documento || null,
      conductorNumeroDocumento: conductorData.numero_documento || null,
      conductorNombre: conductorData.nombres
        ? `${conductorData.nombres} ${conductorData.apellidos || ''}`.trim()
        : null,
      conductorLicencia: conductorData.licencia_conducir || null,
      // Documento relacionado
      docRelacionadoTipo: dto.doc_relacionado_tipo || null,
      docRelacionadoNumero: dto.doc_relacionado_numero || null,
      // Items
      items: itemsResueltos.map((it, i) => ({
        numero: i + 1,
        codigoProducto: it.codigo,
        descripcion: it.descripcion,
        unidadMedida: it.unidad_medida,
        cantidad: it.cantidad,
        pesoUnitario: it.peso_unitario,
      })),
    };

    console.log('=== PAYLOAD GUÍA ENVIADO A JAVA ===');
    console.log(JSON.stringify(payloadJava, null, 2));

    // ============================================================
    // PASO 8: Enviar a Java
    // ============================================================
    let sunatData: any = null;
    let sunatAcepto = false;
const motorJavaUrl = process.env.JAVA_MOTOR_URL || 'http://localhost:8089';

    try {
      const respuestaJava = await firstValueFrom(
        this.httpService.post(
          '${motorJavaUrl}/api/guias/emitir',
          payloadJava,
          { timeout: 60000 }, // las guías pueden tardar más (polling de ticket)
        ),
      );
      sunatData = respuestaJava.data;
      sunatAcepto = sunatData?.success === true;
      console.log('>>> Java respondió. Aceptó:', sunatAcepto);
    } catch (error: any) {
      sunatData = error.response?.data || { message: error.message };
      sunatAcepto = false;
      console.log('>>> Java falló o rechazó:', error.message);
    }

    // ============================================================
    // PASO 9: Guardar en BD
    // ============================================================
    const guiaGuardada = await this.dataSource.transaction(async (manager) => {
      // Si aceptó, avanzar correlativo
      if (sunatAcepto) {
        if (serieExistente) {
          serieExistente.ultimo_correlativo = correlativo;
          await manager.save(serieExistente);
        } else {
          await manager.save(
            manager.create(SerieComprobante, {
              empresa_id: empresaId,
              tipo_comprobante: dto.tipo_guia,
              serie: dto.serie.toUpperCase(),
              ultimo_correlativo: correlativo,
            }),
          );
        }
      }

      // Crear los detalles
      const detallesEntidades = itemsResueltos.map((item, i) =>
        manager.create(GuiaRemisionDetalle, {
          numero: i + 1,
          producto_id: item.producto_id,
          codigo_producto: item.codigo,
          descripcion: item.descripcion,
          unidad_medida: item.unidad_medida,
          cantidad: item.cantidad,
          peso_unitario: item.peso_unitario,
        }),
      );

      // Crear la guía
      const guia = manager.create(GuiaRemision, {
        empresa_id: empresaId,
        tipo_guia: dto.tipo_guia,
        serie: dto.serie.toUpperCase(),
        correlativo,
        fecha_inicio_traslado: new Date(dto.fecha_inicio_traslado),
        venta_id: dto.venta_id || null,
        doc_relacionado_tipo: dto.doc_relacionado_tipo || null,
        doc_relacionado_numero: dto.doc_relacionado_numero || null,
        motivo_traslado: dto.motivo_traslado,
        descripcion_motivo: dto.descripcion_motivo,
        modalidad_transporte: dto.modalidad_transporte,
        peso_bruto_total: dto.peso_bruto_total,
        unidad_peso: dto.unidad_peso || 'KGM',
        destinatario_tipo_documento: dto.destinatario_tipo_documento,
        destinatario_numero_documento: dto.destinatario_numero_documento,
        destinatario_razon_social: dto.destinatario_razon_social,
        partida_ubigeo: dto.partida_ubigeo,
        partida_direccion: dto.partida_direccion,
        llegada_ubigeo: dto.llegada_ubigeo,
        llegada_direccion: dto.llegada_direccion,
        transportista_id: dto.transportista_id || null,
        transportista_tipo_documento: transportistaData.tipo_documento || null,
        transportista_numero_documento: transportistaData.numero_documento || null,
        transportista_razon_social: transportistaData.razon_social || null,
        vehiculo_id: dto.vehiculo_id || null,
        numero_placa: placa,
        conductor_id: dto.conductor_id || null,
        conductor_tipo_documento: conductorData.tipo_documento || null,
        conductor_numero_documento: conductorData.numero_documento || null,
        conductor_nombre: conductorData.nombres
          ? `${conductorData.nombres} ${conductorData.apellidos || ''}`.trim()
          : null,
        conductor_licencia: conductorData.licencia_conducir || null,
        estado_sunat: sunatAcepto ? 'ACEPTADO' : 'RECHAZADO',
        sunat_codigo: sunatData?.sunatResponseCode || null,
        sunat_descripcion: sunatData?.sunatDescription || sunatData?.message || null,
        sunat_hash: sunatData?.hashCode || null,
        sunat_xml_base64: sunatData?.xmlBase64 || null,
        sunat_cdr_base64: sunatData?.cdrBase64 || null,
        nombre_archivo: nombreArchivo,
        observaciones: dto.observaciones || null,
        detalles: detallesEntidades,
      });

      return await manager.save(guia);
    });

    // ============================================================
    // PASO 10: Auditoría
    // ============================================================
    if (contexto) {
      await this.auditoriaService.registrar({
        empresa_id: empresaId,
        usuario_id: contexto.usuario_id,
        usuario_email: contexto.usuario_email,
        usuario_rol: contexto.usuario_rol,
        accion: 'EMITIR_GUIA',
        recurso: 'guia_remision',
        recurso_id: guiaGuardada.id,
        datos_despues: {
          guia: `${dto.serie}-${correlativo}`,
          destinatario: dto.destinatario_razon_social,
          modalidad: dto.modalidad_transporte === '01' ? 'PÚBLICA' : 'PRIVADA',
          estado: sunatAcepto ? 'ACEPTADO' : 'RECHAZADO',
        },
        ip: contexto.ip,
        user_agent: contexto.user_agent,
      });
    }

    // ============================================================
    // PASO 11: Respuesta
    // ============================================================
    if (sunatAcepto) {
      return {
        mensaje: 'Guía de remisión emitida y aceptada por SUNAT',
        guia_id: guiaGuardada.id,
        guia: `${dto.serie}-${correlativo}`,
        estado: 'ACEPTADO',
        sunat_descripcion: sunatData?.sunatDescription,
      };
    } else {
      return {
        mensaje: 'Guía rechazada por SUNAT. Puede corregir y reintentar.',
        guia_id: guiaGuardada.id,
        guia: `${dto.serie}-${correlativo}`,
        estado: 'RECHAZADO',
        error_sunat: sunatData?.sunatDescription || sunatData?.message,
      };
    }
  }

  // ============================================================
  // LISTAR
  // ============================================================
  async listar(
    empresaId: string,
    filtros?: { estado?: string; desde?: string; hasta?: string },
  ) {
    const query = this.guiaRepository
      .createQueryBuilder('g')
      .where('g.empresa_id = :empresaId', { empresaId });

    if (filtros?.estado) {
      query.andWhere('g.estado_sunat = :estado', { estado: filtros.estado });
    }
    if (filtros?.desde) {
      query.andWhere('g.fecha_emision >= :desde', { desde: filtros.desde });
    }
    if (filtros?.hasta) {
      query.andWhere('g.fecha_emision <= :hasta', {
        hasta: filtros.hasta + ' 23:59:59',
      });
    }

    query.orderBy('g.fecha_emision', 'DESC');
    const guias = await query.getMany();

    return guias.map((g) => ({
      id: g.id,
      guia: `${g.serie}-${String(g.correlativo).padStart(8, '0')}`,
      tipo_guia: g.tipo_guia,
      tipo_nombre: g.tipo_guia === '09' ? 'GRR' : 'GRT',
      destinatario: g.destinatario_razon_social,
      modalidad: g.modalidad_transporte === '01' ? 'Pública' : 'Privada',
      peso_total: Number(g.peso_bruto_total),
      estado_sunat: g.estado_sunat,
      fecha_emision: g.fecha_emision,
      fecha_inicio_traslado: g.fecha_inicio_traslado,
    }));
  }

  // ============================================================
  // OBTENER DETALLE COMPLETO
  // ============================================================
  async obtener(id: string, empresaId: string) {
    const guia = await this.guiaRepository.findOne({
      where: { id, empresa_id: empresaId },
      relations: ['detalles'],
    });
    if (!guia) throw new BadRequestException('Guía no encontrada');

    return {
      ...guia,
      guia: `${guia.serie}-${String(guia.correlativo).padStart(8, '0')}`,
      tiene_xml: !!guia.sunat_xml_base64,
      tiene_cdr: !!guia.sunat_cdr_base64,
    };
  }

  // Para generar el PDF: devuelve guía + empresa
async obtenerParaPdf(id: string, empresaId: string) {
  const guia = await this.guiaRepository.findOne({
    where: { id, empresa_id: empresaId },
    relations: ['detalles'],
  });
  if (!guia) {
    throw new BadRequestException('Guía no encontrada');
  }

  const empresa = await this.empresaRepository.findOne({
    where: { id: empresaId },
  });
  if (!empresa) {
    throw new BadRequestException('Empresa no encontrada');
  }

  return { guia, empresa };
}

// Devuelve la entidad cruda con los base64 (para descarga de XML/CDR)
async obtenerGuiaCompleta(id: string, empresaId: string) {
  const guia = await this.guiaRepository.findOne({
    where: { id, empresa_id: empresaId },
  });
  if (!guia) {
    throw new BadRequestException('Guía no encontrada');
  }
  return guia;
}

// Anular guía (solo interna por ahora)
// Las guías SUNAT no permiten anulación retroactiva, solo "marcar como anulada"
async anularGuia(id: string, empresaId: string, contexto?: ContextoUsuario) {
  const guia = await this.guiaRepository.findOne({
    where: { id, empresa_id: empresaId },
  });

  if (!guia) {
    throw new BadRequestException('Guía no encontrada');
  }

  if (guia.estado_sunat === 'ANULADA') {
    throw new BadRequestException('Esta guía ya está anulada');
  }

  if (guia.estado_sunat !== 'ACEPTADO' && guia.estado_sunat !== 'RECHAZADO') {
    throw new BadRequestException(
      'Solo se pueden anular guías aceptadas o rechazadas',
    );
  }

  // Marcar como anulada
  guia.estado_sunat = 'ANULADA';
  await this.guiaRepository.save(guia);

  // Registrar en auditoría
  if (contexto) {
    await this.auditoriaService.registrar({
      empresa_id: empresaId,
      usuario_id: contexto.usuario_id,
      usuario_email: contexto.usuario_email,
      usuario_rol: contexto.usuario_rol,
      accion: 'ANULAR_GUIA',
      recurso: 'guia_remision',
      recurso_id: guia.id,
      datos_despues: {
        guia: `${guia.serie}-${guia.correlativo}`,
        destinatario: guia.destinatario_razon_social,
      },
      ip: contexto.ip,
      user_agent: contexto.user_agent,
    });
  }

  return {
    mensaje: 'Guía anulada correctamente',
    guia_id: guia.id,
  };
}
}