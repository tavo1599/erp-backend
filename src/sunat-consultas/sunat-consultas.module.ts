import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SunatConsultasService } from './sunat-consultas.service';
import { SunatConsultasController } from './sunat-consultas.controller';
import { CacheSunatConsulta } from './entities/cache-sunat-consulta.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([CacheSunatConsulta]),  // ← AGREGAR
  ],
  controllers: [SunatConsultasController],
  providers: [SunatConsultasService],
})
export class SunatConsultasModule {}