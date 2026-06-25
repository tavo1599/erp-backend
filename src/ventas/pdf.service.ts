// src/ventas/pdf.service.ts
import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { Venta } from './entities/venta.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Nota } from '../notas/entities/nota.entity';
import { sanitizarTextoPdf, sanitizarProducto } from './utils/sanitizar';

interface DatosPdf {
  venta: Venta;
  empresa: Empresa;
  detalles: Array<{ producto: Producto | null; cantidad: number; precio_unitario: number; subtotal: number }>;
}

interface DatosPdfGuia {
  guia: any;
  empresa: Empresa;
}

@Injectable()
export class PdfService {
  // Color por defecto si la empresa no tiene uno configurado
  private readonly COLOR_DEFAULT = '#c2643f';

  // ============ HELPERS DE PERSONALIZACIÓN ============

  /**
   * Devuelve el color del PDF de la empresa o el por defecto
   */
  private obtenerColor(empresa: Empresa): string {
    return empresa.color_pdf || this.COLOR_DEFAULT;
  }

  /**
   * Intenta cargar el logo desde el disco. Devuelve la ruta o null si no existe.
   */
  private obtenerRutaLogo(empresa: Empresa): string | null {
    if (!empresa.logo_url) return null;
    try {
      // logo_url tiene formato: /uploads/logos/{empresa_id}.png
      // En disco: ./uploads/logos/{empresa_id}.png
      const rutaRelativa = empresa.logo_url.startsWith('/')
        ? empresa.logo_url.substring(1)
        : empresa.logo_url;
      const rutaCompleta = path.join(process.cwd(), rutaRelativa);
      if (fs.existsSync(rutaCompleta)) {
        return rutaCompleta;
      }
    } catch (e) {
      console.warn('Error cargando logo:', e);
    }
    return null;
  }

  // ============ FORMATO A4 ============
  async generarA4(datos: DatosPdf): Promise<Buffer> {
    const { venta, empresa } = datos;
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));

    const color = this.obtenerColor(empresa);
    const rutaLogo = this.obtenerRutaLogo(empresa);

    const tipoNombre = venta.tipo_comprobante === '01' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';
    const comprobante = `${venta.serie}-${String(venta.correlativo).padStart(8, '0')}`;

    const empresaRazonSocial = sanitizarTextoPdf(empresa.razon_social, 200);
    const empresaNombreComercial = sanitizarTextoPdf(empresa.nombre_comercial, 200);
    const empresaDireccion = sanitizarTextoPdf(empresa.direccion, 250);
    const empresaDistrito = sanitizarTextoPdf(empresa.distrito, 50);
    const empresaProvincia = sanitizarTextoPdf(empresa.provincia, 50);
    const empresaDepartamento = sanitizarTextoPdf(empresa.departamento, 50);

    // --- LOGO (si existe) ---
    let xInicioTextoEmisor = 40;
    if (rutaLogo) {
      try {
        doc.image(rutaLogo, 40, 45, { fit: [70, 70] });
        xInicioTextoEmisor = 120;
      } catch (e) {
        console.warn('No se pudo insertar el logo:', e);
      }
    }

    // --- ENCABEZADO: datos del emisor ---
// --- ENCABEZADO: datos del emisor ---
// Ancho limitado para que NO se monte sobre el recuadro del RUC (que empieza en 380)
// Si hay logo (xInicioTextoEmisor=120) → ancho 240
// Si no hay logo (xInicioTextoEmisor=40)  → ancho 320
const anchoEmisor = 380 - xInicioTextoEmisor - 10; // 10px de margen

doc.fontSize(14).font('Helvetica-Bold').fillColor(color)
  .text(empresaRazonSocial, xInicioTextoEmisor, 50, { width: anchoEmisor });

// Calcular dónde quedó el cursor después del nombre (puede ser 1 o 2 líneas)
let yEmisor = doc.y + 4;

doc.fillColor('black').fontSize(9).font('Helvetica');

if (empresaNombreComercial && empresaNombreComercial !== empresaRazonSocial) {
  doc.text(empresaNombreComercial, xInicioTextoEmisor, yEmisor, { width: anchoEmisor });
  yEmisor = doc.y + 2;
}

doc.text(empresaDireccion, xInicioTextoEmisor, yEmisor, { width: anchoEmisor });
yEmisor = doc.y + 2;

doc.text(
  `${empresaDistrito} - ${empresaProvincia} - ${empresaDepartamento}`,
  xInicioTextoEmisor,
  yEmisor,
  { width: anchoEmisor },
);

    // --- RECUADRO: RUC y comprobante ---
    doc.lineWidth(1.5).strokeColor(color).rect(380, 50, 175, 70).stroke();
    doc.strokeColor('black').lineWidth(1);
    doc.fillColor(color).fontSize(11).font('Helvetica-Bold')
      .text(`RUC: ${empresa.ruc}`, 380, 58, { width: 175, align: 'center' })
      .text(tipoNombre, 380, 74, { width: 175, align: 'center' })
      .fontSize(12).text(comprobante, 380, 100, { width: 175, align: 'center' });
    doc.fillColor('black');

    const clienteRazonSocial = sanitizarTextoPdf(venta.cliente_razon_social, 200);
    const clienteDocumento = sanitizarTextoPdf(venta.cliente_numero_documento, 20);

    // --- DATOS DEL CLIENTE ---
    let y = 140;
    doc.fontSize(9).font('Helvetica')
      .text(`Cliente: ${clienteRazonSocial}`, 40, y)
      .text(`${clienteDocumento.length === 11 ? 'RUC' : 'DNI'}: ${clienteDocumento}`, 40, y + 14)
      .text(`Fecha de emisión: ${new Date(venta.fecha_emision).toLocaleDateString('es-PE')}`, 40, y + 28)
      .text(`Moneda: SOLES`, 40, y + 42);

    // --- TABLA DE ITEMS ---
    y = 210;
    // Encabezado con color personalizado
    doc.rect(40, y, 515, 22).fillAndStroke(color, color);
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold')
      .text('Cant.', 45, y + 7, { width: 35 })
      .text('Código', 82, y + 7, { width: 55 })
      .text('Descripción', 140, y + 7, { width: 215 })
      .text('IGV', 360, y + 7, { width: 30, align: 'center' })
      .text('P. Unit.', 392, y + 7, { width: 60, align: 'right' })
      .text('Importe', 460, y + 7, { width: 90, align: 'right' });

    y += 28;
    doc.fillColor('black').font('Helvetica').fontSize(8);
    for (const d of datos.detalles) {
      const nombre = sanitizarProducto(d.producto?.nombre);
      const codigo = sanitizarTextoPdf(d.producto?.codigo_sunat, 30) || '—';
      const tipoIgv = d.producto?.tipo_igv || '10';
      const afectacion = this.etiquetaAfectacion(tipoIgv);

      doc.text(String(d.cantidad), 45, y, { width: 35 })
        .text(codigo, 82, y, { width: 55 })
        .text(nombre, 140, y, { width: 215 })
        .text(afectacion, 360, y, { width: 30, align: 'center' })
        .text(Number(d.precio_unitario).toFixed(2), 392, y, { width: 60, align: 'right' })
        .text(Number(d.subtotal).toFixed(2), 460, y, { width: 90, align: 'right' });
      y += 16;
    }

    // --- TOTALES ---
    y += 14;
    doc.font('Helvetica').fontSize(9);

    const totalGravado = Number(venta.total_gravado || 0);
    const totalExonerado = Number(venta.total_exonerado || 0);
    const totalInafecto = Number(venta.total_inafecto || 0);
    const totalIgv = Number(venta.total_igv || 0);
    const importeTotal = Number(venta.importe_total || 0);

    if (totalGravado > 0) {
      doc.text('Op. Gravada: S/', 380, y, { width: 90, align: 'right' })
        .text(totalGravado.toFixed(2), 470, y, { width: 80, align: 'right' });
      y += 14;
    }
    if (totalExonerado > 0) {
      doc.text('Op. Exonerada: S/', 380, y, { width: 90, align: 'right' })
        .text(totalExonerado.toFixed(2), 470, y, { width: 80, align: 'right' });
      y += 14;
    }
    if (totalInafecto > 0) {
      doc.text('Op. Inafecta: S/', 380, y, { width: 90, align: 'right' })
        .text(totalInafecto.toFixed(2), 470, y, { width: 80, align: 'right' });
      y += 14;
    }
    if (totalIgv > 0) {
      doc.text('IGV (18%): S/', 380, y, { width: 90, align: 'right' })
        .text(totalIgv.toFixed(2), 470, y, { width: 80, align: 'right' });
      y += 14;
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor(color)
      .text('TOTAL: S/', 380, y + 6, { width: 90, align: 'right' })
      .text(importeTotal.toFixed(2), 470, y + 6, { width: 80, align: 'right' });
    doc.fillColor('black');

    const montoEnLetras = this.numeroALetras(importeTotal) + ' SOLES';
    doc.font('Helvetica').fontSize(8)
      .text(`Son: ${montoEnLetras}`, 40, y + 30, { width: 515 });

    let yActual = y + 55;

    // --- CUENTAS BANCARIAS (si existen) ---
    if (empresa.cuentas_bancarias) {
      const cuentasTexto = sanitizarTextoPdf(empresa.cuentas_bancarias, 500);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(color)
        .text('CUENTAS BANCARIAS', 40, yActual, { width: 515 });
      doc.fillColor('black').font('Helvetica').fontSize(8)
        .text(cuentasTexto, 40, yActual + 12, { width: 515 });
      // Calcular cuántas líneas tomó
      const lineas = cuentasTexto.split('\n').length;
      yActual += 14 + (lineas * 10);
    }

    // --- FRASE AL PIE (si existe) ---
    if (empresa.frase_pie_pdf) {
      const frase = sanitizarTextoPdf(empresa.frase_pie_pdf, 300);
      doc.fontSize(9).font('Helvetica-Oblique').fillColor(color)
        .text(frase, 40, yActual, { width: 515, align: 'center' });
      doc.fillColor('black');
      yActual += 20;
    }

    // --- QR ---
    const qrData = this.construirQrSunat(venta, empresa);
    const qrImg = await QRCode.toDataURL(qrData, { margin: 1, width: 120 });
    doc.image(qrImg, 40, yActual + 5, { width: 110 });

    doc.fontSize(7).font('Helvetica')
      .text(`Representación impresa de la ${tipoNombre}.`, 160, yActual + 15, { width: 395 })
      .text('Consulte su validez en el portal de SUNAT.', 160, yActual + 27, { width: 395 })
      .text(`Hash: ${venta.sunat_hash || ''}`, 160, yActual + 39, { width: 395 });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private etiquetaAfectacion(tipoIgv: string): string {
    if (tipoIgv === '10') return 'Gra';
    if (tipoIgv === '20') return 'Exo';
    if (tipoIgv === '30') return 'Ina';
    if (tipoIgv === '40') return 'Exp';
    return tipoIgv;
  }

  // ============ FORMATO TICKET 80mm ============
  async generarTicket(datos: DatosPdf): Promise<Buffer> {
    const { venta, empresa } = datos;
    const doc = new PDFDocument({ size: [226, 800], margin: 10 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));

    const rutaLogo = this.obtenerRutaLogo(empresa);
    const tipoNombre = venta.tipo_comprobante === '01' ? 'FACTURA ELECTRÓNICA' : 'BOLETA ELECTRÓNICA';
    const comprobante = `${venta.serie}-${String(venta.correlativo).padStart(8, '0')}`;
    const anchoTotal = 206;
    const cx = 113;

    const empresaRazonSocial = sanitizarTextoPdf(empresa.razon_social, 150);
    const empresaDireccion = sanitizarTextoPdf(empresa.direccion, 200);
    const empresaDistrito = sanitizarTextoPdf(empresa.distrito, 50);
    const empresaProvincia = sanitizarTextoPdf(empresa.provincia, 50);

    let y = 12;

    // --- LOGO (centrado, si existe) ---
    if (rutaLogo) {
      try {
        doc.image(rutaLogo, cx - 25, y, { fit: [50, 50] });
        y += 55;
      } catch (e) {
        console.warn('No se pudo insertar logo en ticket:', e);
      }
    }

    // --- ENCABEZADO DEL EMISOR ---
    doc.fontSize(10).font('Helvetica-Bold')
      .text(empresaRazonSocial, 10, y, { width: anchoTotal, align: 'center' });
    y += 16;

    doc.fontSize(7).font('Helvetica')
      .text(`RUC: ${empresa.ruc}`, 10, y, { width: anchoTotal, align: 'center' });
    y += 10;

    if (empresaDireccion) {
      doc.text(empresaDireccion, 10, y, { width: anchoTotal, align: 'center' });
      y += 10;
    }
    if (empresaDistrito) {
      doc.text(`${empresaDistrito} - ${empresaProvincia}`, 10, y, { width: anchoTotal, align: 'center' });
      y += 10;
    }

    y += 4;
    doc.moveTo(10, y).lineTo(216, y).dash(1, { space: 1 }).stroke().undash();
    y += 6;

    doc.fontSize(9).font('Helvetica-Bold')
      .text(tipoNombre, 10, y, { width: anchoTotal, align: 'center' });
    y += 12;
    doc.fontSize(8).font('Helvetica-Bold')
      .text(comprobante, 10, y, { width: anchoTotal, align: 'center' });
    y += 14;

    doc.moveTo(10, y).lineTo(216, y).dash(1, { space: 1 }).stroke().undash();
    y += 6;

    const clienteRazonSocial = sanitizarTextoPdf(venta.cliente_razon_social, 150);
    const clienteDocumento = sanitizarTextoPdf(venta.cliente_numero_documento, 20);

    const tipoDoc = clienteDocumento.length === 11 ? 'RUC' : 'DNI';
    doc.fontSize(7).font('Helvetica');
    doc.text(`Cliente: ${clienteRazonSocial}`, 10, y, { width: anchoTotal });
    y += 10;
    doc.text(`${tipoDoc}: ${clienteDocumento}`, 10, y);
    y += 10;

    const fecha = new Date(venta.fecha_emision);
    const fechaStr = fecha.toLocaleDateString('es-PE');
    const horaStr = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Fecha: ${fechaStr}  ${horaStr}`, 10, y);
    y += 10;
    doc.text(`Moneda: SOLES`, 10, y);
    y += 14;

    doc.moveTo(10, y).lineTo(216, y).dash(1, { space: 1 }).stroke().undash();
    y += 6;

    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('DESCRIPCIÓN', 10, y);
    doc.text('IMPORTE', 10, y, { width: anchoTotal, align: 'right' });
    y += 10;
    doc.moveTo(10, y).lineTo(216, y).stroke();
    y += 4;

    doc.fontSize(7).font('Helvetica');
    for (const d of datos.detalles) {
      const nombre = sanitizarProducto(d.producto?.nombre);
      const codigo = sanitizarTextoPdf(d.producto?.codigo_sunat, 30);
      const tipoIgv = d.producto?.tipo_igv || '10';
      const afectacion = this.etiquetaAfectacion(tipoIgv);

      const nombreCompleto = codigo ? `${codigo} ${nombre}` : nombre;
      doc.font('Helvetica-Bold')
        .text(nombreCompleto, 10, y, { width: anchoTotal });
      y += 10;

      doc.font('Helvetica')
        .text(`${d.cantidad} x ${Number(d.precio_unitario).toFixed(2)} (${afectacion})`, 10, y, { width: 140 })
        .text(Number(d.subtotal).toFixed(2), 10, y, { width: anchoTotal, align: 'right' });
      y += 14;
    }

    doc.moveTo(10, y).lineTo(216, y).dash(1, { space: 1 }).stroke().undash();
    y += 6;

    const totalGravado = Number(venta.total_gravado || 0);
    const totalExonerado = Number(venta.total_exonerado || 0);
    const totalInafecto = Number(venta.total_inafecto || 0);
    const totalIgv = Number(venta.total_igv || 0);
    const importeTotal = Number(venta.importe_total || 0);

    doc.fontSize(7).font('Helvetica');
    if (totalGravado > 0) {
      doc.text(`Op. Gravada:`, 10, y, { width: 110 })
        .text(`S/ ${totalGravado.toFixed(2)}`, 10, y, { width: anchoTotal, align: 'right' });
      y += 10;
    }
    if (totalExonerado > 0) {
      doc.text(`Op. Exonerada:`, 10, y, { width: 110 })
        .text(`S/ ${totalExonerado.toFixed(2)}`, 10, y, { width: anchoTotal, align: 'right' });
      y += 10;
    }
    if (totalInafecto > 0) {
      doc.text(`Op. Inafecta:`, 10, y, { width: 110 })
        .text(`S/ ${totalInafecto.toFixed(2)}`, 10, y, { width: anchoTotal, align: 'right' });
      y += 10;
    }
    if (totalIgv > 0) {
      doc.text(`IGV (18%):`, 10, y, { width: 110 })
        .text(`S/ ${totalIgv.toFixed(2)}`, 10, y, { width: anchoTotal, align: 'right' });
      y += 12;
    }

    doc.moveTo(10, y).lineTo(216, y).stroke();
    y += 6;
    doc.fontSize(10).font('Helvetica-Bold')
      .text(`TOTAL:`, 10, y, { width: 80 })
      .text(`S/ ${importeTotal.toFixed(2)}`, 10, y, { width: anchoTotal, align: 'right' });
    y += 16;

    const montoLetras = this.numeroALetras(importeTotal) + ' SOLES';
    doc.fontSize(6).font('Helvetica')
      .text(`SON: ${montoLetras}`, 10, y, { width: anchoTotal });
    y += this.alturaDe(montoLetras, anchoTotal) + 6;

    doc.moveTo(10, y).lineTo(216, y).dash(1, { space: 1 }).stroke().undash();
    y += 6;

    const formaPago = venta.condicion_pago === 'CREDITO' ? 'CRÉDITO' : 'CONTADO';
    doc.fontSize(7).font('Helvetica')
      .text(`Forma de pago: ${formaPago}`, 10, y);
    y += 14;

    // --- CUENTAS BANCARIAS en ticket ---
    if (empresa.cuentas_bancarias) {
      const cuentasTexto = sanitizarTextoPdf(empresa.cuentas_bancarias, 300);
      doc.fontSize(6).font('Helvetica-Bold')
        .text('CUENTAS:', 10, y, { width: anchoTotal });
      y += 8;
      doc.font('Helvetica')
        .text(cuentasTexto, 10, y, { width: anchoTotal });
      y += cuentasTexto.split('\n').length * 8 + 4;
    }

    const qrData = this.construirQrSunat(venta, empresa);
    const qrImg = await QRCode.toDataURL(qrData, { margin: 1, width: 120 });
    const qrTam = 110;
    doc.image(qrImg, cx - qrTam / 2, y, { width: qrTam });
    y += qrTam + 8;

    doc.fontSize(6).font('Helvetica')
      .text('Representación impresa de la', 10, y, { width: anchoTotal, align: 'center' });
    y += 8;
    doc.text(tipoNombre, 10, y, { width: anchoTotal, align: 'center' });
    y += 8;
    doc.text('Consulte su validez en el portal de SUNAT', 10, y, { width: anchoTotal, align: 'center' });
    y += 12;

    if (venta.sunat_hash) {
      doc.fontSize(5).font('Helvetica')
        .text(`Hash: ${venta.sunat_hash}`, 10, y, { width: anchoTotal, align: 'center' });
      y += 10;
    }

    // --- FRASE AL PIE en ticket ---
    if (empresa.frase_pie_pdf) {
      y += 4;
      const frase = sanitizarTextoPdf(empresa.frase_pie_pdf, 200);
      doc.fontSize(7).font('Helvetica-Bold')
        .text(frase, 10, y, { width: anchoTotal, align: 'center' });
    } else {
      y += 8;
      doc.fontSize(7).font('Helvetica-Bold')
        .text('¡Gracias por su compra!', 10, y, { width: anchoTotal, align: 'center' });
    }

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private alturaDe(texto: string, ancho: number): number {
    const charsLine = Math.floor(ancho / 3.5);
    const lineas = Math.ceil(texto.length / charsLine);
    return lineas * 8;
  }

  // ============ PDF DE NOTA (CRÉDITO/DÉBITO) ============
  async generarNotaA4(datos: { nota: Nota; empresa: Empresa }): Promise<Buffer> {
    const { nota, empresa } = datos;
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));

    const color = this.obtenerColor(empresa);
    const rutaLogo = this.obtenerRutaLogo(empresa);
    const tipoNombre = nota.tipo_nota === '07' ? 'NOTA DE CRÉDITO ELECTRÓNICA' : 'NOTA DE DÉBITO ELECTRÓNICA';
    const comprobante = `${nota.serie}-${String(nota.correlativo).padStart(8, '0')}`;

    const empresaRazonSocial = sanitizarTextoPdf(empresa.razon_social, 200);
    const empresaNombreComercial = sanitizarTextoPdf(empresa.nombre_comercial, 200);
    const empresaDireccion = sanitizarTextoPdf(empresa.direccion, 250);
    const empresaDistrito = sanitizarTextoPdf(empresa.distrito, 50);
    const empresaProvincia = sanitizarTextoPdf(empresa.provincia, 50);
    const empresaDepartamento = sanitizarTextoPdf(empresa.departamento, 50);

    // --- LOGO ---
    let xInicioTextoEmisor = 40;
    if (rutaLogo) {
      try {
        doc.image(rutaLogo, 40, 45, { fit: [70, 70] });
        xInicioTextoEmisor = 120;
      } catch {}
    }

    // --- ENCABEZADO ---
// --- ENCABEZADO ---
const anchoEmisor = 380 - xInicioTextoEmisor - 10;

doc.fontSize(14).font('Helvetica-Bold').fillColor(color)
  .text(empresaRazonSocial, xInicioTextoEmisor, 50, { width: anchoEmisor });

let yEmisor = doc.y + 4;
doc.fillColor('black').fontSize(9).font('Helvetica');

if (empresaNombreComercial && empresaNombreComercial !== empresaRazonSocial) {
  doc.text(empresaNombreComercial, xInicioTextoEmisor, yEmisor, { width: anchoEmisor });
  yEmisor = doc.y + 2;
}

doc.text(empresaDireccion, xInicioTextoEmisor, yEmisor, { width: anchoEmisor });
yEmisor = doc.y + 2;

doc.text(
  `${empresaDistrito} - ${empresaProvincia} - ${empresaDepartamento}`,
  xInicioTextoEmisor,
  yEmisor,
  { width: anchoEmisor },
);

    doc.lineWidth(1.5).strokeColor(color).rect(380, 50, 175, 70).stroke();
    doc.strokeColor('black').lineWidth(1);
    doc.fillColor(color).fontSize(11).font('Helvetica-Bold')
      .text(`RUC: ${empresa.ruc}`, 380, 58, { width: 175, align: 'center' })
      .text(tipoNombre, 380, 74, { width: 175, align: 'center' })
      .fontSize(12).text(comprobante, 380, 100, { width: 175, align: 'center' });
    doc.fillColor('black');

    const comprobanteAfectado = sanitizarTextoPdf(nota.comprobante_afectado, 30);
    const descripcionMotivo = sanitizarTextoPdf(nota.descripcion_motivo, 250);
    const clienteRazonSocial = sanitizarTextoPdf(nota.cliente_razon_social, 200);
    const clienteDocumento = sanitizarTextoPdf(nota.cliente_numero_documento, 20);

    let y = 140;
    doc.fontSize(9).font('Helvetica-Bold').text('Documento que modifica:', 40, y);
    doc.font('Helvetica').text(comprobanteAfectado, 175, y);
    doc.font('Helvetica-Bold').text('Motivo:', 40, y + 16);
    doc.font('Helvetica').text(descripcionMotivo, 175, y + 16, { width: 350 });

    y = 195;
    doc.fontSize(9).font('Helvetica')
      .text(`Cliente: ${clienteRazonSocial}`, 40, y)
      .text(`${clienteDocumento.length === 11 ? 'RUC' : 'DNI'}: ${clienteDocumento}`, 40, y + 14)
      .text(`Fecha de emisión: ${new Date(nota.fecha_emision).toLocaleDateString('es-PE')}`, 40, y + 28);

    y = 270;
    doc.rect(380, y, 175, 80).stroke();
    doc.fontSize(9).font('Helvetica')
      .text('Op. Gravada: S/', 388, y + 10, { width: 90, align: 'right' })
      .text(Number(nota.total_gravado).toFixed(2), 478, y + 10, { width: 70, align: 'right' });
    doc.text('IGV (18%): S/', 388, y + 28, { width: 90, align: 'right' })
      .text(Number(nota.total_igv).toFixed(2), 478, y + 28, { width: 70, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(color)
      .text('TOTAL: S/', 388, y + 52, { width: 90, align: 'right' })
      .text(Number(nota.importe_total).toFixed(2), 478, y + 52, { width: 70, align: 'right' });
    doc.fillColor('black');

    const qrData = this.construirQrNota(nota, empresa);
    const qrImg = await QRCode.toDataURL(qrData, { margin: 1, width: 120 });
    doc.image(qrImg, 40, y + 10, { width: 110 });
    doc.fontSize(7).font('Helvetica')
      .text('Representación impresa de la ' + tipoNombre, 40, y + 130, { width: 250 })
      .text(`Hash: ${nota.sunat_hash || ''}`, 40, y + 142, { width: 250 });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private construirQrNota(nota: Nota, empresa: Empresa): string {
    const fecha = new Date(nota.fecha_emision).toISOString().split('T')[0];
    const tipoDocCliente = nota.cliente_numero_documento.length === 11 ? '6' : '1';
    return [
      empresa.ruc, nota.tipo_nota, nota.serie, nota.correlativo,
      Number(nota.total_igv).toFixed(2), Number(nota.importe_total).toFixed(2),
      fecha, tipoDocCliente, nota.cliente_numero_documento, nota.sunat_hash || '',
    ].join('|');
  }

  private construirQrSunat(venta: Venta, empresa: Empresa): string {
    const fecha = new Date(venta.fecha_emision).toISOString().split('T')[0];
    const tipoDocCliente = venta.cliente_numero_documento.length === 11 ? '6' : '1';
    return [
      empresa.ruc, venta.tipo_comprobante, venta.serie, venta.correlativo,
      Number(venta.total_igv).toFixed(2), Number(venta.importe_total).toFixed(2),
      fecha, tipoDocCliente, venta.cliente_numero_documento, venta.sunat_hash || '',
    ].join('|');
  }

  private numeroALetras(numero: number): string {
    const entero = Math.floor(numero);
    const decimales = Math.round((numero - entero) * 100);
    const enteroEnLetras = this.enteroALetras(entero);
    const centavos = String(decimales).padStart(2, '0');
    return `${enteroEnLetras.toUpperCase()} CON ${centavos}/100`;
  }

  private enteroALetras(num: number): string {
    if (num === 0) return 'cero';
    if (num === 1) return 'uno';
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const especiales: Record<number, string> = {
      10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
      16: 'dieciseis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
      20: 'veinte', 21: 'veintiuno', 22: 'veintidos', 23: 'veintitres', 24: 'veinticuatro',
      25: 'veinticinco', 26: 'veintiseis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve',
    };
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
      'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    if (num < 10) return unidades[num];
    if (especiales[num]) return especiales[num];
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      return decenas[d] + (u > 0 ? ' y ' + unidades[u] : '');
    }
    if (num === 100) return 'cien';
    if (num < 1000) {
      const c = Math.floor(num / 100);
      const resto = num % 100;
      return centenas[c] + (resto > 0 ? ' ' + this.enteroALetras(resto) : '');
    }
    if (num === 1000) return 'mil';
    if (num < 1000000) {
      const miles = Math.floor(num / 1000);
      const resto = num % 1000;
      const milesTexto = miles === 1 ? 'mil' : this.enteroALetras(miles) + ' mil';
      return milesTexto + (resto > 0 ? ' ' + this.enteroALetras(resto) : '');
    }
    if (num < 1000000000) {
      const millones = Math.floor(num / 1000000);
      const resto = num % 1000000;
      const millonesTexto = millones === 1 ? 'un millon' : this.enteroALetras(millones) + ' millones';
      return millonesTexto + (resto > 0 ? ' ' + this.enteroALetras(resto) : '');
    }
    return num.toString();
  }

  // ============ PDF GUÍA DE REMISIÓN ============
  async generarGuiaA4(datos: DatosPdfGuia): Promise<Buffer> {
    const { guia, empresa } = datos;
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));

    const color = this.obtenerColor(empresa);
    const rutaLogo = this.obtenerRutaLogo(empresa);
    const tipoNombre = guia.tipo_guia === '09'
      ? 'GUÍA DE REMISIÓN REMITENTE'
      : 'GUÍA DE REMISIÓN TRANSPORTISTA';
    const comprobante = `${guia.serie}-${String(guia.correlativo).padStart(8, '0')}`;

    const empresaRazonSocial = sanitizarTextoPdf(empresa.razon_social, 200);
    const empresaDireccion = sanitizarTextoPdf(empresa.direccion, 250);
    const empresaDistrito = sanitizarTextoPdf(empresa.distrito, 50);
    const empresaProvincia = sanitizarTextoPdf(empresa.provincia, 50);
    const empresaDepartamento = sanitizarTextoPdf(empresa.departamento, 50);

    // --- LOGO ---
    let xInicio = 40;
    if (rutaLogo) {
      try {
        doc.image(rutaLogo, 40, 45, { fit: [70, 70] });
        xInicio = 120;
      } catch {}
    }

    // --- ENCABEZADO EMISOR ---
// --- ENCABEZADO EMISOR ---
const anchoEmisor = 380 - xInicio - 10;

doc.fontSize(14).font('Helvetica-Bold').fillColor(color)
  .text(empresaRazonSocial, xInicio, 50, { width: anchoEmisor });

let yEmisor = doc.y + 4;
doc.fillColor('black').fontSize(9).font('Helvetica');

doc.text(empresaDireccion, xInicio, yEmisor, { width: anchoEmisor });
yEmisor = doc.y + 2;

doc.text(
  `${empresaDistrito} - ${empresaProvincia} - ${empresaDepartamento}`,
  xInicio,
  yEmisor,
  { width: anchoEmisor },
);

    doc.lineWidth(1.5).strokeColor(color).rect(380, 50, 175, 70).stroke();
    doc.strokeColor('black').lineWidth(1);
    doc.fillColor(color).fontSize(11).font('Helvetica-Bold')
      .text(`RUC: ${empresa.ruc}`, 380, 58, { width: 175, align: 'center' })
      .text(tipoNombre, 380, 74, { width: 175, align: 'center' })
      .fontSize(12).text(comprobante, 380, 100, { width: 175, align: 'center' });
    doc.fillColor('black');

    const destinatarioRazonSocial = sanitizarTextoPdf(guia.destinatario_razon_social, 200);
    const destinatarioDocumento = sanitizarTextoPdf(guia.destinatario_numero_documento, 20);

    let y = 140;
    doc.fontSize(9).font('Helvetica-Bold').text('Fecha de emisión:', 40, y);
    doc.font('Helvetica').text(new Date(guia.fecha_emision).toLocaleDateString('es-PE'), 150, y);
    doc.font('Helvetica-Bold').text('Fecha inicio traslado:', 290, y);
    doc.font('Helvetica').text(new Date(guia.fecha_inicio_traslado).toLocaleDateString('es-PE'), 420, y);

    y += 16;
    doc.font('Helvetica-Bold').text('Motivo del traslado:', 40, y);
    doc.font('Helvetica').text(sanitizarTextoPdf(guia.descripcion_motivo, 250), 150, y, { width: 405 });

    y += 16;
    if (guia.doc_relacionado_numero) {
      doc.font('Helvetica-Bold').text('Documento relacionado:', 40, y);
      doc.font('Helvetica').text(guia.doc_relacionado_numero, 150, y);
      y += 16;
    }

    y += 8;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(color).text('DESTINATARIO', 40, y);
    doc.fillColor('black').fontSize(9).font('Helvetica');
    y += 16;
    doc.font('Helvetica-Bold').text(
      `${guia.destinatario_tipo_documento === '6' ? 'RUC' : 'DNI'}:`,
      40, y
    );
    doc.font('Helvetica').text(destinatarioDocumento, 100, y);
    doc.font('Helvetica-Bold').text('Razón social:', 220, y);
    doc.font('Helvetica').text(destinatarioRazonSocial, 300, y, { width: 255 });

    y += 32;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(color).text('PUNTO DE PARTIDA', 40, y);
    doc.text('PUNTO DE LLEGADA', 300, y);
    doc.fillColor('black').fontSize(9).font('Helvetica');

    y += 16;
    doc.font('Helvetica-Bold').text('Ubigeo:', 40, y);
    doc.font('Helvetica').text(guia.partida_ubigeo, 90, y);
    doc.font('Helvetica-Bold').text('Ubigeo:', 300, y);
    doc.font('Helvetica').text(guia.llegada_ubigeo, 350, y);

    y += 14;
    doc.font('Helvetica-Bold').text('Dirección:', 40, y);
    doc.font('Helvetica').text(sanitizarTextoPdf(guia.partida_direccion, 200), 40, y + 12, { width: 250 });
    doc.font('Helvetica-Bold').text('Dirección:', 300, y);
    doc.font('Helvetica').text(sanitizarTextoPdf(guia.llegada_direccion, 200), 300, y + 12, { width: 255 });

    y += 50;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(color).text('DATOS DEL TRANSPORTE', 40, y);
    doc.fillColor('black').fontSize(9).font('Helvetica');
    y += 16;
    doc.font('Helvetica-Bold').text('Modalidad:', 40, y);
    doc.font('Helvetica').text(
      guia.modalidad_transporte === '01' ? 'Pública (transportista)' : 'Privada (vehículo propio)',
      110, y
    );
    doc.font('Helvetica-Bold').text('Peso total:', 340, y);
    doc.font('Helvetica-Bold').fillColor(color).text(
      `${Number(guia.peso_bruto_total).toFixed(3)} ${guia.unidad_peso || 'KGM'}`,
      400, y
    );
    doc.fillColor('black');

    y += 16;
    if (guia.transportista_razon_social) {
      doc.font('Helvetica-Bold').text('Transportista:', 40, y);
      doc.font('Helvetica').text(
        sanitizarTextoPdf(guia.transportista_razon_social, 200),
        110, y, { width: 200 }
      );
      doc.font('Helvetica-Bold').text('RUC:', 340, y);
      doc.font('Helvetica').text(guia.transportista_numero_documento || '', 380, y);
      y += 16;
    }

    if (guia.numero_placa) {
      doc.font('Helvetica-Bold').text('Placa:', 40, y);
      doc.font('Helvetica').text(guia.numero_placa, 90, y);
    }

    if (guia.conductor_nombre) {
      doc.font('Helvetica-Bold').text('Conductor:', 200, y);
      doc.font('Helvetica').text(
        sanitizarTextoPdf(guia.conductor_nombre, 100),
        260, y, { width: 150 }
      );
      doc.font('Helvetica-Bold').text('Licencia:', 420, y);
      doc.font('Helvetica').text(guia.conductor_licencia || '', 470, y);
      y += 14;
      if (guia.conductor_numero_documento) {
        doc.font('Helvetica-Bold').text('DNI:', 200, y);
        doc.font('Helvetica').text(guia.conductor_numero_documento, 230, y);
      }
    }

    y += 28;
    doc.rect(40, y, 515, 22).fillAndStroke(color, color);
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold')
      .text('#', 45, y + 7, { width: 25 })
      .text('Código', 75, y + 7, { width: 60 })
      .text('Descripción', 140, y + 7, { width: 245 })
      .text('Unidad', 390, y + 7, { width: 50, align: 'center' })
      .text('Cantidad', 445, y + 7, { width: 50, align: 'right' })
      .text('Peso (KG)', 500, y + 7, { width: 50, align: 'right' });

    y += 28;
    doc.fillColor('black').font('Helvetica').fontSize(8);
    for (const item of guia.detalles || []) {
      const descripcion = sanitizarTextoPdf(item.descripcion, 200);
      const pesoTotal = Number(item.cantidad) * Number(item.peso_unitario || 0);
      doc.text(String(item.numero), 45, y, { width: 25 })
        .text(item.codigo_producto || '—', 75, y, { width: 60 })
        .text(descripcion, 140, y, { width: 245 })
        .text(item.unidad_medida || 'NIU', 390, y, { width: 50, align: 'center' })
        .text(Number(item.cantidad).toFixed(3), 445, y, { width: 50, align: 'right' })
        .text(pesoTotal.toFixed(3), 500, y, { width: 50, align: 'right' });
      y += 16;
    }

    if (guia.observaciones) {
      y += 20;
      doc.fontSize(9).font('Helvetica-Bold').text('Observaciones:', 40, y);
      doc.font('Helvetica').text(
        sanitizarTextoPdf(guia.observaciones, 500),
        40, y + 14, { width: 515 }
      );
      y += 40;
    }

    y += 30;
    const qrData = this.construirQrGuia(guia, empresa);
    const qrImg = await QRCode.toDataURL(qrData, { margin: 1, width: 120 });
    doc.image(qrImg, 40, y, { width: 110 });

    doc.fontSize(7).font('Helvetica')
      .text(`Representación impresa de la ${tipoNombre}.`, 160, y + 10, { width: 395 })
      .text('Consulte su validez en el portal de SUNAT.', 160, y + 22, { width: 395 })
      .text(`Hash: ${guia.sunat_hash || ''}`, 160, y + 34, { width: 395, ellipsis: true });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private construirQrGuia(guia: any, empresa: Empresa): string {
    const fechaStr = new Date(guia.fecha_emision).toISOString().split('T')[0];
    const tipoDocDest = guia.destinatario_tipo_documento || '6';
    return [
      empresa.ruc, guia.tipo_guia, guia.serie, guia.correlativo,
      '0.00', '0.00', fechaStr, tipoDocDest,
      guia.destinatario_numero_documento, guia.sunat_hash || '',
    ].join('|');
  }
}