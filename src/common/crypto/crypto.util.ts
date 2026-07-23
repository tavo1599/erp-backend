// src/common/crypto/crypto.util.ts
import * as crypto from 'crypto';
import { ValueTransformer } from 'typeorm';

/**
 * Cifrado simétrico AES-256-GCM para credenciales sensibles en reposo
 * (ej: clave SOL, client_secret SUNAT).
 *
 * Formato del valor cifrado:  enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 * El prefijo permite distinguir valores cifrados de valores legados en texto plano.
 *
 * La clave se deriva (SHA-256 → 32 bytes) de la variable de entorno ENCRYPTION_KEY,
 * que puede ser cualquier frase secreta. Si ENCRYPTION_KEY no está definida, las
 * funciones actúan como passthrough (no cifran) para no romper el arranque; en ese
 * caso se debe configurar la variable para activar el cifrado.
 */

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function obtenerClave(): Buffer | null {
  const secreto = process.env.ENCRYPTION_KEY;
  if (!secreto) return null;
  return crypto.createHash('sha256').update(secreto, 'utf8').digest();
}

/** ¿El valor ya está en formato cifrado? */
export function estaCifrado(valor: unknown): boolean {
  return typeof valor === 'string' && valor.startsWith(PREFIX);
}

/** Cifra un texto. Devuelve el mismo valor si es null/vacío, si ya está cifrado, o si no hay clave. */
export function cifrar(texto: string | null | undefined): string | null {
  if (texto === null || texto === undefined || texto === '') {
    return (texto ?? null) as string | null;
  }
  if (estaCifrado(texto)) return texto;
  const clave = obtenerClave();
  if (!clave) return texto; // sin ENCRYPTION_KEY → passthrough
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, clave, iv);
  const cifrado = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${cifrado.toString('hex')}`;
}

/** Descifra un valor. Si no está cifrado (legado en texto plano) o no hay clave, lo devuelve tal cual. */
export function descifrar(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined || valor === '') {
    return (valor ?? null) as string | null;
  }
  if (!estaCifrado(valor)) return valor; // texto plano legado
  const clave = obtenerClave();
  if (!clave) return valor; // no se puede descifrar sin clave
  try {
    const partes = valor.split(':'); // ['enc','v1', iv, tag, data]
    const iv = Buffer.from(partes[2], 'hex');
    const tag = Buffer.from(partes[3], 'hex');
    const data = Buffer.from(partes[4], 'hex');
    const decipher = crypto.createDecipheriv(ALGO, clave, iv);
    decipher.setAuthTag(tag);
    const descifrado = Buffer.concat([decipher.update(data), decipher.final()]);
    return descifrado.toString('utf8');
  } catch {
    // Si el descifrado falla (clave equivocada / dato corrupto), devolver crudo
    // para no romper la carga de la entidad.
    return valor;
  }
}

/**
 * Transformer de TypeORM: cifra al escribir en la BD y descifra al leer.
 * Uso: @Column({ ..., transformer: cifradoTransformer })
 */
export const cifradoTransformer: ValueTransformer = {
  to: (value: string | null | undefined) => cifrar(value),
  from: (value: string | null | undefined) => descifrar(value),
};
