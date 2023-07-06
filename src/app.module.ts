import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './layout/auth/auth.module';
import { User } from './modules/user/entity/user.entity';
import { ModulesModule } from './modules/modules.module';
import { Chat } from './modules/chat/entity/chat.entity';
import { MessageEntity } from './modules/message/message.entity';

@Module({
  imports: [AuthModule, ModulesModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'admin@123#2023',
      database: 'demo',
      entities: [User, Chat, MessageEntity],
      // synchronize: true,
    }),
    RouterModule.register([
      {
        path: 'api',
        module: AuthModule,
      },
      {
        path: '',
        module: ModulesModule,
      }
    ]),],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
