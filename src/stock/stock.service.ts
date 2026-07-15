import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { StockAlmacen } from './entities/stock-almacen.entity';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockAlmacen)
    private readonly stockRepository: Repository<StockAlmacen>,
  ) {}

  /**
   * Obtiene el stock de un producto en un almacén específico.
   * Retorna 0 si no existe registro.
   */
  async obtenerStock(
    productoId: string,
    almacenId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(StockAlmacen) : this.stockRepository;
    const registro = await repo.findOne({
      where: { producto_id: productoId, almacen_id: almacenId },
    });
    return registro ? Number(registro.stock_actual) : 0;
  }

  /**
   * Obtiene el stock total de un producto (suma de todos los almacenes).
   */
  async obtenerStockTotal(
    productoId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(StockAlmacen) : this.stockRepository;
    const result = await repo
      .createQueryBuilder('sa')
      .select('COALESCE(SUM(sa.stock_actual), 0)', 'total')
      .where('sa.producto_id = :productoId', { productoId })
      .getRawOne();

    return Number(result?.total || 0);
  }

  /**
   * Obtiene el desglose de stock por almacén de un producto.
   */
  async obtenerStockPorAlmacen(productoId: string) {
    return this.stockRepository
      .createQueryBuilder('sa')
      .innerJoin('almacenes', 'a', 'a.id = sa.almacen_id')
      .where('sa.producto_id = :productoId', { productoId })
      .andWhere('a.activo = true')
      .select([
        'sa.id AS id',
        'sa.almacen_id AS almacen_id',
        'a.nombre AS almacen_nombre',
        'a.es_principal AS es_principal',
        'sa.stock_actual AS stock_actual',
      ])
      .orderBy('a.es_principal', 'DESC')
      .addOrderBy('a.nombre', 'ASC')
      .getRawMany();
  }

  /**
   * Suma stock al almacén (entrada de mercadería, ajuste positivo).
   * Si no existe el registro, lo crea.
   */
  async sumarStock(
    productoId: string,
    almacenId: string,
    cantidad: number,
    manager?: EntityManager,
  ): Promise<StockAlmacen> {
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser positiva');
    }

    const repo = manager ? manager.getRepository(StockAlmacen) : this.stockRepository;
    
    let registro = await repo.findOne({
      where: { producto_id: productoId, almacen_id: almacenId },
    });

    if (!registro) {
      registro = repo.create({
        producto_id: productoId,
        almacen_id: almacenId,
        stock_actual: cantidad,
      });
    } else {
      registro.stock_actual = Number(registro.stock_actual) + cantidad;
    }

    return repo.save(registro);
  }

  /**
   * Resta stock del almacén (salida por venta, ajuste negativo).
   * Valida que haya stock suficiente.
   */
  async restarStock(
    productoId: string,
    almacenId: string,
    cantidad: number,
    manager?: EntityManager,
  ): Promise<StockAlmacen> {
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser positiva');
    }

    const repo = manager ? manager.getRepository(StockAlmacen) : this.stockRepository;

    const registro = await repo.findOne({
      where: { producto_id: productoId, almacen_id: almacenId },
    });

    if (!registro) {
      throw new BadRequestException(
        `No hay stock del producto en el almacén seleccionado`,
      );
    }

    const stockActual = Number(registro.stock_actual);

    if (stockActual < cantidad) {
      throw new BadRequestException(
        `Stock insuficiente en el almacén. Disponible: ${stockActual}, solicitado: ${cantidad}`,
      );
    }

    registro.stock_actual = stockActual - cantidad;
    return repo.save(registro);
  }

  /**
   * Establece un stock específico (para ajustes manuales).
   */
  async establecerStock(
    productoId: string,
    almacenId: string,
    cantidad: number,
    manager?: EntityManager,
  ): Promise<StockAlmacen> {
    if (cantidad < 0) {
      throw new BadRequestException('El stock no puede ser negativo');
    }

    const repo = manager ? manager.getRepository(StockAlmacen) : this.stockRepository;

    let registro = await repo.findOne({
      where: { producto_id: productoId, almacen_id: almacenId },
    });

    if (!registro) {
      registro = repo.create({
        producto_id: productoId,
        almacen_id: almacenId,
        stock_actual: cantidad,
      });
    } else {
      registro.stock_actual = cantidad;
    }

    return repo.save(registro);
  }
}