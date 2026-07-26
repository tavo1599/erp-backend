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

export class DetalleRetencionDto {
  @IsString()
  @IsOptional()
  tipo_doc_relacionado?: string; // 01 = Factura (por defecto)

  @IsString()
  @IsNotEmpty()
  num_doc_relacionado: string; // serie-número

  @IsDateString()
  fecha_doc: string;

  @IsNumber()
  @Min(0.01)
  importe_doc: number;

  @IsDateString()
  fecha_pago: string;

  @IsNumber()
  @Min(0.01)
  importe_pagado: number;
}

export class CreateRetencionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4)
  serie: string; // ej: R001

  // Régimen: 01 = 3%, 02 = 6%
  @IsString()
  @IsIn(['01', '02'])
  @IsOptional()
  regimen?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  proveedor_numero_documento: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  proveedor_razon_social: string;

  @IsString()
  @IsOptional()
  proveedor_direccion?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => DetalleRetencionDto)
  detalles: DetalleRetencionDto[];
}
