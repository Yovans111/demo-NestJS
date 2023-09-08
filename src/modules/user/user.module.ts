import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entity/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KmlService } from './map/kml.service';
import { MapService } from './map/map.service';
import { Country, District, State, SubDistrict, Village } from './map/entity/map.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Country, State, District, SubDistrict, Village, User])], //User
  controllers: [UserController],
  providers: [UserService, KmlService, MapService],
  exports: [UserService]
})
export class UserModule { }