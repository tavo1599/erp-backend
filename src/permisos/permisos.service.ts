import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolPermiso } from './entities/rol-permiso.entity';
import {
  CATALOGO_PERMISOS,
  ROLES_EDITABLES,
  MODULOS,
} from './permisos.catalogo';

@Injectable()
export class PermisosService {
  constructor(
    @InjectRepository(RolPermiso)
    private readonly rolPermisoRepository: Repository<RolPermiso>,
  ) {}

  // Inicializar permisos por defecto para una empresa
  async inicializarPermisos(empresaId: string) {
    const existentes = await this.rolPermisoRepository.count({
      where: { empresa_id: empresaId },
    });

    if (existentes > 0) {
      return { mensaje: 'Los permisos ya estaban inicializados' };
    }

    const registros: Partial<RolPermiso>[] = [];

    for (const permiso of CATALOGO_PERMISOS) {
      for (const rol of ROLES_EDITABLES) {
        registros.push({
          empresa_id: empresaId,
          rol,
          permiso: permiso.codigo,
          activo: permiso.rolesPorDefecto.includes(rol),
        });
      }
    }

    await this.rolPermisoRepository.save(registros);
    return { mensaje: 'Permisos inicializados', total: registros.length };
  }

  // Obtener todos los permisos de una empresa (matriz completa)
  async obtenerMatriz(empresaId: string) {
    // Inicializar si no existen
    const total = await this.rolPermisoRepository.count({
      where: { empresa_id: empresaId },
    });
    if (total === 0) {
      await this.inicializarPermisos(empresaId);
    }

    const permisos = await this.rolPermisoRepository.find({
      where: { empresa_id: empresaId },
    });

    // Organizar por módulo
    const matriz = MODULOS.map((modulo) => ({
      modulo,
      permisos: CATALOGO_PERMISOS
        .filter((p) => p.modulo === modulo)
        .map((p) => ({
          codigo: p.codigo,
          nombre: p.nombre,
          descripcion: p.descripcion,
          roles: ROLES_EDITABLES.reduce((acc, rol) => {
            const reg = permisos.find(
              (rp) => rp.rol === rol && rp.permiso === p.codigo,
            );
            acc[rol] = reg?.activo ?? false;
            return acc;
          }, {} as Record<string, boolean>),
        })),
    }));

    return {
      roles: ROLES_EDITABLES,
      modulos: matriz,
    };
  }

  // Actualizar un permiso específico
  async actualizar(
    empresaId: string,
    rol: string,
    permiso: string,
    activo: boolean,
  ) {
    if (!ROLES_EDITABLES.includes(rol)) {
      throw new BadRequestException('Rol no editable');
    }

    if (!CATALOGO_PERMISOS.find((p) => p.codigo === permiso)) {
      throw new BadRequestException('Permiso no existe');
    }

    let registro = await this.rolPermisoRepository.findOne({
      where: { empresa_id: empresaId, rol, permiso },
    });

    if (!registro) {
      registro = this.rolPermisoRepository.create({
        empresa_id: empresaId,
        rol,
        permiso,
        activo,
      });
    } else {
      registro.activo = activo;
    }

    await this.rolPermisoRepository.save(registro);
    return { mensaje: 'Permiso actualizado', activo };
  }

  // Verificar si un rol tiene un permiso (usado por el guard)
  async tienePermiso(
    empresaId: string,
    rol: string,
    permiso: string,
  ): Promise<boolean> {
    // SUPER_ADMIN siempre tiene todos los permisos
    if (rol === 'SUPER_ADMIN') return true;

    const registro = await this.rolPermisoRepository.findOne({
      where: { empresa_id: empresaId, rol, permiso },
    });

    return registro?.activo ?? false;
  }

  // Obtener permisos activos de un rol (útil para el frontend)
async permisosDelRol(empresaId: string, rol: string): Promise<string[]> {
  if (rol === 'SUPER_ADMIN') {
    return CATALOGO_PERMISOS.map((p) => p.codigo);
  }

  // Verificar si la empresa tiene permisos inicializados
  const totalEmpresa = await this.rolPermisoRepository.count({
    where: { empresa_id: empresaId },
  });

  // Si NO hay permisos para esta empresa, inicializar primero
  if (totalEmpresa === 0) {
    await this.inicializarPermisos(empresaId);
  }

  const registros = await this.rolPermisoRepository.find({
    where: { empresa_id: empresaId, rol, activo: true },
  });

  return registros.map((r) => r.permiso);
}
}