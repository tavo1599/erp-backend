// src/notas/dto/create-nota.dto.ts
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

class NotaDetalleDto {
  @IsUUID()
  producto_id: string;

  @IsNumber()
  @Min(0.0001)
  @Max(999999)
  cantidad: number;
}

export class CreateNotaDto {
  @IsString()
  @IsIn(['07', '08']) // 07 = crédito, 08 = débito
  tipo_nota: string;

  @IsString()
  @MinLength(4)
  @MaxLength(4)
  serie: string;

  @IsString()
  @IsIn(['01', '03']) // 01 = factura, 03 = boleta
  tipo_comprobante_afectado: string;

  @IsString()
  @MaxLength(20)
  comprobante_afectado: string; // "F001-00000001"

  @IsString()
  @MaxLength(2)
  codigo_motivo: string;

  @IsString()
  @MinLength(2)
  @MaxLength(250)
  descripcion_motivo: string;

  @IsString()
  @MinLength(8)
  @MaxLength(15)
  cliente_numero_documento: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  cliente_razon_social: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => NotaDetalleDto)
  detalles: NotaDetalleDto[];
}