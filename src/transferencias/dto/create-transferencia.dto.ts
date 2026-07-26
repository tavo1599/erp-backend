import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleTransferenciaDto {
  @IsUUID()
  producto_id: string;

  @IsNumber()
  @Min(0.0001)
  @Max(999999)
  cantidad: number;
}

export class CreateTransferenciaDto {
  @IsUUID()
  almacen_origen_id: string;

  @IsUUID()
  almacen_destino_id: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DetalleTransferenciaDto)
  detalles: DetalleTransferenciaDto[];
}
