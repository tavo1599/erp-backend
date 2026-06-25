import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermisosService } from './permisos.service';
import { PERMISO_KEY } from './permiso.decorator';

@Injectable()
export class PermisoGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permisosService: PermisosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obtener el permiso requerido del decorador
    const permisoRequerido = this.reflector.getAllAndOverride<string>(
      PERMISO_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si el endpoint NO tiene @Permiso(), dejamos pasar
    // (significa que solo requiere JwtAuthGuard)
    if (!permisoRequerido) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user;

    if (!usuario) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // SUPER_ADMIN siempre pasa (tiene todos los permisos)
    if (usuario.rol === 'SUPER_ADMIN') {
      return true;
    }

    // Verificar si el rol del usuario tiene el permiso ACTIVO en su empresa
    const tienePermiso = await this.permisosService.tienePermiso(
      usuario.empresa_id,
      usuario.rol,
      permisoRequerido,
    );

    if (!tienePermiso) {
      throw new ForbiddenException(
        `No tienes permiso para esta acción (requiere: ${permisoRequerido})`,
      );
    }

    return true;
  }
}