import { Body, Controller, Get, Post, Query, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessageService } from '../service/message.service';
import { CreateMessageDTO, MessageResponseDTO } from '../dto';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

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
    @Get('conversation')
    // @UseGuards(AuthGuard)
    async index(@Query('with') convoWith: string, @Query('page') page: number = 0,
                @Query('limit') limit: number = 10,@Query('from') from: string) {
        limit = limit > 100 ? 100 : limit;
        return await this.messageService.getConversation(convoWith,from, { page, limit });
    }
}
