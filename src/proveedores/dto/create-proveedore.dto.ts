// src/proveedores/dto/create-proveedor.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEmail, Length } from 'class-validator';

export class CreateProveedoreDto {
  @IsString()
  @IsNotEmpty({ message: 'El RUC es obligatorio' })
  @Length(11, 11, { message: 'El RUC debe tener 11 dígitos' })
  ruc: string;

  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  razon_social: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  contacto?: string;
}