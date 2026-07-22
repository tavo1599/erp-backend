import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, Min, ArrayMinSize, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class CompraDetalleDto {
  @IsString()
  @IsNotEmpty()
  producto_id: string;

  @IsNumber()
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  cantidad: number;

  @IsNumber()
  @Min(0, { message: 'El costo no puede ser negativo' })
  costo_unitario: number;
}

export class CreateCompraDto {
  // Almacén al que ingresa la mercadería. Opcional: si no se envía, usa el principal.
  @IsOptional()
  @IsString()
  almacen_id?: string;

  @IsString()
  @IsNotEmpty({ message: 'El proveedor es obligatorio' })
  proveedor_id: string;

  @IsString()
  @IsNotEmpty()
  tipo_documento: string;

  @IsString()
  @IsNotEmpty({ message: 'La serie del documento es obligatoria' })
  serie_documento: string;

  @IsString()
  @IsNotEmpty({ message: 'El número del documento es obligatorio' })
  numero_documento: string;

  @IsDateString({}, { message: 'La fecha no es válida' })
  fecha_compra: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La compra debe tener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => CompraDetalleDto)
  detalles: CompraDetalleDto[];

  @IsString()
  @IsOptional()
  condicion_pago?: string;

  @IsNumber()
  @IsOptional()
  dias_credito?: number;
}