import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsIn,
  Min,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DetallePercepcionDto {
  @IsString()
  @IsOptional()
  tipo_doc_relacionado?: string; // 01 = Factura

  @IsString()
  @IsNotEmpty()
  num_doc_relacionado: string;

  @IsDateString()
  fecha_doc: string;

  @IsNumber()
  @Min(0.01)
  importe_doc: number;

  @IsDateString()
  fecha_cobro: string;

  @IsNumber()
  @Min(0.01)
  importe_cobrado: number;
}

export class CreatePercepcionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4)
  serie: string; // ej: P001

  // 01 = 2%, 02 = 1%, 03 = 0.5%
  @IsString()
  @IsIn(['01', '02', '03'])
  @IsOptional()
  regimen?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  cliente_numero_documento: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  cliente_razon_social: string;

  @IsString()
  @IsOptional()
  cliente_direccion?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => DetallePercepcionDto)
  detalles: DetallePercepcionDto[];
}
