// src/empresas/empresas.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { Empresa } from './entities/empresa.entity';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
  ) {}

  async create(createEmpresaDto: CreateEmpresaDto) {
    try {
      // 1. Preparamos el objeto para guardarlo
      const nuevaEmpresa = this.empresaRepository.create(createEmpresaDto);
      
      // 2. Lo guardamos en PostgreSQL
      return await this.empresaRepository.save(nuevaEmpresa);
      
    } catch (error) {
      // Si el RUC ya existe, PostgreSQL lanzará un error "23505"
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe una empresa registrada con este RUC.');
      }
      throw new BadRequestException('Error al crear la empresa');
    }
  }

  async findAll() {
    return await this.empresaRepository.find();
  }
}