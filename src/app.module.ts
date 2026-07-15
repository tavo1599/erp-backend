import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmpresasModule } from './empresas/empresas.module';
import { AlmacenesModule } from './almacenes/almacenes.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { ProductosModule } from './productos/productos.module';
import { KardexModule } from './kardex/kardex.module';
import { VentasModule } from './ventas/ventas.module';
import { NotasModule } from './notas/notas.module';
import { BajasModule } from './bajas/bajas.module';
import { ClientesModule } from './clientes/clientes.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { ComprasModule } from './compras/compras.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { ResumenesModule } from './resumenes/resumenes.module';
import { SunatConsultasModule } from './sunat-consultas/sunat-consultas.module';
import { AdminModule } from './admin/admin.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { TransportistasModule } from './transportistas/transportistas.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { ConductoresModule } from './conductores/conductores.module';
import { DireccionesTrasladoModule } from './direcciones-traslado/direcciones-traslado.module';
import { GuiasRemisionModule } from './guias-remision/guias-remision.module';
import { PermisosModule } from './permisos/permisos.module';
import { StockModule } from './stock/stock.module';
@Module({
  imports: [
    // 1. Iniciamos el módulo de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true, // Para poder usar las variables en cualquier parte del proyecto
    }),
    
    // 2. Configuramos la conexión a PostgreSQL con TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, AdminModule], // Importamos el módulo de Admin para usar su servicio
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true, // Cargará las tablas automáticamente
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    
    EmpresasModule,
    
    UsuariosModule,
    
    AuthModule,
    
    ProductosModule,
    
    KardexModule,
    
    VentasModule,
    
    NotasModule,
    
    BajasModule,
    
    ClientesModule,
    
    ProveedoresModule,
    
    ComprasModule,
    
    CatalogosModule,

    DashboardModule,

    FinanzasModule,

    ResumenesModule,

    AuditoriaModule,

    VehiculosModule,

    TransportistasModule,
    
    ConductoresModule,

    DireccionesTrasladoModule,

    GuiasRemisionModule,

    PermisosModule,

    AlmacenesModule,

    StockModule,

    SunatConsultasModule,
    ThrottlerModule.forRoot([
      {
        name: 'corto',
        ttl: 1000,      // 1 segundo
        limit: 10,      // 10 requests por segundo
      },
      {
        name: 'medio',
        ttl: 60000,     // 1 minuto
        limit: 100,     // 100 requests por minuto
      },
      {
        name: 'largo',
        ttl: 3600000,   // 1 hora
        limit: 2000,    // 2000 requests por hora
      },
    ]),
  ],
  
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}