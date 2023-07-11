import { BadRequestException, Body, Controller, Get, MaxFileSizeValidator, Param, ParseFilePipe, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { responseUrl } from 'src/layout/auth/constant';
import { User } from './entity/user.entity';
import { userData } from './user-dto.dto';
import { UserService } from './user.service';

@ApiBearerAuth('JWT-auth')
@ApiTags('User')
// @UseGuards(AuthGuard('jwt'))
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

    @ApiParam({ name: 'id' })
    @Get('getById/:id')
    getById(@Param() id: number): Promise<User | any> {
        return this.userService.getById(id)
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './src/assets/upload',
            filename: (req, file, callback) => {
                const name = file.originalname.split('.')[0];
                const extension = file.originalname.split('.')[1];
                const newName = name.split(' ').join('_') + '_' + Date.now() + '.' + extension;
                callback(null, newName)
            },
        }),
        fileFilter: (req, file, callback) => {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) { //for Image Only
                return callback(null, false)
            }
            callback(null, true)
        },
    }))
    fileUpload(@UploadedFile(new ParseFilePipe({
        validators: [
            new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }) //2mb (file cal => 1024 => 1kb -- 1024*1024 => 1mb -- 1024*1024*1024 => 1Gb)
        ]
    })) file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('File is not a image')
        } else {
            const response = {
                filePath: `${responseUrl}/user/getFile/${file.filename}`,
                fileName: file.filename
            }
            return response
        }
    }

    @Get('getFile/:filename')
    getFile(@Param('filename') filename, @Res() response: Response) {
        response.sendFile(filename, { root: './src/assets/upload' })
        //for Delete File
        // fs.unlink(`./src/assets/upload/${filename}`,(err) => {
        //     console.log(err)
        // })
        // response.send('success').status(200).end()
    }
}
