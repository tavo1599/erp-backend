import { Test, TestingModule } from '@nestjs/testing';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';

describe('CatalogosController', () => {
  let controller: CatalogosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogosController],
      providers: [CatalogosService],
    }).compile();

    controller = module.get<CatalogosController>(CatalogosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
