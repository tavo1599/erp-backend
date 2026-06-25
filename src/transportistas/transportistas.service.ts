import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transportista } from './entities/transportista.entity';
import { CreateTransportistaDto } from './dto/create-transportista.dto';

@Injectable()
export class TransportistasService {
  constructor(
    @InjectRepository(Transportista)
    private readonly transportistaRepository: Repository<Transportista>,
  ) {}

  // Listar todos los transportistas activos de una empresa
  async listar(empresaId: string) {
    return this.transportistaRepository.find({
      where: { empresa_id: empresaId, activo: true },
      order: { razon_social: 'ASC' },
    });
  }

  // Crear un transportista nuevo
  async crear(dto: CreateTransportistaDto, empresaId: string) {
    // Validar que no exista uno con el mismo documento
    const existente = await this.transportistaRepository.findOne({
      where: {
        empresa_id: empresaId,
        numero_documento: dto.numero_documento,
      },
    });
    if (existente) {
      throw new BadRequestException(
        `Ya existe un transportista con el documento ${dto.numero_documento}`,
      );
    }

    const transportista = this.transportistaRepository.create({
      empresa_id: empresaId,
      tipo_documento: dto.tipo_documento || '6',
      numero_documento: dto.numero_documento,
      razon_social: dto.razon_social,
      numero_mtc: dto.numero_mtc || null,
      direccion: dto.direccion || null,
      telefono: dto.telefono || null,
      activo: true,
    });

    return this.transportistaRepository.save(transportista);
  }

  // Obtener uno por ID
  async obtener(id: string, empresaId: string) {
    const transportista = await this.transportistaRepository.findOne({
      where: { id, empresa_id: empresaId },
    });
    if (!transportista) {
      throw new BadRequestException('Transportista no encontrado');
    }
    return transportista;
  }

  // Actualizar
  async actualizar(id: string, dto: Partial<CreateTransportistaDto>, empresaId: string) {
    const transportista = await this.obtener(id, empresaId);
    Object.assign(transportista, dto);
    return this.transportistaRepository.save(transportista);
  }

  // Desactivar (no borrar físicamente)
  async desactivar(id: string, empresaId: string) {
    const transportista = await this.obtener(id, empresaId);
    transportista.activo = false;
    await this.transportistaRepository.save(transportista);
    return { mensaje: 'Transportista desactivado' };
  }
}