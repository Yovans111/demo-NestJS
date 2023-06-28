import { Controller } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('base')
export class AppController {
  constructor(private readonly appService: AppService) { }
  
}
