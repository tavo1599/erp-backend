import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Almacen } from './entities/almacen.entity';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';

@Injectable()
export class AlmacenesService {
  constructor(
    @InjectRepository(Almacen)
    private readonly almacenRepository: Repository<Almacen>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lista almacenes activos de una empresa
   */
  async listar(empresaId: string) {
    return this.almacenRepository.find({
      where: { empresa_id: empresaId, activo: true },
      order: { es_principal: 'DESC', nombre: 'ASC' },
    });
  }

  /**
   * Obtiene un almacén por id (validando que pertenece a la empresa)
   */
  async obtener(id: string, empresaId: string) {
    const almacen = await this.almacenRepository.findOne({
      where: { id, empresa_id: empresaId },
    });
    if (!almacen) {
      throw new NotFoundException('Almacén no encontrado');
    }
    return almacen;
  }

  /**
   * Crea un nuevo almacén
   */
  async crear(dto: CreateAlmacenDto, empresaId: string) {
    // Validar que no exista otro con el mismo nombre
    const existente = await this.almacenRepository.findOne({
      where: {
        empresa_id: empresaId,
        nombre: dto.nombre.trim(),
        activo: true,
      },
    });
    if (existente) {
      throw new BadRequestException(
        `Ya existe un almacén activo con el nombre "${dto.nombre}"`,
      );
    }

    // Si es principal, quitar el flag al anterior principal
    if (dto.es_principal) {
      await this.almacenRepository.update(
        { empresa_id: empresaId, es_principal: true },
        { es_principal: false },
      );
    }

    const almacen = this.almacenRepository.create({
      empresa_id: empresaId,
      nombre: dto.nombre.trim(),
      direccion: dto.direccion?.trim() || null,
      encargado_nombre: dto.encargado_nombre?.trim() || null,
      encargado_telefono: dto.encargado_telefono?.trim() || null,
      es_principal: dto.es_principal || false,
      activo: true,
    });

    return this.almacenRepository.save(almacen);
  }

  /**
   * Actualiza un almacén
   */
  async actualizar(id: string, dto: UpdateAlmacenDto, empresaId: string) {
    const almacen = await this.obtener(id, empresaId);

    // Si cambia el nombre, validar que no colisione
    if (dto.nombre && dto.nombre.trim() !== almacen.nombre) {
      const existente = await this.almacenRepository.findOne({
        where: {
          empresa_id: empresaId,
          nombre: dto.nombre.trim(),
          activo: true,
        },
      });
      if (existente && existente.id !== id) {
        throw new BadRequestException(
          `Ya existe otro almacén con el nombre "${dto.nombre}"`,
        );
      }
    }

    // Si se marca como principal, quitar el flag al anterior
    if (dto.es_principal && !almacen.es_principal) {
      await this.almacenRepository.update(
        { empresa_id: empresaId, es_principal: true },
        { es_principal: false },
      );
    }

    Object.assign(almacen, {
      nombre: dto.nombre?.trim() ?? almacen.nombre,
      direccion: dto.direccion?.trim() ?? almacen.direccion,
      encargado_nombre: dto.encargado_nombre?.trim() ?? almacen.encargado_nombre,
      encargado_telefono: dto.encargado_telefono?.trim() ?? almacen.encargado_telefono,
      es_principal: dto.es_principal ?? almacen.es_principal,
    });

    return this.almacenRepository.save(almacen);
  }

  /**
   * Desactiva un almacén (soft delete)
   * No permite desactivar el almacén principal
   */
  async desactivar(id: string, empresaId: string) {
    const almacen = await this.obtener(id, empresaId);

    if (almacen.es_principal) {
      throw new BadRequestException(
        'No puedes desactivar el almacén principal. Marca otro como principal primero.',
      );
    }

    almacen.activo = false;
    await this.almacenRepository.save(almacen);
    return { mensaje: 'Almacén desactivado correctamente' };
  }

  /**
   * Obtiene el almacén principal de una empresa
   */
  async obtenerPrincipal(empresaId: string) {
    let principal = await this.almacenRepository.findOne({
      where: { empresa_id: empresaId, es_principal: true, activo: true },
    });

    // Si no hay ninguno marcado como principal, tomar el primero
    if (!principal) {
      principal = await this.almacenRepository.findOne({
        where: { empresa_id: empresaId, activo: true },
        order: { fecha_creacion: 'ASC' },
      });
    }

    if (!principal) {
      throw new NotFoundException(
        'Esta empresa no tiene almacenes. Crea uno primero.',
      );
    }

    return principal;
  }
}