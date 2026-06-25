import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { Empresa } from './entities/empresa.entity';
import { PdfService } from '../ventas/pdf.service';
import { PermisosModule } from '../permisos/permisos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Empresa]),
    HttpModule, // <-- Para reenviar el certificado a Java
    PermisosModule, // <-- Importamos el módulo de permisos
  ],
  controllers: [EmpresasController],
  providers: [EmpresasService, PdfService], // <-- Inyectamos el servicio de PDF
})
export class EmpresasModule {}