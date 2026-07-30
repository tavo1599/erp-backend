// src/admin/admin.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { EmpresaUsuario } from '../usuarios/entities/empresa-usuario.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { Almacen } from '../almacenes/entities/almacen.entity';
import { PagoSuscripcion } from './entities/pago-suscripcion.entity';
import { CreateEmpresaDto } from '../empresas/dto/create-empresa.dto';
import { Rol } from '../auth/roles.enum';
import { fechaActualLima } from '../common/utils/fecha.util';
import { MailService } from '../common/mail/mail.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  private appUrl(): string {
    return process.env.APP_URL || 'https://app.faktur.pe';
  }

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

      // Almacenes / sucursales de la empresa
      const totalAlmacenes = await this.dataSource
        .getRepository(Almacen)
        .createQueryBuilder('a')
        .where('a.empresa_id = :id AND a.activo = true', { id: empresa.id })
        .getCount();

      // Correo del admin de la empresa
      const admin = await this.dataSource
        .getRepository(EmpresaUsuario)
        .createQueryBuilder('eu')
        .innerJoin(Usuario, 'u', 'u.id = eu.usuario_id')
        .where('eu.empresa_id = :id', { id: empresa.id })
        .select('u.email', 'email')
        .orderBy('eu.rol', 'ASC')
        .limit(1)
        .getRawOne();

      resultado.push({
        id: empresa.id,
        ruc: empresa.ruc,
        razon_social: empresa.razon_social,
        ambiente: empresa.ambiente || 'beta',
        plan: empresa.plan || 'GRATUITO',
        estado_suscripcion: empresa.estado_suscripcion || 'ACTIVA',
        fecha_inicio_suscripcion: empresa.fecha_inicio_suscripcion,
        fecha_fin_suscripcion: empresa.fecha_fin_suscripcion,
        total_comprobantes: totalComprobantes,
        total_usuarios: totalUsuarios,
        total_almacenes: totalAlmacenes,
        admin_email: admin?.email || null,
        comprobantes_emitidos_mes: empresa.comprobantes_emitidos_mes || 0,
        limite_comprobantes_mes: empresa.limite_comprobantes_mes || 0,
        fecha_creacion: empresa.fecha_creacion,
      });
    }
    return resultado;
  }

  // Crear una empresa nueva CON su primer admin (transacción)
  async crearEmpresaConAdmin(dto: CreateEmpresaDto) {
    const resultado = await this.dataSource.transaction(async (manager) => {
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

    // Enviar las credenciales por correo al admin (fuera de la transacción).
    // Si el correo no está configurado o falla, la empresa igual queda creada.
    let correoEnviado = false;
    try {
      await this.mailService.enviar(
        dto.admin_email,
        `Bienvenido a tu sistema de facturación — ${resultado.razon_social}`,
        `
          <p>Hola ${dto.admin_nombre},</p>
          <p>Tu cuenta para <strong>${resultado.razon_social}</strong> (RUC ${resultado.ruc}) ya está creada.</p>
          <p><strong>Ingresa aquí:</strong> <a href="${this.appUrl()}">${this.appUrl()}</a></p>
          <p><strong>Usuario:</strong> ${dto.admin_email}<br/>
          <strong>Contraseña:</strong> ${dto.admin_password}</p>
          <p>Te recomendamos cambiar la contraseña al primer ingreso.</p>
          <p>¡Bienvenido!</p>
        `,
      );
      correoEnviado = true;
    } catch {
      correoEnviado = false;
    }

    return { ...resultado, correo_credenciales_enviado: correoEnviado };
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

  // ============================================================
  // PAGOS DE SUSCRIPCIÓN
  // ============================================================
  async registrarPago(
    empresaId: string,
    dto: { monto: number; meses?: number; metodo?: string; notas?: string },
    registradoPor?: string,
  ) {
    const empresa = await this.dataSource.manager.findOne(Empresa, { where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');
    if (!dto.monto || dto.monto <= 0) throw new BadRequestException('Monto inválido');

    const meses = dto.meses && dto.meses > 0 ? dto.meses : 1;
    const hoy = new Date();
    // Si la suscripción sigue vigente, se extiende desde su fin; si no, desde hoy.
    const finActual = empresa.fecha_fin_suscripcion ? new Date(empresa.fecha_fin_suscripcion) : null;
    const base = finActual && finActual > hoy ? finActual : hoy;
    const nuevaFin = new Date(base);
    nuevaFin.setMonth(nuevaFin.getMonth() + meses);
    const periodoHasta = nuevaFin.toISOString().split('T')[0];

    const pago = this.dataSource.manager.create(PagoSuscripcion, {
      empresa_id: empresaId,
      monto: Number(dto.monto),
      meses,
      metodo: dto.metodo || 'EFECTIVO',
      fecha_pago: fechaActualLima(),
      periodo_hasta: periodoHasta,
      registrado_por: registradoPor || null,
      notas: dto.notas || null,
    });
    await this.dataSource.manager.save(pago);

    if (!empresa.fecha_inicio_suscripcion) empresa.fecha_inicio_suscripcion = hoy;
    empresa.fecha_fin_suscripcion = nuevaFin;
    empresa.estado_suscripcion = 'ACTIVA';
    await this.dataSource.manager.save(empresa);

    return {
      mensaje: 'Pago registrado. Suscripción extendida.',
      periodo_hasta: periodoHasta,
      monto: Number(dto.monto),
      meses,
    };
  }

  async listarPagos(empresaId: string) {
    return this.dataSource.getRepository(PagoSuscripcion).find({
      where: { empresa_id: empresaId },
      order: { fecha_pago: 'DESC' },
    });
  }

  private async correoAdminEmpresa(empresaId: string): Promise<string | null> {
    const admin = await this.dataSource
      .getRepository(EmpresaUsuario)
      .createQueryBuilder('eu')
      .innerJoin(Usuario, 'u', 'u.id = eu.usuario_id')
      .where('eu.empresa_id = :id', { id: empresaId })
      .select('u.email', 'email')
      .orderBy('eu.rol', 'ASC')
      .limit(1)
      .getRawOne();
    return admin?.email || null;
  }

  async enviarRecordatorioPago(empresaId: string) {
    const empresa = await this.dataSource.manager.findOne(Empresa, { where: { id: empresaId } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');
    const correo = await this.correoAdminEmpresa(empresaId);
    if (!correo) throw new BadRequestException('La empresa no tiene un correo de administrador');

    const fin = empresa.fecha_fin_suscripcion
      ? new Date(empresa.fecha_fin_suscripcion).toLocaleDateString('es-PE')
      : 'pendiente';

    await this.mailService.enviar(
      correo,
      `Recordatorio de pago — ${empresa.razon_social}`,
      `
        <p>Estimado cliente,</p>
        <p>Le recordamos que su suscripción del sistema de facturación
        (<strong>${empresa.razon_social}</strong>, plan ${empresa.plan}) vence el
        <strong>${fin}</strong>.</p>
        <p>Para no interrumpir el servicio, por favor realice el pago de su próxima mensualidad.</p>
        <p>Gracias por su preferencia.</p>
      `,
    );
    return { mensaje: `Recordatorio enviado a ${correo}` };
  }

  // ============================================================
  // DASHBOARD SUPER ADMIN (ingresos + suscripciones)
  // ============================================================
  async dashboardSuperAdmin() {
    const pagosRepo = this.dataSource.getRepository(PagoSuscripcion);

    const totalRow = await pagosRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.monto), 0)', 'total')
      .getRawOne();

    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const mesRow = await pagosRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.monto), 0)', 'total')
      .where('p.fecha_pago >= :desde', { desde: primerDiaMes })
      .getRawOne();

    // Ingresos últimos 6 meses (por mes)
    const ingresosPorMes = await pagosRepo
      .createQueryBuilder('p')
      .select("TO_CHAR(p.fecha_pago, 'YYYY-MM')", 'mes')
      .addSelect('COALESCE(SUM(p.monto), 0)', 'total')
      .groupBy("TO_CHAR(p.fecha_pago, 'YYYY-MM')")
      .orderBy('mes', 'DESC')
      .limit(6)
      .getRawMany();

    const empresasRepo = this.dataSource.getRepository(Empresa);
    const totalEmpresas = await empresasRepo.count();
    const activas = await empresasRepo
      .createQueryBuilder('e')
      .where("e.estado_suscripcion = 'ACTIVA'")
      .getCount();

    const porPlan = await empresasRepo
      .createQueryBuilder('e')
      .select('e.plan', 'plan')
      .addSelect('COUNT(*)', 'cantidad')
      .groupBy('e.plan')
      .getRawMany();

    // Próximos vencimientos (o ya vencidas): las 8 más cercanas
    const proximos = await empresasRepo
      .createQueryBuilder('e')
      .where('e.fecha_fin_suscripcion IS NOT NULL')
      .orderBy('e.fecha_fin_suscripcion', 'ASC')
      .limit(8)
      .getMany();

    const hoyMs = Date.now();
    const proximosVencimientos = proximos.map((e) => {
      const fin = e.fecha_fin_suscripcion ? new Date(e.fecha_fin_suscripcion) : null;
      const dias = fin ? Math.ceil((fin.getTime() - hoyMs) / 86400000) : null;
      return {
        id: e.id,
        razon_social: e.razon_social,
        plan: e.plan,
        estado_suscripcion: e.estado_suscripcion,
        fecha_fin_suscripcion: e.fecha_fin_suscripcion,
        dias_restantes: dias,
      };
    });

    return {
      ingresos_total: Number(Number(totalRow?.total || 0).toFixed(2)),
      ingresos_mes: Number(Number(mesRow?.total || 0).toFixed(2)),
      ingresos_por_mes: ingresosPorMes
        .map((r) => ({ mes: r.mes, total: Number(r.total) }))
        .reverse(),
      total_empresas: totalEmpresas,
      empresas_activas: activas,
      empresas_suspendidas: totalEmpresas - activas,
      empresas_por_plan: porPlan.map((r) => ({ plan: r.plan, cantidad: Number(r.cantidad) })),
      proximos_vencimientos: proximosVencimientos,
    };
  }
}