// src/common/motor-java.util.ts
// Utilidades para llamar al motor Java de facturación (SUNAT).

/** URL base del motor Java. */
export const JAVA_MOTOR_URL = process.env.JAVA_MOTOR_URL || 'http://localhost:8089';

/**
 * Cabeceras para autenticar contra el motor Java.
 * Agrega X-API-Key si JAVA_MOTOR_API_KEY está definida. Se puede pasar `extra`
 * para combinar con otras cabeceras (ej: las de form-data en subida de archivos).
 */
export function cabecerasMotor(
  extra: Record<string, any> = {},
): Record<string, any> {
  const headers: Record<string, any> = { ...extra };
  const apiKey = process.env.JAVA_MOTOR_API_KEY;
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  return headers;
}
