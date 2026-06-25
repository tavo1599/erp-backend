import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conductor } from './entities/conductor.entity';
import { CreateConductorDto } from './dto/create-conductor.dto';

@Injectable()
export class ConductoresService {
  constructor(
    @InjectRepository(Conductor)
    private readonly conductorRepository: Repository<Conductor>,
  ) {}

  // Listar todos los conductores activos
  // Si se pasa transportista_id, filtra por ese transportista
  async listar(empresaId: string, filtros?: { transportista_id?: string }) {
    const query = this.conductorRepository
      .createQueryBuilder('c')
      .where('c.empresa_id = :empresaId', { empresaId })
      .andWhere('c.activo = true');

    if (filtros?.transportista_id) {
      query.andWhere('c.transportista_id = :tid', {
        tid: filtros.transportista_id,
      });
    }

    query.orderBy('c.nombres', 'ASC');
    return query.getMany();
  }

  async crear(dto: CreateConductorDto, empresaId: string) {
    // Validar que no exista otro con el mismo documento en la empresa
    const existente = await this.conductorRepository.findOne({
      where: {
        empresa_id: empresaId,
        numero_documento: dto.numero_documento,
      },
    });
    if (existente) {
      throw new BadRequestException(
        `Ya existe un conductor con el documento ${dto.numero_documento}`,
      );
    }

    const conductor = this.conductorRepository.create({
      empresa_id: empresaId,
      tipo_documento: dto.tipo_documento || '1',
      numero_documento: dto.numero_documento,
      nombres: dto.nombres,
      apellidos: dto.apellidos || null,
      licencia_conducir: dto.licencia_conducir,
      transportista_id: dto.transportista_id || null,
      activo: true,
    });

    return this.conductorRepository.save(conductor);
  }

  async obtener(id: string, empresaId: string) {
    const conductor = await this.conductorRepository.findOne({
      where: { id, empresa_id: empresaId },
    });
    if (!conductor) {
      throw new BadRequestException('Conductor no encontrado');
    }
    return conductor;
  }

  async actualizar(id: string, dto: Partial<CreateConductorDto>, empresaId: string) {
    const conductor = await this.obtener(id, empresaId);
    Object.assign(conductor, dto);
    return this.conductorRepository.save(conductor);
  }

  async desactivar(id: string, empresaId: string) {
    const conductor = await this.obtener(id, empresaId);
    conductor.activo = false;
    await this.conductorRepository.save(conductor);
    return { mensaje: 'Conductor desactivado' };
  }
}