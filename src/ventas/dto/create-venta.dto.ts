import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsIn,
  IsUUID,
  Min,
  Max,
  MaxLength,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleVentaDto {
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

export class PagoDto {
  @IsString()
  @IsIn([
    'EFECTIVO',
    'YAPE',
    'TRANSFERENCIA',
    'TARJETA_DEBITO',
    'TARJETA_CREDITO',
    'DEPOSITO',
    'CHEQUE',
    'OTRO',
  ])
  metodo: string;

  @IsNumber()
  @Min(0.01)
  @Max(99999999)
  monto: number;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  referencia?: string;
}

export class CreateVentaDto {
  // Cliente: o se manda cliente_id o se mandan los datos directos
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

  @IsString()
  @IsIn(['01', '03'])
  tipo_comprobante: string;

  @IsString()
  @MinLength(4)
  @MaxLength(4)
  serie: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaDto)
  detalles: DetalleVentaDto[];

  @IsString()
  @IsIn(['CONTADO', 'CREDITO'])
  @IsOptional()
  condicion_pago?: string;

  @IsNumber()
  @Min(0)
  @Max(365)
  @IsOptional()
  dias_credito?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  descuento_global_porcentaje?: number;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PagoDto)
  @IsOptional()
  pagos?: PagoDto[];
}