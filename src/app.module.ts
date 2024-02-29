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
import { Country, State, District, SubDistrict, Village, Ward, City } from './modules/user/map/entity/map.entity';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [AuthModule, ModulesModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'admin@123#2023',
      database: 'prod_mapdata', //change to demo for other database
      entities: [Country, State, District, SubDistrict, Village, City, Ward],
      connectTimeout: 18000000 //30 min
      // synchronize: true,

    }),
    //     MongooseModule.forRoot('mongodb://localhost:27017/your-mongodb-database-name', {
    //   // useNewUrlParser: true,
    //   // useUnifiedTopology: true,
    // }),
    // 
    // MongooseModule.forRoot('mongodb://localhost/iif-local'),

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
