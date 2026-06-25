import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTransportistaDto {
  @IsString()
  @IsIn(['1', '6'])
  @IsOptional()
  tipo_documento?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(15)
  numero_documento: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  razon_social: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  numero_mtc?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  direccion?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  telefono?: string;
}