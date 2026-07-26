import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cotizacion } from './entities/cotizacion.entity';
import { CotizacionDetalle } from './entities/cotizacion-detalle.entity';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { Producto } from '../productos/entities/producto.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { VentasService } from '../ventas/ventas.service';
import { CreateVentaDto } from '../ventas/dto/create-venta.dto';
import { fechaActualLima } from '../common/utils/fecha.util';

interface ContextoUsuario {
  usuario_id: string;
  usuario_email: string;
  usuario_rol: string;
  ip?: string;
  user_agent?: string;
}

@Injectable()
export class CotizacionesService {
  constructor(
    @InjectRepository(Cotizacion)
    private readonly cotizacionRepository: Repository<Cotizacion>,
    @InjectRepository(CotizacionDetalle)
    private readonly cotizacionDetalleRepository: Repository<CotizacionDetalle>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    private readonly ventasService: VentasService,
  ) {}

  async obtenerParaPdf(id: string, empresaId: string) {
    const cotizacion = await this.cotizacionRepository.findOne({
      where: { id, empresa_id: empresaId },
      relations: ['detalles'],
    });
    if (!cotizacion) throw new BadRequestException('Cotización no encontrada');
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');
    return { cotizacion, empresa };
  }

  // Resuelve cliente + productos + totales a partir del DTO (compartido por crear y actualizar).
  private async resolverDatos(dto: CreateCotizacionDto, empresaId: string) {
    let clienteId: string | null = null;
    let clienteDoc: string;
    let clienteNombre: string;

    if (dto.cliente_id) {
      const cliente = await this.clienteRepository.findOne({
        where: { id: dto.cliente_id, empresa_id: empresaId },
      });
      if (!cliente) throw new BadRequestException('Cliente no encontrado');
      clienteId = cliente.id;
      clienteDoc = cliente.numero_documento;
      clienteNombre = cliente.razon_social;
    } else {
      if (!dto.cliente_numero_documento || !dto.cliente_razon_social) {
        throw new BadRequestException(
          'Envía un cliente_id o los datos del cliente (documento y razón social)',
        );
      }
      clienteDoc = dto.cliente_numero_documento;
      clienteNombre = dto.cliente_razon_social;
    }

    if (!dto.detalles || dto.detalles.length === 0) {
      throw new BadRequestException('La cotización debe tener al menos un producto');
    }

    let gravadoConIgv = 0;
    let otros = 0;
    const detalles: Array<Partial<CotizacionDetalle>> = [];

    for (const item of dto.detalles) {
      const producto = await this.productoRepository.findOne({
        where: { id: item.producto_id, empresa_id: empresaId },
      });
      if (!producto) {
        throw new BadRequestException(`Producto no encontrado: ${item.producto_id}`);
      }
      const descPct = Number(item.descuento_porcentaje || 0);
      const precio = Number(producto.precio_venta);
      const lineaConDesc = precio * Number(item.cantidad) * (1 - descPct / 100);

      if ((producto.tipo_igv || '10') === '10') gravadoConIgv += lineaConDesc;
      else otros += lineaConDesc;

      detalles.push({
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        cantidad: Number(item.cantidad),
        precio_unitario: precio,
        descuento_porcentaje: descPct,
        subtotal: Number(lineaConDesc.toFixed(2)),
      });
    }

    const totalGravado = gravadoConIgv / 1.18;
    return {
      clienteId,
      clienteDoc,
      clienteNombre,
      detalles,
      total_gravado: Number(totalGravado.toFixed(2)),
      total_igv: Number((gravadoConIgv - totalGravado).toFixed(2)),
      importe_total: Number((gravadoConIgv + otros).toFixed(2)),
    };
  }

  async crear(dto: CreateCotizacionDto, empresaId: string) {
    const r = await this.resolverDatos(dto, empresaId);

    // Correlativo por empresa
    const ultima = await this.cotizacionRepository.findOne({
      where: { empresa_id: empresaId },
      order: { numero: 'DESC' },
    });
    const numero = (ultima?.numero || 0) + 1;

    const cotizacion = this.cotizacionRepository.create({
      empresa_id: empresaId,
      numero,
      cliente_id: r.clienteId,
      cliente_numero_documento: r.clienteDoc,
      cliente_razon_social: r.clienteNombre,
      fecha_emision: fechaActualLima(),
      fecha_validez: dto.fecha_validez || null,
      estado: 'PENDIENTE',
      total_gravado: r.total_gravado,
      total_igv: r.total_igv,
      importe_total: r.importe_total,
      observaciones: dto.observaciones || null,
      detalles: r.detalles.map((d) => Object.assign(new CotizacionDetalle(), d)),
    });

    const guardada = await this.cotizacionRepository.save(cotizacion);
    return this.obtener(guardada.id, empresaId);
  }

  async actualizar(id: string, dto: CreateCotizacionDto, empresaId: string) {
    const cotizacion = await this.cotizacionRepository.findOne({
      where: { id, empresa_id: empresaId },
    });
    if (!cotizacion) throw new BadRequestException('Cotización no encontrada');
    if (cotizacion.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden editar cotizaciones pendientes');
    }

    const r = await this.resolverDatos(dto, empresaId);

    // Reemplazar los detalles: borrar los viejos e insertar los nuevos
    await this.cotizacionDetalleRepository.delete({ cotizacion_id: id });
    const nuevos = r.detalles.map((d) =>
      this.cotizacionDetalleRepository.create({ ...d, cotizacion_id: id }),
    );
    await this.cotizacionDetalleRepository.save(nuevos);

    cotizacion.cliente_id = r.clienteId;
    cotizacion.cliente_numero_documento = r.clienteDoc;
    cotizacion.cliente_razon_social = r.clienteNombre;
    cotizacion.fecha_validez = dto.fecha_validez || null;
    cotizacion.observaciones = dto.observaciones || null;
    cotizacion.total_gravado = r.total_gravado;
    cotizacion.total_igv = r.total_igv;
    cotizacion.importe_total = r.importe_total;
    await this.cotizacionRepository.save(cotizacion);

    return this.obtener(id, empresaId);
  }

  async listar(empresaId: string, estado?: string) {
    const where: any = { empresa_id: empresaId };
    if (estado) where.estado = estado;
    const cotizaciones = await this.cotizacionRepository.find({
      where,
      order: { numero: 'DESC' },
    });
    return cotizaciones.map((c) => ({
      id: c.id,
      numero: c.numero,
      codigo: `COT-${String(c.numero).padStart(6, '0')}`,
      cliente: c.cliente_razon_social,
      cliente_documento: c.cliente_numero_documento,
      fecha_emision: c.fecha_emision,
      fecha_validez: c.fecha_validez,
      estado: c.estado,
      importe_total: Number(c.importe_total),
      venta_id: c.venta_id,
    }));
  }

  async obtener(id: string, empresaId: string) {
    const cotizacion = await this.cotizacionRepository.findOne({
      where: { id, empresa_id: empresaId },
      relations: ['detalles'],
    });
    if (!cotizacion) throw new BadRequestException('Cotización no encontrada');
    return {
      ...cotizacion,
      codigo: `COT-${String(cotizacion.numero).padStart(6, '0')}`,
    };
  }

  async cambiarEstado(id: string, empresaId: string, estado: string) {
    const permitidos = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'ANULADA'];
    if (!permitidos.includes(estado)) {
      throw new BadRequestException('Estado inválido');
    }
    const cotizacion = await this.cotizacionRepository.findOne({
      where: { id, empresa_id: empresaId },
    });
    if (!cotizacion) throw new BadRequestException('Cotización no encontrada');
    if (cotizacion.estado === 'CONVERTIDA') {
      throw new BadRequestException('Una cotización convertida en venta no se puede cambiar');
    }
    cotizacion.estado = estado;
    await this.cotizacionRepository.save(cotizacion);
    return { mensaje: `Cotización marcada como ${estado}` };
  }

  async convertirEnVenta(id: string, empresaId: string, contexto?: ContextoUsuario) {
    const cotizacion = await this.cotizacionRepository.findOne({
      where: { id, empresa_id: empresaId },
      relations: ['detalles'],
    });
    if (!cotizacion) throw new BadRequestException('Cotización no encontrada');
    if (cotizacion.estado === 'CONVERTIDA') {
      throw new BadRequestException('Esta cotización ya fue convertida en venta');
    }
    if (cotizacion.estado === 'ANULADA' || cotizacion.estado === 'RECHAZADA') {
      throw new BadRequestException('No se puede convertir una cotización anulada o rechazada');
    }

    // Documento de 11 dígitos → factura; si no → boleta
    const tipoComprobante = cotizacion.cliente_numero_documento.length === 11 ? '01' : '03';
    const serie = tipoComprobante === '01' ? 'F001' : 'B001';

    const ventaDto: CreateVentaDto = {
      cliente_id: cotizacion.cliente_id || undefined,
      cliente_numero_documento: cotizacion.cliente_numero_documento,
      cliente_razon_social: cotizacion.cliente_razon_social,
      tipo_comprobante: tipoComprobante,
      serie,
      condicion_pago: 'CONTADO',
      detalles: cotizacion.detalles.map((d) => ({
        producto_id: d.producto_id,
        cantidad: Number(d.cantidad),
        descuento_porcentaje: Number(d.descuento_porcentaje),
      })),
    };

    const resultado: any = await this.ventasService.crearVentaInterna(
      ventaDto,
      empresaId,
      contexto,
    );

    cotizacion.estado = 'CONVERTIDA';
    cotizacion.venta_id = resultado?.venta_id || null;
    await this.cotizacionRepository.save(cotizacion);

    return resultado;
  }
}
