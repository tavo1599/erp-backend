import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateConductorDto {
  @IsString()
  @IsIn(['1', '4', '7'])  // 1=DNI, 4=Carnet Extranjería, 7=Pasaporte
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
  @MaxLength(100)
  nombres: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  apellidos?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(20)
  licencia_conducir: string;

@IsUUID()
@IsOptional()
transportista_id?: string;
}