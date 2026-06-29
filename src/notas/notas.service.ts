// src/notas/notas.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateNotaDto } from './dto/create-nota.dto';
import { Nota } from './entities/nota.entity';
import { SerieComprobante } from '../ventas/entities/serie-comprobante.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Producto } from '../productos/entities/producto.entity';

interface ItemNota {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
}

@Injectable()
export class NotasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
  ) {}

  async crearNota(dto: CreateNotaDto, empresaId: string) {
    const {
      tipo_nota, serie, tipo_comprobante_afectado, comprobante_afectado,
      codigo_motivo, descripcion_motivo, cliente_numero_documento,
      cliente_razon_social, detalles,
    } = dto;

    if (!detalles || detalles.length === 0) {
      throw new BadRequestException('La nota debe tener al menos un ítem');
    }

    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    // Resolver productos
    const items: ItemNota[] = [];
    for (const d of detalles) {
      const producto = await this.productoRepository.findOne({
        where: { id: d.producto_id, empresa_id: empresaId },
      });
      if (!producto) throw new BadRequestException(`Producto no encontrado: ${d.producto_id}`);
      items.push({
        producto,
        cantidad: Number(d.cantidad),
        precioUnitario: Number(producto.precio_venta),
      });
    }

// Correlativo de la nota (su propia serie, por ambiente)
const ambienteActual = empresa.ambiente || 'beta';
const serieExistente = await this.dataSource.manager.findOne(SerieComprobante, {
  where: { 
    empresa_id: empresaId, 
    tipo_comprobante: tipo_nota, 
    serie,
    ambiente: ambienteActual,
  },
});
const correlativoTentativo = (serieExistente?.ultimo_correlativo || 0) + 1;

    // Totales
    let totalConIgv = 0;
    for (const it of items) totalConIgv += it.cantidad * it.precioUnitario;
    const totalGravadoSinIgv = totalConIgv / 1.18;
    const totalIgv = totalGravadoSinIgv * 0.18;
    const importeTotal = totalGravadoSinIgv + totalIgv;

    const ahora = new Date();
    const fechaActual = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    const horaActual = ahora.toTimeString().split(' ')[0];
    const tipoDocCliente = cliente_numero_documento.length === 11 ? '6' : '1';

    const payloadJava = {
      tipoNota: tipo_nota,
      tipoComprobanteAfectado: tipo_comprobante_afectado,
      comprobanteAfectado: comprobante_afectado,
      codigoMotivo: codigo_motivo,
      descripcionMotivo: descripcion_motivo,
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
      serie: serie,
      correlativo: correlativoTentativo,
      fechaEmision: fechaActual,
      horaEmision: horaActual,
      tipoOperacion: '0101',
      moneda: 'PEN',
      clienteTipoDocumento: tipoDocCliente,
      clienteNumeroDocumento: cliente_numero_documento,
      clienteRazonSocial: cliente_razon_social,
      clienteDireccion: 'AV. LIMA 456',
      items: items.map((it, index) => {
        const precioUnitario = it.precioUnitario;
        const valorUnitario = precioUnitario / 1.18;
        return {
          numero: index + 1,
          codigoProducto: it.producto.codigo_sunat || it.producto.id.substring(0, 8),
          unidadMedida: it.producto.unidad_medida || 'NIU',
          cantidad: it.cantidad,
          descripcion: it.producto.nombre,
          valorUnitario: Number(valorUnitario.toFixed(2)),
          precioUnitario: Number(precioUnitario.toFixed(2)),
          tipoPrecio: '01',
          tipoAfectacionIgv: it.producto.tipo_igv || '10',
          porcentajeIgv: 18.0,
          codigoTributo: '1000',
        };
      }),
    };

    console.log('=== PAYLOAD NOTA A JAVA ===');
    console.log(JSON.stringify(payloadJava, null, 2));

    // Enviar a Java
    let sunatData: any = null;
    let sunatAcepto = false;
    const motorJavaUrl = process.env.JAVA_MOTOR_URL || 'http://localhost:8089';
    try {
      const resp = await firstValueFrom(
        this.httpService.post(`${motorJavaUrl}/api/notas/emitir`, payloadJava),
      );
      sunatData = resp.data;
      sunatAcepto = sunatData?.success === true && sunatData?.sunatResponseCode === '0';
    } catch (error: any) {
      sunatData = error.response?.data || { message: error.message };
      sunatAcepto = false;
    }

// Si SUNAT RECHAZÓ, NO guardar nada y lanzar excepción
if (!sunatAcepto) {
  throw new BadRequestException({
    mensaje: 'SUNAT rechazó la nota. No se guardó nada, el correlativo no avanzó.',
    sunat_codigo: sunatData?.sunatResponseCode,
    sunat_descripcion: sunatData?.sunatDescription || sunatData?.message,
    correlativo_intentado: correlativoTentativo,
  });
}

const nombreArchivo = `${empresa.ruc}-${tipo_nota}-${serie}-${String(correlativoTentativo).padStart(8, '0')}`;

// SUNAT aceptó → guardar todo en transacción
const notaGuardada = await this.dataSource.transaction(async (manager) => {
  // Actualizar correlativo de la serie
const serieActual = await manager.findOne(SerieComprobante, {
  where: { 
    empresa_id: empresaId, 
    tipo_comprobante: tipo_nota, 
    serie,
    ambiente: ambienteActual,
  },
});
if (serieActual) {
  serieActual.ultimo_correlativo = correlativoTentativo;
  await manager.save(serieActual);
} else {
  await manager.save(
    manager.create(SerieComprobante, {
      empresa_id: empresaId,
      tipo_comprobante: tipo_nota,
      serie,
      ambiente: ambienteActual,
      ultimo_correlativo: correlativoTentativo,
    }),
  );
}

  // Guardar nota
  const nuevaNota = manager.create(Nota, {
    empresa_id: empresaId,
    tipo_nota,
    serie,
    correlativo: correlativoTentativo,
    tipo_comprobante_afectado,
    comprobante_afectado,
    codigo_motivo,
    descripcion_motivo,
    cliente_numero_documento,
    cliente_razon_social,
    total_gravado: Number(totalGravadoSinIgv.toFixed(2)),
    total_igv: Number(totalIgv.toFixed(2)),
    importe_total: Number(importeTotal.toFixed(2)),
    estado_sunat: 'ACEPTADO',
    sunat_codigo: sunatData?.sunatResponseCode || null,
    sunat_descripcion: sunatData?.sunatDescription || null,
    sunat_hash: sunatData?.hashCode || null,
    sunat_xml_base64: sunatData?.xmlBase64 || null,
    sunat_cdr_base64: sunatData?.cdrBase64 || null,
    nombre_archivo: nombreArchivo,
  });
  return await manager.save(nuevaNota);
});

return {
  mensaje: 'Nota emitida y aceptada por SUNAT',
  nota_id: notaGuardada.id,
  comprobante: `${serie}-${correlativoTentativo}`,
  estado: 'ACEPTADO',
  sunat_descripcion: sunatData.sunatDescription,
};
  }

  // Listar notas de la empresa
  async listarNotas(
    empresaId: string,
    filtros?: { tipo_nota?: string; estado?: string },
  ) {
    const query = this.dataSource
      .getRepository(Nota)
      .createQueryBuilder('nota')
      .where('nota.empresa_id = :empresaId', { empresaId });

    if (filtros?.tipo_nota) {
      query.andWhere('nota.tipo_nota = :tipo', { tipo: filtros.tipo_nota });
    }
    if (filtros?.estado) {
      query.andWhere('nota.estado_sunat = :estado', { estado: filtros.estado });
    }

    query.orderBy('nota.fecha_emision', 'DESC');
    const notas = await query.getMany();

    return notas.map((n) => ({
      id: n.id,
      comprobante: `${n.serie}-${String(n.correlativo).padStart(8, '0')}`,
      tipo_nota: n.tipo_nota,
      tipo_nombre: n.tipo_nota === '07' ? 'Nota de Crédito' : 'Nota de Débito',
      documento_afectado: n.comprobante_afectado,
      motivo: n.descripcion_motivo,
      cliente: n.cliente_razon_social,
      importe_total: Number(n.importe_total),
      estado_sunat: n.estado_sunat,
      fecha_emision: n.fecha_emision,
    }));
  }

  // Detalle de una nota
  async obtenerNota(notaId: string, empresaId: string) {
    const nota = await this.dataSource.manager.findOne(Nota, {
      where: { id: notaId, empresa_id: empresaId },
    });
    if (!nota) {
      throw new BadRequestException('Nota no encontrada');
    }

    return {
      id: nota.id,
      comprobante: `${nota.serie}-${String(nota.correlativo).padStart(8, '0')}`,
      tipo_nota: nota.tipo_nota,
      tipo_nombre: nota.tipo_nota === '07' ? 'Nota de Crédito' : 'Nota de Débito',
      documento_afectado: nota.comprobante_afectado,
      tipo_comprobante_afectado: nota.tipo_comprobante_afectado,
      codigo_motivo: nota.codigo_motivo,
      descripcion_motivo: nota.descripcion_motivo,
      cliente: {
        razon_social: nota.cliente_razon_social,
        numero_documento: nota.cliente_numero_documento,
      },
      totales: {
        gravado: Number(nota.total_gravado),
        igv: Number(nota.total_igv),
        total: Number(nota.importe_total),
      },
      estado_sunat: nota.estado_sunat,
      sunat_codigo: nota.sunat_codigo,
      sunat_descripcion: nota.sunat_descripcion,
      nombre_archivo: nota.nombre_archivo,
      fecha_emision: nota.fecha_emision,
      tiene_xml: !!nota.sunat_xml_base64,
      tiene_cdr: !!nota.sunat_cdr_base64,
    };
  }

async obtenerNotaParaPdf(notaId: string, empresaId: string) {
  const nota = await this.dataSource.manager.findOne(Nota, {
    where: { id: notaId, empresa_id: empresaId },
  });
  if (!nota) throw new BadRequestException('Nota no encontrada');

  const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
  if (!empresa) throw new BadRequestException('Empresa no encontrada');

  return { nota, empresa };
}
}