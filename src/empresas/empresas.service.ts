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
    try {
      const formData = new FormData();
      formData.append('archivo', certificado.buffer, {
        filename: certificado.originalname || 'certificate.pfx',
        contentType: 'application/x-pkcs12',
      });
      formData.append('password', passwordCertificado);
      formData.append('ambiente', 'beta');

      const urlJava = `http://localhost:8089/api/certificados/${createEmpresaDto.ruc}/upload`;

      const respuestaJava = await firstValueFrom(
        this.httpService.post(urlJava, formData, {
          headers: formData.getHeaders(),
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
    return await this.empresaRepository.find();
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

  try {
    await firstValueFrom(
      this.httpService.post(
        `http://localhost:8089/api/certificados/${empresa.ruc}/upload?ambiente=${empresa.ambiente}`,
        formData,
        { headers: formData.getHeaders() },
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

}