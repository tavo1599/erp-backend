import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity';

export interface RegistroAuditoria {
  empresa_id?: string | null;
  usuario_id?: string | null;
  usuario_email: string;
  usuario_rol: string;
  accion: string;
  recurso?: string;
  recurso_id?: string;
  datos_antes?: any;
  datos_despues?: any;
  ip?: string;
  user_agent?: string;
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
  ) {}

  /**
   * Registra una acción en auditoría. Es "fire and forget":
   * nunca debe fallar y bloquear la operación principal.
   */
  async registrar(datos: RegistroAuditoria): Promise<void> {
    try {
      const log = this.auditoriaRepository.create({
        empresa_id: datos.empresa_id || null,
        usuario_id: datos.usuario_id || null,
        usuario_email: datos.usuario_email,
        usuario_rol: datos.usuario_rol,
        accion: datos.accion,
        recurso: datos.recurso || null,
        recurso_id: datos.recurso_id || null,
        datos_antes: datos.datos_antes || null,
        datos_despues: datos.datos_despues || null,
        ip: datos.ip || null,
        user_agent: datos.user_agent || null,
      });
      await this.auditoriaRepository.save(log);
    } catch (e) {
      // Solo log a consola, NO interrumpir la operación principal
      console.error('Error registrando auditoría:', e);
    }
  }

  // Listar auditoría con filtros (para la pantalla)
  async listar(filtros: {
    empresa_id?: string;
    usuario_id?: string;
    accion?: string;
    desde?: string;
    hasta?: string;
    pagina?: number;
    limite?: number;
  }) {
    const query = this.auditoriaRepository
      .createQueryBuilder('a')
      .orderBy('a.fecha', 'DESC');

    if (filtros.empresa_id) {
      query.andWhere('a.empresa_id = :empresa_id', { empresa_id: filtros.empresa_id });
    }
    if (filtros.usuario_id) {
      query.andWhere('a.usuario_id = :usuario_id', { usuario_id: filtros.usuario_id });
    }
    if (filtros.accion) {
      query.andWhere('a.accion = :accion', { accion: filtros.accion });
    }
    if (filtros.desde) {
      query.andWhere('a.fecha >= :desde', { desde: filtros.desde });
    }
    if (filtros.hasta) {
      query.andWhere('a.fecha <= :hasta', { hasta: filtros.hasta + ' 23:59:59' });
    }

    const pagina = filtros.pagina || 1;
    const limite = filtros.limite || 50;
    query.skip((pagina - 1) * limite).take(limite);

    const [registros, total] = await query.getManyAndCount();

    return {
      registros,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    };
  }
}