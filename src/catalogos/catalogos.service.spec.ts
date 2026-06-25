import { Test, TestingModule } from '@nestjs/testing';
import { CatalogosService } from './catalogos.service';

describe('CatalogosService', () => {
  let service: CatalogosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogosService],
    }).compile();

    service = module.get<CatalogosService>(CatalogosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
