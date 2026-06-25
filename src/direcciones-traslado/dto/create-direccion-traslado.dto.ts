import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateDireccionTrasladoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^[0-9]{6}$/, {
    message: 'El ubigeo debe tener 6 dígitos numéricos',
  })
  ubigeo: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(250)
  direccion: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  departamento: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  provincia: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  distrito: string;

  @IsString()
  @IsIn(['PARTIDA', 'LLEGADA', 'AMBOS'])
  @IsOptional()
  tipo?: string;

  @IsBoolean()
  @IsOptional()
  es_predeterminada?: boolean;
}