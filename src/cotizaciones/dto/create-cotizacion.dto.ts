import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleCotizacionDto {
  @IsUUID()
  producto_id: string;

  @IsNumber()
  @Min(0.0001)
  @Max(999999)
  cantidad: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  descuento_porcentaje?: number;
}

export class CreateCotizacionDto {
  @IsUUID()
  @IsOptional()
  cliente_id?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(15)
  @IsOptional()
  cliente_numero_documento?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @IsOptional()
  cliente_razon_social?: string;

  @IsDateString()
  @IsOptional()
  fecha_validez?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DetalleCotizacionDto)
  detalles: DetalleCotizacionDto[];
}
