import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmpresasModule } from './empresas/empresas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { ProductosModule } from './productos/productos.module';
import { KardexModule } from './kardex/kardex.module';
import { VentasModule } from './ventas/ventas.module';

@Module({
  imports: [
    // 1. Iniciamos el módulo de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true, // Para poder usar las variables en cualquier parte del proyecto
    }),
    
    // 2. Configuramos la conexión a PostgreSQL con TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true, // Cargará las tablas automáticamente
        synchronize: true, // ¡OJO! Solo para desarrollo. Crea las tablas en la BD automáticamente.
      }),
    }),
    
    EmpresasModule,
    
    UsuariosModule,
    
    AuthModule,
    
    ProductosModule,
    
    KardexModule,
    
    VentasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}