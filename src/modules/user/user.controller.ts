import { BadRequestException, Body, Controller, Get, InternalServerErrorException, MaxFileSizeValidator, Param, ParseFilePipe, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { responseUrl } from 'src/layout/auth/constant';
import { User } from './entity/user.entity';
import { userData } from './user-dto.dto';
import { UserService } from './user.service';
import { KmlService } from './map/kml.service';
import { MapService } from './map/map.service';

@ApiBearerAuth('JWT-auth')
@ApiTags('User')
// @UseGuards(AuthGuard('jwt'))
@Controller()
export class UserController {

    constructor(private userService: UserService, private kmlService: KmlService, private mapService: MapService) { }

    // @UseGuards(AuthGuard('jwt')) //tokenguard
    @Get('get')
    getHello(): any {
        const inpath = 'src/assets/json/subdistrict/India_Sub_District_Boundary_2023.json', outpath = '../../../../../../mapData/subdistrict_2023'
        return this.mapService.readLargeJson(inpath, outpath);
        // const inpath = 'src/assets/rawJsonData', outpath = './src/assets/rawValidJson'
        // return this.mapService.convertToSinglejson(inpath)
        // return this.mapService.getUserData();
    }

    @Get('index')
    getIndex(): any {
        const inpath = 'src/assets/json/indiavillage2021.geojson', outpath = './src/assets/rawValidJson'
        return this.mapService.createIndexByVillage(inpath, outpath);
    }

    @Get('saveMap')
    saveMapData(): any {
        return this.mapService.saveDataByFolder();
    }

    @Get('village')
    parseGeojson() {
        const villconfig = { stateName: 'stname', distName: 'dtname', subDistName: 'SUB_DIST_CODE', villageName: 'NAME' },
            otherConfig = { countryName: 'Country', stateName: 'State', distName: 'District', subDistName: 'Subdistrict', villageName: 'Name' }, //villageName: 'name', wardName: 'sourcewardname', cityName: 'townname', wardNo: 'sourcewardcode' },
            config = otherConfig,
            inpath = '../../../../../../mapData/maharastrageojson/maharashtra_district.geojson', outPath = '../../../../../../mapData/maharastra-json-parse'
        return this.mapService.parseGeojson(inpath, outPath, config, 'DIST')
        // return this.mapService.readJsonDataByfolder(inpath, outPath, config, 'VIL') // pass the folder path only
    }

    @Get('geoJson')
    async getGeoJsonFeature(@Query('country') country: string, @Query('state') state: string,
        @Query('district') dist: string, @Query('subdistrict') subdist: string, @Query('village') village: string) {

        const data: any = await this.mapService.getDataByFolder(country, state, dist, subdist, village);
        return data//JSON.stringify(data).replace(/\s/g, '')
    }

    @Get('surveyChurch')
    async surveyChurch() {
        const data: any = await this.mapService.readVillageByDist();
        return data//JSON.stringify(data).replace(/\s/g, '')
    }

    @Get('findDup')
    async findDup() {
        const data: any = await this.mapService.findVillageSubdistIdByNull();
        return data//JSON.stringify(data).replace(/\s/g, '')
    }
    @Get('reObjectId')
    async removeDupObjectId() {
        const data: any = await this.mapService.removeDupObjectId('VILLAGE');
        return data//JSON.stringify(data).replace(/\s/g, '')
    }

    //create geojson data parsing by folder like admin0->admin1->admin2->admin3
    @Get('saveJsonByFolder')
    async saveJsonByFolder() {
        const data: any = await this.mapService.getDataFromDb('VILLAGE');
        return data//JSON.stringify(data).replace(/\s/g, '')
    }

    /** User **/

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


    @Post('upload-kml')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './src/assets',
            filename: (req, file, callback) => {
                const name = file.originalname
                callback(null, name)
            },
        }),
    }),)
    async uploadKml(@UploadedFile() file: Express.Multer.File) {
        try {
            // return this.userService.getJsonData(); // Json extraction
            // // Assuming you have previously defined the output folder path
            const outputFolderPath = './src/assets/upload';
            await this.kmlService.extractKmlFile(file.path, outputFolderPath)
            return { message: 'File uploaded and data extracted successfully!' };
        } catch (error) {
            console.error('Error uploading and processing KML file:', error);
            throw new InternalServerErrorException('Error processing KML file.');
        }
    }
}
