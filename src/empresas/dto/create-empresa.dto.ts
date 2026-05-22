// src/empresas/dto/create-empresa.dto.ts
export class CreateEmpresaDto {
  ruc: string;
  razon_social: string;
  nombre_comercial?: string; // El signo ? significa que es opcional
  direccion?: string;
  ubigeo?: string;
}