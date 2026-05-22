import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateVentaDto } from './dto/create-venta.dto';
import { Venta } from './entities/venta.entity';
import { VentaDetalle } from './entities/venta-detalle.entity';
import { SerieComprobante } from './entities/serie-comprobante.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { KardexService } from '../kardex/kardex.service';

@Injectable()
export class VentasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly kardexService: KardexService,
    private readonly httpService: HttpService, // <-- Inyectamos Axios
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa> // <-- Para obtener el RUC
  ) {}

  async crearVentaInterna(createVentaDto: CreateVentaDto, empresaId: string) {
    
    const { cliente_numero_documento, cliente_razon_social, tipo_comprobante, serie, detalles } = createVentaDto;

    // Obtenemos los datos de la Empresa (Tenant) para mandarlos a Java
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let ventaGuardada: Venta;
    let nuevoCorrelativo: number;

    try {
      // --- FASES 2, 3, 4 y 5 (IGUAL QUE ANTES) ---
      let controlSerie = await queryRunner.manager.findOne(SerieComprobante, {
        where: { empresa_id: empresaId, tipo_comprobante, serie },
        lock: { mode: 'pessimistic_write' }
      });

      if (!controlSerie) {
        controlSerie = queryRunner.manager.create(SerieComprobante, { empresa_id: empresaId, tipo_comprobante, serie, ultimo_correlativo: 0 });
      }

      controlSerie.ultimo_correlativo += 1;
      await queryRunner.manager.save(controlSerie);
      nuevoCorrelativo = controlSerie.ultimo_correlativo;

      let totalGravado = 0;
      const itemsDetalle: VentaDetalle[] = [];

      for (const item of detalles) {
        const subtotalItem = item.cantidad * item.precio_unitario;
        totalGravado += subtotalItem;
        itemsDetalle.push(queryRunner.manager.create(VentaDetalle, {
          producto_id: item.producto_id, cantidad: item.cantidad, precio_unitario: item.precio_unitario, subtotal: subtotalItem
        }));

        await this.kardexService.registrarMovimiento({
          producto_id: item.producto_id, empresa_id: empresaId, tipo_movimiento: 'SALIDA_VENTA',
          cantidad: item.cantidad, referencia_documento: `${serie}-${nuevoCorrelativo}`
        });
      }

      const totalIgv = totalGravado * 0.18;
      const importeTotal = totalGravado + totalIgv;

      const nuevaVenta = queryRunner.manager.create(Venta, {
        empresa_id: empresaId, cliente_numero_documento, cliente_razon_social, tipo_comprobante, serie,
        correlativo: nuevoCorrelativo, total_gravado: Number(totalGravado.toFixed(2)), total_igv: Number(totalIgv.toFixed(2)),
        importe_total: Number(importeTotal.toFixed(2)), estado_sunat: 'PENDIENTE', detalles: itemsDetalle
      });

      ventaGuardada = await queryRunner.manager.save(nuevaVenta);
      await queryRunner.commitTransaction();

    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw new BadRequestException(`Transacción fallida: ${error.message}`);
    } finally {
      await queryRunner.release();
    }

    // ==========================================
    // FASE 6: COMUNICACIÓN CON JAVA (Facturación)
    // ==========================================
    try {
      // 1. Mapeamos nuestra Venta al JSON que espera tu motor Java
// 1. Convertimos el payload a una estructura PLANA directamente en la raíz
// 1. Mapeamos nuestra Venta al JSON EXACTO basado en tu clase ComprobanteRequestDTO
      const ahora = new Date();
const fechaActual = ahora.toISOString().split('T')[0];
const horaActual = ahora.toTimeString().split(' ')[0];

// Tipo documento: 11 dígitos → RUC (6), 8 dígitos → DNI (1)
const tipoDocCliente = cliente_numero_documento.length === 11 ? "6" : "1";

const payloadJava = {
  // Datos del emisor (la empresa que vende)
  empresa: {
    ruc: empresa.ruc,
    razonSocial: empresa.razon_social,
    nombreComercial: empresa.nombre_comercial || empresa.razon_social,
    direccion: empresa.direccion,
    ubigeo: empresa.ubigeo || "150101",
    departamento: empresa.departamento || "LIMA",
    provincia: empresa.provincia || "LIMA",
    distrito: empresa.distrito || "LIMA",
    codigoPais: "PE",
    solUsuario: empresa.sol_usuario || "MODDATOS",   // ← AGREGAR
    solClave: empresa.sol_clave || "MODDATOS",
    ambiente: "beta"
  },

  // Datos del comprobante
  tipoComprobante: tipo_comprobante,
  serie: serie,
  correlativo: nuevoCorrelativo,
  fechaEmision: fechaActual,
  horaEmision: horaActual,
  //fechaVencimiento: fechaActual,
  tipoOperacion: "0101",
  moneda: "PEN",
  formaPago: "Contado",

  // Datos del cliente
  clienteTipoDocumento: tipoDocCliente,
  clienteNumeroDocumento: cliente_numero_documento,
  clienteRazonSocial: cliente_razon_social,
  clienteDireccion: "AV. LIMA 456",

  // Items
  items: detalles.map((item, index) => {
    const precioUnitario = Number(item.precio_unitario);
    const cantidad = Number(item.cantidad);
    const valorUnitario = precioUnitario / 1.18;
    const valorVenta = valorUnitario * cantidad;
    const montoIgv = valorVenta * 0.18;
    const montoTotal = valorVenta + montoIgv;

    return {
      numero: index + 1,
      codigoProducto: `PROD${String(index + 1).padStart(3, '0')}`,
      unidadMedida: "NIU",
      cantidad: cantidad,
      descripcion: "Producto de venta",
      valorUnitario: Number(valorUnitario.toFixed(2)),
      precioUnitario: Number(precioUnitario.toFixed(2)),
      tipoPrecio: "01",
      tipoAfectacionIgv: "10",
      porcentajeIgv: 18.00,
      codigoTributo: "1000",
      valorVenta: Number(valorVenta.toFixed(2)),
      montoIgv: Number(montoIgv.toFixed(2)),
      montoTotal: Number(montoTotal.toFixed(2))
    };
  })
};

// Log para verificar
console.log('=== PAYLOAD ENVIADO A JAVA ===');
console.log(JSON.stringify(payloadJava, null, 2));
console.log('==============================');

      // 2. Disparamos la petición a Java (Puerto 8089)
      const respuestaJava = await firstValueFrom(
        this.httpService.post('http://localhost:8089/api/comprobantes/emitir', payloadJava)
      );

      // 3. Si Java responde éxito, actualizamos la base de datos a ACEPTADO
      await this.dataSource.manager.update(Venta, { id: ventaGuardada.id }, { estado_sunat: 'ACEPTADO' });

      return {
        mensaje: 'Venta registrada y enviada a SUNAT exitosamente',
        venta_id: ventaGuardada.id,
        comprobante: `${serie}-${nuevoCorrelativo}`,
        sunat_response: respuestaJava.data
      };

    } catch (error) {
      // Si Java falla o SUNAT rechaza, actualizamos a RECHAZADO, pero la venta interna se mantiene
      await this.dataSource.manager.update(Venta, { id: ventaGuardada.id }, { estado_sunat: 'RECHAZADO' });
      
      return {
        mensaje: 'Venta guardada localmente, pero falló la emisión electrónica.',
        venta_id: ventaGuardada.id,
        error_java: error.response?.data || error.message
      };
    }
  }
}