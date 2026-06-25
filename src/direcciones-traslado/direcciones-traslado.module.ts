import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DireccionesTrasladoService } from './direcciones-traslado.service';
import { DireccionesTrasladoController } from './direcciones-traslado.controller';
import { DireccionTraslado } from './entities/direccion-traslado.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DireccionTraslado])],
  controllers: [DireccionesTrasladoController],
  providers: [DireccionesTrasladoService],
  exports: [DireccionesTrasladoService],
})
export class DireccionesTrasladoModule {}