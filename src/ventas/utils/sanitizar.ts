/**
 * Limpia texto para uso seguro en PDFs:
 * - Elimina caracteres de control (saltos de línea, tabs, etc.)
 * - Elimina caracteres invisibles/zero-width
 * - Trunca a una longitud máxima
 * - Convierte null/undefined a string vacío
 */
export function sanitizarTextoPdf(
  texto: string | null | undefined,
  maxLength: number = 200,
): string {
  if (!texto) return '';

  let limpio = String(texto);

  // 1. Eliminar caracteres de control (0x00-0x1F y 0x7F)
  limpio = limpio.replace(/[\x00-\x1F\x7F]/g, ' ');

  // 2. Eliminar caracteres invisibles/zero-width
  limpio = limpio.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '');

  // 3. Colapsar espacios múltiples
  limpio = limpio.replace(/\s+/g, ' ');

  // 4. Trim
  limpio = limpio.trim();

  // 5. Truncar
  if (limpio.length > maxLength) {
    limpio = limpio.substring(0, maxLength - 3) + '...';
  }

  return limpio;
}

/**
 * Sanitiza un objeto cliente para PDF
 */
export function sanitizarCliente(cliente: {
  razon_social?: string;
  numero_documento?: string;
  direccion?: string;
}) {
  return {
    razon_social: sanitizarTextoPdf(cliente.razon_social, 200),
    numero_documento: sanitizarTextoPdf(cliente.numero_documento, 20),
    direccion: sanitizarTextoPdf(cliente.direccion, 250),
  };
}

/**
 * Sanitiza descripción de producto para PDF
 */
export function sanitizarProducto(nombre: string | null | undefined): string {
  return sanitizarTextoPdf(nombre, 150);
}