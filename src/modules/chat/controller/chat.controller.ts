import { Controller, Get, Param, Res } from '@nestjs/common';
import { ChatService } from '../service/chat.service';
import { ApiTags } from '@nestjs/swagger';
import { Room } from '../dto/chat/chat.interface';

@ApiTags('Chat')
@Controller()
export class ChatController {
    constructor(private chatService: ChatService) { }

    @Get('get')
    async Chat(@Res() res) {
        const messages = await this.chatService.getMessages();
        return res.json(messages);
    }

    //For Room Chat
    
    @Get('api/rooms')
    async getAllRooms(): Promise<Room[]> {
        return await this.chatService.getRooms()
    }

    @Get('api/rooms/:room')
    async getRoom(@Param() params): Promise<Room> {
        const rooms = await this.chatService.getRooms()
        const room = await this.chatService.getRoomByName(params.room)
        return rooms[room]
    }
}
