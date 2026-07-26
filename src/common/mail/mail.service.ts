import { Injectable, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface AdjuntoCorreo {
  filename: string;
  content: Buffer;
  contentType?: string;
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  private obtenerTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new BadRequestException(
        'El envío de correos no está configurado. Define SMTP_HOST, SMTP_USER y SMTP_PASS en el servidor.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: { user, pass },
    });
    return this.transporter;
  }

  async enviar(
    to: string,
    asunto: string,
    html: string,
    adjuntos: AdjuntoCorreo[] = [],
  ): Promise<{ mensaje: string }> {
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new BadRequestException('Correo de destino inválido');
    }
    const transporter = this.obtenerTransporter();
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
      from,
      to,
      subject: asunto,
      html,
      attachments: adjuntos.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    return { mensaje: 'Correo enviado correctamente' };
  }
}
