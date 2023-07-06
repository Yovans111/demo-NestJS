import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessageService } from '../service/message.service';
import { CreateMessageDTO, MessageResponseDTO } from '../dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Message')
@Controller()
export class MessageController {

    constructor(private messageService:MessageService){}

    @Post('save')
    // @UseGuards(AuthGuard)
    // @UsePipes(new ValidationPipe())
    async createMessage(@Body() data: CreateMessageDTO): Promise<MessageResponseDTO> {
        return this.messageService.createMessage(data);
    }
}
