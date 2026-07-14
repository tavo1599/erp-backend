// src/permisos/permisos.catalogo.ts

export interface PermisoCatalogo {
  codigo: string;
  nombre: string;
  descripcion: string;
  modulo: string;
  // Roles que tienen este permiso ACTIVO por defecto
  rolesPorDefecto: string[];
}

// Catálogo completo de permisos del sistema
export const CATALOGO_PERMISOS: PermisoCatalogo[] = [
  // ===== VENTAS =====
  {
    codigo: 'ver_ventas',
    nombre: 'Ver ventas',
    descripcion: 'Acceder a la lista y detalle de ventas',
    modulo: 'Ventas',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'VENDEDOR', 'CONTADOR'],
  },
  {
    codigo: 'crear_ventas',
    nombre: 'Crear ventas',
    descripcion: 'Emitir nuevas facturas y boletas',
    modulo: 'Ventas',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'VENDEDOR'],
  },
  {
    codigo: 'anular_ventas',
    nombre: 'Anular ventas',
    descripcion: 'Anular comprobantes ya emitidos',
    modulo: 'Ventas',
    rolesPorDefecto: ['ADMIN_EMPRESA'],
  },
  {
    codigo: 'descargar_pdf_xml',
    nombre: 'Descargar PDF/XML',
    descripcion: 'Descargar archivos de comprobantes',
    modulo: 'Ventas',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'VENDEDOR', 'CONTADOR'],
  },

  // ===== NOTAS =====
  {
    codigo: 'ver_notas',
    nombre: 'Ver notas',
    descripcion: 'Ver notas de crédito y débito',
    modulo: 'Notas',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'VENDEDOR', 'CONTADOR'],
  },
  {
    codigo: 'crear_notas',
    nombre: 'Crear notas',
    descripcion: 'Emitir notas de crédito y débito',
    modulo: 'Notas',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'CONTADOR'],
  },

  // ===== PRODUCTOS =====
  {
    codigo: 'ver_productos',
    nombre: 'Ver productos',
    descripcion: 'Acceder al catálogo de productos',
    modulo: 'Productos',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'VENDEDOR', 'CONTADOR'],
  },
  {
    codigo: 'crear_productos',
    nombre: 'Crear productos',
    descripcion: 'Agregar productos al catálogo',
    modulo: 'Productos',
    rolesPorDefecto: ['ADMIN_EMPRESA'],
  },
  {
    codigo: 'editar_productos',
    nombre: 'Editar productos',
    descripcion: 'Modificar productos existentes',
    modulo: 'Productos',
    rolesPorDefecto: ['ADMIN_EMPRESA'],
  },
  {
    codigo: 'eliminar_productos',
    nombre: 'Eliminar productos',
    descripcion: 'Desactivar productos',
    modulo: 'Productos',
    rolesPorDefecto: ['ADMIN_EMPRESA'],
  },

  // ===== CLIENTES =====
  {
    codigo: 'ver_clientes',
    nombre: 'Ver clientes',
    descripcion: 'Acceder a la lista de clientes',
    modulo: 'Clientes',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'VENDEDOR', 'CONTADOR'],
  },
  {
    codigo: 'crear_clientes',
    nombre: 'Crear clientes',
    descripcion: 'Registrar nuevos clientes',
    modulo: 'Clientes',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'VENDEDOR'],
  },
  {
    codigo: 'editar_clientes',
    nombre: 'Editar clientes',
    descripcion: 'Modificar datos de clientes',
    modulo: 'Clientes',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'VENDEDOR'],
  },

  // ===== COMPRAS =====
  {
    codigo: 'ver_compras',
    nombre: 'Ver compras',
    descripcion: 'Acceder al módulo de compras',
    modulo: 'Compras',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'CONTADOR'],
  },
  {
    codigo: 'crear_compras',
    nombre: 'Registrar compras',
    descripcion: 'Ingresar compras al sistema',
    modulo: 'Compras',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'CONTADOR'],
  },

  // ===== FINANZAS =====
  {
    codigo: 'ver_finanzas',
    nombre: 'Ver finanzas',
    descripcion: 'Acceder al módulo financiero',
    modulo: 'Finanzas',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'CONTADOR'],
  },
  {
    codigo: 'registrar_pagos',
    nombre: 'Registrar pagos',
    descripcion: 'Registrar pagos y movimientos',
    modulo: 'Finanzas',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'CONTADOR'],
  },

  // ===== GUÍAS DE REMISIÓN =====
  {
    codigo: 'ver_guias',
    nombre: 'Ver guías',
    descripcion: 'Acceder a guías de remisión',
    modulo: 'Guías',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'VENDEDOR', 'CONTADOR'],
  },
  {
    codigo: 'crear_guias',
    nombre: 'Crear guías',
    descripcion: 'Emitir guías de remisión',
    modulo: 'Guías',
    rolesPorDefecto: ['ADMIN_EMPRESA', 'VENDEDOR'],
  },
  {
    codigo: 'anular_guias',
    nombre: 'Anular guías',
    descripcion: 'Anular guías emitidas',
    modulo: 'Guías',
    rolesPorDefecto: ['ADMIN_EMPRESA'],
  },

  // ===== CONFIGURACIÓN =====
  {
    codigo: 'editar_empresa',
    nombre: 'Editar datos de empresa',
    descripcion: 'Modificar razón social, dirección, etc.',
    modulo: 'Configuración',
    rolesPorDefecto: ['ADMIN_EMPRESA'],
  },
  {
    codigo: 'editar_credenciales_sunat',
    nombre: 'Credenciales SUNAT',
    descripcion: 'Modificar usuario SOL, certificado',
    modulo: 'Configuración',
    rolesPorDefecto: ['ADMIN_EMPRESA'],
  },
  {
    codigo: 'personalizar_pdf',
    nombre: 'Personalizar PDF',
    descripcion: 'Cambiar logo, color y diseño',
    modulo: 'Configuración',
    rolesPorDefecto: ['ADMIN_EMPRESA'],
  },
  {
    codigo: 'gestionar_permisos',
    nombre: 'Gestionar permisos',
    descripcion: 'Editar permisos de roles',
    modulo: 'Configuración',
    rolesPorDefecto: ['ADMIN_EMPRESA'],
  },

  // ===== AUDITORÍA =====
  {
    codigo: 'ver_auditoria',
    nombre: 'Ver auditoría',
    descripcion: 'Ver el log de acciones del sistema',
    modulo: 'Auditoría',
    rolesPorDefecto: ['ADMIN_EMPRESA'],
  },

  {
  codigo: 'ver_almacenes',
  nombre: 'Ver almacenes',
  descripcion: 'Ver lista de almacenes de la empresa',
  modulo: 'Almacenes',
  rolesPorDefecto: ['ADMIN_EMPRESA', 'VENDEDOR', 'CONTADOR'],
},
{
  codigo: 'crear_almacenes',
  nombre: 'Crear almacenes',
  descripcion: 'Crear nuevos almacenes',
  modulo: 'Almacenes',
  rolesPorDefecto: ['ADMIN_EMPRESA'],
},
{
  codigo: 'editar_almacenes',
  nombre: 'Editar almacenes',
  descripcion: 'Editar y desactivar almacenes',
  modulo: 'Almacenes',
  rolesPorDefecto: ['ADMIN_EMPRESA'],
},
];

// Roles editables (NO incluye SUPER_ADMIN, que tiene todos los permisos siempre)
export const ROLES_EDITABLES = ['ADMIN_EMPRESA', 'VENDEDOR', 'CONTADOR'];

// Lista de módulos únicos (para agrupar en la UI)
export const MODULOS = Array.from(
  new Set(CATALOGO_PERMISOS.map((p) => p.modulo)),
);