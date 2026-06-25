// src/catalogos/catalogos.module.ts
import { Module } from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { CatalogosController } from './catalogos.controller';

@Module({
  controllers: [CatalogosController],
  providers: [CatalogosService],
})
export class CatalogosModule {}