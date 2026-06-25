import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateVehiculoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(10)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'La placa debe contener solo letras mayúsculas, números y guiones',
  })
  placa: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  marca?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  modelo?: string;

  @IsString()
  @MaxLength(30)
  @IsOptional()
  certificado_mtc?: string;

  @IsUUID()
  @IsOptional()
  transportista_id?: string;

  @IsBoolean()
  @IsOptional()
  es_propio?: boolean;
}