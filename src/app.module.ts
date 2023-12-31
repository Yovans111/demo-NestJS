import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './layout/auth/auth.module';
import { User } from './modules/user/entity/user.entity';
import { ModulesModule } from './modules/modules.module';
import { Chat } from './modules/chat/entity/chat.entity';
import { MessageEntity } from './modules/message/message.entity';
import { LoginMiddleware } from './middleware/login/login.middleware';
import { Country, State, District, SubDistrict, Village } from './modules/user/map/entity/map.entity';

@Module({
  imports: [AuthModule, ModulesModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'admin@123#2023',
      database: 'mapData', //change to demo for other database
      entities: [User, Chat, MessageEntity, Country, State, District, SubDistrict, Village],
      connectTimeout: 180000 //3 min
      // synchronize: true,
    }),
    RouterModule.register([
      {
        path: '',
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoginMiddleware)
      .exclude('/auth/login')
      .forRoutes('*'); // ('*') applies the middleware to all routes, or you can specify specific routes here.
  }
}
