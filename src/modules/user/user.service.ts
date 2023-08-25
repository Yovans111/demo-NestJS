import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { appendFile, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { DataSource, Repository } from 'typeorm';
import * as xmljs from 'xml-js';
import * as xml2js from 'xml2js';
import { User } from './entity/user.entity';
import { ReturnAllUser, userData } from './user-dto.dto';
const fsEx = require('fs-extra');


@Injectable()
export class UserService {

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectDataSource() private dataSource: DataSource
    ) { }
    async getUserData(): Promise<ReturnAllUser> {
        const d = await this.usersRepository.find();
        d.map((a: User) => {
            delete a.password
            return a
        })
        return { result: d, statusCode: HttpStatus.OK, message: 'success' }
    }

    saveData(data: userData) {
        if (data?.id) {
            return this.usersRepository.update(data?.id, data);
        } else {
            return this.usersRepository.save(data);
        }
    }

    async getById(id: any): Promise<User | any> {
        // const q = await this.dataSource.query('SELECT user.id , user.name ,user.email_id,user.age  FROM `demo`.`user` as user WHERE user.id = 1 ')
        const d = await this.usersRepository.findOneBy(id);
        delete d.password
        return d
    }

    //kml extraction

    async extractKmlFile(kmlFilePath: string, outputFolderPath: string) {
        const extractData: any = await this.extractKMLData(kmlFilePath)
        const kanniyakumariDataList = extractData?.filter((item) => {
            const res = (item.extendedData.NAME == 'Kanniyakumari')
            return res
        }
        );
        this.createKMLFile(kanniyakumariDataList, outputFolderPath, 'kanniyakumari.kml')
        return
        try {
            const kmlData = readFileSync(kmlFilePath, 'utf-8');
            const kmlJson = xmljs.xml2js(kmlData, { compact: true })
            const document = this.findDocument(kmlJson);
            if (!document) {
                throw new Error('Invalid KML format: Document not found.');
            }
            // Create a folder for Kanyakumari district
            const kanyakumariFolder = this.createFolder(outputFolderPath, 'Kanniyakumari');

            // Find the Kanyakumari district placemark
            const kanyakumariPlacemark = await this.findPlacemarkByName(kmlJson, 'Kanniyakumari');
            if (!kanyakumariPlacemark) {
                throw new Error("Kanyakumari district not found in the KML data.");
            }

            // Write the Kanyakumari district data to a new KML file
            this.writeKMLFile(kanyakumariFolder, 'Kanyakumari.kml', kanyakumariPlacemark);

            // Find and extract villages within Kanyakumari district
            const villages = this.findPlacemarksByKeyword(kmlJson, 'Village');
            villages.forEach((village) => {
                const villageName = village.name[0];
                const villageFolder = this.createFolder(kanyakumariFolder, villageName);
                this.writeKMLFile(villageFolder, `${villageName}.kml`, village);
            });

            console.log('Data extracted and organized successfully!');
        } catch (error) {
            console.error('Error processing KML file:', error);
        }
    }


    private createFolder(basePath: string, folderName: string): string {
        const folderPath = `${basePath}/${folderName}`;
        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }
        return folderPath;
    }

    private writeKMLFile(folderPath: string, fileName: string, placemark: any) {
        const xmlData = `<?xml version="1.0" encoding="UTF-8"?>\n${placemark.outerXML}`;
        writeFileSync(`${folderPath}/${fileName}`, xmlData, 'utf-8');
    }

    private findPlacemarkByName(kmlJson: any, name: string): any | null {
        const placemarks = this.findPlacemarks(kmlJson);
        for (const placemark of placemarks) {
            if (placemark._text === name) {
                console.log('placemark', placemark._text)
                return placemark;
            }
        }
        return null;
    }

    private findDocument(kmlJson: any): any {
        if (kmlJson && kmlJson.kml && kmlJson.kml.Document) {
            return kmlJson.kml.Document;
        }
        return null;
    }

    // private findPlacemarks(document: any): any[] {
    //     const placemark = document.kml.Document?.Placemark
    //     console.log('document',placemark )
    //     if (placemark) {
    //         return Array.isArray(placemark) ? placemark : [placemark];
    //     }
    //     return [];
    // }
    private findPlacemarks(document: any): any[] {
        const placemarks = [];
        const file = document?.kml?.Document?.Placemark
        if (file.length) {
            file.forEach(el => {
                el.ExtendedData.Data.forEach((dataItem) => {
                    placemarks.push(dataItem.value);
                });
                el.Polygon.outerBoundaryIs.LinearRing.coordinates.forEach((dataItem) => {
                    console.log('dataItem', dataItem);


                });
            });
        }
        return placemarks;
    }

    private findPlacemarksByKeyword(kmlJson: any, keyword: string): any[] {
        const placemarks = kmlJson.kml.Document[0].Placemark;
        const filteredPlacemarks = [];
        for (const placemark of placemarks) {
            if (placemark.name[0].includes(keyword)) {
                filteredPlacemarks.push(placemark);
            }
        }
        return filteredPlacemarks;
    }


    async extractKMLData(path: any) {
        try {
            // Read the KML data from the file or use your KML data directly
            const kmlData = fs.readFileSync(path, 'utf8');

            // Parse the KML data into a JSON object
            const parser = new xml2js.Parser();
            const parsedKML = await parser.parseStringPromise(kmlData);

            // Access the Document and Placemark elements
            const document = parsedKML.kml.Document[0];
            const placemarks = document.Placemark;

            // Process each Placemark
            const extractedDataList = [];
            for (const placemark of placemarks) {
                const extendedData = placemark.ExtendedData[0].Data;
                const polygonCoordinates = placemark.Polygon[0].outerBoundaryIs[0].LinearRing[0].coordinates[0];

                // Extract the values from ExtendedData
                const extractedData = {};
                for (const data of extendedData) {
                    const name = data.$.name;
                    const value = data.value[0];
                    extractedData[name] = value;
                }

                // Extract the polygon coordinates
                const polygonCoordsArray = polygonCoordinates.split(' ');
                const coordinates = polygonCoordsArray.map((coordString) => {
                    const [lng, lat] = coordString.split(',');
                    return { lng: parseFloat(lng), lat: parseFloat(lat) };
                });

                // Add the extracted data to the list
                extractedDataList.push({ extendedData: extractedData, coordinates: coordinates });
            }

            // The extractedDataList now contains the data for each Placemark
            // console.log('Extracted Data:', extractedDataList);
            return extractedDataList
        } catch (error) {
            console.error('Error extracting data from KML:', error);
        }
    }

    async createKMLFile(dataList, outputPath, fileName) {
        // console.log('dataList',dataList);
        try {
            // Create a new KML object with the appropriate structure
            const kmlObject = {
                kml: {
                    _declaration: { _attributes: { version: '1.0', encoding: 'UTF-8' } },
                    Document: {
                        Placemark: dataList.map((item) => ({
                            ExtendedData: {
                                Data: Object.entries(item.extendedData).map(([name, value]) => ({
                                    _attributes: { name },
                                    value: [value],
                                })),
                            },
                            Polygon: [
                                {
                                    outerBoundaryIs: [
                                        {
                                            LinearRing: [
                                                {
                                                    coordinates: [
                                                        item.coordinates.map(({ lng, lat }) => `${lng},${lat}`).join(' '),
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        })),
                    },
                },
            };

            console.log('kmlObject', dataList)
            // Convert the KML object back to XML format
            const builder = new xml2js.Builder();
            const kmlData = builder.buildObject(kmlObject);

            // Write the XML data to a new KML file
            fs.writeFileSync(`${outputPath}/${fileName}`, kmlData, 'utf8');

            console.log('KML file created successfully!');
        } catch (error) {
            console.error('Error creating KML file:', error);
        }
    }


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
