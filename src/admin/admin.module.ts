// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PagoSuscripcion } from './entities/pago-suscripcion.entity';
import { MailModule } from '../common/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([PagoSuscripcion]), MailModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
