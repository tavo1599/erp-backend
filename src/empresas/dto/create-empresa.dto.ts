// src/empresas/dto/create-empresa.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsIn,
  Matches,
} from 'class-validator';

export class CreateEmpresaDto {
  // Datos de la empresa
  @IsString()
  @IsNotEmpty()
  @MinLength(11)
  @MaxLength(11)
  @Matches(/^[0-9]{11}$/, {
    message: 'El RUC debe tener exactamente 11 dígitos numéricos',
  })
  ruc: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  razon_social: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  nombre_comercial?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  direccion?: string;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  ubigeo?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  departamento?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  provincia?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  distrito?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  sol_usuario?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  sol_clave?: string;

  // Datos del primer admin
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  admin_nombre: string;

  @IsEmail()
  @MaxLength(150)
  admin_email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  admin_password: string;

  @IsString()
  @IsIn(['GRATUITO', 'BASICO', 'PRO'])
  @IsOptional()
  plan?: string;
}