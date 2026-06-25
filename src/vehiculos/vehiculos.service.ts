import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehiculo } from './entities/vehiculo.entity';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';

@Injectable()
export class VehiculosService {
  constructor(
    @InjectRepository(Vehiculo)
    private readonly vehiculoRepository: Repository<Vehiculo>,
  ) {}

  // Listar todos los vehículos activos
  // Si se pasa transportista_id, filtra solo los de ese transportista
  // Si se pasa es_propio=true, filtra solo los propios
  async listar(
    empresaId: string,
    filtros?: { transportista_id?: string; es_propio?: boolean },
  ) {
    const query = this.vehiculoRepository
      .createQueryBuilder('v')
      .where('v.empresa_id = :empresaId', { empresaId })
      .andWhere('v.activo = true');

    if (filtros?.transportista_id) {
      query.andWhere('v.transportista_id = :tid', {
        tid: filtros.transportista_id,
      });
    }
    if (filtros?.es_propio !== undefined) {
      query.andWhere('v.es_propio = :propio', { propio: filtros.es_propio });
    }

    query.orderBy('v.placa', 'ASC');
    return query.getMany();
  }

  async crear(dto: CreateVehiculoDto, empresaId: string) {
    // Normalizar placa a mayúsculas
    const placa = dto.placa.toUpperCase();

    // Validar que no exista una placa duplicada en la misma empresa
    const existente = await this.vehiculoRepository.findOne({
      where: { empresa_id: empresaId, placa },
    });
    if (existente) {
      throw new BadRequestException(
        `Ya existe un vehículo con la placa ${placa}`,
      );
    }

    // Coherencia: si tiene transportista_id, NO es propio
    const esPropio = dto.es_propio !== undefined ? dto.es_propio : !dto.transportista_id;

    const vehiculo = this.vehiculoRepository.create({
      empresa_id: empresaId,
      placa,
      marca: dto.marca || null,
      modelo: dto.modelo || null,
      certificado_mtc: dto.certificado_mtc || null,
      transportista_id: dto.transportista_id || null,
      es_propio: esPropio,
      activo: true,
    });

    return this.vehiculoRepository.save(vehiculo);
  }

  async obtener(id: string, empresaId: string) {
    const vehiculo = await this.vehiculoRepository.findOne({
      where: { id, empresa_id: empresaId },
    });
    if (!vehiculo) {
      throw new BadRequestException('Vehículo no encontrado');
    }
    return vehiculo;
  }

  async actualizar(id: string, dto: Partial<CreateVehiculoDto>, empresaId: string) {
    const vehiculo = await this.obtener(id, empresaId);
    if (dto.placa) {
      dto.placa = dto.placa.toUpperCase();
    }
    Object.assign(vehiculo, dto);
    return this.vehiculoRepository.save(vehiculo);
  }

  async desactivar(id: string, empresaId: string) {
    const vehiculo = await this.obtener(id, empresaId);
    vehiculo.activo = false;
    await this.vehiculoRepository.save(vehiculo);
    return { mensaje: 'Vehículo desactivado' };
  }
}