// src/common/utils/fecha.util.ts

/**
 * Helpers para manejo de fechas en zona horaria Lima/Perú (America/Lima).
 * 
 * IMPORTANTE: Node.js `.toISOString()` SIEMPRE devuelve UTC, ignorando la TZ del sistema.
 * Estas funciones fuerzan explícitamente la zona horaria Lima para evitar bugs.
 */

const TIMEZONE_LIMA = 'America/Lima';

/**
 * Devuelve la fecha actual en hora Lima, formato YYYY-MM-DD.
 * 
 * @example
 *   const hoy = fechaActualLima();  // "2026-06-28"
 */
export function fechaActualLima(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE_LIMA });
}

/**
 * Devuelve la hora actual en Lima, formato HH:MM:SS.
 * 
 * @example
 *   const hora = horaActualLima();  // "14:30:45"
 */
export function horaActualLima(): string {
  return new Date().toLocaleTimeString('en-GB', { 
    timeZone: TIMEZONE_LIMA,
    hour12: false,
  });
}

/**
 * Convierte un Date (o ISO string) a formato YYYY-MM-DD en hora Lima.
 * 
 * @example
 *   const fecha = formatearFechaLima(new Date());  // "2026-06-28"
 *   const fecha2 = formatearFechaLima('2026-06-28T22:00:00.000Z');  // "2026-06-28"
 */
export function formatearFechaLima(fecha: Date | string): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return date.toLocaleDateString('en-CA', { timeZone: TIMEZONE_LIMA });
}

/**
 * Devuelve fecha + hora actual en Lima, formato YYYY-MM-DDTHH:MM:SS.
 * 
 * @example
 *   const ahora = fechaHoraActualLima();  // "2026-06-28T14:30:45"
 */
export function fechaHoraActualLima(): string {
  return `${fechaActualLima()}T${horaActualLima()}`;
}