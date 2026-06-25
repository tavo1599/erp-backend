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
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleGuiaDto {
  @IsUUID()
  @IsOptional()
  producto_id?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  codigo_producto?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  descripcion: string;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  unidad_medida?: string;

  @IsNumber()
  @Min(0.0001)
  @Max(999999)
  cantidad: number;

  @IsNumber()
  @Min(0)
  @Max(99999)
  @IsOptional()
  peso_unitario?: number;
}

export class CreateGuiaRemisionDto {
  // Identificación
  @IsString()
  @IsIn(['09', '31'])
  tipo_guia: string;

  @IsString()
  @MinLength(4)
  @MaxLength(4)
  @Matches(/^T[\w]{3}$/i, { message: 'Serie debe ser T### (ej: T001)' })
  serie: string;

  @IsDateString()
  fecha_inicio_traslado: string;

  // Vinculación opcional con venta
  @IsUUID()
  @IsOptional()
  venta_id?: string;

  @IsString()
  @IsIn(['01', '03'])
  @IsOptional()
  doc_relacionado_tipo?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  doc_relacionado_numero?: string;

  // Motivo (catálogo 20 SUNAT)
  @IsString()
  @IsIn(['01', '02', '04', '08', '09', '13', '14', '18'])
  motivo_traslado: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  descripcion_motivo: string;

  // Modalidad (catálogo 18 SUNAT)
  @IsString()
  @IsIn(['01', '02'])
  modalidad_transporte: string; // 01=Público, 02=Privado

  // Peso
  @IsNumber()
  @Min(0.001)
  @Max(999999)
  peso_bruto_total: number;

  @IsString()
  @IsIn(['KGM', 'TNE'])
  @IsOptional()
  unidad_peso?: string;

  // Destinatario
  @IsString()
  @IsIn(['1', '6'])
  destinatario_tipo_documento: string;

  @IsString()
  @MinLength(8)
  @MaxLength(15)
  destinatario_numero_documento: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  destinatario_razon_social: string;

  // Partida
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  partida_ubigeo: string;

  @IsString()
  @MinLength(5)
  @MaxLength(250)
  partida_direccion: string;

  // Llegada
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  llegada_ubigeo: string;

  @IsString()
  @MinLength(5)
  @MaxLength(250)
  llegada_direccion: string;

  // Transportista (si pública)
  @IsUUID()
  @IsOptional()
  transportista_id?: string;

  // Vehículo
  @IsUUID()
  @IsOptional()
  vehiculo_id?: string;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  numero_placa?: string;

  // Conductor (si privada)
  @IsUUID()
  @IsOptional()
  conductor_id?: string;

  // Items
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DetalleGuiaDto)
  detalles: DetalleGuiaDto[];

  @IsString()
  @MaxLength(500)
  @IsOptional()
  observaciones?: string;
}