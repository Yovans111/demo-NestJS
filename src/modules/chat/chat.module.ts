import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './controller/chat.controller';
import { Chat } from './entity/chat.entity';
import { ChatGateway } from './gateway/chat.gateway';
import { AzurecommunicationService } from './service/azurecommunication/azurecommunication.service';
import { ChatService } from './service/chat.service';

@Module({
    imports: [TypeOrmModule.forFeature([Chat])],
    controllers: [ChatController],
    providers: [ChatService, ChatGateway, AzurecommunicationService],
    exports: [ChatGateway]
})
export class ChatModule { }
