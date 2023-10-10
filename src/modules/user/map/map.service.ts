import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import * as fs from 'fs';
import { appendFile, existsSync, mkdirSync, writeFileSync } from "fs";
import { lastValueFrom } from "rxjs";
import { DataSource, Repository } from "typeorm";
import { City, Country, District, State, SubDistrict, Village, Ward } from "./entity/map.entity";
const fsEx = require('fs-extra');

const jsonMinify = require('jsonminify');
const geojsonStream = require('geojson-stream');


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
        @InjectRepository(City)
        private cityRepository: Repository<City>,
        @InjectRepository(Ward)
        private wardRepository: Repository<Ward>,
        @InjectDataSource()
        private dataSource: DataSource,
        private http: HttpService
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
        return writeFileSync(`${folderPath}/${fileName}.json`, jsonString);
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
        filesNames = ['nagpur_ward.json'];
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
            await this.writeJsonFile('./src/assets/rawValidJson', fileN, valid)
            // if (i === arr.length - 1) {
            // }
            // this.appendToJsonFile(path, features)
            // data = [];
        })

        // const valid = this.createJsonData(features)
    }
    readLargeJson(inpath, outpath) {
        const fs = require('fs');
        const filePath = inpath; // Replace with the actual file path
        const readStream = fs.createReadStream(filePath, 'utf8');
        let features = [],
            states = ['Andaman and Nicobar Islands']//'Lakshadweep', 'The Dadra And Nagar Haveli And Daman And Diu', 'Chhattisgarh', 'Andaman and Nicobar Islands', 'West Bengal', 'Haryana', 'Himachal Pradesh', 'Uttarakhand', 'Meghalaya', 'Sikkim', 'Mizoram', 'Nagaland', 'Arunachal Pradesh', 'Punjab', 'Puducherry', 'Jammu And Kashmir', 'Ladakh'
        const parse = readStream.pipe(geojsonStream.parse())
        const stateFeatureMap = new Map();
        console.log(`Features for state started`);
        parse.on('data', (feature) => {
            const state = feature?.properties?.state;
            if (states.includes(state)) {
                if (!stateFeatureMap.has(state)) {
                    console.log('data =>', state)
                    stateFeatureMap.set(state, []);
                }
                stateFeatureMap.get(state).push(feature);
            }
        })
        parse.on('end', () => {
            stateFeatureMap.forEach((features, state) => {
                const outputFile = `${state}_subdistrict`;
                const featureCollection = {
                    type: 'FeatureCollection',
                    features: features
                };
                // const JSONStream = require('JSONStream');
                // const outputStream = fs.createWriteStream(`${outpath}/${outputFile}.json`);
                // const jsonStream = JSONStream.stringify();
                // jsonStream.pipe(outputStream);
                // jsonStream.write(featureCollection);
                // jsonStream.end();
                // outputStream.on('finish', () => {
                //     console.log('Data written successfully.');
                // });
                this.writeJsonFile(outpath, outputFile, featureCollection)
                console.log(`Features for state ${state} written to ${outpath}`);
            });
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
    startTime
    async saveData(data: any, level: 'DIST' | 'SUBDIST' | 'VIL' | 'STATE' | 'COUNTRY' | 'CITY' | 'WARD') {
        const countryQuery = this.countryRepository.createQueryBuilder('country'),
            stateQuery = this.stateRepository.createQueryBuilder('state'),
            districtQuery = this.districtRepository.createQueryBuilder('district'),
            subdistQuery = this.subDistrictRepository.createQueryBuilder('subdistrict'),
            villageQuery = this.villageRepository.createQueryBuilder('village'),
            wardQuery = this.wardRepository.createQueryBuilder('ward'),
            cityQuery = this.cityRepository.createQueryBuilder('city');
        let name = data?.properties['name'], properties = data?.properties, geometries = this.stringifyData(data?.geometry),
            cityname = data?.properties['cityname'], res: any;
        // console.log('name=>', name, 'state =>', data?.properties?.['state']);
        switch (level) {
            case 'COUNTRY':
                const country_object_id = '1';
                properties = this.setProperty(properties, country_object_id)
                res = await countryQuery.insert().into(Country).values({ country_name: name, geometries, properties, object_id: country_object_id }).execute()
                break;
            case 'STATE':
                let countryData = await this.countryRepository.findOne({ where: { country_name: data?.properties['country'] } }),
                    country_id = countryData['id'], counObId = countryData['object_id'],
                    state_object_id = this.generateObjectId(counObId, 2);
                properties = this.setProperty(properties, state_object_id)
                res = await stateQuery.insert().into(State).values({ state_name: name, geometries, properties, country_id, object_id: state_object_id }).execute()
                break;
            case 'DIST':
                let stateData = await this.stateRepository.findOne({ where: { state_name: data?.properties['state'] } });
                let state_id = stateData?.['id'], stateObId = stateData?.['object_id'],
                    district_object_id = this.generateObjectId(stateObId, 2);
                properties = this.setProperty(properties, district_object_id)
                res = await districtQuery.insert().into(District).values({ district_name: name, geometries, properties, state_id, object_id: district_object_id }).execute()
                break;
            case 'SUBDIST':
                let districtData = await this.districtRepository.findOne({ where: { district_name: data?.properties['district'] } });
                let district_id = districtData?.['id'], districtObId = districtData?.['object_id'],
                    subdist_object_id = this.generateObjectId(districtObId, 2);
                properties = this.setProperty(properties, subdist_object_id);
                res = await subdistQuery.insert().into(SubDistrict).values({ subdistrict_name: name, geometries, properties, district_id, object_id: subdist_object_id }).execute()
                break;

            case 'CITY':
                if (data?.properties['statename'] == 'Maharashtra') {
                    let districtBycity = await districtQuery.where(`LOWER(district.district_name) LIKE LOWER(:value)`, { value: data?.properties['district'] }).getOne(),
                        district_idBycity = districtBycity?.['id'], districtObIdBycity = districtBycity?.['object_id'];
                    let city_object_id = this.generateObjectId(districtObIdBycity, 2);
                    properties = this.setProperty(properties, city_object_id);
                    this.countForEach.count++
                    console.log(`Before Insert ${name} | district => ${data?.properties['districtname']} | count => ${this.countForEach.count} / ${this.countForEach.total_count} | start => ${this.startTime} `);
                    res = await cityQuery.insert().into(City).values({ city_name: cityname, geometries, properties, district_id: district_idBycity, object_id: city_object_id }).execute()
                }
                break;

            case 'WARD':
                if (data?.properties['state'] == 'Maharashtra') {
                    let cityData = await cityQuery.where(`LOWER(city.city_name) LIKE LOWER(:value)`, { value: data?.properties['cityname'] }).getOne();
                    // console.log(`cityId => ${cityData?.id} | city => ${name}`)
                    let city_id = cityData?.id
                    let ward_object_id = this.generateObjectId(cityData?.object_id, 3);
                    this.countForEach.count++;
                    properties = this.setProperty(properties, ward_object_id)
                    console.log(`Before Insert ${name} | city => ${data?.properties['cityname']} | count => ${this.countForEach.count} / ${this.countForEach.total_count} | start => ${this.startTime} `);
                    res = await wardQuery.insert().into(Ward).values({ ward_name: name, geometries, properties, city_id, object_id: ward_object_id, state_name: data?.properties['state'] }).execute()
                }
                break;

            case 'VIL':
                let subdistData = await this.subDistrictRepository.findOne({ where: { subdistrict_name: data?.properties['subdistrict'] } });
                let subdistrict_id = subdistData?.['id'], subdistObId = subdistData?.['object_id'],
                    village_object_id = this.generateObjectId(subdistObId, 3), state_name = data?.properties?.['state'];
                properties = this.setProperty(properties, village_object_id)
                const state = data?.properties['state'], district = data?.properties['district'], subdist = data?.properties['subdistrict']
                if (!this.village_dup?.[state]) {
                    this.village_dup[state] = {};
                }
                if (!this.village_dup?.[state][district]) {
                    this.village_dup[state][district] = {}
                }
                if (!this.village_dup?.[state][district][subdist]) {
                    this.village_dup[state][district][subdist] = []
                }
                if (!this.village_dup?.[state][district][subdist].includes(name)) {
                    this.village_dup[state][district][subdist].push(name)
                } else {
                    name = name + '_' + village_object_id
                };
                this.countForEach.count++
                const d = new Date();
                console.log(`Before Insert ${name} | state => ${state} | count => ${this.countForEach.count} / ${this.countForEach.total_count} | start => ${this.startTime} `);
                res = await villageQuery.insert().into(Village).values({ village_name: name, geometries, properties, subdistrict_id, object_id: village_object_id, state_name }).execute();
                // console.log('After Insert',name)
                break;
        }
        if (res)
            console.log(res)
    }

    async saveDataByFolder() {
        let path = '../../../../../../mapData/ward',
            // let path = 'src/assets/json/subdistrict',
            fileName = await this.readFilesFromFolder(path)
        // fileName = ['Uttar Pradesh_village.json']
        // const count: { state: string, count: number } = { state: '', count: 0 }
        let count = 0
        console.log('fileNames =>', fileName);
        const d = new Date()
        this.startTime = `${d.getHours()}:${d.getMinutes()}`;
        for (let fn of fileName) {
            let jsonData = await this.readJsonFile(`${path}/${fn}`)
            for (let feature of jsonData?.['features']) {
                count++
                this.saveData(feature, 'WARD');
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


    /* For Find Duplicate and update village table */


    async findVillageDulicateByName() {
        const villageQuery = this.villageRepository.createQueryBuilder('village'); let count = 0, nullCount = 0;

        try {
            await villageQuery.select(['village.village_name', 'village.id', 'village.properties'])
                .where('village.subdistrict_id IN ' +
                    '(SELECT subdistrict.id ' +
                    'FROM subdistrict ' +
                    'WHERE subdistrict.subdistrict_name IN ' +
                    '(SELECT subdistrict_name ' +
                    'FROM subdistrict ' +
                    'GROUP BY subdistrict_name ' +
                    'HAVING COUNT(subdistrict_name) > 1))').getMany().then(async (res) => {
                        if (res.length) {
                            await res.forEach(async (d) => {
                                const prop = typeof d?.properties == 'string' ? JSON.parse(d?.properties) : d?.properties;
                                const villageName = prop?.name,
                                    subdistrictName = prop?.subdistrict,
                                    districtName = prop?.district,
                                    stateName = prop?.state;

                                let result = await this.dataSource.query(`
                            SELECT sub.id,sub.subdistrict_name,state.state_name from subdistrict as sub
                            inner join district as dist ON sub.district_id = dist.id 
                            inner join state as state ON state.id = dist.state_id 
                            WHERE (  LOWER(dist.district_name) = LOWER('${districtName}'))  AND (LOWER(state.state_name) = LOWER('${stateName}')) AND (LOWER(sub.subdistrict_name) = LOWER('${subdistrictName}'))  
                            `)
                                if (result) {
                                    const newsubId = Array.isArray(result) && result.length ? (result.length > 1 ? null : result[0].id) : null;
                                    if (newsubId == null) {
                                        nullCount++
                                    }
                                    count++
                                    console.log(`Before village => ${villageName} | state => ${stateName} | count => ${count}`)
                                    const res = await this.villageRepository.update(d?.id, { subdistrict_id: newsubId })
                                    if (res) {
                                        console.log(`Data Updated village => ${villageName} | state => ${stateName} `)
                                        console.log(`Data Updated Null COUNT => ${nullCount}`)
                                    }
                                }
                            })
                        }
                    });

        } catch (error) {
            return error
        }
    }

    async findVillageSubdistIdByNull() {
        const villageQuery = this.villageRepository.createQueryBuilder('village');
        let count = 0, nullCount = 0;

        await villageQuery.select(['village.village_name', 'village.id', 'village.properties'])
            .where('village.subdistrict_id is null').getMany().then(async (data) => {
                if (data.length) {
                    await data.forEach(async (d) => {
                        const prop = typeof d?.properties == 'string' ? JSON.parse(d?.properties) : d?.properties;
                        const villageName = prop?.name,
                            subdistrictName = prop?.subdistrict,
                            districtName = prop?.district,
                            stateName = prop?.state,
                            villageId = d?.id;
                        let result = await this.dataSource.query(`
                            SELECT sub.id,sub.subdistrict_name,state.state_name from subdistrict as sub
                            inner join district as dist ON sub.district_id = dist.id 
                            inner join state as state ON state.id = dist.state_id 
                            WHERE (  LOWER(dist.district_name) LIKE LOWER('%${districtName}%'))  AND (LOWER(state.state_name) = LOWER('${stateName}')) AND (LOWER(sub.subdistrict_name) LIKE LOWER('%${subdistrictName}%'))  
                            `)
                        if (result) {
                            const newsubId = Array.isArray(result) && result.length ? (result.length > 1 ? null : result[0].id) : null;
                            if (newsubId == null) {
                                nullCount++
                            }
                            count++
                            console.log(`Before village => ${villageName} | state => ${stateName} | count => ${count}`)
                            const res = await this.villageRepository.update(villageId, { subdistrict_id: newsubId })
                            if (res) {
                                console.log(`Data Updated village => ${villageName} | state => ${stateName} `)
                                console.log(`Data Updated Null COUNT => ${nullCount}`)
                            }
                        }

                    })
                }
            })
    }

    async removeDupObjectId(level: 'DIST' | 'SUB-DIST' | 'VILLAGE') {
        const stateQuery = this.stateRepository.createQueryBuilder('state'),
            districtQuery = this.districtRepository.createQueryBuilder('district'),
            subdistQuery = this.subDistrictRepository.createQueryBuilder('subdistrict'),
            villageQuery = this.villageRepository.createQueryBuilder('village');
        let res, nullCount = 0, count = 0
        switch (level) {
            case 'DIST':
                const distData = await districtQuery.getMany();
                distData.forEach(async (d) => {
                    const prop = typeof d?.properties == 'string' ? JSON.parse(d?.properties) : d?.properties;
                    const stateData = await stateQuery.select(['state.object_id', 'state.state_name']).where(`state.id = ${d?.state_id}`).getOne();
                    const new_dist_object_id = this.generateObjectId(stateData?.object_id, 2);
                    console.log('StateData =>', stateData, 'new Obje =>', new_dist_object_id);
                    res = await this.districtRepository.update(d?.id, { object_id: new_dist_object_id });
                    if (res) {
                        console.log('Data Update Succesfully');
                    }
                })
                break;

            case 'SUB-DIST':
                const subdistData = await subdistQuery.getMany();
                subdistData.forEach(async (d) => {
                    const prop = typeof d?.properties == 'string' ? JSON.parse(d?.properties) : d?.properties;
                    const districtData = await this.dataSource.query(`
                    select dist.object_id,dist.district_name from mapdata.district as dist
                    inner join mapdata.state as state on dist.state_id = state.id
                    where  lower(dist.district_name) like lower('${prop?.district}')  AND lower(state.state_name) = lower('${prop?.state}') ;
                    `)
                    const distObjId = Array.isArray(districtData) && districtData.length ? (districtData.length > 1 ? null : districtData[0].object_id) : null;
                    if (distObjId == null) {
                        nullCount++
                        return
                    }
                    const new_subdist_object_id = this.generateObjectId(distObjId, 2);
                    console.log('StateData =>', districtData, 'new Obje =>', new_subdist_object_id);
                    res = await this.subDistrictRepository.update(d?.id, { object_id: new_subdist_object_id });
                    if (res) {
                        console.log('Data Update Succesfully | NULL COUNT =>', nullCount);
                    }
                })
                break;

            case 'VILLAGE':
                const villageStream = await villageQuery.select(['village.id as id', 'village.village_name as village_name', 'village.properties as properties', 'village.subdistrict_id as subId']).stream();
                villageStream.on('data', async (d: any) => {
                    const prop = typeof d?.properties == 'string' ? JSON.parse(d?.properties) : d?.properties;
                    const skip = ['Uttarakhand', 'Uttar Pradesh', 'West Bengal', 'Tripura', 'Telangana', 'Tamil Nadu']
                    if (skip.includes(prop?.state)) {

                        const subdistData = await this.dataSource.query(`
                        SELECT sub.object_id,sub.id,sub.subdistrict_name from subdistrict as sub
                        where sub.id = ${d?.subId}
                        `)
                        // await this.subDistrictRepository.findOne({ where: { id: d?.subId } });
                        const subdistObjId = Array.isArray(subdistData) && subdistData.length ? (subdistData.length > 1 ? null : subdistData[0].object_id) : null;
                        count++
                        if (subdistObjId == null) {
                            nullCount++
                            return
                        }
                        const new_village_object_id = this.generateObjectId(subdistObjId, 3);
                        console.log(` village => ${d?.village_name} | state => ${prop?.state} | count => ${count}`);
                        res = await this.villageRepository.update(d?.id, { object_id: new_village_object_id });
                        if (res) {
                            console.log(`Data Update Succesfully | village => ${d?.village_name}| NULL COUNT =>`, nullCount);
                        }
                    }
                });
                break;
        }

    }

    //For survery churchs and remove dupicate churches


    churchList: any = []
    getChurhes(admin0, admin1, admin2) {
        const url = `http://192.168.0.109:8080/api/admin-areas/dist-churches?admin0=${admin0}&admin1=${admin1}&admin2=${admin2}`;
        const headersRequest = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhbnNsaW5qZW5pc2hhIiwiYXV0aCI6Ik9SR19BRE1JTixPUkdfVVNFUixST0xFX0FETUlOIiwiZXhwIjoxNjk3MzQ3Nzg1fQ.j5xUAHTRZA-RDgDItl4KGy_D9JLjt69ZYVqmx7oQQpzNDrgxOUQKNdplNzqDpnLFzJWddYySENGnRGOctRQ8xQ`,
        };
        return lastValueFrom(this.http.get(url, { headers: headersRequest }));
    }

    readVillageByDist(): Promise<any> {
        return new Promise((resolve, reject) => {

            const jsonPath = '../../../../../../mapData/village_2023/Tamil Nadu_village.json',
                readStream = fs.createReadStream(jsonPath, 'utf8'),
                parse = readStream.pipe(geojsonStream.parse());
            console.log('started')

            const distFeatureMap = new Map();
            parse.on('data', (feature) => {
                const dist = feature?.properties?.district;
                console.log('district =>', dist)
                if (!distFeatureMap.has(dist)) {
                    distFeatureMap.set(dist, []);
                }
                distFeatureMap.get(dist).push(feature);
            })
            parse.on('end', () => {
                Array.from(distFeatureMap.keys()).forEach(async (k) => {
                    const f = distFeatureMap.get(k);
                    await f.forEach(async (features: any) => {

                        let admin0, admin1, admin2, admin3, admin4, polygon, isGet: boolean = false;

                        admin0 = features?.properties.country
                        admin1 = features?.properties.state
                        admin2 = features?.properties.district;
                        admin3 = features?.properties.subdistrict;
                        admin4 = features?.properties.names;
                        polygon = features?.geometry?.coordinates;

                        await this.getChurhes(admin0, admin1, admin2).then(async (res: any) => {
                            if (Array.isArray(res?.data)) {
                                isGet = true
                                this.churchList = [];
                                let churchres = await this.removeDuplicate(res?.data);
                                await churchres.forEach(async e => {
                                    let geo = e.geometry?.location;
                                    const isInside = await this.isMarkerInsidePolygon(geo, polygon)
                                    if (isInside) {
                                        this.churchList.push(e);
                                    }
                                })
                            } else {
                                resolve(res)
                            }
                        }).catch((err) => { reject(`Error in getting Church ${err}`); isGet = false })

                        if (isGet) {
                            let villFeature = features;
                            await this.saveSurvey(villFeature)
                            resolve(this.churchList);
                        }
                    })

                    // clear village data for each loop
                    distFeatureMap.set(k, []);
                });
            })

        })
    }

    removeDuplicate(arr): Promise<any> {
        const uniqueArray = arr.filter((item, index, self) => {
            const firstIndex = self.findIndex((el) => el.geometry.location.lat === item.geometry.location.lat && el.geometry.location.lng === item.geometry.location.lng);
            return index === firstIndex;
        });
        return uniqueArray
    }

    async saveSurvey(data: any): Promise<any> {
        const apiPayload = await this.payload(data);
        console.log('called Save', apiPayload)
        const url = `http://192.168.0.109:8080/api/encuesta/create`;
        const headersRequest = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhbnNsaW5qZW5pc2hhIiwiYXV0aCI6Ik9SR19BRE1JTixPUkdfVVNFUixST0xFX0FETUlOIiwiZXhwIjoxNjk3MzQ3Nzg1fQ.j5xUAHTRZA-RDgDItl4KGy_D9JLjt69ZYVqmx7oQQpzNDrgxOUQKNdplNzqDpnLFzJWddYySENGnRGOctRQ8xQ`,
        };
        return lastValueFrom(this.http.post(url, apiPayload, { headers: headersRequest }));
    }

    async payload(features) {
        const geoJson = JSON.stringify(features);
        let payload: any = {},
            admin0 = features?.properties.country,
            admin1 = features?.properties.state,
            admin2 = features?.properties.district,
            admin3 = features?.properties.subdistrict,
            admin4 = features?.properties.name;
        payload.survey = {
            admin0: admin0,
            admin1: admin1,
            admin2: admin2,
            admin3: admin3,
            admin4: admin4,
            noWork: +this.churchList?.length ? false : true,
            approvedDate: new Date(),
            geojson: jsonMinify(geoJson),
            approverName: 'Admin',
            churchCount: this.churchList?.length
        }
        payload.newChurches = this.churchList;
        return payload
    }

    isMarkerInsidePolygon(marker, polygon): Promise<any> {
        const point = marker;
        polygon = polygon[0];
        let x = point.lng,
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