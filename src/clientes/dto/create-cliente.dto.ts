import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  IsEmail,
  IsIn,
} from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(15)
  numero_documento: string;

  @IsString()
  @IsIn(['1', '6'])
  @IsOptional()
  tipo_documento?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  razon_social: string;

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

  @IsEmail()
  @MaxLength(150)
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  telefono?: string;
}