import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transferencia } from './entities/transferencia.entity';
import { TransferenciaDetalle } from './entities/transferencia-detalle.entity';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { Almacen } from '../almacenes/entities/almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { StockService } from '../stock/stock.service';

@Injectable()
export class TransferenciasService {
  constructor(
    @InjectRepository(Transferencia)
    private readonly transferenciaRepository: Repository<Transferencia>,
    @InjectRepository(Almacen)
    private readonly almacenRepository: Repository<Almacen>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    private readonly stockService: StockService,
    private readonly dataSource: DataSource,
  ) {}

  private async validarAlmacen(id: string, empresaId: string): Promise<Almacen> {
    const almacen = await this.almacenRepository.findOne({
      where: { id, empresa_id: empresaId, activo: true },
    });
    if (!almacen) {
      throw new BadRequestException('Almacén no encontrado o inactivo');
    }
    return almacen;
  }

  async crear(dto: CreateTransferenciaDto, empresaId: string, usuarioEmail?: string) {
    if (dto.almacen_origen_id === dto.almacen_destino_id) {
      throw new BadRequestException('El almacén de origen y destino deben ser distintos');
    }
    await this.validarAlmacen(dto.almacen_origen_id, empresaId);
    await this.validarAlmacen(dto.almacen_destino_id, empresaId);

    if (!dto.detalles || dto.detalles.length === 0) {
      throw new BadRequestException('La transferencia debe tener al menos un producto');
    }

    // Resolver productos + validar stock disponible en el origen (pre-chequeo)
    const items: Array<{ producto: Producto; cantidad: number }> = [];
    for (const item of dto.detalles) {
      const producto = await this.productoRepository.findOne({
        where: { id: item.producto_id, empresa_id: empresaId },
      });
      if (!producto) {
        throw new BadRequestException(`Producto no encontrado: ${item.producto_id}`);
      }
      const disponible = await this.stockService.obtenerStock(
        producto.id,
        dto.almacen_origen_id,
      );
      if (disponible < Number(item.cantidad)) {
        throw new BadRequestException(
          `Stock insuficiente de "${producto.nombre}" en el almacén de origen. Disponible: ${disponible}, solicitado: ${item.cantidad}`,
        );
      }
      items.push({ producto, cantidad: Number(item.cantidad) });
    }

    // Correlativo por empresa
    const ultima = await this.transferenciaRepository.findOne({
      where: { empresa_id: empresaId },
      order: { numero: 'DESC' },
    });
    const numero = (ultima?.numero || 0) + 1;

    // Todo en una transacción: mover stock (solo stock_almacen, el total global no cambia)
    const guardada = await this.dataSource.transaction(async (manager) => {
      for (const it of items) {
        await this.stockService.restarStock(
          it.producto.id,
          dto.almacen_origen_id,
          it.cantidad,
          manager,
        );
        await this.stockService.sumarStock(
          it.producto.id,
          dto.almacen_destino_id,
          it.cantidad,
          manager,
        );
      }

      const transferencia = manager.create(Transferencia, {
        empresa_id: empresaId,
        numero,
        almacen_origen_id: dto.almacen_origen_id,
        almacen_destino_id: dto.almacen_destino_id,
        observaciones: dto.observaciones || null,
        usuario_email: usuarioEmail || null,
        estado: 'COMPLETADA',
        detalles: items.map((it) =>
          manager.create(TransferenciaDetalle, {
            producto_id: it.producto.id,
            producto_nombre: it.producto.nombre,
            cantidad: it.cantidad,
          }),
        ),
      });
      return manager.save(transferencia);
    });

    return this.obtener(guardada.id, empresaId);
  }

  async listar(empresaId: string) {
    const transferencias = await this.transferenciaRepository.find({
      where: { empresa_id: empresaId },
      order: { numero: 'DESC' },
    });

    // Mapa de nombres de almacén
    const almacenes = await this.almacenRepository.find({ where: { empresa_id: empresaId } });
    const nombre = (id: string) => almacenes.find((a) => a.id === id)?.nombre || '—';

    return transferencias.map((t) => ({
      id: t.id,
      numero: t.numero,
      codigo: `TRA-${String(t.numero).padStart(6, '0')}`,
      almacen_origen: nombre(t.almacen_origen_id),
      almacen_destino: nombre(t.almacen_destino_id),
      fecha: t.created_at,
      usuario_email: t.usuario_email,
      estado: t.estado,
    }));
  }

  async obtener(id: string, empresaId: string) {
    const transferencia = await this.transferenciaRepository.findOne({
      where: { id, empresa_id: empresaId },
      relations: ['detalles'],
    });
    if (!transferencia) throw new BadRequestException('Transferencia no encontrada');

    const origen = await this.almacenRepository.findOne({
      where: { id: transferencia.almacen_origen_id },
    });
    const destino = await this.almacenRepository.findOne({
      where: { id: transferencia.almacen_destino_id },
    });

    return {
      ...transferencia,
      codigo: `TRA-${String(transferencia.numero).padStart(6, '0')}`,
      almacen_origen_nombre: origen?.nombre || '—',
      almacen_destino_nombre: destino?.nombre || '—',
    };
  }
}
