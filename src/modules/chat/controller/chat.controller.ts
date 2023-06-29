import { Controller, Get, Res } from '@nestjs/common';
import { ChatService } from '../service/chat.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Chat')
@Controller()
export class ChatController {
    constructor(private chatService: ChatService) { }
 
    @Get('get')
    async Chat(@Res() res) {
        const messages = await this.chatService.getMessages();
        return res.json(messages);
    }
}
