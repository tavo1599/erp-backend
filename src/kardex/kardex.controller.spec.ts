import { Test, TestingModule } from '@nestjs/testing';
import { KardexController } from './kardex.controller';
import { KardexService } from './kardex.service';

describe('KardexController', () => {
  let controller: KardexController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KardexController],
      providers: [KardexService],
    }).compile();

    controller = module.get<KardexController>(KardexController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
