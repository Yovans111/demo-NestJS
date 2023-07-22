import { Test, TestingModule } from '@nestjs/testing';
import { AzurecommunicationService } from './azurecommunication.service';

describe('AzurecommunicationService', () => {
  let service: AzurecommunicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AzurecommunicationService],
    }).compile();

    service = module.get<AzurecommunicationService>(AzurecommunicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
