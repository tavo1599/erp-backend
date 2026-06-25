// src/sunat-consultas/sunat-consultas.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { CacheSunatConsulta } from './entities/cache-sunat-consulta.entity';

@Injectable()
export class SunatConsultasService {
  private readonly token: string;
  private readonly baseUrl = 'https://api.decolecta.com/v1';

  // TTL del caché: 7 días
  private readonly TTL_DIAS = 7;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(CacheSunatConsulta)
    private readonly cacheRepository: Repository<CacheSunatConsulta>,
  ) {
    this.token = this.configService.get<string>('DECOLECTA_TOKEN') || '';
    console.log('TOKEN cargado:', this.token ? `SÍ (${this.token.substring(0, 10)}...)` : 'NO');
    if (!this.token) {
      console.warn('⚠️  DECOLECTA_TOKEN no configurado. Las consultas a SUNAT/RENIEC fallarán.');
    }
  }

  // ============================================================
  // Helpers de caché
  // ============================================================
  private async buscarEnCache(tipo: 'RUC' | 'DNI', numero: string) {
    const cache = await this.cacheRepository.findOne({
      where: { tipo, numero_documento: numero },
    });

    if (!cache) return null;

    // ¿Expiró?
    if (new Date() > cache.fecha_expira) {
      // Borrar el registro caducado (opcional, también podría dejarse)
      await this.cacheRepository.delete(cache.id);
      return null;
    }

    // Incrementar contador de uso
    cache.veces_usado += 1;
    await this.cacheRepository.save(cache);

    return cache.datos;
  }

  private async guardarEnCache(tipo: 'RUC' | 'DNI', numero: string, datos: any) {
    const fechaExpira = new Date();
    fechaExpira.setDate(fechaExpira.getDate() + this.TTL_DIAS);

    // Si ya existe, actualizar
    const existente = await this.cacheRepository.findOne({
      where: { tipo, numero_documento: numero },
    });

    if (existente) {
      existente.datos = datos;
      existente.fecha_consulta = new Date();
      existente.fecha_expira = fechaExpira;
      existente.veces_usado = 1;
      await this.cacheRepository.save(existente);
    } else {
      const nuevo = this.cacheRepository.create({
        tipo,
        numero_documento: numero,
        datos,
        fecha_expira: fechaExpira,
        veces_usado: 1,
      });
      await this.cacheRepository.save(nuevo);
    }
  }

  // ============================================================
  // Consultar RUC (con caché)
  // ============================================================
  async consultarRuc(ruc: string) {
    if (!ruc || ruc.length !== 11 || !/^\d{11}$/.test(ruc)) {
      throw new BadRequestException('El RUC debe tener exactamente 11 dígitos');
    }

    // 1. Revisar caché
    const enCache = await this.buscarEnCache('RUC', ruc);
    if (enCache) {
      console.log(`✓ RUC ${ruc} desde CACHÉ (ahorrado 1 consulta Decolecta)`);
      return enCache;
    }

    // 2. No está en caché → consultar Decolecta
    if (!this.token) {
      throw new BadRequestException(
        'El servicio de consulta no está configurado. Contacta al administrador.',
      );
    }

    try {
      const url = `${this.baseUrl}/sunat/ruc?numero=${ruc}`;
      const headers = {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
      };

      const response = await firstValueFrom(
        this.httpService.get(url, { headers, timeout: 8000 }),
      );

      const data = response.data;
      if (!data || !data.razon_social) {
        throw new NotFoundException('RUC no encontrado o no válido');
      }

      const resultado = {
        ruc: data.numero_documento || ruc,
        razon_social: data.razon_social || '',
        nombre_comercial: data.nombre_comercial || data.razon_social || '',
        direccion: data.direccion || '',
        departamento: data.departamento || '',
        provincia: data.provincia || '',
        distrito: data.distrito || '',
        ubigeo: data.ubigeo || '',
        estado: data.estado || '',
        condicion: data.condicion || '',
      };

      // 3. Guardar en caché para futuras consultas
      await this.guardarEnCache('RUC', ruc, resultado);
      console.log(`→ RUC ${ruc} consultado a Decolecta y cacheado`);

      return resultado;
    } catch (e: any) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;

      const status = e.response?.status;
      const detalle = e.response?.data;
      console.error('Error consulta RUC Decolecta:', { status, detalle });

      if (status === 401 || status === 403) {
        throw new BadRequestException('Token de Decolecta inválido o expirado');
      }
      if (status === 404) {
        throw new NotFoundException('RUC no encontrado en SUNAT');
      }
      if (status === 429) {
        throw new BadRequestException('Se agotó el cupo de consultas. Intenta más tarde.');
      }
      throw new BadRequestException('No se pudo consultar el RUC. Intenta en unos segundos.');
    }
  }

  // ============================================================
  // Consultar DNI (con caché)
  // ============================================================
  async consultarDni(dni: string) {
    if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      throw new BadRequestException('El DNI debe tener exactamente 8 dígitos');
    }

    // 1. Revisar caché
    const enCache = await this.buscarEnCache('DNI', dni);
    if (enCache) {
      console.log(`✓ DNI ${dni} desde CACHÉ (ahorrado 1 consulta Decolecta)`);
      return enCache;
    }

    // 2. No está en caché → consultar Decolecta
    if (!this.token) {
      throw new BadRequestException(
        'El servicio de consulta no está configurado. Contacta al administrador.',
      );
    }

    try {
      const url = `${this.baseUrl}/reniec/dni?numero=${dni}`;
      const headers = {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
      };

      const response = await firstValueFrom(
        this.httpService.get(url, { headers, timeout: 8000 }),
      );

      const data = response.data;
      if (!data || (!data.nombres && !data.first_name)) {
        throw new NotFoundException('DNI no encontrado');
      }

      const nombres = data.nombres || data.first_name || '';
      const apPaterno = data.apellido_paterno || data.first_last_name || '';
      const apMaterno = data.apellido_materno || data.second_last_name || '';
      const nombreCompleto = `${nombres} ${apPaterno} ${apMaterno}`.trim();

      const resultado = {
        dni: data.numero_documento || dni,
        nombres,
        apellido_paterno: apPaterno,
        apellido_materno: apMaterno,
        nombre_completo: nombreCompleto,
      };

      // 3. Guardar en caché
      await this.guardarEnCache('DNI', dni, resultado);
      console.log(`→ DNI ${dni} consultado a Decolecta y cacheado`);

      return resultado;
    } catch (e: any) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;

      const status = e.response?.status;
      console.error('Error consulta DNI Decolecta:', status, e.response?.data);

      if (status === 401 || status === 403) {
        throw new BadRequestException('Token de Decolecta inválido o expirado');
      }
      if (status === 404) {
        throw new NotFoundException('DNI no encontrado');
      }
      if (status === 429) {
        throw new BadRequestException('Se agotó el cupo de consultas. Intenta más tarde.');
      }
      throw new BadRequestException('No se pudo consultar el DNI. Intenta en unos segundos.');
    }
  }

  // ============================================================
  // Estadísticas del caché (útiles para super admin)
  // ============================================================
  async estadisticasCache() {
    const total = await this.cacheRepository.count();
    const totalRuc = await this.cacheRepository.count({ where: { tipo: 'RUC' } });
    const totalDni = await this.cacheRepository.count({ where: { tipo: 'DNI' } });
    
    // Top más consultados
    const masUsados = await this.cacheRepository
      .createQueryBuilder('c')
      .orderBy('c.veces_usado', 'DESC')
      .limit(10)
      .getMany();

    // Suma total de "veces_usado" = consultas ahorradas a Decolecta
    const ahorroQuery = await this.cacheRepository
      .createQueryBuilder('c')
      .select('SUM(c.veces_usado - 1)', 'ahorradas')
      .getRawOne();
    const consultasAhorradas = parseInt(ahorroQuery?.ahorradas || '0');

    return {
      total_cacheados: total,
      total_ruc: totalRuc,
      total_dni: totalDni,
      consultas_ahorradas_a_decolecta: consultasAhorradas,
      mas_consultados: masUsados.map((c) => ({
        tipo: c.tipo,
        numero: c.numero_documento,
        veces: c.veces_usado,
      })),
    };
  }

  // Limpiar caché caducado
  async limpiarCacheCaducado() {
    const result = await this.cacheRepository
      .createQueryBuilder()
      .delete()
      .where('fecha_expira < :ahora', { ahora: new Date() })
      .execute();
    return { eliminados: result.affected || 0 };
  }
}