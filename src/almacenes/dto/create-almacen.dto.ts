import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAlmacenDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  direccion?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  encargado_nombre?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  encargado_telefono?: string;

  @IsBoolean()
  @IsOptional()
  es_principal?: boolean;
}