import { Controller, Get, Header, Headers, HttpStatus, Param, Res, StreamableFile } from '@nestjs/common';
import { ChatService } from '../service/chat.service';
import { ApiTags } from '@nestjs/swagger';
import { Room } from '../dto/chat/chat.interface';
import { Response } from 'express';
import { createReadStream, statSync } from 'fs';
import { join } from 'path';

@ApiTags('Chat')
@Controller()
export class ChatController {
    // constructor(private chatService: ChatService) { }

    // @Get('get')
    // async Chat(@Res() res) {
    //     const messages = await this.chatService.getMessages();
    //     return res.json(messages);
    // }

    // //For Room Chat

    // @Get('api/rooms')
    // async getAllRooms(): Promise<Room[]> {
    //     return await this.chatService.getRooms()
    // }

    // @Get('api/rooms/:room')
    // async getRoom(@Param() params): Promise<Room> {
    //     const rooms = await this.chatService.getRooms()
    //     const room = await this.chatService.getRoomByName(params.room)
    //     return rooms[room]
    // }

    // // video stream

    // @Get('stream/:file')
    // @Header('Content-Type', 'video/mp4')
    // stream(@Param('file') file: string, @Res() res: Response, @Headers() headers): any {
    //     const videoPath = `./src/assets/stream/${file}.mp4`;
    //     const { size } = statSync(videoPath);
    //     const videoRange = headers.range;
    //     const fileData = createReadStream(join(process.cwd(), videoPath));
    //     // res.writeHead(HttpStatus.OK);
    //     res.set({
    //         // 'Content-Type': 'video/mp4',
    //         'Content-Disposition': `inline; filename=${file}.mp4`, //  Content-Disposition :'attachment' => is for force to download
    //     });
    //     // return new StreamableFile(fileData)
    //     return fileData.pipe(res)
    // }
}
