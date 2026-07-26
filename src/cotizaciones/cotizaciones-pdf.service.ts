import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Cotizacion } from './entities/cotizacion.entity';
import { sanitizarTextoPdf } from '../ventas/utils/sanitizar';

@Injectable()
export class CotizacionesPdfService {
  private readonly COLOR_DEFAULT = '#c2643f';

  private rutaLogo(empresa: Empresa): string | null {
    if (!empresa.logo_url) return null;
    try {
      const rel = empresa.logo_url.startsWith('/')
        ? empresa.logo_url.substring(1)
        : empresa.logo_url;
      const ruta = path.join(process.cwd(), rel);
      return fs.existsSync(ruta) ? ruta : null;
    } catch {
      return null;
    }
  }

  private money(n: number): string {
    return `S/ ${Number(n).toFixed(2)}`;
  }

  async generar(cotizacion: Cotizacion, empresa: Empresa): Promise<Buffer> {
    const color = empresa.color_pdf || this.COLOR_DEFAULT;
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    const codigo = `COT-${String(cotizacion.numero).padStart(6, '0')}`;

    // ---------- Encabezado ----------
    const rutaLogo = this.rutaLogo(empresa);
    if (rutaLogo) {
      try {
        doc.image(rutaLogo, 40, 45, { fit: [70, 70] });
      } catch {
        /* logo inválido, se ignora */
      }
    }

    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold');
    doc.text(sanitizarTextoPdf(empresa.razon_social, 80), rutaLogo ? 120 : 40, 48);
    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text(`RUC: ${empresa.ruc}`, rutaLogo ? 120 : 40, 68);
    if (empresa.direccion) {
      doc.text(sanitizarTextoPdf(empresa.direccion, 90), rutaLogo ? 120 : 40, 82, { width: 320 });
    }

    // Caja de la cotización (derecha)
    doc.roundedRect(390, 45, 165, 70, 6).stroke(color);
    doc.fillColor(color).fontSize(12).font('Helvetica-Bold');
    doc.text('COTIZACIÓN', 390, 55, { width: 165, align: 'center' });
    doc.fillColor('#0f172a').fontSize(11);
    doc.text(codigo, 390, 74, { width: 165, align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor('#64748b');
    doc.text(`Emisión: ${cotizacion.fecha_emision}`, 390, 92, { width: 165, align: 'center' });
    doc.text(
      `Válida hasta: ${cotizacion.fecha_validez || '—'}`,
      390,
      103,
      { width: 165, align: 'center' },
    );

    // ---------- Cliente ----------
    let y = 135;
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('CLIENTE', 40, y);
    doc.font('Helvetica').fillColor('#334155');
    doc.text(sanitizarTextoPdf(cotizacion.cliente_razon_social, 90), 40, y + 13);
    doc.text(`Doc: ${cotizacion.cliente_numero_documento}`, 40, y + 26);

    // ---------- Tabla de ítems ----------
    y = 185;
    doc.rect(40, y, 515, 22).fill(color);
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('Descripción', 48, y + 6);
    doc.text('Cant.', 330, y + 6, { width: 50, align: 'right' });
    doc.text('P. Unit.', 400, y + 6, { width: 65, align: 'right' });
    doc.text('Importe', 480, y + 6, { width: 67, align: 'right' });

    y += 22;
    doc.font('Helvetica').fillColor('#0f172a').fontSize(9);
    for (const d of cotizacion.detalles || []) {
      const alto = 18;
      doc.fillColor('#0f172a').text(sanitizarTextoPdf(d.producto_nombre, 60), 48, y + 4, { width: 270 });
      doc.text(String(Number(d.cantidad)), 330, y + 4, { width: 50, align: 'right' });
      doc.text(this.money(Number(d.precio_unitario)), 400, y + 4, { width: 65, align: 'right' });
      doc.text(this.money(Number(d.subtotal)), 480, y + 4, { width: 67, align: 'right' });
      y += alto;
      doc.moveTo(40, y).lineTo(555, y).strokeColor('#e2e8f0').stroke();
    }

    // ---------- Totales ----------
    y += 10;
    const filaTotal = (label: string, valor: string, negrita = false) => {
      doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(negrita ? 11 : 9);
      doc.fillColor('#334155').text(label, 360, y, { width: 110, align: 'right' });
      doc.fillColor('#0f172a').text(valor, 475, y, { width: 72, align: 'right' });
      y += negrita ? 18 : 15;
    };
    filaTotal('Op. Gravada', this.money(Number(cotizacion.total_gravado)));
    filaTotal('IGV (18%)', this.money(Number(cotizacion.total_igv)));
    filaTotal('TOTAL', this.money(Number(cotizacion.importe_total)), true);

    // ---------- Observaciones ----------
    if (cotizacion.observaciones) {
      y += 12;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155').text('Observaciones', 40, y);
      doc.font('Helvetica').fillColor('#475569').fontSize(9);
      doc.text(sanitizarTextoPdf(cotizacion.observaciones, 400), 40, y + 13, { width: 515 });
    }

    // ---------- Pie ----------
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica');
    if (empresa.frase_pie_pdf) {
      doc.text(sanitizarTextoPdf(empresa.frase_pie_pdf, 300), 40, 760, { width: 515, align: 'center' });
    }
    doc.text(
      'Este documento es una cotización y NO constituye un comprobante de pago.',
      40,
      775,
      { width: 515, align: 'center' },
    );

    doc.end();
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
