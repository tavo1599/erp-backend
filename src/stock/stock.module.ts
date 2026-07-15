import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockAlmacen } from './entities/stock-almacen.entity';
import { StockService } from './stock.service';

@Module({
  imports: [TypeOrmModule.forFeature([StockAlmacen])],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}