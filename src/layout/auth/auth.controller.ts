import { BadRequestException, Body, Controller, HttpCode, Post, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RESPONSE_CODE } from './constant';
import { ApiTags } from '@nestjs/swagger';
import { logInData, logInReturnData } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {

    constructor(private authService: AuthService) { }

    @HttpCode(RESPONSE_CODE.SUCCESS)
    @Post('/login')
    async login(@Body() request: logInData): Promise<{ status: any, data?: logInReturnData, statusCode: number, message?: any }> {
        const returnData = await this.authService.login(request);
        if (returnData.statusCode == RESPONSE_CODE.SUCCESS) {
            //@ts-ignore
            return returnData
        } else {
            throw new BadRequestException(returnData)
        }
    }



}
