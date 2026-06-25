// src/auth/roles.enum.ts
export enum Rol {
  SUPER_ADMIN = 'SUPER_ADMIN',     // Tú: gestiona todas las empresas
  ADMIN_EMPRESA = 'ADMIN_EMPRESA', // Admin de UNA empresa (acceso total a la suya)
  VENDEDOR = 'VENDEDOR',           // Solo emite ventas y consulta
  CONTADOR = 'CONTADOR',           // Ve reportes, ventas, compras (lectura amplia)
}