// src/auditoria/auditoria.types.ts

/**
 * Contexto del usuario que realiza una acción.
 * Se usa para pasar información de auditoría a los métodos de service.
 */
export interface ContextoUsuario {
  usuario_id?: string;
  usuario_email: string;
  usuario_rol: string;
  ip?: string;
  user_agent?: string;
}