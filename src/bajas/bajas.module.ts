// src/bajas/bajas.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BajasService } from './bajas.service';
import { BajasController } from './bajas.controller';
import { Baja } from './entities/baja.entity';
import { Empresa } from '../empresas/entities/empresa.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Baja, Empresa]),
    HttpModule,
  ],
  controllers: [BajasController],
  providers: [BajasService],
  exports: [BajasService],
})
export class BajasModule {}