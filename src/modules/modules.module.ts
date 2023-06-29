import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from './chat/chat.module';
import { User } from './user/entity/user.entity';
import { UserModule } from './user/user.module';
import { Chat } from './chat/entity/chat.entity';

const Route: Routes = [
    {
        path: 'api/' + 'user',
        module: UserModule
    },
    {
        path: 'api/' + 'chat',
        module: ChatModule
    },
]
@Module({
    imports: [
        UserModule,
        ChatModule,
        TypeOrmModule.forFeature([User, Chat]),
        RouterModule.register(Route)
    ],
})
export class ModulesModule { }

