import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from '../chat/chat.module';
import { MessageController } from './controller/message.controller';
import { MessageEntity } from './message.entity';
import { MessageService } from './service/message.service';
import { User } from '../user/entity/user.entity';

@Module({
    imports: [
        CacheModule.register(),
        TypeOrmModule.forFeature([MessageEntity,User]),
        ChatModule
    ],
    controllers: [MessageController],
    providers: [MessageService]
})
export class MessageModule { }
