import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermisosService } from './permisos.service';
import { PermisosController } from './permisos.controller';
import { PermisoGuard } from './permiso.guard';
import { RolPermiso } from './entities/rol-permiso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RolPermiso])],
  controllers: [PermisosController],
  providers: [PermisosService, PermisoGuard],
  exports: [PermisosService, PermisoGuard],  // ← exportar el guard también
})
export class PermisosModule {}