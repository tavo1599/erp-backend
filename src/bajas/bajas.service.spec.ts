import { Test, TestingModule } from '@nestjs/testing';
import { BajasService } from './bajas.service';

describe('BajasService', () => {
  let service: BajasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BajasService],
    }).compile();

    service = module.get<BajasService>(BajasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
