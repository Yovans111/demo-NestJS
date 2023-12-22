import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import * as fs from 'fs';
import { appendFile, createWriteStream, existsSync, mkdirSync, writeFileSync } from "fs";
import { Observable, catchError, combineLatest, delay, from, lastValueFrom, mergeMap, of, retryWhen, take, throwError, toArray } from "rxjs";
import { City, Country, District, State, SubDistrict, Village, Ward } from "./entity/map.entity";
import { DataSource, ObjectId, Repository } from "typeorm";
import axios from "axios";
//import path from "path";
import * as path from 'path';

import pointInPolygon from 'point-in-polygon';
import { promisify } from "util";
import { pipeline } from "stream";
import { MongoClient } from "mongodb";
import axiosRetry from "axios-retry";
const fsEx = require('fs-extra');

const jsonMinify = require('jsonminify');
const geojsonStream = require('geojson-stream');

const streamPipeline = promisify(pipeline);

@Injectable()
export class MapService {

    constructor(
        @InjectRepository(Country)
        private countryRepository: Repository<Country>,
        @InjectRepository(State)
        private stateRepository: Repository<State>,
        @InjectRepository(District)
        private districtRepository: Repository<District>,
        @InjectRepository(SubDistrict)
        private subDistrictRepository: Repository<SubDistrict>,
        @InjectRepository(Village)
        private villageRepository: Repository<Village>,
        @InjectRepository(Ward)
        private wardRepository: Repository<Ward>,
        @InjectRepository(City)
        private cityRepository: Repository<City>,
        @InjectDataSource()
        private dataSource: DataSource,
        private http: HttpService,
        private httpService: HttpService

    ) { }
    //Json Extraction


    private createFolderForJson(basePath: string, folderName: string): string {
        const folderPath = `${basePath}/${folderName}`;
        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }
        return folderPath;
    }
    private writeJsonFile(folderPath: string, fileName: string, jsonData: any) {
        const jsonString = JSON.stringify(jsonData, null, 2);
        // return writeFileSync(`${folderPath}/${fileName}.json`, jsonString);
        return writeFileSync(`${folderPath}/${fileName}`, jsonString);
    }

    async getJsonVillageData(inputfilePath: string, outFilePath: string, config: any, level: 'DIST' | 'SUBDIST' | 'VIL' | 'STATE' | 'COUNTRY' | 'CITY' | 'WARD' = 'VIL') {
        let jsonData: any = {}, finalJson: any = {};
        jsonData = await fsEx.readJson(inputfilePath); let outputFolderPath = outFilePath;
        jsonData?.features.forEach((a: any) => {
            let distName: string = this.replaceSpeChar(a?.properties?.[config?.distName]),
                stateName: string = this.replaceSpeChar(a?.properties?.[config?.stateName]),
                subDistName: string = this.replaceSpeChar(a?.properties?.[config?.subDistName]),
                villageName: string = this.replaceSpeChar(a?.properties?.[config?.villageName]),
                countryName: string = this.replaceSpeChar(a?.properties?.[config?.countryName]),
                cityName: string = this.replaceSpeChar(a?.properties?.[config?.cityName]) + '_city',
                wardName: string = this.replaceSpeChar(a?.properties?.[config?.wardName]),
                wardNo: string = this.replaceSpeChar(a?.properties?.[config?.wardNo]);
            finalJson = this.createJsonData(a);
            // const countryPath = this.createFolderForJson(outputFolderPath, countryName);
            // if (level == 'COUNTRY') {
            //     this.writeJsonFile(`${countryPath}`, countryName, finalJson)
            //     console.log(`File for country ${countryName} created`)
            //     return
            // }
            const statePath = this.createFolderForJson(outputFolderPath, stateName); // folder by sytate state
            if (level == 'STATE') {
                this.writeJsonFile(`${statePath}`, stateName, finalJson);
                console.log(`File for state ${stateName}`);
                return
            }
            const distPath = this.createFolderForJson(statePath, distName); //folder by dist Name
            if (level == 'DIST') {
                this.writeJsonFile(`${distPath}`, distName, finalJson);
                console.log(`File for district ${distName} in ${stateName}`);
                return
            }
            if (level == 'CITY' || level == 'WARD') {
                const cityPath = this.createFolderForJson(`${distPath}`, cityName);
                if (level == 'CITY') {
                    this.writeJsonFile(`${cityPath}`, cityName, finalJson);
                    console.log(`File for city ${cityName} in ${stateName}`);
                    return
                }
                // const wardPath = this.createFolderForJson(`${cityPath}`, 'ward');
                if (!wardName) {
                    wardName = 'ward_no_' + wardNo;
                } else {
                    wardName = wardName + '_ward_no_' + wardNo;
                }
                const wardInvPath = this.createFolderForJson(`${cityPath}`, wardName);
                if (level == 'WARD') {
                    this.writeJsonFile(`${wardInvPath}`, wardName, finalJson);
                    console.log(`File for ward ${wardName} in ${stateName}`);
                    return
                }
            }
            const subdistPath = this.createFolderForJson(`${distPath}`, subDistName); //folder by sub dist 
            if (level == 'SUBDIST') {
                this.writeJsonFile(`${subdistPath}`, subDistName, finalJson);
                console.log(`File for subdistrict ${subDistName} in ${stateName}`);
                return
            }
            // const villagePath = this.createFolderForJson(`${subdistPath}`, 'village'); //folder by sub dist 
            const villageInvPath = this.createFolderForJson(`${subdistPath}`, villageName);
            this.writeJsonFile(`${villageInvPath}`, villageName, finalJson);
            console.log(`File for village ${villageName} in ${stateName}`);
        })
    }

    replaceSpeChar(str: string): string {
        const specialCharPattern = /[!@#\$%\^&*()_+|{}\[\]:;<>,.?~\\\-=/"']/g, consecutiveSpaces = /^\s+|\s+$|\s+(?=\s)/g, replacesingleSpace = /\s+/g;
        if (specialCharPattern.test(str)) {
            str = str.replace(specialCharPattern, '');
        }
        if (consecutiveSpaces.test(str)) {
            str = str.replace(consecutiveSpaces, '')
        }
        if (replacesingleSpace.test(str)) {
            str = str.replace(replacesingleSpace, '_')
        }
        return str?.toLowerCase();
    }

    //join multiple json file into single file
    async convertToSinglejson(inputfilePath: any, filesNames?: Array<string>) {
        let features = [], path = './src/assets/rawValidJson/tempFile.json'
        filesNames = ['Chinchwad.json'];
        if (!filesNames?.length) {
            filesNames = await this.readFilesFromFolder(inputfilePath)
        }
        //for test delete exsit data 
        // await unlink(path, (err: any) => { })
        await filesNames.forEach(async (fN: any, i, arr) => {
            let data = await fsEx.readJson(`${inputfilePath}/${fN}`)
            if (typeof data == 'string') {
                data = JSON.parse(data);
            }
            // features = [];
            data?.features?.forEach((a: any, i) => {
                let f = {
                    type: 'Feature',
                    geometry: a?.geometry,
                    properties: a?.attributes
                }
                f.geometry.coordinates = a?.geometry.rings
                f.geometry.type = 'Polygon'
                delete f?.geometry.rings
                features.push(f);
            })
            console.log('features =>', features?.length)
            const valid = this.createJsonData(features)
            let fileN = fN.split('.')[0];
            await this.writeJsonFile('./src/assets/output', fileN, valid)
            // if (i === arr.length - 1) {
            // }
            // this.appendToJsonFile(path, features)
            // data = [];
        })

        // const valid = this.createJsonData(features)
    }
    // readLargeJson(inpath, outpath) {
    //     const fs = require('fs');
    //     const filePath = inpath; // Replace with the actual file path
    //     const readStream = fs.createReadStream(filePath, 'utf8');
    //     let features = [],
    //         states = ['Maharashtra']//'Lakshadweep', 'The Dadra And Nagar Haveli And Daman And Diu', 'Chhattisgarh', 'Andaman and Nicobar Islands', 'West Bengal', 'Haryana', 'Himachal Pradesh', 'Uttarakhand', 'Meghalaya', 'Sikkim', 'Mizoram', 'Nagaland', 'Arunachal Pradesh', 'Punjab', 'Puducherry', 'Jammu And Kashmir', 'Ladakh'
    //     const parse = readStream.pipe(geojsonStream.parse())
    //     const stateFeatureMap = new Map();
    //     console.log(`Features for state started`);
    //     parse.on('data', (feature) => {
    //         const state = feature?.properties?.state;
    //         if (states.includes(state)) {
    //             if (!stateFeatureMap.has(state)) {
    //                 console.log('data =>', state)
    //                 stateFeatureMap.set(state, []);
    //             }
    //             stateFeatureMap.get(state).push(feature);
    //         }
    //     })
    //     parse.on('end', () => {
    //         stateFeatureMap.forEach((features, state) => {
    //            // const outputFile = `${state}_subdistrict`;

    //             const outputFile = 'Wardno_'+ features?.properties?.sourcewardcode;

    //             const featureCollection = {
    //                 type: 'FeatureCollection',
    //                 features: features
    //             };
    //             // const JSONStream = require('JSONStream');
    //             // const outputStream = fs.createWriteStream(`${outpath}/${outputFile}.json`);
    //             // const jsonStream = JSONStream.stringify();
    //             // jsonStream.pipe(outputStream);
    //             // jsonStream.write(featureCollection);
    //             // jsonStream.end();
    //             // outputStream.on('finish', () => {
    //             //     console.log('Data written successfully.');
    //             // });
    //             this.writeJsonFile(outpath, outputFile, featureCollection)
    //             console.log(`Features for state ${state} written to ${outpath}`);
    //         });
    //     });
    // }


    /**** split one json to multiple json */

    // readLargeJson(inpath, outpath) {
    //     const fs = require('fs');
    //     const filePath = inpath;
    //     const readStream = fs.createReadStream(filePath, 'utf8');
    //     const parse = readStream.pipe(geojsonStream.parse());

    //     parse.on('data', (feature) => {

    //         const objectId = feature?.properties?.objectid;
    //         const wardno = feature?.properties?.sourcewardcode
    //         if (objectId) {
    //             const outputFile = `Wardno_${wardno}.json`;
    //             this.writeJsonFile(outpath, outputFile, feature);
    //             console.log(`Feature with ObjectID ${objectId} written to ${outpath}`);
    //         }
    //     });

    //     parse.on('end', () => {
    //         console.log('Processing completed.');
    //     });
    // }

    /**** split one json to multiple json inside the folder */
    readLargeJson(inpath, outpath) {
        const fs = require('fs');
        const filePath = inpath;
        const readStream = fs.createReadStream(filePath, 'utf8');
        const parse = readStream.pipe(geojsonStream.parse());

        parse.on('data', (feature) => {
            const objectId = feature?.properties?.sourcewardcode;
            if (objectId) {
                const folderName = `wardno_${objectId}`;
                const fileName = `wardno_${objectId}.json`;
                const folderPath = `${outpath}/${folderName}`;

                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath);
                }

                this.writeJsonFile(`${folderPath}/${fileName}`, '', feature);

                console.log(`Feature with sourcewardcode ${objectId} written to ${folderPath}/${fileName}`);
            }
        });

        parse.on('end', () => {
            console.log('Processing completed.');
        });
    }


    async appendToJsonFile(filePath, newData) {
        try {
            let eF = await this.isFileExist(filePath)
            if (eF) {
                const jsonString = JSON.stringify(newData, null, 2);
                // const jsonString = '}';                
                appendFile(filePath, jsonString, (err) => { })
            } else {
                await this.writeJsonFile('./src/assets/rawValidJson', 'tempFile', newData)
            }
        } catch (error) {
            console.error(`Error appending data to ${filePath}:`, error);
        }
    }
    async isFileExist(path: any) {
        return new Promise(async (resolve, reject) => {
            if (existsSync(path)) {
                resolve(true)
            } else {
                resolve(false)
            }
        })
    }




    readFilesFromFolder(folderPath: string): Promise<Array<string>> {
        return new Promise((resolve, reject) => {
            fsEx.readdir(folderPath, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(files);
                }
            });
        });
    }




    async readJsonDataByfolder(inpath, outpath, config, level: 'DIST' | 'SUBDIST' | 'VIL' | 'STATE' = 'VIL') {
        let filesNames = await this.readFilesFromFolder(inpath)
        await filesNames.forEach(async (fN: any, i, arr) => {
            this.getJsonVillageData(`${inpath}/${fN}`, outpath, config, level)
        })
    }

    createIndexByVillage(inpath, outpath) {
        const fs = require('fs');
        const geojsonStream = require('geojson-stream');
        const filePath = inpath;
        const readStream = fs.createReadStream(filePath, 'utf8');
        const parse = readStream.pipe(geojsonStream.parse());
        const indexD = []; let count = 0
        console.log(`Features for index started`);
        parse.on('data', (feature) => {
            count++
            const state = feature?.properties?.state, dist = feature?.properties?.district,
                subdist = feature?.properties?.subdistrict, village = feature?.properties?.name;
            const res = {
                country_code: "IND",
                country_name: "India",
                admin_0_name: "India",//country 
                admin_1_name: state,//state
                admin_2_name: dist, // dist
                admin_3_name: subdist,//subdist
                admin_4_name: village,//village
                object_id: '91' + this.generateId(count)
            }
            indexD.push(res);
        })
        parse.on('end', () => {
            this.writeJsonFile(outpath, 'index', indexD)
            console.log(`Features for index written to ${outpath}`);
        });

    }

    generateId(currentId): string {
        const formattedId = currentId.toString().padStart(6, '0');
        currentId++;
        return formattedId;
    }
    createJsonData(data) {
        return new FeatureCollection(data)
    }

    createIndexByDataFolder() {
        var GetFilelistRecursively = ((targetpath, depth = -1) => {
            let result = [];
            let dirs = fs.readdirSync(targetpath);
            dirs.forEach(file => {
                let filepath = targetpath + "/" + file;
                if (fs.lstatSync(filepath).isDirectory()) {
                    if (depth == 0) return result;
                    result.push(file)
                    result = result.concat(GetFilelistRecursively(filepath, depth - 1));
                }
            });
            return result;
        });
    }

    async getDataByFolder(country?: string, state?: string, dist?: string, subdist?: string, village?: string): Promise<any> {
        country = this.replaceSpeChar(country), state = this.replaceSpeChar(state),
            dist = this.replaceSpeChar(dist), subdist = this.replaceSpeChar(subdist), village = this.replaceSpeChar(village)
        return new Promise(async (resolve, reject) => {
            var GetFilelistRecursively = ((targetpath, depth = -1) => {
                let result = [], file = []
                let dirs = fs.readdirSync(targetpath);
                dirs.forEach(files => {
                    let filepath = targetpath + "/" + files;
                    if (fs.lstatSync(filepath).isDirectory()) {
                        if (depth == 0) return result;
                        result.push(this.formatString(files))
                        // result = result.concat(GetFilelistRecursively(filepath, depth - 1));
                    } else {
                        file.push(files)
                    }
                });
                return { dir: result, file: file };
            })
            let basePath = '../../../../../Python Project/iia-data-jobs-master/data', folderPath = '', finaldata: any = {}, jsonData: any = {},
                level = village ? 'VILLAGE' : subdist ? 'SUBDIST' : dist ? 'DIST' : state ? 'STATE' : 'COUNTRY'
            switch (level) {
                case 'VILLAGE':
                    folderPath = `${country}/${state}/${dist}/${subdist}/${village}`
                    console.log('village called =>', folderPath)
                    break;
                case 'SUBDIST':
                    folderPath = `${country}/${state}/${dist}/${subdist}`
                    console.log('subdist called =>', folderPath);
                    break;
                case 'DIST':
                    folderPath = `${country}/${state}/${dist}`
                    console.log('dist called =>', folderPath)
                    break;
                case 'STATE':
                    folderPath = `${country}/${state}`
                    console.log('state called =>', folderPath)
                    break;
                default:
                    folderPath = `${country}`
                    console.log('country called =>', folderPath)
                    break;
            }
            finaldata = GetFilelistRecursively(`${basePath}/${folderPath}`)
            jsonData = finaldata?.file.length ? await this.readJsonFile(`${basePath}/${folderPath}/${finaldata?.file[0]}`) : 'No File Detected'
            let res
            if (jsonData || finaldata.dir) {
                // if (level == 'COUNTRY') {
                // res = { data: finaldata?.dir }
                // } else {
                res = JSON.stringify({ data: finaldata?.dir, geoJson: jsonData })
                // }
                resolve(res);
            } else {
                reject('Unable to Get Data')
            }
        });
    }

    async readJsonFile(path) {
        return await fsEx.readJson(path)
    }
    formatString(str: string) {
        return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    village_dup = {}
    countForEach = { count: 0, total_count: 0 }
    async saveData(data: any, level: 'DIST' | 'SUBDIST' | 'VIL' | 'STATE' | 'COUNTRY') {
        // const countryQuery = this.countryRepository.createQueryBuilder('country'),
        //     stateQuery = this.stateRepository.createQueryBuilder('state'),
        //     districtQuery = this.districtRepository.createQueryBuilder('district'),
        //     subdistQuery = this.subDistrictRepository.createQueryBuilder('subdistrict'),
        //     villageQuery = this.villageRepository.createQueryBuilder('village');
        // let name = data?.properties['name'], properties = data?.properties, geometries = this.stringifyData(data?.geometry), res: any;
        // switch (level) {
        //     case 'COUNTRY':
        //         const country_object_id = '1';
        //         properties = this.setProperty(properties, country_object_id)
        //         res = await countryQuery.insert().into(Country).values({ country_name: name, geometries, properties, object_id: country_object_id }).execute()
        //         break;
        //     case 'STATE':
        //         let countryData = await this.countryRepository.findOne({ where: { country_name: data?.properties['country'] } }),
        //             country_id = countryData['id'], counObId = countryData['object_id'],
        //             state_object_id = this.generateObjectId(counObId, 2);
        //         properties = this.setProperty(properties, state_object_id)
        //         res = await stateQuery.insert().into(State).values({ state_name: name, geometries, properties, country_id, object_id: state_object_id }).execute()
        //         break;
        //     case 'DIST':
        //         let stateData = await this.stateRepository.findOne({ where: { state_name: data?.properties['state'] } });
        //         let state_id = stateData?.['id'], stateObId = stateData?.['object_id'],
        //             district_object_id = this.generateObjectId(stateObId, 2);
        //         properties = this.setProperty(properties, district_object_id)
        //         res = await districtQuery.insert().into(District).values({ district_name: name, geometries, properties, state_id, object_id: district_object_id }).execute()
        //         break;
        //     case 'SUBDIST':
        //         let districtData = await this.districtRepository.findOne({ where: { district_name: data?.properties['district'] } });
        //         let district_id = districtData?.['id'], districtObId = districtData?.['object_id'],
        //             subdist_object_id = this.generateObjectId(districtObId, 2);
        //         properties = this.setProperty(properties, subdist_object_id);
        //         res = await subdistQuery.insert().into(SubDistrict).values({ subdistrict_name: name, geometries, properties, district_id, object_id: subdist_object_id }).execute()
        //         break;
        //     case 'VIL':
        //         console.log('village Called =>', name, 'state =>', data?.properties?.['state']);
        //         let subdistData = await this.subDistrictRepository.findOne({ where: { subdistrict_name: data?.properties['subdistrict'] } });
        //         let subdistrict_id = subdistData?.['id'], subdistObId = subdistData?.['object_id'],
        //             village_object_id = this.generateObjectId(subdistObId, 3), state_name = data?.properties?.['state'];
        //         properties = this.setProperty(properties, village_object_id)
        //         const state = data?.properties['state'], district = data?.properties['district'], subdist = data?.properties['subdistrict']
        //         if (!this.village_dup?.[state]) {
        //             this.village_dup[state] = {}
        //         }
        //         if (!this.village_dup?.[state][district]) {
        //             this.village_dup[state][district] = {}
        //         }
        //         if (!this.village_dup?.[state][district][subdist]) {
        //             this.village_dup[state][district][subdist] = []
        //         }
        //         if (!this.village_dup?.[state][district][subdist].includes(name)) {
        //             this.village_dup[state][district][subdist].push(name)
        //         } else {
        //             name = name + '_' + village_object_id
        //         };
        //         this.countForEach.count++
        //         console.log(`Before Insert ${name} | state => ${state} | count => ${this.countForEach.count} / ${this.countForEach.total_count}`);
        //         res = await villageQuery.insert().into(Village).values({ village_name: name, geometries, properties, subdistrict_id, object_id: village_object_id, state_name }).execute();
        //         // console.log('After Insert',name)
        //         break;
        // }
        // if (res)
        //     console.log('Data Save successfully =>', name, 'state =>', data?.properties?.['state'])
    }

    async saveDataByFolder() {
        let path = '../../../../../../mapData/village_2023',
            // let path = 'src/assets/json/subdistrict',
            // fileName = await this.readFilesFromFolder(path),
            fileName = ['Rajasthan_village.json']
        // const count: { state: string, count: number } = { state: '', count: 0 }
        let count = 0
        console.log('fileNames =>', fileName)

        for (let fn of fileName) {
            let jsonData = await this.readJsonFile(`${path}/${fn}`)
            for (let feature of jsonData?.['features']) {
                // if (['Assam', 'Bihar'].includes(feature?.properties?.state)) {
                //     count['state'] = feature?.properties?.state
                //     count.count++;
                // }
                count++
                this.saveData(feature, 'VIL');
            }
        }
        this.countForEach.total_count = count
        console.log('Total count =>', count)
    }

    setProperty(properties, object_id) {
        properties['object_id'] = object_id;
        properties['objectid'] ? delete properties['objectid'] : '';
        return this.stringifyData(properties);
    }

    idMap = {};
    generateObjectId(ObId, padstart) {
        if (!this.idMap[ObId]) {
            this.idMap[ObId] = { ObjId: ObId, newId: 1 };
        }
        const { ObjId, newId } = this.idMap[ObId];
        this.idMap[ObId].newId++;
        return `${ObjId}${newId?.toString().padStart(padstart, '0')}`
    }

    stringifyData(data) {
        return JSON.stringify(data)
    }




    /* For create India upto village folder using Db  */


    async getDataFromDb(level: 'COUNTRY' | 'STATE' | 'DIST' | 'SUB-DIST' | 'VILLAGE' | 'CITY' | 'WARD' | 'wardId', stateName: string, districtName: string) {
        const countryQuery = this.countryRepository.createQueryBuilder('c'),
            stateQuery = this.stateRepository.createQueryBuilder('s'),
            districtQuery = this.districtRepository.createQueryBuilder('d'),
            subdistQuery = this.subDistrictRepository.createQueryBuilder('sd'),
            villageQuery = this.villageRepository.createQueryBuilder('v'),
            wardQuery = this.wardRepository.createQueryBuilder('w'),
            cityQuery = this.cityRepository.createQueryBuilder('ci');
        let streamData, query, select;

        switch (level) {
            case 'COUNTRY':
                select = ['c.id as id', 'c.properties as properties', 'c.geometries as geometries', 'c.object_id as object_id']
                streamData = await countryQuery.select(select).stream();
                query = 'SELECT  c.country_name from country as c where c.id ='
                break;
            case 'STATE':
                select = ['s.state_name as state_name', 's.properties as properties', 's.geometries as geometries', 's.country_id as country_id', 's.id as id', 's.object_id as object_id']
                streamData = await stateQuery.select(select).stream();
                query = `
                SELECT  c.country_name,s.state_name from state as s
                INNER JOIN country as c on c.id = s.country_id
                WHERE s.id = `
                break;
            case 'DIST':
                select = ['d.district_name as district_name', 'd.properties as properties', 'd.geometries as geometries', 'd.state_id as state_id', 'd.id as id', 'd.object_id as object_id']
                streamData = await districtQuery.select(select).stream();
                query = `
                select c.country_name,s.state_name,d.district_name from district as d
                inner join state as s on s.id = d.state_id
                inner join country as c on c.id = s.country_id
                where d.id =`
                break;
            case 'SUB-DIST':
                select = ['sd.subdistrict_name as subdistrict_name', 'sd.district_id as district_id', 'sd.properties as properties', 'sd.geometries as geometries', 'sd.id as id', 'sd.object_id as object_id']
                streamData = await subdistQuery.select(select).stream();
                query = `
                select c.country_name,s.state_name,d.district_name,sd.subdistrict_name from subdistrict as sd
                inner join district as d on d.id = sd.district_id
                inner join state as s on s.id = d.state_id
                inner join country as c on c.id = s.country_id
                where sd.id = `
                break;
            case 'VILLAGE':
                select = ['v.village_name as village_name', 'v.subdistrict_id as subdistrict_id', 'v.properties as properties', 'v.geometries as geometries', 'v.id as id', 'v.object_id as object_id']
                //.where('v.state_name = :value', { value: 'Andaman and Nicobar Islands' }) //for filter by state
                // streamData = await villageQuery.select(select)
                //     .innerJoin(`subdistrict`, `subd`, `subd.id = v.subdistrict_id`)
                //     .innerJoin(`district`, `dist`, `dist.id = subd.district_id`)
                //     .where('v.state_name = :value', { value: 'Maharashtra' })
                //     .andWhere('dist.district_name = :distValue', { distValue: 'Ahmednagar' })
                //     .stream();
                streamData = await villageQuery.select(select)
                    .innerJoin('subdistrict', 'subd', 'subd.id = v.subdistrict_id')
                    .innerJoin('district', 'dist', 'dist.id = subd.district_id')
                    // .where('v.state_name = :value', { value: 'Tamil Nadu' }) 
                    // .andWhere('dist.district_name IN (:...districts)', { districts: ['Dharmapuri',
                    //  'Dindigul','Erode'] })
                    .where('v.state_name = :stateName', { stateName })
                    .andWhere('dist.district_name = :districtName', { districtName })
                    .stream();

                query = `
                select c.country_name as admin0,s.state_name as admin1,d.district_name as admin2,sd.subdistrict_name as admin3,v.village_name as admin4,v.object_id as object_id from village as v
                inner join subdistrict as sd on sd.id = v.subdistrict_id
                inner join district as d on d.id = sd.district_id
                inner join state as s on s.id = d.state_id
                inner join country as c on c.id = s.country_id
                where  v.id =`
                break;
            case 'CITY':
                streamData = await cityQuery.stream();
                break;
            case 'WARD':
                select = ['w.ward_name as ward_name', 'w.city_id as city_id', 'w.properties as properties', 'w.geometries as geometries', 'w.id as id', 'w.object_id as object_id']
                streamData = await wardQuery.select(select)
                    .innerJoin('city', 'ci', 'ci.id = w.city_id')
                    .innerJoin('district', 'dist', 'dist.id = ci.district_id')
                    .where('w.state_name = :value', { value: 'Tamil Naadu' })
                    .andWhere('dist.district_name IN (:...districts)', { districts: ['Karur'] })
                    //.andWhere('ci.city_name = :cityName', { cityName: 'Nagpur' })
                    .stream();

                query = `
                select c.country_name as admin0,s.state_name as admin1,d.district_name as admin2,ci.city_name as admin3,w.ward_name as admin4,w.object_id as object_id from ward as w
                inner join city as ci on ci.id = w.city_id
                inner join district as d on d.id = ci.district_id
                inner join state as s on s.id = d.state_id
                inner join country as c on c.id = s.country_id
                where  w.id =`
                break;


        };


        console.log(`stream Start for level => ${level}`)
        let count = { totalCount: 0, forState: 0 }

        await streamData.on('data', async (d: any) => {
            let prop = typeof d?.properties == 'string' ? JSON.parse(d?.properties) : d?.properties;
            const geometry = typeof d?.geometries == 'string' ? JSON.parse(d?.geometries) : d?.geometries;
            prop.object_id = d?.object_id;
            count.totalCount++
            const features = {
                "type": "Feature",
                "properties": prop,
                "geometry": geometry
            }
            // console.log('state=>',d)
            const joinDataArr = await this.dataSource.query(query + d?.id);
            const joinData = await Array.isArray(joinDataArr) && joinDataArr.length ? joinDataArr[0] : joinDataArr;
            count.forState++;
            //     const admin0 = joinData.admin0.replace(/[_-]/g, ''); 
            //     const admin1 = joinData.admin1.replace(/[_-]/g, '');
            //     const admin2 = joinData.admin2.replace(/[_-]/g, ''); 
            //  const admin3 = joinData.admin3.replace(/[_-]/g, '')+ ' City';
            //  const admin4 = joinData.admin4.replace(/[-_ –]/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').replace(/\b\w/g, (char) => char.toUpperCase());
            //    //const admin4 = joinData.admin4.replace(/[_-]/g, '').replace(/^\s*No\s*/i, 'Wardno ').replace(/(\d+)/, ' $1').trim().replace(/^\w/, (c) => c.toUpperCase());


            //     try {
            //         const { data: churchCount } = await this.getChurchCount(admin0, admin1, admin2, admin3, admin4);
            //         console.log('objectid=>'+ joinData.object_id,'Church count:', churchCount,'admin0=>'+admin0,'admin1=>'+admin1,'admin2=>'+admin2,'admin3=>'+admin3,'admin4=>'+admin4);

            //         await this.saveStats(joinData.object_id,features, churchCount);
            //       } catch (error) {
            //         console.error('Error =>', error);
            //       }



            //const churchCount = await this.getChurchCount(joinData.admin0, joinData.admin1, joinData.admin2, joinData.admin3, joinData.admin4);
            // await this.saveStats(joinData.object_id, features, churchCount);
            await this.surveyAndStats(joinData.admin0, joinData.admin1, joinData.admin2, joinData.admin3, joinData.admin4, geometry.coordinates, features, joinData.object_id)
            //await this.surveyAndStats(joinData.admin0, joinData.admin1, joinData.admin2,  joinData.admin3 + '_city', joinData.admin4, geometry.coordinates, features, joinData.object_id)
            console.log(`state => ${joinData.admin2} | ward => ${joinData.admin4} |city => ${joinData.admin3} |count => ${count.forState} | totalCount => ${count.totalCount}`);
        })

        streamData.on('error', (error) => {
            console.error('Error in streamData:', error);
        });

        streamData.on('end', () => {
            console.log('Stream Completed');
        });

    }










    async getDataFromDbVillageOutBoundary(level: 'COUNTRY' | 'STATE' | 'DIST' | 'SUB-DIST' | 'VILLAGE' | 'CITY' | 'WARD' | 'wardId', stateName: string, districtName: string) {
        const countryQuery = this.countryRepository.createQueryBuilder('c'),
            stateQuery = this.stateRepository.createQueryBuilder('s'),
            districtQuery = this.districtRepository.createQueryBuilder('d'),
            subdistQuery = this.subDistrictRepository.createQueryBuilder('sd'),
            villageQuery = this.villageRepository.createQueryBuilder('v'),
            wardQuery = this.wardRepository.createQueryBuilder('w'),
            cityQuery = this.cityRepository.createQueryBuilder('ci');
        let streamData, query, select;

        switch (level) {
            case 'COUNTRY':
                select = ['c.id as id', 'c.properties as properties', 'c.geometries as geometries', 'c.object_id as object_id']
                streamData = await countryQuery.select(select).stream();
                query = 'SELECT  c.country_name from country as c where c.id ='
                break;
            case 'STATE':
                select = ['s.state_name as state_name', 's.properties as properties', 's.geometries as geometries', 's.country_id as country_id', 's.id as id', 's.object_id as object_id']
                streamData = await stateQuery.select(select).stream();
                query = `
                SELECT  c.country_name,s.state_name from state as s
                INNER JOIN country as c on c.id = s.country_id
                WHERE s.id = `
                break;
            case 'DIST':
                select = ['d.district_name as district_name', 'd.properties as properties', 'd.geometries as geometries', 'd.state_id as state_id', 'd.id as id', 'd.object_id as object_id']
                streamData = await districtQuery.select(select).stream();
                query = `
                select c.country_name,s.state_name,d.district_name from district as d
                inner join state as s on s.id = d.state_id
                inner join country as c on c.id = s.country_id
                where d.id =`
                break;
            case 'SUB-DIST':
                select = ['sd.subdistrict_name as subdistrict_name', 'sd.district_id as district_id', 'sd.properties as properties', 'sd.geometries as geometries', 'sd.id as id', 'sd.object_id as object_id']
                streamData = await subdistQuery.select(select).stream();
                query = `
                select c.country_name,s.state_name,d.district_name,sd.subdistrict_name from subdistrict as sd
                inner join district as d on d.id = sd.district_id
                inner join state as s on s.id = d.state_id
                inner join country as c on c.id = s.country_id
                where sd.id = `
                break;
            case 'VILLAGE':
                select = ['v.village_name as village_name', 'v.subdistrict_id as subdistrict_id', 'v.properties as properties', 'v.geometries as geometries', 'v.id as id', 'v.object_id as object_id']
                //.where('v.state_name = :value', { value: 'Andaman and Nicobar Islands' }) //for filter by state
                // streamData = await villageQuery.select(select)
                //     .innerJoin(`subdistrict`, `subd`, `subd.id = v.subdistrict_id`)
                //     .innerJoin(`district`, `dist`, `dist.id = subd.district_id`)
                //     .where('v.state_name = :value', { value: 'Maharashtra' })
                //     .andWhere('dist.district_name = :distValue', { distValue: 'Ahmednagar' })
                //     .stream();
                streamData = await villageQuery.select(select)
                    .innerJoin('subdistrict', 'subd', 'subd.id = v.subdistrict_id')
                    .innerJoin('district', 'dist', 'dist.id = subd.district_id')
                    // .where('v.state_name = :value', { value: 'Tamil Nadu' }) 
                    // .andWhere('dist.district_name IN (:...districts)', { districts: ['Dharmapuri',
                    //  'Dindigul','Erode'] })
                    .where('v.state_name = :stateName', { stateName })
                    .andWhere('dist.district_name = :districtName', { districtName })
                    .stream();

                query = `
                select c.country_name as admin0,s.state_name as admin1,d.district_name as admin2,sd.subdistrict_name as admin3,v.village_name as admin4,v.object_id as object_id from village as v
                inner join subdistrict as sd on sd.id = v.subdistrict_id
                inner join district as d on d.id = sd.district_id
                inner join state as s on s.id = d.state_id
                inner join country as c on c.id = s.country_id
                where  v.id =`
                break;
            case 'CITY':
                streamData = await cityQuery.stream();
                break;
            case 'WARD':
                select = ['w.ward_name as ward_name', 'w.city_id as city_id', 'w.properties as properties', 'w.geometries as geometries', 'w.id as id', 'w.object_id as object_id']
                streamData = await wardQuery.select(select)
                    .innerJoin('city', 'ci', 'ci.id = w.city_id')
                    .innerJoin('district', 'dist', 'dist.id = ci.district_id')
                    .where('w.state_name = :value', { value: 'Tamil Naadu' })
                    .andWhere('dist.district_name IN (:...districts)', { districts: ['Karur'] })
                    //.andWhere('ci.city_name = :cityName', { cityName: 'Nagpur' })
                    .stream();

                query = `
                select c.country_name as admin0,s.state_name as admin1,d.district_name as admin2,ci.city_name as admin3,w.ward_name as admin4,w.object_id as object_id from ward as w
                inner join city as ci on ci.id = w.city_id
                inner join district as d on d.id = ci.district_id
                inner join state as s on s.id = d.state_id
                inner join country as c on c.id = s.country_id
                where  w.id =`
                break;


        };


        console.log(`stream Start for level => ${level}`)
        let count = { totalCount: 0, forState: 0 }

        await streamData.on('data', async (d: any) => {
            let prop = typeof d?.properties == 'string' ? JSON.parse(d?.properties) : d?.properties;
            const geometry = typeof d?.geometries == 'string' ? JSON.parse(d?.geometries) : d?.geometries;
            prop.object_id = d?.object_id;
            count.totalCount++
            const features = {
                "type": "Feature",
                "properties": prop,
                "geometry": geometry
            }
            // console.log('state=>',d)
            const joinDataArr = await this.dataSource.query(query + d?.id);
            const joinData = await Array.isArray(joinDataArr) && joinDataArr.length ? joinDataArr[0] : joinDataArr;
            count.forState++;
            await this.surveyAndStatsVillageOutside(joinData.admin0, joinData.admin1, joinData.admin2, joinData.admin3, joinData.admin4, geometry.coordinates, features, joinData.object_id)
            //await this.surveyAndStats(joinData.admin0, joinData.admin1, joinData.admin2,  joinData.admin3 + '_city', joinData.admin4, geometry.coordinates, features, joinData.object_id)
            console.log(`state => ${joinData.admin2} | ward => ${joinData.admin4} |city => ${joinData.admin3} |count => ${count.forState} | totalCount => ${count.totalCount}`);
        })

        streamData.on('error', (error) => {
            console.error('Error in streamData:', error);
        });

        streamData.on('end', () => {
            console.log('Stream Completed');
        });

    }






    async getDataFromDbWard(level: 'COUNTRY' | 'STATE' | 'DIST' | 'SUB-DIST' | 'VILLAGE' | 'CITY' | 'WARD' | 'wardId', stateName: string, districtName: string, cityName: string) {
        const countryQuery = this.countryRepository.createQueryBuilder('c'),
            stateQuery = this.stateRepository.createQueryBuilder('s'),
            districtQuery = this.districtRepository.createQueryBuilder('d'),
            subdistQuery = this.subDistrictRepository.createQueryBuilder('sd'),
            villageQuery = this.villageRepository.createQueryBuilder('v'),
            wardQuery = this.wardRepository.createQueryBuilder('w'),
            cityQuery = this.cityRepository.createQueryBuilder('ci');
        let streamData, query, select;
        switch (level) {


            case 'WARD':
                select = ['w.ward_name as ward_name', 'w.city_id as city_id', 'w.properties as properties', 'w.geometries as geometries', 'w.id as id', 'w.object_id as object_id']
                streamData = await wardQuery.select(select)
                    .innerJoin('city', 'ci', 'ci.id = w.city_id')
                    .innerJoin('district', 'dist', 'dist.id = ci.district_id')
                    // .where('w.state_name = :value', { value: 'Tamil Naadu' })
                    // .andWhere('dist.district_name IN (:...districts)', { districts: ['Nagpur'] })
                    //.andWhere('ci.city_name = :cityName', { cityName: 'Nagpur' })
                    .where('w.state_name = :stateName', { stateName })
                    .andWhere('dist.district_name = :districtName', { districtName })
                    .andWhere('ci.city_name = :cityName', { cityName })
                    .stream();

                query = `
                select c.country_name as admin0,s.state_name as admin1,d.district_name as admin2,ci.city_name as admin3,w.ward_name as admin4,w.object_id as object_id from ward as w
                inner join city as ci on ci.id = w.city_id
                inner join district as d on d.id = ci.district_id
                inner join state as s on s.id = d.state_id
                inner join country as c on c.id = s.country_id
                where  w.id =`
                break;


        };


        console.log(`stream Start for level => ${level}`)
        let count = { totalCount: 0, forState: 0 }

        await streamData.on('data', async (d: any) => {
            let prop = typeof d?.properties == 'string' ? JSON.parse(d?.properties) : d?.properties;
            const geometry = typeof d?.geometries == 'string' ? JSON.parse(d?.geometries) : d?.geometries;
            prop.object_id = d?.object_id;
            count.totalCount++
            const features = {
                "type": "Feature",
                "properties": prop,
                "geometry": geometry
            }
            // console.log('state=>',d)
            const joinDataArr = await this.dataSource.query(query + d?.id);
            const joinData = await Array.isArray(joinDataArr) && joinDataArr.length ? joinDataArr[0] : joinDataArr;
            count.forState++;

            //  const admin3 = joinData.admin3.replace(/[_-]/g, '')+ ' City';
            //   const admin4 = joinData.admin4.replace(/[-_ –]/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').replace(/\b\w/g, (char) => char.toUpperCase());
            //    //const admin4 = joinData.admin4.replace(/[_-]/g, '').replace(/^\s*No\s*/i, 'Wardno ').replace(/(\d+)/, ' $1').trim().replace(/^\w/, (c) => c.toUpperCase());


            //     try {
            //         const { data: churchCount } = await this.getChurchCount(admin0, admin1, admin2, admin3, admin4);
            //         console.log('objectid=>'+ joinData.object_id,'Church count:', churchCount,'admin0=>'+admin0,'admin1=>'+admin1,'admin2=>'+admin2,'admin3=>'+admin3,'admin4=>'+admin4);

            //         await this.saveStats(joinData.object_id,features, churchCount);
            //       } catch (error) {
            //         console.error('Error =>', error);
            //       }



            //const churchCount = await this.getChurchCount(joinData.admin0, joinData.admin1, joinData.admin2, joinData.admin3, joinData.admin4);
            // await this.saveStats(joinData.object_id, features, churchCount);
            await this.surveyAndStatsWard(joinData.admin0, joinData.admin1, joinData.admin2, joinData.admin3, joinData.admin4, geometry.coordinates, features, joinData.object_id)
            //await this.surveyAndStats(joinData.admin0, joinData.admin1, joinData.admin2,  joinData.admin3 + '_city', joinData.admin4, geometry.coordinates, features, joinData.object_id)
            // console.log(`state => ${joinData.admin2} | ward => ${joinData.admin4} |city => ${joinData.admin3} |count => ${count.forState} | totalCount => ${count.totalCount}`);
        })

        streamData.on('error', (error) => {
            console.error('Error in streamData:', error);
        });

        streamData.on('end', () => {
            console.log('Stream Completed');
        });

    }







    async getDataFromDbWardOutBoundary(level: 'COUNTRY' | 'STATE' | 'DIST' | 'SUB-DIST' | 'VILLAGE' | 'CITY' | 'WARD' | 'wardId', stateName: string, districtName: string) {



        const countryQuery = this.countryRepository.createQueryBuilder('c'),
            stateQuery = this.stateRepository.createQueryBuilder('s'),
            districtQuery = this.districtRepository.createQueryBuilder('d'),
            subdistQuery = this.subDistrictRepository.createQueryBuilder('sd'),
            villageQuery = this.villageRepository.createQueryBuilder('v'),
            wardQuery = this.wardRepository.createQueryBuilder('w'),
            cityQuery = this.cityRepository.createQueryBuilder('ci');
        let streamData, query, select;
        switch (level) {


            case 'WARD':
                select = ['w.ward_name as ward_name', 'w.city_id as city_id', 'w.properties as properties', 'w.geometries as geometries', 'w.id as id', 'w.object_id as object_id']
                streamData = await wardQuery.select(select)
                    .innerJoin('city', 'ci', 'ci.id = w.city_id')
                    .innerJoin('district', 'dist', 'dist.id = ci.district_id')
                    // .where('w.state_name = :value', { value: 'Tamil Naadu' })
                    // .andWhere('dist.district_name IN (:...districts)', { districts: ['Nagpur'] })
                    //.andWhere('ci.city_name = :cityName', { cityName: 'Nagpur' })
                    .where('w.state_name = :stateName', { stateName })
                    .andWhere('dist.district_name = :districtName', { districtName })
                    // .andWhere('ci.city_name = :cityName', { cityName })
                    .stream();

                query = `
                select c.country_name as admin0,s.state_name as admin1,d.district_name as admin2,ci.city_name as admin3,w.ward_name as admin4,w.object_id as object_id from ward as w
                inner join city as ci on ci.id = w.city_id
                inner join district as d on d.id = ci.district_id
                inner join state as s on s.id = d.state_id
                inner join country as c on c.id = s.country_id
                where  w.id =`
                break;


        };


        console.log(`stream Start for level => ${level}`)
        let count = { totalCount: 0, forState: 0 }

        await streamData.on('data', async (d: any) => {
            let prop = typeof d?.properties == 'string' ? JSON.parse(d?.properties) : d?.properties;
            const geometry = typeof d?.geometries == 'string' ? JSON.parse(d?.geometries) : d?.geometries;
            prop.object_id = d?.object_id;
            count.totalCount++
            const features = {
                "type": "Feature",
                "properties": prop,
                "geometry": geometry
            }
            // console.log('state=>',d)
            const joinDataArr = await this.dataSource.query(query + d?.id);
            const joinData = await Array.isArray(joinDataArr) && joinDataArr.length ? joinDataArr[0] : joinDataArr;
            count.forState++;

            await this.surveyAndStatsWardOutside(joinData.admin0, joinData.admin1, joinData.admin2, joinData.admin3, joinData.admin4, geometry.coordinates, features, joinData.object_id)

        })

        streamData.on('error', (error) => {
            console.error('Error in streamData:', error);
        });

        streamData.on('end', () => {
            console.log('Stream Completed');
        });

    }






    async createFolderAndSave(level, json, fullData, count) {
        let folderpath = '', outputFolderPath = `../../../../../../mapData/parseData/india_village`,
            countryName = this.replaceSpeChar(fullData?.country_name),
            stateName = this.replaceSpeChar(fullData?.state_name), distName = this.replaceSpeChar(fullData?.district_name),
            subDistName = this.replaceSpeChar(fullData?.subdistrict_name), villageName = this.replaceSpeChar(fullData?.village_name),
            logMsg = '', fileName = '';
        switch (level) {
            case 'COUNTRY':
                folderpath = await this.createFolderForJson(`${outputFolderPath}`, countryName);
                logMsg = `File Creatad for Country => ${countryName} `
                fileName = countryName
                break;
            case 'STATE':
                folderpath = await this.createFolderForJson(`${outputFolderPath}/${countryName}`, stateName);
                logMsg = `File Creatad for state => ${stateName} `
                fileName = stateName
                break;
            case 'DIST':
                folderpath = await this.createFolderForJson(`${outputFolderPath}/${countryName}/${stateName}`, distName);
                logMsg = `File Created For State => ${stateName} | dist => ${distName}`
                fileName = distName
                break;
            case 'SUB-DIST':
                folderpath = await this.createFolderForJson(`${outputFolderPath}/${countryName}/${stateName}/${distName}`, subDistName);
                logMsg = `File Created For State => ${stateName} | subdist => ${subDistName}`
                fileName = subDistName
                break;
            case 'VILLAGE':
                folderpath = await this.createFolderForJson(`${outputFolderPath}/${countryName}/${stateName}/${distName}/${subDistName}`, villageName);
                logMsg = `File Created For State => ${stateName} | dist => ${distName} | village =>${villageName}`
                fileName = villageName
                break;
        }

        const res: any = await this.writeJsonFile(`${folderpath}`, fileName, json);
        console.log(`${logMsg} | count => ${count.forState} | totalCount => ${count.totalCount}`);
    }


    //For survery churchs and remove dupicate churches
    getChurchCount(admin0, admin1, admin2, admin3, admin4) {
        const url = `http://192.168.86.18:8080/api/admin-areas/village/church-count?admin0=${admin0}&admin1=${admin1}&admin2=${admin2}&admin3=${admin3}&admin4=${admin4}`;
        const headersRequest = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhbnNsaW5qZW5pc2hhIiwiYXV0aCI6Ik9SR19BRE1JTixPUkdfVVNFUixST0xFX0FETUlOIiwiZXhwIjoxNjk3MzQ3Nzg1fQ.j5xUAHTRZA-RDgDItl4KGy_D9JLjt69ZYVqmx7oQQpzNDrgxOUQKNdplNzqDpnLFzJWddYySENGnRGOctRQ8xQ`,
        };
        return lastValueFrom(this.http.get(url, { headers: headersRequest }));
    }


    getChurhes(admin0, admin1, admin2, admin3?, admin4?) {
        // const url = `http://192.168.0.109:8080/api/admin-areas/dist-churches?admin0=${admin0}&admin1=${admin1}&admin2=${admin2}`;
        const url = `http://192.168.86.18:8080/api/admin-areas/village-churches?admin0=${admin0}&admin1=${admin1}&admin2=${admin2}&admin3=${admin3}&admin4=${admin4}`;
        const headersRequest = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhbnNsaW5qZW5pc2hhIiwiYXV0aCI6Ik9SR19BRE1JTixPUkdfVVNFUixST0xFX0FETUlOIiwiZXhwIjoxNjk3MzQ3Nzg1fQ.j5xUAHTRZA-RDgDItl4KGy_D9JLjt69ZYVqmx7oQQpzNDrgxOUQKNdplNzqDpnLFzJWddYySENGnRGOctRQ8xQ`,
        };
        return lastValueFrom(this.http.get(url, { headers: headersRequest }));
    }


    async surveyAndStats(admin0, admin1, admin2, admin3, admin4, polygon, features, object_id?) {
        return new Promise(async (resolve, reject) => {
            const churchList = [];
            console.log('admin0=>' + admin0, 'admin1=>' + admin1, 'admin2=>' + admin2, 'admin3=>' + admin3, 'admin4=>' + admin4);
            await this.getChurhes(admin0, admin1, admin2, admin3, admin4).then(async (res: any) => {
                if (Array.isArray(res?.data)) {
                    const churchres = await this.removeDuplicate(res?.data);
                    await churchres.forEach(async e => {
                        let geo = e.geometry?.location;
                        const isInside = await this.isMarkerInsidePolygon(geo, polygon)
                        if (isInside) {
                            churchList.push(e);
                        }
                        // console.log('IsIn    side =>', isInside, `| ${admin2} | ${admin3} | ${admin4} | ch => ${e?.name}`)
                    })
                    try {
                        // const apiA: Observable<any> = from(this.saveSurvey(features, churchList)),
                        //     apiB: Observable<any> = from(this.saveStats(object_id, features, churchList))
                        // await combineLatest({
                        //     survey: apiA,
                        //     stats: apiB
                        // }).subscribe((a) => {
                        //     resolve(a);
                        // });
                        Promise.all([
                            this.saveSurvey(features, churchList),
                            this.saveStats(object_id, features, churchList)
                        ]).then((res) => {
                            resolve(res)
                        })
                            .catch((err) => { console.log('Error in Combine =>', err) })
                    } catch (error) {
                        console.log('Error in Combine =>', error)
                    }
                    // await this.saveStats(admin2, admin3, admin4, features, churchList);
                    this.total_church_count += +churchList.length
                    console.log('Final Result churches', churchList.length, ` totalCount => ${this.total_church_count}  | ${admin2} | ${admin3} | ${admin4} `)
                } else {
                    resolve(res);
                }
            }).catch((err) => { reject(`Error in getting Church ${err}`); })

        })
    }




    async surveyAndStatsVillageOutside(admin0, admin1, admin2, admin3, admin4, polygon, features, object_id) {
        try {
            const churchList = [];
            console.log(`admin0: ${admin0}, admin1: ${admin1}, admin2: ${admin2}, admin3: ${admin3}, admin4: ${admin4}`);

            const client = await MongoClient.connect('mongodb://localhost:27017/');
            const db = client.db('iif-local');

            const outsideChurchCollection = await db.collection('geocode_responses')
                .find()
                .toArray();
            for (const church of outsideChurchCollection) {
                const lat = parseFloat(church.lat);
                const lon = parseFloat(church.lon);
                console.log(`outside lat and lon=======,${lat},${lon}`)


                const encuestaChurch = await db.collection('encuesta_churches')
                    .find({
                        "location.lat": lat,
                        "location.lng": lon
                    })
                    .toArray();
                if (encuestaChurch) {
                    await db.collection('geocode_responses').deleteOne({ _id: church._id });
                } else {
                    const isInside = await this.isMarkerInsidePolygon({ lat, lon }, polygon);

                    if (isInside) {
                        console.log(`Outside Boundary Location: ${church.display_name}, Latitude: ${lat}`);
                        churchList.push(church);
                        await db.collection('geocode_responses').deleteOne({ _id: church._id });
                    }
                }
            }
            await Promise.all([
                this.saveSurveyVillageOutside(features, churchList),
                //this.saveStatsWard(object_id, features, churchList),
            ]);



            this.total_church_count += churchList.length;
            console.log(`Final Result churches: ${churchList.length}, totalCount: ${this.total_church_count} | ${admin2} | ${admin3} | ${admin4}`);

            client.close();
            return { success: true, message: 'Survey and stats saved successfully.' };
        } catch (error) {
            console.log('Error in surveyAndStats:', error);
            return Promise.reject('Error in surveyAndStats.');
        }
    }


    // async surveyAndStatsWard(admin0, admin1, admin2, admin3, admin4, polygon, features, object_id?) {
    //     return new Promise(async (resolve, reject) => {
    //         const churchList = [];
    //         console.log('admin0=>'+admin0,'admin1=>'+admin1,'admin2=>'+admin2,'admin3=>'+admin3,'admin4=>'+admin4);
    //         await this.getChurhes(admin0, admin1, admin2, admin3, admin4).then(async (res: any) => {
    //             if (Array.isArray(res?.data)) {
    //                 const churchres = await this.removeDuplicate(res?.data);
    //                 await churchres.forEach(async e => {
    //                     let geo = e.geometry?.location;
    //                     const isInside = await this.isMarkerInsidePolygon(geo, polygon)
    //                     if (isInside) {
    //                         churchList.push(e);
    //                     }
    //                     // console.log('IsIn    side =>', isInside, `| ${admin2} | ${admin3} | ${admin4} | ch => ${e?.name}`)
    //                 })
    //                 try {
    //                     // const apiA: Observable<any> = from(this.saveSurvey(features, churchList)),
    //                     //     apiB: Observable<any> = from(this.saveStats(object_id, features, churchList))
    //                     // await combineLatest({
    //                     //     survey: apiA,
    //                     //     stats: apiB
    //                     // }).subscribe((a) => {
    //                     //     resolve(a);
    //                     // });
    //                     Promise.all([
    //                         this.saveSurvey(features, churchList),
    //                         this.saveStatsWard(object_id, features, churchList)
    //                     ]).then((res) => {
    //                         resolve(res)
    //                     })
    //                         .catch((err) => { console.log('Error in Combine =>', err) })
    //                 } catch (error) {
    //                     console.log('Error in Combine =>', error)
    //                 }
    //                 // await this.saveStats(admin2, admin3, admin4, features, churchList);
    //                 this.total_church_count += +churchList.length
    //                 console.log('Final Result churches', churchList.length, ` totalCount => ${this.total_church_count}  | ${admin2} | ${admin3} | ${admin4} `)
    //             } else {
    //                 resolve(res);
    //             }
    //         }).catch((err) => { reject(`Error in getting Church ${err}`); })

    //     })
    // }





    // async surveyAndStatsWard(admin0, admin1, admin2, admin3, admin4, polygon, features, object_id?) {
    //     return new Promise(async (resolve, reject) => {
    //         const churchList = [];
    //         console.log('admin0=>' + admin0, 'admin1=>' + admin1, 'admin2=>' + admin2, 'admin3=>' + admin3, 'admin4=>' + admin4);

    //         try {

    //             const client = await MongoClient.connect('mongodb://localhost:27017/');
    //             //const client = await MongoClient.connect('mongodb://192.168.86.18:27017');
    //             // const client = await MongoClient.connect('mongodb+srv://itoi:Yu7blcAMUUC8jAFU@cluster0-oi4s9.mongodb.net/iif-dev-db?retryWrites=true&w=majority');
    //             // const db = client.db('iif-dev-db');
    //             const db = client.db('iif-local');

    //             const churchCollection = await db.collection('google_state_churches').find({ admin2: admin2 }).toArray();
    //             const res = await this.removeDuplicate(churchCollection);
    //             for (const church of res) {
    //                 const churchLocation = church.geometry?.location;
    //                 const isInside = this.isMarkerInsidePolygon(churchLocation, polygon);

    //                 if (isInside) {

    //                     churchList.push(church);
    //                     try {
    //                         // console.log('Reading church data:', church);

    //                        // console.log('church list=>', churchList);
    //                         //console.log('features=>',features);
    //                         await Promise.all([

    //                             this.saveSurveyWard(features, churchList),
    //                            // this.saveStatsWard(object_id, features, churchList)
    //                         ]);

    //                         this.total_church_count += 1;
    //                         console.log('Match Found! Church saved. Total count:', this.total_church_count, `| ${admin2} | ${admin3} | ${admin4}`);
    //                     } catch (error) {
    //                         console.log('Error saving survey and stats =>', error);
    //                         reject('Error saving survey and stats.');
    //                         return;
    //                     }
    //                 }
    //             }

    //             client.close();

    //             resolve({ success: true, message: 'Survey and stats saved successfully.' });
    //         } catch (error) {
    //             console.log('Error connecting to MongoDB or fetching data =>', error);
    //             reject('Error connecting to MongoDB or fetching data.');
    //         }
    //     });
    // }





    async surveyAndStatsWard(admin0, admin1, admin2, admin3, admin4, polygon, features, object_id) {
        try {
            const churchList = [];
            console.log(`admin0: ${admin0}, admin1: ${admin1}, admin2: ${admin2}, admin3: ${admin3}, admin4: ${admin4}`);

            const client = await MongoClient.connect('mongodb://localhost:27017/');
            const db = client.db('iif-local');

            const churchCollection = await db.collection('google_state_churches')
                .find({ admin2: admin2 })
                .toArray();

            const uniqueChurches = await this.removeDuplicate(churchCollection);

            for (const church of uniqueChurches) {
                const churchLocation = church.geometry?.location;
                const isInside = await this.isMarkerInsidePolygon(churchLocation, polygon);

                if (isInside) {
                    churchList.push(church);
                }
            }

            // Save survey and stats concurrently
            await Promise.all([
                this.saveSurveyWard(features, churchList),
                this.saveStatsWard(object_id, features, churchList)
            ]);

            this.total_church_count += churchList.length;
            console.log(`Final Result churches: ${churchList.length}, totalCount: ${this.total_church_count} | ${admin2} | ${admin3} | ${admin4}`);

            client.close();
            return { success: true, message: 'Survey and stats saved successfully.' };
        } catch (error) {
            console.log('Error in surveyAndStats:', error);
            return Promise.reject('Error in surveyAndStats.');
        }
    }




    async surveyAndStatsWardOutside(admin0, admin1, admin2, admin3, admin4, polygon, features, object_id) {
        try {
            const churchList = [];
            console.log(`admin0: ${admin0}, admin1: ${admin1}, admin2: ${admin2}, admin3: ${admin3}, admin4: ${admin4}`);
    
            const client = await MongoClient.connect('mongodb://localhost:27017/');
            const db = client.db('iif-local');
    
            const outsideChurchCollection = await db.collection('geocode_responses').find().toArray();
    
            for (const church of outsideChurchCollection) {
                const lat = parseFloat(church.lat);
                const lon = parseFloat(church.lon);
                console.log(`outside lat and lon=======,${lat},${lon}`);
    
                const encuestaChurch = await db.collection('encuesta_churches').findOne({
                    "location.lat": lat,
                    "location.lng": lon
                });
                console.log('Encuesta Church:', encuestaChurch);
   
                if (encuestaChurch) {
                    //console.log(`Encuesta Churches found for location (lat: ${encuestaChurch.location.lat}, lng: ${encuestaChurch.location.lng}):`, encuestaChurch);
                    console.log(`Geocode Response Location: Latitude ${lat}, Longitude ${lon}`);
                    await db.collection('geocode_responses').deleteOne({ _id: church._id });
                } else {
                    const isInside = await this.isMarkerInsidePolygon({ lat, lon }, polygon);
    
                    if (isInside) {
                        console.log(`Outside Boundary Location: ${church.display_name}, Latitude: ${lat}`);
                        churchList.push(church);
                        await db.collection('geocode_responses').deleteOne({ _id: church._id });
                    }
                }
            }
    
            await Promise.all([
                this.saveSurveyWardOutside(features, churchList),
                // this.saveStatsWard(object_id, features, churchList),
            ]);
    
            this.total_church_count += churchList.length;
            console.log(`Final Result churches: ${churchList.length}, totalCount: ${this.total_church_count} | ${admin2} | ${admin3} | ${admin4}`);
    
            await client.close();
            return { success: true, message: 'Survey and stats saved successfully.' };
        } catch (error) {
            console.log('Error in surveyAndStats:', error);
            return Promise.reject('Error in surveyAndStats.');
        }
    }
    



    total_church_count = 0
    readVillageByDist(): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                const jsonPath = 'src/assets/village_2023/Maharashtra_village.json',
                    readStream = fs.createReadStream(jsonPath, 'utf8'),
                    parse = readStream.pipe(geojsonStream.parse());
                const distFeatureMap = new Map();
                parse.on('data', (feature) => {
                    const dist = feature?.properties?.district,
                        subdist = feature?.properties?.subdistrict,
                        name = feature?.properties?.name
                    console.log('district =>', dist)
                    if (['Chandrapur'].includes(dist)) {
                        console.log('Village NAme = >', name)
                        if (!distFeatureMap.has(dist)) {
                            distFeatureMap.set(dist, []);
                        }
                        distFeatureMap.get(dist).push(feature);
                    }
                })
                parse.on('end', () => {
                    console.log('Json Read End')
                    Array.from(distFeatureMap.keys()).forEach(async (k) => {
                        const f = distFeatureMap.get(k);
                        await f.forEach(async (features: any) => {

                            //let , isGet: boolean = false;

                            const admin0 = features?.properties.country,
                                admin1 = features?.properties.state,
                                admin2 = features?.properties.district,
                                admin3 = features?.properties.subdistrict,
                                admin4 = features?.properties.name,
                                polygon = features?.geometry?.coordinates;
                            //  const churchCount: any = await this.getChurchCount(admin0, admin1, admin2, admin3, admin4);
                            //  this.total_church_count += +churchCount['data'];
                            //  console.log(`count => ${churchCount['data']} | total => ${this.total_church_count} | ${admin2} | ${admin3} | ${admin4}`);
                            //  this.saveStats(admin2, admin3, admin4, features, churchCount['data'])

                            //await this.surveyAndStats(admin0, admin1, admin2, admin3, admin4, polygon, features);
                        })
                        distFeatureMap.set(k, []);
                    });
                })

            } catch (err) {
                reject(err)
            }

        })
    }

    removeDuplicate(arr): Promise<any> {
        const uniqueArray = arr.filter((item, index, self) => {
            const firstIndex = self.findIndex((el) => el.geometry.location.lat === item.geometry.location.lat && el.geometry.location.lng === item.geometry.location.lng);
            return index === firstIndex;
        });
        return uniqueArray
    }

    async
    saveSurvey(data: any, churchList: any = []): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                const apiPayload = await this.payload(data, churchList);
                console.log(' Save called', `${apiPayload.survey.admin3} | ${apiPayload.survey.admin4} |${apiPayload.newChurches?.length} `)
                const url = `http://192.168.86.18:8080/api/encuesta/create`;
                const headersRequest = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhbnNsaW5qZW5pc2hhIiwiYXV0aCI6Ik9SR19BRE1JTixPUkdfVVNFUixST0xFX0FETUlOIiwiZXhwIjoxNjk3MzQ3Nzg1fQ.j5xUAHTRZA-RDgDItl4KGy_D9JLjt69ZYVqmx7oQQpzNDrgxOUQKNdplNzqDpnLFzJWddYySENGnRGOctRQ8xQ`,
                };
                const res = await lastValueFrom(this.http.post(url, apiPayload, { headers: headersRequest }));

                resolve(res)
            } catch (err) {
                console.log('Error in save survey =>', err)
                reject(err)
            }
        })
    }


    saveSurveyVillageOutside(data: any, churchList: any = []): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                const apiPayload = await this.payloadVillageOutside(data, churchList);
                // console.log(' Save called', `${apiPayload.survey.admin3} | ${apiPayload.survey.admin4} |${apiPayload.newChurches?.length} `)
                const url = `http://192.168.86.24:8080/api/encuesta/create/outBoundary`;
                const headersRequest = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhbnNsaW5qZW5pc2hhIiwiYXV0aCI6Ik9SR19BRE1JTixPUkdfVVNFUixST0xFX0FETUlOIiwiZXhwIjoxNjk3MzQ3Nzg1fQ.j5xUAHTRZA-RDgDItl4KGy_D9JLjt69ZYVqmx7oQQpzNDrgxOUQKNdplNzqDpnLFzJWddYySENGnRGOctRQ8xQ`,
                };
                const res = await lastValueFrom(this.http.post(url, apiPayload, { headers: headersRequest }));

                resolve(res)
            } catch (err) {
                console.log('Error in save survey =>', err)
                reject(err)
            }
        })
    }


    saveSurveyWard(features: any, churchList: any = []): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                const apiPayload = await this.payloadWard(features, churchList);
                console.log(' Save called', `${apiPayload.survey.admin3} | ${apiPayload.survey.admin4} |${apiPayload.newChurches?.length} `)
                const url = `http://192.168.86.24:8080/api/encuesta/create`;
                //const url =`http://143.110.182.115:8080/api/encuesta/create`;
                const headersRequest = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhbnNsaW5qZW5pc2hhIiwiYXV0aCI6Ik9SR19BRE1JTixPUkdfVVNFUixST0xFX0FETUlOIiwiZXhwIjoxNjk3MzQ3Nzg1fQ.j5xUAHTRZA-RDgDItl4KGy_D9JLjt69ZYVqmx7oQQpzNDrgxOUQKNdplNzqDpnLFzJWddYySENGnRGOctRQ8xQ`,
                };
                const res = await lastValueFrom(this.http.post(url, apiPayload, { headers: headersRequest }));

                resolve(res)
            } catch (err) {
                console.log('Error in save survey =>', err)
                reject(err)
            }
        })
    }


    saveSurveyWardOutside(features: any, churchList: any = []): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                const apiPayload = await this.payloadWardOutside(features, churchList);
                // console.log(' Save called', `${apiPayload.survey.admin3} | ${apiPayload.survey.admin4} |${apiPayload.newChurches?.length} `)
                const url = `http://192.168.86.24:8080/api/encuesta/create/outBoundary`;
                //const url =`http://143.110.182.115:8080/api/encuesta/create`;
                const headersRequest = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhbnNsaW5qZW5pc2hhIiwiYXV0aCI6Ik9SR19BRE1JTixPUkdfVVNFUixST0xFX0FETUlOIiwiZXhwIjoxNjk3MzQ3Nzg1fQ.j5xUAHTRZA-RDgDItl4KGy_D9JLjt69ZYVqmx7oQQpzNDrgxOUQKNdplNzqDpnLFzJWddYySENGnRGOctRQ8xQ`,
                };
                const res = await lastValueFrom(this.http.post(url, apiPayload, { headers: headersRequest }));

                resolve(res)
            } catch (err) {
                console.log('Error in save survey =>', err)
                reject(err)
            }
        })
    }


    async payload(features, churchList: any = []) {
        const geoJson = await JSON.stringify(structuredClone(features));
        const strJson = jsonMinify(geoJson)

        const payload: any = {},
            admin0 = 'India',
            //admin0 = features?.properties.country,
            admin1 = features?.properties.state,
            admin2 = features?.properties.district,
            // admin2 = 'Nagpur',
            admin3 = features?.properties.subdistrict,
            // admin3 = features.properties.cityname + ' City',
            admin4 = features.properties.name;
        // admin4 = (features?.properties.sourcewardname.replace(/[^a-zA-Z_ ]/g, '') + ' Wardno ' + features?.properties.sourcewardcode).replace(/\s+/g, ' ');
        // admin4 = features?.properties.name ? features.properties.name.replace('_', ' ').replace(/(?:^|\s)\S/g, (match) => match.toUpperCase()) : null;
        // admin4 = 'Wardno ' + features?.properties.sourcewardcode;


        payload.survey = {

            admin0: admin0,
            admin1: admin1,
            admin2: admin2,
            admin3: admin3,
            admin4: admin4,
            isMasterSurvey: true,
            noWork: Array.isArray(churchList) && churchList?.length ? false : true,
            approvedDate: new Date(),
            geojson: strJson,
            approverName: 'Admin',
            churchCount: Array.isArray(churchList) && churchList?.length ? churchList.length : 0
        }
        payload.newChurches = structuredClone(churchList).map((cl) => {
            let res = {
                "name": cl?.name,
                "organization": cl?.organization?.organizationName,
                "memberCount": cl?.memberCount,
                "workerCount": 1,
                "phone_number": cl?.phone_number,
                "localLanguage": cl?.language,
                "peopleGroups": cl?.people_group,
                "email": cl?.email,
                "location": {
                    "lat": cl?.geometry?.location?.lat,
                    "lng": cl?.geometry?.location?.lng,
                },
                "workerName": cl?.worker_name,
                "address": cl?.address,
                "remarks": ""
            }
            return { ...cl, ...res }
        });
        return payload
    }






    async payloadVillageOutside(features, churchList: any = []) {
        const geoJson = await JSON.stringify(structuredClone(features));
        const strJson = jsonMinify(geoJson)

        const payload: any = {},
            admin0 = 'India',
            admin1 = features?.properties.state,
            admin2 = features?.properties.district,
            admin3 = features?.properties.subdistrict,
            admin4 = features.properties.name;

        // payload.survey = {

        //     admin0: admin0,
        //     admin1: admin1,
        //     admin2: admin2,
        //     admin3: admin3,
        //     admin4: admin4,
        //     isMasterSurvey: true,
        //     noWork: Array.isArray(churchList) && churchList?.length ? false : true,
        //     approvedDate: new Date(),
        //     geojson: strJson,
        //     approverName: 'Admin',
        //     churchCount: Array.isArray(churchList) && churchList?.length ? churchList.length : 0
        // }
        payload.newChurches = structuredClone(churchList).map((cl) => {
            let res = {
                admin0: admin0,
                admin1: admin1,
                admin2: admin2,
                admin3: admin3,
                admin4: admin4,
                "name": cl?.display_name,
                "organization": cl?.organization?.organizationName,
                "memberCount": cl?.memberCount,
                "workerCount": 1,
                "phone_number": cl?.phone_number,
                "localLanguage": cl?.language,
                "peopleGroups": cl?.people_group,
                "email": cl?.email,
                "location": {
                    "lat": cl?.lat,
                    "lng": cl?.lon,
                },
                "workerName": cl?.worker_name,
                "address": cl?.address.toString(),
                "remarks": ""
            }
            return { ...cl, ...res }
        });
        return payload
    }




    async payloadWard(features, churchList: any = []) {
        const geoJson = await JSON.stringify(structuredClone(features));
        const strJson = jsonMinify(geoJson)

        const payload: any = {},
            admin0 = 'India',
            //admin0 = features?.properties.country,
            admin1 = features?.properties.state,
            admin2 = features?.properties.district,
            // admin2 = 'Nagpur',
            //admin3 = features?.properties.subdistrict,
            admin3 = features.properties.cityname + ' City',
            admin4 = features.properties.name.replace(/[-_ –]/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').replace(/\b\w/g, (char) => char.toUpperCase());;
        // admin4 = (features?.properties.sourcewardname.replace(/[^a-zA-Z_ ]/g, '') + ' Wardno ' + features?.properties.sourcewardcode).replace(/\s+/g, ' ');
        // admin4 = features?.properties.name ? features.properties.name.replace('_', ' ').replace(/(?:^|\s)\S/g, (match) => match.toUpperCase()) : null;
        // admin4 = 'Wardno ' + features?.properties.sourcewardcode;


        payload.survey = {
            admin0: admin0,
            admin1: admin1,
            admin2: admin2,

            admin3: admin3,
            admin4: admin4,
            isMasterSurvey: true,
            noWork: Array.isArray(churchList) && churchList?.length ? false : true,
            approvedDate: new Date(),
            geojson: strJson,
            approverName: 'Admin',
            churchCount: Array.isArray(churchList) && churchList?.length ? churchList.length : 0
            //churchCount: Array.isArray(churchList) ? churchList.length : 0 
        }

        payload.newChurches = structuredClone(churchList).map((cl) => {
            let res = {
                admin0: admin0,
                admin1: admin1,
                admin2: admin2,
                admin3: admin3,
                admin4: admin4,
                "name": cl?.name,
                "organization": cl?.organization?.organizationName,
                "memberCount": cl?.memberCount,
                "workerCount": 1,
                "phone_number": cl?.phone_number,
                "localLanguage": cl?.language,
                "peopleGroups": cl?.people_group,
                "email": cl?.email,
                "location": {
                    "lat": cl?.geometry?.location?.lat,
                    "lng": cl?.geometry?.location?.lng,
                },
                "workerName": cl?.worker_name,
                "address": cl?.address,
                "remarks": ""
            }
            return res
        });
        return payload
    }




    async payloadWardOutside(features, churchList: any = []) {
        const geoJson = await JSON.stringify(structuredClone(features));
        const strJson = jsonMinify(geoJson)
        let admin_4 = '';

        if (features.properties && features.properties.name) {
            admin_4 = features.properties.name.replace(/[-_ –]/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/^\s+|\s+$/g, '')
                .replace(/\b\w/g, (char) => char.toUpperCase());
        }
        const payload: any = {},
            admin0 = 'India',
            //admin0 = features?.properties.country,
            admin1 = features?.properties.state,
            admin2 = features?.properties.district,
            // admin2 = 'Nagpur',
            //admin3 = features?.properties.subdistrict,
            admin3 = features.properties.cityname + ' City',
            //admin4 = features.properties.name
            admin4 = admin_4
        //admin4 = features.properties.name.replace(/[-_ –]/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').replace(/\b\w/g, (char) => char.toUpperCase());

        // payload.survey = {
        //     admin0: admin0,
        //     admin1: admin1,
        //     admin2: admin2,

        //     admin3: admin3,
        //     admin4: admin4,
        //     isMasterSurvey: true,
        //     noWork: Array.isArray(churchList) && churchList?.length ? false : true,
        //     approvedDate: new Date(),
        //     geojson: strJson,
        //     approverName: 'Admin',
        //     churchCount: Array.isArray(churchList) && churchList?.length ? churchList.length : 0
        //     //churchCount: Array.isArray(churchList) ? churchList.length : 0 
        // }

        payload.newChurches = structuredClone(churchList).map((cl) => {
            let res = {
                admin0: admin0,
                admin1: admin1,
                admin2: admin2,
                admin3: admin3,
                admin4: admin4,
                "name": cl?.display_name,
                "organization": cl?.organization?.organizationName,
                "memberCount": cl?.memberCount,
                "workerCount": 1,
                "phone_number": cl?.phone_number,
                "localLanguage": cl?.language,
                "peopleGroups": cl?.people_group,
                "email": cl?.email,
                "location": {
                    // "lat": cl?.geometry?.location?.lat,
                    // "lng": cl?.geometry?.location?.lng,
                    "lat": cl?.lat,
                    "lng": cl?.lon,
                },
                "workerName": cl?.worker_name,
                "address": cl?.address?.village,
                // "address": {
                //     "village": cl?.address?.village,
                //     "county": cl?.address?.county,
                //     "stateDistrict": cl?.address?.state_district,
                //     "state": cl?.address?.state,
                //     "country": cl?.address?.country,
                // },
                "remarks": ""
            }
            return res
        });
        // payload.survey = payload.survey || {};


        // payload.survey.churchCount = (payload.survey.churchCount || 0) + payload.newChurches.length;

        return payload;
    }



    // saveStatsWard(object_id, feature, churchCount): Promise<any> {
    //     return new Promise(async (resolve, reject) => {
    //         try {
    //             const payload = await this.statsPayload(feature, churchCount)
    //             //console.log('payload =>', payload)
    //            const url = `https://api-iia.mhsglobal.org/api/v1/adminStats/saveByName/${object_id}/1`;
    //           // const url = `http://192.168.0.111/IIF_Local/iia-php-api/api/v1/adminStats/saveByName/${object_id}/1`;
    //             const res = await lastValueFrom(this.http.post(url, payload))
    //             if (res) {
    //                 console.log('Save Stats =>', res.data)
    //             }
    //         resolve(res)
    //         } catch (error) {
    //             console.log('Error in save stats =>', error)
    //             reject(error)
    //         }
    //     })
    // }

    async saveStats(object_id, feature, churchCount) {
        try {
            const payload = await this.statsPayload(feature, churchCount);
            // const url = `http://192.168.0.111/IIF_Local/iia-php-api/api/v1/adminStats/saveByName/${object_id}`;
            const url = `https://api-iia.mhsglobal.org/api/v1/adminStats/saveByName/${object_id}/0`;
            /***    0 - village, 1 - ward */

            const res = await lastValueFrom(this.http.post(url, payload, { timeout: 18000000 }));
            if (res) {
                console.log('Save Stats =>', res.data);
            }

            return res;
        } catch (error) {
            console.log('Error in save stats =>', error);
            throw error;
        }
    }

    // async saveStatsWard(object_id, feature, churchList) {
    //     try {
    //         const payload = await this.statsPayload(feature, churchList);
    //         // const url = `http://192.168.0.111/IIF_Local/iia-php-api/api/v1/adminStats/saveByName/${object_id}`;
    //         const url = `https://api-iia.mhsglobal.org/api/v1/adminStats/saveByName/${object_id}/1`;
    //         /***    0 - village, 1 - ward */
    //         axiosRetry(this.http, { retries: 3, retryDelay: axiosRetry.exponentialDelay });
    //         const res = await lastValueFrom(this.http.post(url, payload, { timeout: 18000000 }));
    //         if (res) {
    //             console.log('Save Stats =>', res.data);
    //         }

    //         return res;
    //     } catch (error) {
    //         console.log('Error in save stats =>', error.message || error);
    //         throw error;
    //     }
    // }


    async saveStatsWard(object_id, feature, churchList) {
        try {
            const payload = await this.statsPayload(feature, churchList);
            const url = `https://api-iia.mhsglobal.org/api/v1/adminStats/saveByName/${object_id}/1`;

            // Retry logic (customizable)
            const maxRetries = 3;
            let attempt = 0;
            let res;

            do {
                try {
                    attempt++;
                    res = await this.httpService.post(url, payload, { timeout: 18000000 }).toPromise();
                    console.log('Save Stats =>', res.data);
                } catch (error) {
                    console.log(`Error in save stats (attempt ${attempt} of ${maxRetries}):`, error.message || error);


                    if (attempt >= maxRetries) {
                        throw error;
                    }
                }
            } while (!res && attempt < maxRetries);

            return res;
        } catch (error) {
            console.log('Error in save stats =>', error.message || error);
            throw error;
        }
    }



    statsPayload(feature, churchCount) {
        let payload: any = {};
        payload.no_member = 0
        payload.no_church = Array.isArray(churchCount) && churchCount?.length ? churchCount.length : 0
        // payload.no_church = churchCount
        payload.no_people = feature?.properties?.tot_p_2011
        payload.no_house_hold = feature?.properties?.no_hh_2011
        return payload
    }

    isMarkerInsidePolygon(marker, polygon): Promise<any> {
        const point = marker;
        polygon = polygon[0];
        //let x = point.lng,
        let x = point.lon,
            y = point.lat;

        let inside: any = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            let xi = polygon[i][0],
                yi = polygon[i][1];
            let xj = polygon[j][0],
                yj = polygon[j][1];

            let intersect =
                yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
        return inside;
    }






    /***** check the location ****/



    readJsonFile1(filePath: string): any {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            console.error(`Error reading JSON file at path ${filePath}:`, error);
            return null;
        }
    }
    async readJsonFile2(wardFolderPath: string): Promise<any> {
        try {
            const filesInWardFolder = await fs.promises.readdir(wardFolderPath);
            const jsonFiles = filesInWardFolder.filter(file => file.endsWith('.json'));
            if (jsonFiles.length === 1) {
                const wardJsonPath = path.join(wardFolderPath, jsonFiles[0]);
                const jsonContent = await fs.promises.readFile(wardJsonPath, 'utf8');
                let jsonData = JSON.parse(jsonContent);
                if (!Array.isArray(jsonData)) {
                    jsonData = [jsonData];
                }

                return jsonData;
            } else if (jsonFiles.length === 0) {
                console.log(`No JSON files found in ${wardFolderPath}`);
            } else {
                console.log(`Multiple JSON files found in ${wardFolderPath}. Expected only one.`);
            }

            return null;
        } catch (error) {
            console.error(`Error reading JSON files in ward folder at path ${wardFolderPath}:`, error);
            return null;
        }
    }





    writeJsonFile1(filePath: string, data: any): void {
        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, content, 'utf8');
    }


    listFiles(dir: string, extension: string): string[] {
        const files: string[] = [];

        function walk(currentDir: string) {
            const entries = fs.readdirSync(currentDir);

            entries.forEach((entry) => {
                const fullPath = path.join(currentDir, entry);
                if (fs.statSync(fullPath).isDirectory()) {
                    walk(fullPath);
                } else if (entry.endsWith(extension)) {
                    files.push(fullPath);
                }
            });
        }

        walk(dir);

        //console.log('JSON Files in', dir, ':', files);

        return files;
    }



    getPuneCityWards(puneCityPath: string): any[] {
        const wardFiles = this.listFiles(puneCityPath, '.json');
        const puneCityWards: any[] = [];

        wardFiles.forEach((wardFile) => {
            const wardData = this.readJsonFile1(wardFile);
            puneCityWards.push(wardData);

            //console.log(`Path of ${path.basename(wardFile)}:`);
            // console.log(wardFile);
            //console.log('Polygon Coordinates:', JSON.stringify(wardData.geometry.coordinates));
        });

        return puneCityWards;
    }



    filterByAdmin3(data: any[], admin3Value: string): any[] {
        const normalizedAdmin3 = admin3Value.toLowerCase(); return data.filter((item) => {
            const itemAdmin3 = item.admin1 ? item.admin1.toLowerCase() : '';

            return itemAdmin3 === normalizedAdmin3;
        });

    }


    processMatchingDataWithCustomCheck(wardData: any[], encuestaData: any[]): any {
        const updatedData = encuestaData.map((church) => {
            const location = church.geometry.location;
            // const location = church.location;
            const matchingWard = wardData.find((ward) => {
                if (ward.geometry && ward.geometry.coordinates) {
                    const coordinates = ward.geometry.coordinates;
                    //console.log("location" + location);
                    // console.log("location =>", `Latitude: ${location.lat}, Longitude: ${location.lng}`);

                    //console.log("coordinates" + coordinates);
                    return this.isMarkerInsidePolygon(location, coordinates);
                }
                return false;
            });

            if (matchingWard) {
                console.log('Match Found!');
                church.admin2 = 'Nagpur'
                church.admin3 = 'Nagpur City'
                church.admin4 = matchingWard.properties.name;
                //church.admin4 = matchingWard.properties.name;
                console.log('Matching Ward Properties:', matchingWard.properties);
                // console.log('Church Location:', location);

                //console.log('Matching Ward Polygon:', matchingWard.geometry.coordinates[0]);
                console.log("admin4=>" + church.admin4);
                console.log("admin3=>" + church.admin3);
            } else {
                console.log('No Match Found:');
                // console.log('Church Location:', location);
            }

            return church;
        });

        return updatedData;
    }

    /****add name field in json ****/



    async addNameField(inpath) {
        try {
            const wardFolders = await fs.promises.readdir(inpath);
            let totalFilesWritten = 0;

            for (const wardFolder of wardFolders) {
                const wardFolderPath = path.join(inpath, wardFolder);

                try {
                    const jsonData = await this.readJsonFile2(wardFolderPath);

                    if (jsonData && jsonData.length > 0) {
                        const feature = jsonData[0];

                        const sourceWardCode = feature?.properties?.sourcewardcode;
                        const nameFieldValue = 'Wardno ' + sourceWardCode;
                        feature.properties.name = nameFieldValue;

                        const jsonFilePath = path.join(wardFolderPath, `${wardFolder}.json`);
                        fs.writeFileSync(jsonFilePath, JSON.stringify(feature, null, 2));
                        totalFilesWritten++;
                        console.log(`Name field added ${jsonFilePath}`);
                    }
                } catch (error) {
                    console.error(`Error reading ${wardFolder}:`, error);
                }
            }

            console.log(`Total files written: ${totalFilesWritten}`);
            console.log('Ward folder processing complete.');
        } catch (error) {
            console.error('Error during ward folder processing:', error);
        }
    }


    // async saveFile() {
    //     const baseUrl = 'https://www.dentee.com/manage/Theme/images/tooth-image/lower-teeth/11-18/';
    //    // const savePath = 'uploads/tooth-image/upper-teeth/11-18/';
    //    const savePath = 'src/assets/image';
    //     this.pathExists(savePath);

    //     for (let i = 11; i <= 18; i++) {
    //       for (const vs of ['lower', 'front']) {
    //         for (const v of ['', 'missing', 'caries', 'implant', 'PeriapicalAbcess', 'root', 'selected']) {
    //           const toothName = !v ? `${i}-tooth-${vs}.png` : `${v}-${i}-tooth-${vs}.png`;
    //           const subPath = `${i}-tooth/${toothName}`;
    //           const imageUrl = baseUrl + subPath;
    //           console.log("imageurl=>"+ imageUrl);
    //            const response = await this.httpService.get(imageUrl, { responseType: 'stream' }).toPromise();


    //           //const { data: image } = await this.httpService.get<ArrayBuffer>(imageUrl).toPromise();

    //           const finalUrl = path.join(savePath, subPath);
    //           const imageDirectory = path.join(savePath, `${i}-tooth/`);
    //           this.pathExists(imageDirectory);

    //           const directory = path.dirname(finalUrl);
    //           if (!fs.existsSync(directory)) {
    //             fs.mkdirSync(directory, { recursive: true });
    //           }

    //            const fileStream = createWriteStream(finalUrl);
    //           await streamPipeline(response.data, fileStream);
    //         }
    //       }
    //     }
    //   }

    async saveFile() {
        //const baseUrl = 'https://www.dentee.com/manage/Theme/images/tooth-image/lower-teeth/41-48/';
        const baseUrl = 'https://www.dentee.com/manage/theme/images/tooth-image/lower-teeth/41-48/';
        const savePath = 'src/assets/image/lower-teeth';
        this.pathExists(savePath);

        for (let i = 41; i <= 48; i++) {
            for (const vs of ['lower', 'front']) {
                for (const v of ['', 'missing', 'caries', 'implant', 'PeriapicalAbcess', 'root', 'selected']) {
                    //const toothName = !v ? `${i}-tooth-${vs}.png` : `${v}-${i}-tooth-${vs}.png`;
                    // const subPath = `${i}-${toothName}-tooth/`;

                    const toothName = !v ? `${i}` : `${v}-${i}`;
                    console.log("toothname=>" + toothName);
                    const subPath = `${i}-tooth/${toothName}-lower-tooth.png`;
                    const imageUrl = baseUrl + subPath;
                    console.log("imageurl=>" + imageUrl);
                    const response = await this.httpService.get(imageUrl, { responseType: 'stream' }).toPromise();

                    const finalUrl = path.join(savePath, subPath);
                    const imageDirectory = path.join(savePath, `${i}-tooth/`);
                    this.pathExists(imageDirectory);

                    const directory = path.dirname(finalUrl);
                    if (!fs.existsSync(directory)) {
                        fs.mkdirSync(directory, { recursive: true });
                    }


                    const fileStream = createWriteStream(finalUrl);
                    await streamPipeline(response.data, fileStream);
                }
            }
        }
    }

    private pathExists(directoryPath: string) {
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        }

    }
}





export class FeatureCollection {
    type: any;
    constructor(public features: Array<any>) {
        this.type = {
            type: "FeatureCollection",
            features: !Array.isArray(features) ? [this.features] : this.features
        }
        return this.type;
    }


}


