import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportistasService } from './transportistas.service';
import { TransportistasController } from './transportistas.controller';
import { Transportista } from './entities/transportista.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transportista])],
  controllers: [TransportistasController],
  providers: [TransportistasService],
  exports: [TransportistasService],
})
export class TransportistasModule {}