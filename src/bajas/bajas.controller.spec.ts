import { Test, TestingModule } from '@nestjs/testing';
import { BajasController } from './bajas.controller';
import { BajasService } from './bajas.service';

describe('BajasController', () => {
  let controller: BajasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BajasController],
      providers: [BajasService],
    }).compile();

    controller = module.get<BajasController>(BajasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
