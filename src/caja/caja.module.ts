import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaService } from './caja.service';
import { CajaController } from './caja.controller';
import { CajaSesion } from './entities/caja-sesion.entity';
import { PermisosModule } from '../permisos/permisos.module';

@Module({
  imports: [TypeOrmModule.forFeature([CajaSesion]), PermisosModule],
  controllers: [CajaController],
  providers: [CajaService],
})
export class CajaModule {}
