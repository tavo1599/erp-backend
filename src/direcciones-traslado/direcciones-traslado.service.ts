import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DireccionTraslado } from './entities/direccion-traslado.entity';
import { CreateDireccionTrasladoDto } from './dto/create-direccion-traslado.dto';

@Injectable()
export class DireccionesTrasladoService {
  constructor(
    @InjectRepository(DireccionTraslado)
    private readonly direccionRepository: Repository<DireccionTraslado>,
  ) {}

  // Listar todas las direcciones activas
  // Filtros opcionales: tipo (PARTIDA, LLEGADA, AMBOS)
  async listar(empresaId: string, filtros?: { tipo?: string }) {
    const query = this.direccionRepository
      .createQueryBuilder('d')
      .where('d.empresa_id = :empresaId', { empresaId })
      .andWhere('d.activo = true');

    if (filtros?.tipo) {
      // Si pide PARTIDA, también incluye las de tipo AMBOS
      query.andWhere('(d.tipo = :tipo OR d.tipo = :ambos)', {
        tipo: filtros.tipo,
        ambos: 'AMBOS',
      });
    }

    query.orderBy('d.es_predeterminada', 'DESC')
         .addOrderBy('d.nombre', 'ASC');
    return query.getMany();
  }

  async crear(dto: CreateDireccionTrasladoDto, empresaId: string) {
    // Validar que no exista una con el mismo nombre en esa empresa
    const existente = await this.direccionRepository.findOne({
      where: {
        empresa_id: empresaId,
        nombre: dto.nombre,
      },
    });
    if (existente) {
      throw new BadRequestException(
        `Ya existe una dirección con el nombre "${dto.nombre}"`,
      );
    }

    // Si la marca como predeterminada, desmarcar las demás
    if (dto.es_predeterminada === true) {
      await this.direccionRepository
        .createQueryBuilder()
        .update()
        .set({ es_predeterminada: false })
        .where('empresa_id = :empresaId', { empresaId })
        .execute();
    }

    const direccion = this.direccionRepository.create({
      empresa_id: empresaId,
      nombre: dto.nombre,
      ubigeo: dto.ubigeo,
      direccion: dto.direccion,
      departamento: dto.departamento,
      provincia: dto.provincia,
      distrito: dto.distrito,
      tipo: dto.tipo || 'AMBOS',
      es_predeterminada: dto.es_predeterminada || false,
      activo: true,
    });

    return this.direccionRepository.save(direccion);
  }

  async obtener(id: string, empresaId: string) {
    const direccion = await this.direccionRepository.findOne({
      where: { id, empresa_id: empresaId },
    });
    if (!direccion) {
      throw new BadRequestException('Dirección no encontrada');
    }
    return direccion;
  }

  async actualizar(
    id: string,
    dto: Partial<CreateDireccionTrasladoDto>,
    empresaId: string,
  ) {
    const direccion = await this.obtener(id, empresaId);

    // Si la marca como predeterminada, desmarcar las demás
    if (dto.es_predeterminada === true) {
      await this.direccionRepository
        .createQueryBuilder()
        .update()
        .set({ es_predeterminada: false })
        .where('empresa_id = :empresaId AND id != :id', { empresaId, id })
        .execute();
    }

    Object.assign(direccion, dto);
    return this.direccionRepository.save(direccion);
  }

  async desactivar(id: string, empresaId: string) {
    const direccion = await this.obtener(id, empresaId);
    direccion.activo = false;
    await this.direccionRepository.save(direccion);
    return { mensaje: 'Dirección desactivada' };
  }
}