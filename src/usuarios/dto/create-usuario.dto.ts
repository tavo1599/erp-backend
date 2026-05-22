// src/usuarios/dto/create-usuario.dto.ts
export class CreateUsuarioDto {
  email: string;
  password: string; // La recibimos plana, la encriptaremos en el servicio
  nombre: string;
  empresa_id: string; // ID de la empresa a la que se va a unir
  rol: string; // Ej: 'ADMIN' o 'VENDEDOR'
}