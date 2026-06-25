// src/clientes/clientes.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { Cliente } from './entities/cliente.entity';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
  ) {}

  async create(dto: CreateClienteDto, empresaId: string) {
    // Validación básica: RUC = 11 dígitos, DNI = 8 dígitos
    if (dto.tipo_documento === '6' && dto.numero_documento.length !== 11) {
      throw new BadRequestException('El RUC debe tener 11 dígitos');
    }
    if (dto.tipo_documento === '1' && dto.numero_documento.length !== 8) {
      throw new BadRequestException('El DNI debe tener 8 dígitos');
    }

    try {
      const nuevoCliente = this.clienteRepository.create({
        ...dto,
        empresa_id: empresaId,
      });
      return await this.clienteRepository.save(nuevoCliente);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe un cliente con ese número de documento');
      }
      throw new BadRequestException('Error al crear el cliente: ' + error.message);
    }
  }

  async findAll(empresaId: string, buscar?: string) {
    const query = this.clienteRepository
      .createQueryBuilder('cliente')
      .where('cliente.empresa_id = :empresaId', { empresaId })
      .andWhere('cliente.estado = true');

    // Búsqueda por nombre o documento
    if (buscar) {
      query.andWhere(
        '(cliente.razon_social ILIKE :buscar OR cliente.numero_documento ILIKE :buscar)',
        { buscar: `%${buscar}%` },
      );
    }

    query.orderBy('cliente.razon_social', 'ASC');
    return await query.getMany();
  }

  async findOne(id: string, empresaId: string) {
    const cliente = await this.clienteRepository.findOne({
      where: { id, empresa_id: empresaId },
    });
    if (!cliente) throw new BadRequestException('Cliente no encontrado');
    return cliente;
  }

  async update(id: string, dto: Partial<CreateClienteDto>, empresaId: string) {
    const cliente = await this.findOne(id, empresaId);
    Object.assign(cliente, dto);
    return await this.clienteRepository.save(cliente);
  }

  async desactivar(id: string, empresaId: string) {
    const cliente = await this.findOne(id, empresaId);
    cliente.estado = false;
    await this.clienteRepository.save(cliente);
    return { mensaje: 'Cliente desactivado', id };
  }
}