import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  // ADMIN_EMPRESA ve la auditoría de SU empresa
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPER_ADMIN)
  @Get()
  listar(
    @Query('usuario_id') usuario_id: string,
    @Query('accion') accion: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('pagina') pagina: string,
    @Request() req,
  ) {
    return this.auditoriaService.listar({
      empresa_id: req.user.empresa_id,
      usuario_id,
      accion,
      desde,
      hasta,
      pagina: pagina ? Number(pagina) : 1,
      limite: 50,
    });
  }

  // SUPER_ADMIN ve auditoría de cualquier empresa
  @Roles(Rol.SUPER_ADMIN)
  @Get('global')
  listarGlobal(
    @Query('empresa_id') empresa_id: string,
    @Query('usuario_id') usuario_id: string,
    @Query('accion') accion: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('pagina') pagina: string,
  ) {
    return this.auditoriaService.listar({
      empresa_id,
      usuario_id,
      accion,
      desde,
      hasta,
      pagina: pagina ? Number(pagina) : 1,
      limite: 50,
    });
  }
}