// src/empresas/empresas.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData = require('form-data');
import { Multer } from 'multer';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { Empresa } from './entities/empresa.entity';
import { PdfService } from '../ventas/pdf.service';
import { cabecerasMotor } from '../common/motor-java.util';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    private readonly httpService: HttpService,
    private readonly pdfService: PdfService,
  ) {}

  async createConCertificado(
    createEmpresaDto: CreateEmpresaDto,
    certificado: Express.Multer.File,
    passwordCertificado: string,
  ) {
    // 1. Guardar la empresa en PostgreSQL
    let empresaGuardada: Empresa;
    try {
      const nuevaEmpresa = this.empresaRepository.create(createEmpresaDto);
      empresaGuardada = await this.empresaRepository.save(nuevaEmpresa);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe una empresa registrada con este RUC.');
      }
      throw new BadRequestException('Error al crear la empresa: ' + error.message);
    }

    // 2. Reenviar el certificado .pfx a Java
    const motorJavaUrl = process.env.JAVA_MOTOR_URL || 'http://localhost:8089';
    try {
      const formData = new FormData();
      formData.append('archivo', certificado.buffer, {
        filename: certificado.originalname || 'certificate.pfx',
        contentType: 'application/x-pkcs12',
      });
      formData.append('password', passwordCertificado);
      formData.append('ambiente', 'beta');

      const urlJava = `${motorJavaUrl}/api/certificados/${createEmpresaDto.ruc}/upload`;

      const respuestaJava = await firstValueFrom(
        this.httpService.post(urlJava, formData, {
          headers: cabecerasMotor(formData.getHeaders()),
        }),
      );

      return {
        mensaje: 'Empresa creada y certificado subido correctamente',
        empresa: empresaGuardada,
        certificado_java: respuestaJava.data,
      };
    } catch (error: any) {
      // La empresa ya se guardó, pero el certificado falló
      return {
        mensaje: 'Empresa creada, PERO falló la subida del certificado a Java',
        empresa: empresaGuardada,
        error_certificado: error.response?.data || error.message,
        nota: 'Puede reintentar subir el certificado directamente a Java',
      };
    }
  }

  async create(createEmpresaDto: CreateEmpresaDto) {
    try {
      const nuevaEmpresa = this.empresaRepository.create(createEmpresaDto);
      return await this.empresaRepository.save(nuevaEmpresa);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe una empresa registrada con este RUC.');
      }
      throw new BadRequestException('Error al crear la empresa');
    }
  }

  async findAll() {
    // Nunca exponer credenciales sensibles (sol_clave, sunat_client_secret) en un listado.
    const empresas = await this.empresaRepository.find();
    return empresas.map((e) => ({
      id: e.id,
      ruc: e.ruc,
      razon_social: e.razon_social,
      nombre_comercial: e.nombre_comercial,
      estado: e.estado,
      ambiente: e.ambiente,
      plan: e.plan,
      estado_suscripcion: e.estado_suscripcion,
      fecha_fin_suscripcion: e.fecha_fin_suscripcion,
      comprobantes_emitidos_mes: e.comprobantes_emitidos_mes,
      limite_comprobantes_mes: e.limite_comprobantes_mes,
      created_at: e.created_at,
    }));
  }

  // Obtener los datos de una empresa
  async obtener(id: string) {
    const empresa = await this.empresaRepository.findOne({ where: { id } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');
    // No devolvemos datos sensibles como la clave SOL
    return {
      id: empresa.id,
      ruc: empresa.ruc,
      razon_social: empresa.razon_social,
      nombre_comercial: empresa.nombre_comercial,
      direccion: empresa.direccion,
      ubigeo: empresa.ubigeo,
      departamento: empresa.departamento,
      provincia: empresa.provincia,
      distrito: empresa.distrito,
      sol_usuario: empresa.sol_usuario,
      estado: empresa.estado,
      ambiente: empresa.ambiente,

    };
  }

  // Actualizar datos de la empresa (no el certificado ni RUC)
async actualizar(id: string, datos: any) {
    console.log('=== ACTUALIZAR EMPRESA ===');
    console.log('Datos recibidos:', datos);  // ← ver qué llega
    
    const empresa = await this.empresaRepository.findOne({ where: { id } });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');

    const camposEditables = [
      'razon_social', 'nombre_comercial', 'direccion',
      'ubigeo', 'departamento', 'provincia', 'distrito', 'sol_usuario',
      'ambiente',
    ];
    for (const campo of camposEditables) {
      if (datos[campo] !== undefined) {
        empresa[campo] = datos[campo];
      }
    }
    console.log('Empresa antes de guardar:', { ambiente: empresa.ambiente });
    await this.empresaRepository.save(empresa);
    return { mensaje: 'Datos de la empresa actualizados' };
  }

  async actualizarCredencialesSol(
  empresaId: string,
  sol_usuario: string,
  sol_clave: string,
) {
  const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
  if (!empresa) throw new BadRequestException('Empresa no encontrada');

  if (!sol_usuario || !sol_clave) {
    throw new BadRequestException('Usuario y clave SOL son obligatorios');
  }

  empresa.sol_usuario = sol_usuario;
  empresa.sol_clave = sol_clave;
  await this.empresaRepository.save(empresa);

  return { mensaje: 'Credenciales SOL actualizadas correctamente' };
}
async actualizarCertificado(
  empresaId: string,
  archivo: Express.Multer.File,
  password_certificado: string,
) {
  const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
  if (!empresa) throw new BadRequestException('Empresa no encontrada');

  if (!archivo) throw new BadRequestException('Debes adjuntar el archivo .pfx');
  if (!password_certificado) throw new BadRequestException('La contraseña del certificado es obligatoria');

  // Enviar el certificado al motor Java (mismo flujo que al crear empresa)
  const FormData = require('form-data');
  const formData = new FormData();
  formData.append('archivo', archivo.buffer, archivo.originalname);
  formData.append('password', password_certificado);
const motorJavaUrl = process.env.JAVA_MOTOR_URL || 'http://localhost:8089';
  try {
    await firstValueFrom(
      this.httpService.post(
        `${motorJavaUrl}/api/certificados/${empresa.ruc}/upload?ambiente=${empresa.ambiente}`,
        formData,
        { headers: cabecerasMotor(formData.getHeaders()) },
      ),
    );
  } catch (e: any) {
    throw new BadRequestException(
      'Error al cargar el certificado en el motor SUNAT: ' +
        (e.response?.data?.message || e.message),
    );
  }

  return { mensaje: 'Certificado actualizado correctamente' };
}

async obtenerPorId(id: string) {
  const empresa = await this.empresaRepository.findOne({ where: { id } });
  if (!empresa) {
    throw new BadRequestException('Empresa no encontrada');
  }
  return empresa;
}

async actualizarPersonalizacion(
  empresaId: string,
  datos: {
    color_pdf?: string;
    frase_pie_pdf?: string;
    cuentas_bancarias?: string;
  },
) {
  const empresa = await this.obtenerPorId(empresaId);

  if (datos.color_pdf !== undefined) {
    empresa.color_pdf = datos.color_pdf || null;
  }
  if (datos.frase_pie_pdf !== undefined) {
    empresa.frase_pie_pdf = datos.frase_pie_pdf || null;
  }
  if (datos.cuentas_bancarias !== undefined) {
    empresa.cuentas_bancarias = datos.cuentas_bancarias || null;
  }

  await this.empresaRepository.save(empresa);
  return { mensaje: 'Personalización actualizada' };
}

async actualizarLogo(empresaId: string, logoUrl: string | null) {
  const empresa = await this.obtenerPorId(empresaId);
  empresa.logo_url = logoUrl;
  await this.empresaRepository.save(empresa);
  return empresa;
}

// Genera un PDF de ejemplo aplicando la personalización temporal
// Genera un PDF de ejemplo aplicando la personalización temporal
async generarPreviewPdf(
  empresaId: string,
  personalizacion: {
    color_pdf?: string;
    frase_pie_pdf?: string;
    cuentas_bancarias?: string;
  },
): Promise<Buffer> {
  // Usar obtenerPorId que devuelve la entidad completa con TODOS los campos
  const empresa = await this.obtenerPorId(empresaId);

  // Aplicar personalización temporal (sin guardar en BD)
  const empresaTemporal: any = {
    ...empresa,
    color_pdf: personalizacion.color_pdf ?? empresa.color_pdf,
    frase_pie_pdf: personalizacion.frase_pie_pdf ?? empresa.frase_pie_pdf,
    cuentas_bancarias: personalizacion.cuentas_bancarias ?? empresa.cuentas_bancarias,
  };

  // Crear una venta de EJEMPLO
  const ventaEjemplo: any = {
    tipo_comprobante: '01',
    serie: 'F001',
    correlativo: 1,
    fecha_emision: new Date(),
    cliente_razon_social: 'CLIENTE DE PRUEBA S.A.C.',
    cliente_numero_documento: '20100070970',
    total_gravado: 100.00,
    total_exonerado: 0,
    total_inafecto: 0,
    total_igv: 18.00,
    importe_total: 118.00,
    condicion_pago: 'CONTADO',
    sunat_hash: 'preview-no-real-hash',
  };

  // Detalles de ejemplo (con `any` para evitar problemas de tipos)
  const detallesEjemplo: any[] = [
    {
      producto: {
        nombre: 'Producto de ejemplo 1',
        codigo_sunat: 'P001',
        unidad_medida: 'NIU',
        tipo_igv: '10',
      },
      cantidad: 1,
      precio_unitario: 100.00,
      subtotal: 100.00,
    },
    {
      producto: {
        nombre: 'Producto de ejemplo 2',
        codigo_sunat: 'P002',
        unidad_medida: 'NIU',
        tipo_igv: '10',
      },
      cantidad: 2,
      precio_unitario: 50.00,
      subtotal: 100.00,
    },
  ];

  // Generar PDF
  return await this.pdfService.generarA4({
    venta: ventaEjemplo,
    empresa: empresaTemporal,
    detalles: detallesEjemplo,
  });
}

/**
 * Verifica si la empresa está lista para emitir comprobantes.
 * Revisa credenciales SOL en BD y certificado en el motor Java.
 */
async verificarConfiguracion(empresaId: string) {
  const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
  if (!empresa) throw new BadRequestException('Empresa no encontrada');

  const tieneCredencialesSol = !!(empresa.sol_usuario && empresa.sol_clave);
  
  // Verificar certificado preguntando al motor Java
  let tieneCertificado = false;
  try {
    const motorJavaUrl = process.env.JAVA_MOTOR_URL || 'http://localhost:8089';
    const resp = await firstValueFrom(
      this.httpService.get(`${motorJavaUrl}/api/certificados/${empresa.ruc}/existe`, {
        timeout: 5000,
        headers: cabecerasMotor(),
      }),
    );
    tieneCertificado = resp.data?.existe === true;
  } catch {
    tieneCertificado = false;
  }

  const faltantes: string[] = [];
  if (!tieneCertificado) faltantes.push('certificado');
  if (!tieneCredencialesSol) faltantes.push('credenciales_sol');

  return {
    empresa_id: empresa.id,
    ruc: empresa.ruc,
    razon_social: empresa.razon_social,
    ambiente: empresa.ambiente || 'beta',
    tiene_certificado: tieneCertificado,
    tiene_credenciales_sol: tieneCredencialesSol,
    todo_listo: tieneCertificado && tieneCredencialesSol,
    faltantes,
  };
}

async actualizarCuentaDetraccion(
  empresaId: string, 
  cuenta_detraccion: string,
  cuenta_detraccion_cci?: string,
) {
  const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
  if (!empresa) throw new BadRequestException('Empresa no encontrada');

  empresa.cuenta_detraccion = cuenta_detraccion;
  empresa.cuenta_detraccion_cci = cuenta_detraccion_cci || null;
  await this.empresaRepository.save(empresa);

  return { mensaje: 'Cuenta de detracción actualizada correctamente' };
}

}