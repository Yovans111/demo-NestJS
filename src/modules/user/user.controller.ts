import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from './entity/user.entity';
import { userData } from './user-dto.dto';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth('JWT-auth')
@ApiTags('User')
@UseGuards(AuthGuard('jwt'))
@Controller()
export class UserController {

    constructor(private userService: UserService) { }

    // @UseGuards(AuthGuard('jwt')) //tokenguard
    @Get('get')
    getHello(): any {
        return this.userService.getUserData();
    }

    // @UseGuards(AuthGuard('jwt')) //tokenguard
    @Post('save')
    saveData(@Body() request: userData): any {
        return this.userService.saveData(request);
    }

    @ApiParam({name:'id'})
    @Get('getById/:id')
    getById(@Param() id: number): Promise<User | any> {
        return this.userService.getById(id)
    }
}
