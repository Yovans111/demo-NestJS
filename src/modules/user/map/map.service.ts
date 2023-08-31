import { Injectable } from "@nestjs/common";
import { rejects } from "assert";
import { existsSync, mkdirSync, writeFileSync, appendFile } from "fs";
const fsEx = require('fs-extra');
import * as fs from 'fs';
const jsonMinify = require('jsonminify');


@Injectable()
export class MapService {

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
        const geojsonStream = require('geojson-stream');
        const filePath = inpath; // Replace with the actual file path
        const readStream = fs.createReadStream(filePath, 'utf8');
        let features = [],
            states = ['Uttar Pradesh'] //Haryana,Lakshadweep,Sikkim,Meghalaya,Nagaland,Mizoram,Himachal Pradesh,Arunachal Pradesh,Chhattisgarh,West Bengal,Uttarakhand,Daman And Diu,Andaman and Nicobar,Madhya Pradesh,Punjab,Puducherry,Jammu And Kashmir,Ladakh,Rajasthan,Goa,Assam
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
                const outputFile = `${state}_village`;
                const featureCollection = {
                    type: 'FeatureCollection',
                    features: features
                };
                const JSONStream = require('JSONStream');
                const outputStream = fs.createWriteStream(`${outpath}/${outputFile}.json`);
                const jsonStream = JSONStream.stringify();
                jsonStream.pipe(outputStream);
                jsonStream.write(featureCollection);
                jsonStream.end();
                outputStream.on('finish', () => {
                    console.log('Data written successfully.');
                });
                // this.writeJsonFile(outpath, outputFile, featureCollection)
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
            let basePath = '../../../../../Python Project/iia-data-jobs-master/data', folderPath = '', finaldata, jsonData,
                level = village ? 'VILLAGE' : subdist ? 'SUBDIST' : dist ? 'DIST' : state ? 'STATE' : 'COUNTRY'
            switch (level) {
                case 'VILLAGE':
                    folderPath = `${basePath}/${country}/${state}/${dist}/${subdist}/${village}`
                    console.log('village called =>', folderPath)
                    break;
                case 'SUBDIST':
                    folderPath = `${basePath}/${country}/${state}/${dist}/${subdist}`
                    console.log('subdist called =>', folderPath);
                    break;
                case 'DIST':
                    folderPath = `${basePath}/${country}/${state}/${dist}`
                    console.log('dist called =>', folderPath)
                    break;
                case 'STATE':
                    folderPath = `${basePath}/${country}/${state}`
                    console.log('state called =>', folderPath)
                    break;
                default:
                    folderPath = `${basePath}/${country}`
                    console.log('country called =>', folderPath)
                    break;
            }
            finaldata = GetFilelistRecursively(folderPath)
            jsonData = await this.readJsonFile(`${folderPath}/${finaldata?.file}`)
            let res
            if (jsonData || finaldata.dir) {
                if (level == 'COUNTRY') {
                    res = {data:finaldata?.dir}
                }else{
                    res = JSON.stringify({ data: finaldata?.dir, geoJson: jsonData });
                }
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