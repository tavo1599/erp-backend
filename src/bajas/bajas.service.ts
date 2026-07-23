// src/bajas/bajas.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateBajaDto } from './dto/create-baja.dto';
import { Baja } from './entities/baja.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { fechaActualLima } from '../common/utils/fecha.util';
import { cabecerasMotor } from '../common/motor-java.util';

@Injectable()
export class BajasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    @InjectRepository(Baja)
    private readonly bajaRepository: Repository<Baja>,
  ) {}

  // PASO 1: Enviar la comunicación de baja (recibe ticket)
async enviarBaja(dto: CreateBajaDto, empresaId: string) {
  const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
  if (!empresa) throw new BadRequestException('Empresa no encontrada');

  // VALIDACIÓN: si ya hay una baja ACEPTADA o PENDIENTE para este documento, bloquear
  const bajaExistente = await this.bajaRepository.findOne({
    where: {
      empresa_id: empresaId,
      tipo_documento: dto.tipo_documento,
      serie_documento: dto.serie_documento,
      correlativo_documento: dto.correlativo_documento,
    },
    order: { fecha_creacion: 'DESC' },
  });

  if (bajaExistente && bajaExistente.estado === 'ACEPTADO') {
    throw new BadRequestException(
      `El comprobante ${dto.serie_documento}-${dto.correlativo_documento} ya fue dado de baja exitosamente.`,
    );
  }

  if (bajaExistente && bajaExistente.estado === 'PENDIENTE') {
    throw new BadRequestException(
      `Ya hay una baja PENDIENTE para este comprobante. Consulta el estado del ticket ${bajaExistente.ticket} antes de reintentar.`,
    );
  }

  // Si hay una baja RECHAZADA anterior, la borramos para no duplicar
  if (bajaExistente && bajaExistente.estado === 'RECHAZADO') {
    await this.bajaRepository.delete({ id: bajaExistente.id });
  }

  // Correlativo de la baja del día
const hoy = fechaActualLima();
  const bajasHoy = await this.bajaRepository
    .createQueryBuilder('baja')
    .where('baja.empresa_id = :empresaId', { empresaId })
    .andWhere('DATE(baja.fecha_creacion) = :hoy', { hoy })
    .getCount();
  const correlativoBaja = bajasHoy + 1;

  const fechaActual = hoy;

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
    fechaGeneracion: fechaActual,
    fechaBajaDocs: dto.fecha_emision_documento,
    correlativo: correlativoBaja,
    items: [
      {
        numero: 1,
        tipoDocumento: dto.tipo_documento,
        serie: dto.serie_documento,
        correlativo: dto.correlativo_documento,
        motivo: dto.motivo,
      },
    ],
  };

  console.log('=== PAYLOAD BAJA A JAVA ===');
  console.log(JSON.stringify(payloadJava, null, 2));

  let sunatData: any = null;
  let ticket: string | null = null;
  const motorJavaUrl = process.env.JAVA_MOTOR_URL || 'http://localhost:8089';
  try {
    const resp = await firstValueFrom(
      this.httpService.post(`${motorJavaUrl}/api/bajas/enviar`, payloadJava, {
        headers: cabecerasMotor(),
      }),
    );
    sunatData = resp.data;
    ticket = sunatData?.ticket || null;
  } catch (error: any) {
    sunatData = error.response?.data || { message: error.message };
  }

  // Si SUNAT no devolvió ticket, es rechazo inmediato → NO guardar
  if (!ticket) {
    throw new BadRequestException({
      mensaje: 'SUNAT rechazó la comunicación de baja. No se guardó nada.',
      sunat_descripcion: sunatData?.message || sunatData?.sunatDescription,
      detalle: 'El correlativo del día no avanzó.',
    });
  }

  const identificador = `RA-${fechaActual.replace(/-/g, '')}-${correlativoBaja}`;
  const nombreArchivo = `${empresa.ruc}-${identificador}`;

  // SUNAT dio TICKET → guardar baja como PENDIENTE
  const baja = this.bajaRepository.create({
    empresa_id: empresaId,
    identificador,
    correlativo: correlativoBaja,
    tipo_documento: dto.tipo_documento,
    serie_documento: dto.serie_documento,
    correlativo_documento: dto.correlativo_documento,
    motivo: dto.motivo,
    ticket,
    estado: 'PENDIENTE',
    sunat_descripcion: sunatData?.message || sunatData?.sunatDescription || null,
    nombre_archivo: nombreArchivo,
  });
  const bajaGuardada = await this.bajaRepository.save(baja);

  return {
    mensaje: 'Comunicación de baja enviada. Use el ticket para consultar el estado.',
    baja_id: bajaGuardada.id,
    identificador,
    ticket,
    estado: 'PENDIENTE',
    nota: 'Espere unos segundos y consulte el estado.',
  };
}

  // PASO 2: Consultar el estado de la baja (con el ticket)
  async consultarEstado(bajaId: string, empresaId: string) {
    const baja = await this.bajaRepository.findOne({
      where: { id: bajaId, empresa_id: empresaId },
    });
    if (!baja) throw new BadRequestException('Baja no encontrada');
    if (!baja.ticket) throw new BadRequestException('Esta baja no tiene ticket para consultar');

    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    const empresaPayload = {
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
    };

    let sunatData: any = null;
    const motorJavaUrl = process.env.JAVA_MOTOR_URL || 'http://localhost:8089';
    try {
      // El ticket va como query param, la empresa en el body
      const resp = await firstValueFrom(
        this.httpService.post(
          `${motorJavaUrl}/api/bajas/estado?ticket=${baja.ticket}`,
          empresaPayload,
          { timeout: 20000, headers: cabecerasMotor() }, // 20 segundos
        ),
      );
      sunatData = resp.data;
    } catch (error: any) {
      sunatData = error.response?.data || { message: error.message };
    }

    const codigo = sunatData?.sunatResponseCode;
    const aceptado = codigo === '0';
    const enProceso = codigo === '98' || !codigo;

    // Actualizar el estado de la baja
    if (!enProceso) {
      baja.estado = aceptado ? 'ACEPTADO' : 'RECHAZADO';
      baja.sunat_codigo = codigo || null;
      baja.sunat_descripcion = sunatData?.sunatDescription || sunatData?.message || null;
      baja.sunat_cdr_base64 = sunatData?.cdrBase64 || null;
      await this.bajaRepository.save(baja);
    }

    return {
      baja_id: baja.id,
      identificador: baja.identificador,
      ticket: baja.ticket,
      estado: enProceso ? 'EN_PROCESO' : baja.estado,
      sunat_codigo: codigo,
      sunat_descripcion: sunatData?.sunatDescription || sunatData?.message,
      nota: enProceso ? 'SUNAT aún procesa la baja. Consulte de nuevo en unos segundos.' : undefined,
    };
  }

  // Listar bajas de la empresa
  async listarBajas(empresaId: string) {
    const bajas = await this.bajaRepository.find({
      where: { empresa_id: empresaId },
      order: { fecha_creacion: 'DESC' },
    });

    return bajas.map((b) => ({
      id: b.id,
      identificador: b.identificador,
      documento_anulado: `${b.serie_documento}-${String(b.correlativo_documento).padStart(8, '0')}`,
      tipo_documento: b.tipo_documento,
      motivo: b.motivo,
      ticket: b.ticket,
      estado: b.estado,
      sunat_descripcion: b.sunat_descripcion,
      fecha_creacion: b.fecha_creacion,
    }));
  }

  // Detalle de una baja
  async obtenerBaja(bajaId: string, empresaId: string) {
    const baja = await this.bajaRepository.findOne({
      where: { id: bajaId, empresa_id: empresaId },
    });
    if (!baja) {
      throw new BadRequestException('Baja no encontrada');
    }
    return {
      id: baja.id,
      identificador: baja.identificador,
      documento_anulado: `${baja.serie_documento}-${String(baja.correlativo_documento).padStart(8, '0')}`,
      tipo_documento: baja.tipo_documento,
      serie_documento: baja.serie_documento,
      correlativo_documento: baja.correlativo_documento,
      motivo: baja.motivo,
      ticket: baja.ticket,
      estado: baja.estado,
      sunat_codigo: baja.sunat_codigo,
      sunat_descripcion: baja.sunat_descripcion,
      nombre_archivo: baja.nombre_archivo,
      fecha_creacion: baja.fecha_creacion,
      tiene_cdr: !!baja.sunat_cdr_base64,
    };
  }
}