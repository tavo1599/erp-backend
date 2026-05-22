import { Test, TestingModule } from '@nestjs/testing';
import { KardexService } from './kardex.service';

describe('KardexService', () => {
  let service: KardexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KardexService],
    }).compile();

    service = module.get<KardexService>(KardexService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
