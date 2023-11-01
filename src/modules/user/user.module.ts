import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entity/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KmlService } from './map/kml.service';
import { MapService } from './map/map.service';
import { City, Country, District, State, SubDistrict, Village, Ward } from './map/entity/map.entity';
import { HttpModule } from '@nestjs/axios';

const http = require('http'),
  https = require('https'),
  httpAgent = new http.Agent({ keepAlive: true,keepAliveMsecs :90000000}),
  httpsAgent = new https.Agent({ keepAlive: true,keepAliveMsecs:90000000 });
@Module({
  imports: [
    HttpModule.register({
      timeout: 90000000,
      httpAgent: httpAgent,
      httpsAgent:httpsAgent
    }),
     TypeOrmModule.forFeature([Country, State, District, SubDistrict, Village, City, Ward])
  ], //User
  controllers: [UserController],
  providers: [UserService, KmlService, MapService],
  exports: [UserService]
})
export class UserModule { }
