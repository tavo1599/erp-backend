// src/admin/admin.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { EmpresaUsuario } from '../usuarios/entities/empresa-usuario.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { Almacen } from '../almacenes/entities/almacen.entity';
import { CreateEmpresaDto } from '../empresas/dto/create-empresa.dto';
import { Rol } from '../auth/roles.enum';
import { fechaActualLima } from '../common/utils/fecha.util';

@Injectable()
export class AdminService {
  constructor(private readonly dataSource: DataSource) {}

  // Lista todas las empresas con KPIs básicos
  async listarEmpresas() {
    const empresas = await this.dataSource.manager.find(Empresa, {
      order: { fecha_creacion: 'DESC' } as any,
    });

    const resultado: any[] = [];
    for (const empresa of empresas) {
      // Comprobantes de la empresa
      const totalComprobantes = await this.dataSource
        .getRepository(Venta)
        .createQueryBuilder('v')
        .where('v.empresa_id = :id', { id: empresa.id })
        .getCount();

      // Usuarios de la empresa (a través de empresa_usuarios)
      const totalUsuarios = await this.dataSource
        .getRepository(EmpresaUsuario)
        .createQueryBuilder('eu')
        .where('eu.empresa_id = :id', { id: empresa.id })
        .getCount();

      resultado.push({
        id: empresa.id,
        ruc: empresa.ruc,
        razon_social: empresa.razon_social,
        ambiente: empresa.ambiente || 'beta',
        plan: empresa.plan || 'GRATUITO',
        estado_suscripcion: empresa.estado_suscripcion || 'ACTIVA',
        fecha_fin_suscripcion: empresa.fecha_fin_suscripcion,
        total_comprobantes: totalComprobantes,
        total_usuarios: totalUsuarios,
        fecha_creacion: empresa.fecha_creacion,
      });
    }
    return resultado;
  }

  // Crear una empresa nueva CON su primer admin (transacción)
  async crearEmpresaConAdmin(dto: CreateEmpresaDto) {
    return await this.dataSource.transaction(async (manager) => {
      // Validar que no exista una empresa con ese RUC
      const existente = await manager.findOne(Empresa, {
        where: { ruc: dto.ruc },
      });
      if (existente) {
        throw new BadRequestException(`Ya existe una empresa con el RUC ${dto.ruc}`);
      }

      // Validar que el email no exista
      const emailExistente = await manager.findOne(Usuario, {
        where: { email: dto.admin_email },
      });
      if (emailExistente) {
        throw new BadRequestException(`El email ${dto.admin_email} ya está registrado`);
      }

      // Crear la empresa
      const empresa = manager.create(Empresa, {
        ruc: dto.ruc,
        razon_social: dto.razon_social,
        nombre_comercial: dto.nombre_comercial || dto.razon_social,
        direccion: dto.direccion || 'AV. PRINCIPAL 123',
        ubigeo: dto.ubigeo || '150101',
        departamento: dto.departamento || 'LIMA',
        provincia: dto.provincia || 'LIMA',
        distrito: dto.distrito || 'LIMA',
        ambiente: 'beta',
        plan: dto.plan || 'GRATUITO',
        estado_suscripcion: 'ACTIVA',
        fecha_inicio_suscripcion: new Date(),
      });
      const empresaGuardada = await manager.save(empresa);

      // Crear el usuario admin (en tabla usuarios)
      const passwordHash = await bcrypt.hash(dto.admin_password, 10);
      const admin = manager.create(Usuario, {
        nombre: dto.admin_nombre,
        email: dto.admin_email,
        password_hash: passwordHash,
      });
      const adminGuardado = await manager.save(admin);

      // Crear la relación en empresa_usuarios con rol ADMIN_EMPRESA
      const relacion = manager.create(EmpresaUsuario, {
        empresa_id: empresaGuardada.id,
        usuario_id: adminGuardado.id,
        rol: Rol.ADMIN_EMPRESA,
      });
      await manager.save(relacion);

      // Crear un almacén principal por defecto. Ventas, compras y ajustes de
      // stock trabajan por almacén, así que toda empresa debe tener al menos uno.
      const almacenPrincipal = manager.create(Almacen, {
        empresa_id: empresaGuardada.id,
        nombre: 'Almacén Principal',
        es_principal: true,
        activo: true,
      });
      await manager.save(almacenPrincipal);

      return {
        mensaje: 'Empresa creada correctamente',
        empresa_id: empresaGuardada.id,
        ruc: empresaGuardada.ruc,
        razon_social: empresaGuardada.razon_social,
        admin_email: dto.admin_email,
      };
    });
  }

  // Editar datos de una empresa
  async actualizarEmpresa(empresaId: string, datos: Partial<Empresa>) {
    const empresa = await this.dataSource.manager.findOne(Empresa, {
      where: { id: empresaId },
    });
    if (!empresa) {
      throw new BadRequestException('Empresa no encontrada');
    }

    Object.assign(empresa, datos);
    await this.dataSource.manager.save(empresa);

    return { mensaje: 'Empresa actualizada', empresa_id: empresaId };
  }

  // Suspender / activar una empresa
  async cambiarEstadoEmpresa(empresaId: string, estado: 'ACTIVA' | 'SUSPENDIDA' | 'CANCELADA') {
    const empresa = await this.dataSource.manager.findOne(Empresa, {
      where: { id: empresaId },
    });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    empresa.estado_suscripcion = estado;
    await this.dataSource.manager.save(empresa);

    return { mensaje: `Empresa ${estado.toLowerCase()}`, empresa_id: empresaId };
  }

  // Re-encripta en reposo las credenciales SUNAT existentes.
  // Al cargar cada empresa el transformer descifra (o deja el texto plano legado);
  // al volver a guardar, el transformer cifra. Idempotente.
  async reencriptarCredenciales() {
    const empresas = await this.dataSource.manager.find(Empresa);
    let procesadas = 0;
    for (const empresa of empresas) {
      if (empresa.sol_clave || empresa.sunat_client_secret) {
        await this.dataSource.manager.save(empresa);
        procesadas++;
      }
    }
    return {
      mensaje: 'Credenciales SUNAT re-encriptadas en reposo',
      empresas_procesadas: procesadas,
    };
  }

  // KPIs globales del sistema
  async kpisGlobales() {
    const totalEmpresas = await this.dataSource.getRepository(Empresa).count();

    const empresasActivas = await this.dataSource
      .getRepository(Empresa)
      .createQueryBuilder('e')
      .where('e.estado_suscripcion = :estado', { estado: 'ACTIVA' })
      .getCount();

    const totalComprobantes = await this.dataSource.getRepository(Venta).count();

    const comprobantesAceptados = await this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('v')
      .where('v.estado_sunat = :estado', { estado: 'ACEPTADO' })
      .getCount();

    // Comprobantes emitidos hoy
    const hoy = fechaActualLima()
    const comprobantesHoy = await this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('v')
      .where('DATE(v.fecha_emision) = :hoy', { hoy })
      .getCount();

    // Distribución por plan
    const empresasPorPlan = await this.dataSource
      .getRepository(Empresa)
      .createQueryBuilder('e')
      .select('e.plan', 'plan')
      .addSelect('COUNT(*)', 'cantidad')
      .groupBy('e.plan')
      .getRawMany();

    return {
      total_empresas: totalEmpresas,
      empresas_activas: empresasActivas,
      empresas_suspendidas: totalEmpresas - empresasActivas,
      total_comprobantes: totalComprobantes,
      comprobantes_aceptados: comprobantesAceptados,
      comprobantes_hoy: comprobantesHoy,
      empresas_por_plan: empresasPorPlan,
    };
  }
}