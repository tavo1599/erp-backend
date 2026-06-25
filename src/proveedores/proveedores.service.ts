// src/proveedores/proveedores.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProveedoreDto } from './dto/create-proveedore.dto';
import { Proveedor } from './entities/proveedore.entity';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
  ) {}

  async create(dto: CreateProveedoreDto, empresaId: string) {
    if (dto.ruc.length !== 11) {
      throw new BadRequestException('El RUC del proveedor debe tener 11 dígitos');
    }
    try {
      const nuevo = this.proveedorRepository.create({ ...dto, empresa_id: empresaId });
      return await this.proveedorRepository.save(nuevo);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe un proveedor con ese RUC');
      }
      throw new BadRequestException('Error al crear el proveedor: ' + error.message);
    }
  }

  async findAll(empresaId: string, buscar?: string) {
    const query = this.proveedorRepository
      .createQueryBuilder('prov')
      .where('prov.empresa_id = :empresaId', { empresaId })
      .andWhere('prov.estado = true');

    if (buscar) {
      query.andWhere('(prov.razon_social ILIKE :b OR prov.ruc ILIKE :b)', { b: `%${buscar}%` });
    }
    query.orderBy('prov.razon_social', 'ASC');
    return await query.getMany();
  }

  async findOne(id: string, empresaId: string) {
    const proveedor = await this.proveedorRepository.findOne({
      where: { id, empresa_id: empresaId },
    });
    if (!proveedor) throw new BadRequestException('Proveedor no encontrado');
    return proveedor;
  }

  async update(id: string, dto: Partial<CreateProveedoreDto>, empresaId: string) {
    const proveedor = await this.findOne(id, empresaId);
    Object.assign(proveedor, dto);
    return await this.proveedorRepository.save(proveedor);
  }

  async desactivar(id: string, empresaId: string) {
    const proveedor = await this.findOne(id, empresaId);
    proveedor.estado = false;
    await this.proveedorRepository.save(proveedor);
    return { mensaje: 'Proveedor desactivado', id };
  }
}