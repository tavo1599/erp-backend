import { Injectable, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

export interface AdjuntoCorreo {
  filename: string;
  content: Buffer;
  contentType?: string;
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;

  private obtenerResend(): Resend {
    if (!this.resend) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    return this.resend;
  }

  private obtenerTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      throw new BadRequestException(
        'El envío de correos no está configurado. Define RESEND_API_KEY (recomendado) o SMTP_HOST/USER/PASS.',
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

    // Remitente: "Nombre <correo@dominio>". Con Resend, el dominio debe estar
    // verificado; para pruebas se puede usar onboarding@resend.dev.
    const from = process.env.MAIL_FROM || 'onboarding@resend.dev';

    // 1) Preferir Resend si hay API key
    if (process.env.RESEND_API_KEY) {
      const resend = this.obtenerResend();
      const { error } = await resend.emails.send({
        from,
        to: [to],
        subject: asunto,
        html,
        attachments: adjuntos.map((a) => ({
          filename: a.filename,
          content: a.content, // Buffer
        })),
      });
      if (error) {
        throw new BadRequestException(`Error al enviar correo (Resend): ${error.message}`);
      }
      return { mensaje: 'Correo enviado correctamente' };
    }

    // 2) Fallback: SMTP (nodemailer)
    const transporter = this.obtenerTransporter();
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
