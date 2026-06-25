import { PartialType } from '@nestjs/mapped-types';
import { CreateBajaDto } from './create-baja.dto';

export class UpdateBajaDto extends PartialType(CreateBajaDto) {}
