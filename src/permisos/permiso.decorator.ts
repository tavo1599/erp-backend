import { SetMetadata } from '@nestjs/common';

// Metadato que identifica el permiso requerido
export const PERMISO_KEY = 'permiso';

/**
 * Marca un endpoint con un permiso específico requerido.
 * Uso: @Permiso('crear_ventas')
 */
export const Permiso = (codigo: string) => SetMetadata(PERMISO_KEY, codigo);