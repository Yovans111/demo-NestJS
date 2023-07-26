import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from './chat/chat.module';
import { User } from './user/entity/user.entity';
import { UserModule } from './user/user.module';
import { Chat } from './chat/entity/chat.entity';
import { MessageModule } from './message/message.module';

const Route: Routes = [
    {
        path: 'user',
        module: UserModule
    },
    {
        path: 'chat',
        module: ChatModule
    },
    {
        path: 'message',
        module: MessageModule
    },
]
@Module({
    imports: [
        UserModule,
        ChatModule,
        MessageModule,
        TypeOrmModule.forFeature([User, Chat]),
        RouterModule.register(Route),
    ],
})
export class ModulesModule { }

