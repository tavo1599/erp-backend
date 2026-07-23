import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  nombre: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  codigo_sunat?: string;

  @IsString()
  @MaxLength(60)
  @IsOptional()
  codigo_barras?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  unidad_medida?: string;

  @IsString()
  @IsIn(['BIEN', 'SERVICIO'])
  @IsOptional()
  tipo_bien_servicio?: string;

  @IsString()
  @IsIn(['10', '20', '30', '40'])
  @IsOptional()
  tipo_igv?: string;

  @IsNumber()
  @Min(0)
  @Max(99999999)
  precio_venta: number;

  @IsNumber()
  @Min(0)
  @Max(99999999)
  @IsOptional()
  precio_compra?: number;

  @IsNumber()
  @Min(0)
  @Max(99999)
  @IsOptional()
  peso_unitario?: number;

  @IsNumber()
  @Min(0)
  @Max(999999)
  @IsOptional()
  stock_actual?: number;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  descripcion?: string;

  // ============ DETRACCIÓN SUNAT ============
  @IsBoolean()
  @IsOptional()
  aplica_detraccion?: boolean;

  @IsString()
  @MaxLength(3)
  @IsOptional()
  codigo_detraccion?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  porcentaje_detraccion?: number;
}