import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateVentaDto } from './dto/create-venta.dto';
import { Venta } from './entities/venta.entity';
import { VentaDetalle } from './entities/venta-detalle.entity';
import { SerieComprobante } from './entities/serie-comprobante.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Producto } from '../productos/entities/producto.entity';
import { KardexService } from '../kardex/kardex.service';
import { Cliente } from '../clientes/entities/cliente.entity';
import { FinanzasService } from '../finanzas/finanzas.service';
import { BajasService } from '../bajas/bajas.service';
import { VentaPago } from './entities/venta-pago.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { fechaActualLima, horaActualLima } from '../common/utils/fecha.util';

interface ItemResuelto {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  precioConDescuento: number;
  descuentoLineaPct: number;
}

interface ContextoUsuario {
  usuario_id: string;
  usuario_email: string;
  usuario_rol: string;
  ip?: string;
  user_agent?: string;
}

@Injectable()
export class VentasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly kardexService: KardexService,
    private readonly httpService: HttpService,
    private readonly finanzasService: FinanzasService,
    private readonly bajasService: BajasService,
    private readonly auditoriaService: AuditoriaService,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
  ) {}

  async crearVentaInterna(
    createVentaDto: CreateVentaDto,
    empresaId: string,
    contexto?: ContextoUsuario,
  ) {
    const { cliente_id, tipo_comprobante, serie, detalles } = createVentaDto;
    const condicionPago = createVentaDto.condicion_pago || 'CONTADO';
    const diasCredito = createVentaDto.dias_credito || 0;

    // Resolver datos del cliente
    let cliente_numero_documento: string;
    let cliente_razon_social: string;

    if (cliente_id) {
      const cliente = await this.clienteRepository.findOne({
        where: { id: cliente_id, empresa_id: empresaId },
      });
      if (!cliente) throw new BadRequestException('Cliente no encontrado');
      cliente_numero_documento = cliente.numero_documento;
      cliente_razon_social = cliente.razon_social;
    } else {
      if (!createVentaDto.cliente_numero_documento || !createVentaDto.cliente_razon_social) {
        throw new BadRequestException(
          'Debe enviar un cliente_id o los datos del cliente (numero_documento y razon_social)',
        );
      }
      cliente_numero_documento = createVentaDto.cliente_numero_documento;
      cliente_razon_social = createVentaDto.cliente_razon_social;
    }

    if (!detalles || detalles.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un producto');
    }

    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    // ============================================================
    // PASO 0: Resolver productos + validar stock + descuentos
    // ============================================================
    const itemsResueltos: ItemResuelto[] = [];

    for (const detalle of detalles) {
      const producto = await this.productoRepository.findOne({
        where: { id: detalle.producto_id, empresa_id: empresaId },
      });

      if (!producto) {
        throw new BadRequestException(
          `Producto no encontrado o no pertenece a esta empresa: ${detalle.producto_id}`,
        );
      }
      if (!producto.estado) {
        throw new BadRequestException(`El producto "${producto.nombre}" está inactivo`);
      }
      if (Number(producto.stock_actual) < Number(detalle.cantidad)) {
        throw new BadRequestException(
          `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock_actual}, solicitado: ${detalle.cantidad}`,
        );
      }

      const descuentoLineaPct = Number(detalle.descuento_porcentaje || 0);
      if (descuentoLineaPct < 0 || descuentoLineaPct > 100) {
        throw new BadRequestException(
          `Descuento inválido para "${producto.nombre}": debe estar entre 0 y 100`,
        );
      }

      const precioOriginal = Number(producto.precio_venta);
      const precioConDescuento = precioOriginal * (1 - descuentoLineaPct / 100);

      itemsResueltos.push({
        producto,
        cantidad: Number(detalle.cantidad),
        precioUnitario: precioOriginal,
        precioConDescuento,
        descuentoLineaPct,
      });
    }

// ============================================================
// PASO 1: Leer correlativo actual (separado por ambiente)
// ============================================================
const ambienteActual = empresa.ambiente || 'beta';
const serieExistente = await this.dataSource.manager.findOne(SerieComprobante, {
  where: { 
    empresa_id: empresaId, 
    tipo_comprobante, 
    serie,
    ambiente: ambienteActual,
  },
});
const correlativoTentativo = (serieExistente?.ultimo_correlativo || 0) + 1;

    // ============================================================
    // PASO 2: Calcular totales separados por tipo de IGV
    // ============================================================
    let totalGravadoSinIgv = 0;
    let totalExonerado = 0;
    let totalInafecto = 0;
    let subtotalSinDescuentos = 0;

    for (const item of itemsResueltos) {
      const tipoIgv = item.producto.tipo_igv || '10';
      const precioConDescuentoLinea = item.precioConDescuento;
      const totalLineaConPrecio = precioConDescuentoLinea * item.cantidad;

      subtotalSinDescuentos += item.precioUnitario * item.cantidad;

      if (tipoIgv === '10') {
        totalGravadoSinIgv += totalLineaConPrecio / 1.18;
      } else if (tipoIgv === '20') {
        totalExonerado += totalLineaConPrecio;
      } else if (tipoIgv === '30') {
        totalInafecto += totalLineaConPrecio;
      } else if (tipoIgv === '40') {
        totalGravadoSinIgv += totalLineaConPrecio;
      }
    }

    const descuentoGlobalPct = Number(createVentaDto.descuento_global_porcentaje || 0);
    if (descuentoGlobalPct < 0 || descuentoGlobalPct > 100) {
      throw new BadRequestException('El descuento global debe estar entre 0 y 100');
    }
    const factor = 1 - descuentoGlobalPct / 100;
    totalGravadoSinIgv = totalGravadoSinIgv * factor;
    totalExonerado = totalExonerado * factor;
    totalInafecto = totalInafecto * factor;

    const totalIgv = totalGravadoSinIgv * 0.18;
    const importeTotal = totalGravadoSinIgv + totalIgv + totalExonerado + totalInafecto;

const fechaActual = fechaActualLima();
const horaActual = horaActualLima();

    const tipoDocCliente = cliente_numero_documento.length === 11 ? '6' : '1';

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
      tipoComprobante: tipo_comprobante,
      serie: serie,
      correlativo: correlativoTentativo,
      fechaEmision: fechaActual,
      horaEmision: horaActual,
      tipoOperacion: '0101',
      moneda: 'PEN',
      formaPago: 'Contado',
      clienteTipoDocumento: tipoDocCliente,
      clienteNumeroDocumento: cliente_numero_documento,
      clienteRazonSocial: cliente_razon_social,
      clienteDireccion: 'AV. LIMA 456',
      totalGravado: Number(totalGravadoSinIgv.toFixed(2)),
      totalExonerado: Number(totalExonerado.toFixed(2)),
      totalInafecto: Number(totalInafecto.toFixed(2)),
      totalIgv: Number(totalIgv.toFixed(2)),
      importeTotal: Number(importeTotal.toFixed(2)),
      items: itemsResueltos.map((item, index) => {
        const tipoIgv = item.producto.tipo_igv || '10';
        const esGravado = tipoIgv === '10';
        const precioUnitario = item.precioConDescuento;
        const valorUnitario = esGravado ? precioUnitario / 1.18 : precioUnitario;
        const valorUnitarioFinal = valorUnitario * factor;
        const precioUnitarioFinal = esGravado ? valorUnitarioFinal * 1.18 : valorUnitarioFinal;
        const unidadFinal =
          item.producto.tipo_bien_servicio === 'SERVICIO'
            ? 'ZZ'
            : item.producto.unidad_medida || 'NIU';
        let codigoTributo = '1000';
        if (tipoIgv === '20') codigoTributo = '9997';
        else if (tipoIgv === '30') codigoTributo = '9998';
        else if (tipoIgv === '40') codigoTributo = '9995';

        return {
          numero: index + 1,
          codigoProducto: item.producto.codigo_sunat || item.producto.id.substring(0, 8),
          unidadMedida: unidadFinal,
          cantidad: item.cantidad,
          descripcion: item.producto.nombre,
          valorUnitario: Number(valorUnitarioFinal.toFixed(2)),
          precioUnitario: Number(precioUnitarioFinal.toFixed(2)),
          tipoPrecio: '01',
          tipoAfectacionIgv: tipoIgv,
          porcentajeIgv: esGravado ? 18.0 : 0.0,
          codigoTributo,
        };
      }),
    };

    console.log('=== PAYLOAD ENVIADO A JAVA ===');
    console.log(JSON.stringify(payloadJava, null, 2));
    console.log('==============================');

    // ============================================================
    // PASO 3: Enviar a SUNAT (vía Java)
    // ============================================================
    console.log('>>> Llamando a Java...');
    let sunatData: any = null;
    let sunatAcepto = false;

    try {
      const motorJavaUrl = process.env.JAVA_MOTOR_URL || 'http://localhost:8089';
const respuestaJava = await firstValueFrom(
  this.httpService.post(`${motorJavaUrl}/api/comprobantes/emitir`, payloadJava),
);
      sunatData = respuestaJava.data;
      sunatAcepto = sunatData?.success === true && sunatData?.sunatResponseCode === '0';
      console.log('>>> Java respondió. Aceptó:', sunatAcepto);
    } catch (error: any) {
      sunatData = error.response?.data || { message: error.message };
      sunatAcepto = false;
      console.log('>>> Java falló o rechazó:', error.message);
    }

    // ============================================================
    // PASO 4: Guardar TODO en UNA SOLA transacción
    // ============================================================
    if (!sunatAcepto) {
  // Auditoría del rechazo (opcional, sin guardar la venta)
  if (contexto) {
    await this.auditoriaService.registrar({
      empresa_id: empresaId,
      usuario_id: contexto.usuario_id,
      usuario_email: contexto.usuario_email,
      usuario_rol: contexto.usuario_rol,
      accion: 'EMITIR_VENTA_RECHAZADA',
      recurso: 'venta',
      datos_despues: {
        comprobante_intento: `${serie}-${correlativoTentativo}`,
        cliente: cliente_razon_social,
        error_sunat: sunatData?.sunatDescription || sunatData?.message,
      },
      ip: contexto.ip,
      user_agent: contexto.user_agent,
    });
  }
  
  throw new BadRequestException({
    mensaje: 'SUNAT rechazó el comprobante. No se guardó nada, el correlativo no avanzó.',
    sunat_codigo: sunatData?.sunatResponseCode,
    sunat_descripcion: sunatData?.sunatDescription || sunatData?.message,
    correlativo_intentado: correlativoTentativo,
  });
}

const nombreArchivo = `${empresa.ruc}-${tipo_comprobante}-${serie}-${String(correlativoTentativo).padStart(8, '0')}`;

console.log('>>> Guardando en BD...');
const ventaGuardada = await this.dataSource.transaction(async (manager) => {
  // Actualizar correlativo de la serie
const serieActual = await manager.findOne(SerieComprobante, {
  where: { 
    empresa_id: empresaId, 
    tipo_comprobante, 
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
      tipo_comprobante,
      serie,
      ambiente: ambienteActual,
      ultimo_correlativo: correlativoTentativo,
    }),
  );
}

  // Descontar stock
  for (const item of itemsResueltos) {
    await this.kardexService.registrarMovimiento(
      {
        producto_id: item.producto.id,
        empresa_id: empresaId,
        tipo_movimiento: 'SALIDA_VENTA',
        cantidad: item.cantidad,
        referencia_documento: `${serie}-${correlativoTentativo}`,
      },
      manager,
    );
  }

  // Crear detalles
  const itemsDetalle = itemsResueltos.map((item) =>
    manager.create(VentaDetalle, {
      producto_id: item.producto.id,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      subtotal: item.cantidad * item.precioUnitario,
    }),
  );

  // Fecha vencimiento si es crédito
  let fechaVencimiento: Date | null = null;
  if (condicionPago === 'CREDITO' && diasCredito > 0) {
    fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito);
  }

  // Crear venta con estado ACEPTADO (siempre)
  const nuevaVenta = manager.create(Venta, {
    empresa_id: empresaId,
    cliente_numero_documento,
    cliente_razon_social,
    tipo_comprobante,
    serie,
    correlativo: correlativoTentativo,
    total_gravado: Number(totalGravadoSinIgv.toFixed(2)),
    total_exonerado: Number(totalExonerado.toFixed(2)),
    total_inafecto: Number(totalInafecto.toFixed(2)),
    total_igv: Number(totalIgv.toFixed(2)),
    importe_total: Number(importeTotal.toFixed(2)),
    estado_sunat: 'ACEPTADO',
    sunat_codigo: sunatData?.sunatResponseCode || null,
    sunat_descripcion: sunatData?.sunatDescription || null,
    sunat_hash: sunatData?.hashCode || null,
    sunat_xml_base64: sunatData?.xmlBase64 || null,
    sunat_cdr_base64: sunatData?.cdrBase64 || null,
    nombre_archivo: nombreArchivo,
    condicion_pago: condicionPago,
    estado_pago: condicionPago === 'CONTADO' ? 'PAGADO' : 'PENDIENTE',
    fecha_vencimiento: fechaVencimiento,
    detalles: itemsDetalle,
  });

  const ventaGuardadaTx = await manager.save(nuevaVenta);

  // Pagos múltiples
  if (createVentaDto.pagos && createVentaDto.pagos.length > 0) {
    const sumaPagos = createVentaDto.pagos.reduce((s, p) => s + Number(p.monto), 0);

    if (sumaPagos < importeTotal - 0.01) {
      throw new BadRequestException(
        `La suma de pagos (${sumaPagos.toFixed(2)}) no cubre el total (${importeTotal.toFixed(2)})`,
      );
    }

    if (sumaPagos > importeTotal + 0.01) {
      const tieneEfectivo = createVentaDto.pagos.some((p) => p.metodo === 'EFECTIVO');
      if (!tieneEfectivo) {
        throw new BadRequestException(
          'Solo se permite vuelto cuando uno de los pagos es en efectivo',
        );
      }
    }

    for (const pago of createVentaDto.pagos) {
      await manager.save(
        manager.create(VentaPago, {
          venta_id: ventaGuardadaTx.id,
          metodo: pago.metodo,
          monto: Number(pago.monto),
          referencia: pago.referencia ?? undefined,
        } as any),
      );
    }
  }

  // Finanzas
  const comprobante = `${serie}-${String(correlativoTentativo).padStart(8, '0')}`;
  const montoTotal = Number(importeTotal.toFixed(2));

  if (condicionPago === 'CONTADO') {
    await this.finanzasService.registrarCaja(
      {
        empresa_id: empresaId,
        tipo: 'INGRESO',
        concepto: `Venta al contado ${comprobante}`,
        monto: montoTotal,
        referencia: comprobante,
        metodo_pago: 'EFECTIVO',
      },
      manager,
    );
  } else {
    await this.finanzasService.crearCuentaPorCobrar(
      {
        empresa_id: empresaId,
        venta_id: ventaGuardadaTx.id,
        cliente_documento: cliente_numero_documento,
        cliente_razon_social,
        comprobante,
        monto_total: montoTotal,
        fecha_vencimiento: fechaVencimiento,
      },
      manager,
    );
  }

  return ventaGuardadaTx;
});
console.log('>>> Venta guardada OK');

// ============================================================
// AUDITORÍA (FUERA de la transacción)
// ============================================================
if (contexto) {
  await this.auditoriaService.registrar({
    empresa_id: empresaId,
    usuario_id: contexto.usuario_id,
    usuario_email: contexto.usuario_email,
    usuario_rol: contexto.usuario_rol,
    accion: 'EMITIR_VENTA',
    recurso: 'venta',
    recurso_id: ventaGuardada.id,
    datos_despues: {
      comprobante: `${serie}-${correlativoTentativo}`,
      importe_total: importeTotal,
      cliente: cliente_razon_social,
      estado: 'ACEPTADO',
    },
    ip: contexto.ip,
    user_agent: contexto.user_agent,
  });
}

    // ============================================================
    // PASO 5: Respuesta al frontend
    // ============================================================
    if (sunatAcepto) {
      return {
        mensaje: 'Venta registrada y aceptada por SUNAT',
        venta_id: ventaGuardada.id,
        comprobante: `${serie}-${correlativoTentativo}`,
        estado: 'ACEPTADO',
        sunat_descripcion: sunatData.sunatDescription,
      };
    } else {
      return {
  mensaje: 'Venta registrada y aceptada por SUNAT',
  venta_id: ventaGuardada.id,
  comprobante: `${serie}-${correlativoTentativo}`,
  estado: 'ACEPTADO',
  sunat_descripcion: sunatData.sunatDescription,
};
    }
  }

  // Obtener una venta con todos sus datos para el PDF
  async obtenerVentaParaPdf(ventaId: string, empresaId: string) {
    const venta = await this.dataSource.manager.findOne(Venta, {
      where: { id: ventaId, empresa_id: empresaId },
      relations: ['detalles'],
    });
    if (!venta) throw new BadRequestException('Venta no encontrada');

    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    const detalles: Array<{
      producto: Producto | null;
      cantidad: number;
      precio_unitario: number;
      subtotal: number;
    }> = [];

    for (const d of venta.detalles) {
      const producto = await this.productoRepository.findOne({ where: { id: d.producto_id } });
      detalles.push({
        producto,
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        subtotal: Number(d.subtotal),
      });
    }

    return { venta, empresa, detalles };
  }

  // Listar ventas con filtros
  async listarVentas(
    empresaId: string,
    filtros?: {
      estado?: string;
      tipo_comprobante?: string;
      desde?: string;
      hasta?: string;
    },
  ) {
    const query = this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('venta')
      .where('venta.empresa_id = :empresaId', { empresaId });

    if (filtros?.estado) {
      query.andWhere('venta.estado_sunat = :estado', { estado: filtros.estado });
    }
    if (filtros?.tipo_comprobante) {
      query.andWhere('venta.tipo_comprobante = :tipo', { tipo: filtros.tipo_comprobante });
    }
    if (filtros?.desde) {
      query.andWhere('venta.fecha_emision >= :desde', { desde: filtros.desde });
    }
    if (filtros?.hasta) {
      query.andWhere('venta.fecha_emision <= :hasta', { hasta: filtros.hasta + ' 23:59:59' });
    }

    query.orderBy('venta.fecha_emision', 'DESC');

    const ventas = await query.getMany();

    return ventas.map((v) => ({
      id: v.id,
      comprobante: `${v.serie}-${String(v.correlativo).padStart(8, '0')}`,
      tipo_comprobante: v.tipo_comprobante,
      tipo_nombre: v.tipo_comprobante === '01' ? 'Factura' : 'Boleta',
      cliente: v.cliente_razon_social,
      cliente_documento: v.cliente_numero_documento,
      importe_total: Number(v.importe_total),
      estado_sunat: v.estado_sunat,
      fecha_emision: v.fecha_emision,
    }));
  }

  // Detalle completo de una venta
  async obtenerVenta(ventaId: string, empresaId: string) {
    const venta = await this.dataSource.manager.findOne(Venta, {
      where: { id: ventaId, empresa_id: empresaId },
      relations: ['detalles'],
    });
    if (!venta) throw new BadRequestException('Venta no encontrada');

    const detalles: Array<{
      producto_id: string;
      producto_nombre: string;
      cantidad: number;
      precio_unitario: number;
      subtotal: number;
    }> = [];

    for (const d of venta.detalles) {
      const producto = await this.productoRepository.findOne({
        where: { id: d.producto_id },
      });
      detalles.push({
        producto_id: d.producto_id,
        producto_nombre: producto?.nombre || 'Producto',
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        subtotal: Number(d.subtotal),
      });
    }

    return {
      id: venta.id,
      comprobante: `${venta.serie}-${String(venta.correlativo).padStart(8, '0')}`,
      tipo_comprobante: venta.tipo_comprobante,
      tipo_nombre: venta.tipo_comprobante === '01' ? 'Factura' : 'Boleta',
      serie: venta.serie,
      correlativo: venta.correlativo,
      cliente: {
        razon_social: venta.cliente_razon_social,
        numero_documento: venta.cliente_numero_documento,
      },
      totales: {
        gravado: Number(venta.total_gravado),
        igv: Number(venta.total_igv),
        total: Number(venta.importe_total),
      },
      estado_sunat: venta.estado_sunat,
      sunat_codigo: venta.sunat_codigo,
      sunat_descripcion: venta.sunat_descripcion,
      nombre_archivo: venta.nombre_archivo,
      fecha_emision: venta.fecha_emision,
      detalles,
      tiene_xml: !!venta.sunat_xml_base64,
      tiene_cdr: !!venta.sunat_cdr_base64,
    };
  }

  // Para descargar XML/CDR: devuelve la entidad cruda
  async obtenerVentaCompleta(ventaId: string, empresaId: string) {
    const venta = await this.dataSource.manager.findOne(Venta, {
      where: { id: ventaId, empresa_id: empresaId },
    });
    if (!venta) throw new BadRequestException('Venta no encontrada');
    return venta;
  }

  async anularVenta(id: string, empresaId: string, contexto?: ContextoUsuario) {
    // La transacción solo guarda en BD
    const ventaAnulada = await this.dataSource.transaction(async (manager) => {
      const venta = await manager.findOne(Venta, {
        where: { id, empresa_id: empresaId },
        relations: ['detalles'],
      });
      if (!venta) throw new BadRequestException('Venta no encontrada');
      if (venta.estado_sunat === 'ANULADA') {
        throw new BadRequestException('Esta venta ya está anulada');
      }

      // 1. Devolver el stock
      for (const detalle of venta.detalles) {
        await this.kardexService.registrarMovimiento(
          {
            producto_id: detalle.producto_id,
            empresa_id: empresaId,
            tipo_movimiento: 'AJUSTE_INGRESO',
            cantidad: Number(detalle.cantidad),
            referencia_documento: `Anulación venta ${venta.serie}-${venta.correlativo}`,
          },
          manager,
        );
      }

      // 2. Revertir finanzas
      if (venta.condicion_pago === 'CONTADO') {
        await this.finanzasService.registrarCaja(
          {
            empresa_id: empresaId,
            tipo: 'EGRESO',
            concepto: `Reverso por anulación de venta ${venta.serie}-${venta.correlativo}`,
            monto: Number(venta.importe_total),
            referencia: `${venta.serie}-${venta.correlativo}`,
            metodo_pago: 'EFECTIVO',
          },
          manager,
        );
      } else {
        await manager
          .createQueryBuilder()
          .update('cuentas_por_cobrar')
          .set({ estado: 'ANULADA', saldo_pendiente: 0 })
          .where('venta_id = :id', { id: venta.id })
          .execute();
      }

      // 3. Marcar como anulada
      venta.estado_sunat = 'ANULADA';
      await manager.save(venta);

      return venta;
    });

    // AUDITORÍA (fuera de la transacción)
    if (contexto) {
      await this.auditoriaService.registrar({
        empresa_id: empresaId,
        usuario_id: contexto.usuario_id,
        usuario_email: contexto.usuario_email,
        usuario_rol: contexto.usuario_rol,
        accion: 'ANULAR_VENTA',
        recurso: 'venta',
        recurso_id: ventaAnulada.id,
        datos_despues: {
          comprobante: `${ventaAnulada.serie}-${ventaAnulada.correlativo}`,
        },
        ip: contexto.ip,
        user_agent: contexto.user_agent,
      });
    }

    return {
      mensaje: 'Venta anulada internamente. Se devolvió el stock y se revirtieron las finanzas.',
      venta_id: ventaAnulada.id,
    };
  }

  async buscarPorSerieNumero(
    empresaId: string,
    tipoComprobante: string,
    serie: string,
    numero: number,
  ) {
    const venta = await this.dataSource.manager.findOne(Venta, {
      where: {
        empresa_id: empresaId,
        tipo_comprobante: tipoComprobante,
        serie,
        correlativo: numero,
      },
      relations: ['detalles'],
    });

    if (!venta) {
      throw new BadRequestException(
        `No se encontró el comprobante ${serie}-${numero}`,
      );
    }
    if (venta.estado_sunat !== 'ACEPTADO') {
      throw new BadRequestException(
        'Solo se pueden afectar comprobantes aceptados por SUNAT',
      );
    }

    const detallesConProducto: any[] = [];
    for (const d of venta.detalles) {
      const producto = await this.dataSource.manager.findOne(Producto, {
        where: { id: d.producto_id },
      });
      detallesConProducto.push({
        producto_id: d.producto_id,
        producto_nombre: producto?.nombre || 'Producto',
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        subtotal: Number(d.subtotal),
      });
    }

    return {
      venta_id: venta.id,
      tipo_comprobante: venta.tipo_comprobante,
      serie: venta.serie,
      correlativo: venta.correlativo,
      comprobante: `${venta.serie}-${String(venta.correlativo).padStart(8, '0')}`,
      fecha_emision: venta.fecha_emision,
      cliente: {
        numero_documento: venta.cliente_numero_documento,
        razon_social: venta.cliente_razon_social,
      },
      detalles: detallesConProducto,
      total_gravado: Number(venta.total_gravado),
      total_igv: Number(venta.total_igv),
      importe_total: Number(venta.importe_total),
    };
  }

  // Envía la comunicación de baja a SUNAT por una venta específica
  async enviarBajaSunat(ventaId: string, empresaId: string, motivo?: string) {
    const venta = await this.dataSource.manager.findOne(Venta, {
      where: { id: ventaId, empresa_id: empresaId },
    });
    if (!venta) throw new BadRequestException('Venta no encontrada');

    if (venta.tipo_comprobante !== '01') {
      throw new BadRequestException(
        'La comunicación de baja solo aplica a facturas. Para boletas usa una nota de crédito.',
      );
    }
    if (venta.estado_sunat !== 'ACEPTADO') {
      throw new BadRequestException(
        'Solo se pueden dar de baja comprobantes aceptados por SUNAT',
      );
    }

    const dto = {
      tipo_documento: venta.tipo_comprobante,
      serie_documento: venta.serie,
      correlativo_documento: venta.correlativo,
      motivo: motivo || 'ANULACION',
      fecha_emision_documento:
        typeof venta.fecha_emision === 'string'
          ? (venta.fecha_emision as string).split('T')[0]
          : new Date(venta.fecha_emision).toISOString().split('T')[0],
    };

    return this.bajasService.enviarBaja(dto as any, empresaId);
  }

  /**
 * Devuelve el próximo correlativo a usar para un tipo de comprobante + serie.
 * Considera el ambiente actual de la empresa (beta o producción).
 */
async obtenerProximoCorrelativo(
  tipoComprobante: string,
  serie: string,
  empresaId: string,
) {
  if (!tipoComprobante || !serie) {
    throw new BadRequestException('Debes indicar tipo_comprobante y serie');
  }

  const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
  if (!empresa) throw new BadRequestException('Empresa no encontrada');

  const ambiente = empresa.ambiente || 'beta';

  const serieExistente = await this.dataSource.manager.findOne(SerieComprobante, {
    where: {
      empresa_id: empresaId,
      tipo_comprobante: tipoComprobante,
      serie,
      ambiente,
    },
  });

  const ultimoCorrelativo = serieExistente?.ultimo_correlativo || 0;
  const proximoCorrelativo = ultimoCorrelativo + 1;

  return {
    tipo_comprobante: tipoComprobante,
    serie,
    ambiente,
    ultimo_correlativo: ultimoCorrelativo,
    proximo_correlativo: proximoCorrelativo,
    comprobante_proximo: `${serie}-${String(proximoCorrelativo).padStart(8, '0')}`,
  };
}

/**
 * Marca una boleta como PENDIENTE_ANULACION.
 * La boleta será anulada cuando se envíe el resumen diario a SUNAT.
 */
async marcarBoletaPendienteAnulacion(
  ventaId: string,
  empresaId: string,
  contexto?: ContextoUsuario,
) {
  const venta = await this.dataSource.manager.findOne(Venta, {
    where: { id: ventaId, empresa_id: empresaId },
  });
  if (!venta) throw new BadRequestException('Venta no encontrada');

  if (venta.tipo_comprobante !== '03') {
    throw new BadRequestException(
      'Solo las boletas se anulan vía resumen diario. Para facturas usa comunicación de baja.',
    );
  }

  if (venta.estado_sunat !== 'ACEPTADO') {
    throw new BadRequestException(
      'Solo se pueden anular boletas aceptadas por SUNAT',
    );
  }

  venta.estado_sunat = 'PENDIENTE_ANULACION';
  await this.dataSource.manager.save(venta);

  // Auditoría
  if (contexto) {
    await this.auditoriaService.registrar({
      empresa_id: empresaId,
      usuario_id: contexto.usuario_id,
      usuario_email: contexto.usuario_email,
      usuario_rol: contexto.usuario_rol,
      accion: 'MARCAR_BOLETA_PENDIENTE_ANULACION',
      recurso: 'venta',
      recurso_id: venta.id,
      datos_despues: {
        comprobante: `${venta.serie}-${venta.correlativo}`,
      },
      ip: contexto.ip,
      user_agent: contexto.user_agent,
    });
  }

  return {
    mensaje: 'Boleta marcada para anulación. Se enviará a SUNAT en el próximo resumen diario.',
    venta_id: venta.id,
    estado: 'PENDIENTE_ANULACION',
  };
}
}