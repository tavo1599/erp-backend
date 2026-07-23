import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Aviso si falta la clave de cifrado de credenciales SUNAT en reposo.
  if (!process.env.ENCRYPTION_KEY) {
    console.warn(
      '⚠️  ENCRYPTION_KEY no está definida: las credenciales SUNAT (clave SOL, ' +
        'client_secret) se guardarán en TEXTO PLANO. Define ENCRYPTION_KEY para cifrarlas.',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // SEGURIDAD: cabeceras HTTP
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

  // CORS: lista de dominios permitidos desde variable de entorno
  const dominiosPermitidos = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(d => d.trim())
    : ['http://localhost:5173'];

  app.enableCors({
    origin: dominiosPermitidos,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();