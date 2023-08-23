import { HttpStatus, Injectable } from '@nestjs/common';
import { ReturnAllUser, userData } from './user-dto.dto';
import { User } from './entity/user.entity';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Connection } from 'mysql2/typings/mysql/lib/Connection';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlink, appendFile, appendFileSync } from 'fs';
import * as xmljs from 'xml-js';
import * as xml2js from 'xml2js';
import * as fs from 'fs';
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

    async getJsonVillageData(inputfilePath: string, outFilePath: string, config: any, level: 'DIST' | 'SUBDIST' | 'VIL' | 'STATE' = 'VIL') {
        const fsEx = require('fs-extra'),
            jsonData = await fsEx.readJson(inputfilePath), outputFolderPath = outFilePath;
        let finalJson: any = {};
        jsonData?.features.forEach((a: any) => {
            let distName: string = this.replaceSpeChar(a?.properties?.[config?.distName]),
                stateName: string = this.replaceSpeChar(a?.properties?.[config?.stateName]),
                subDistName: string = this.replaceSpeChar(a?.properties?.[config?.subDistName]),
                villageName: string = this.replaceSpeChar(a?.properties?.[config?.villageName]);
            finalJson = this.createJsonData(a);
            const statePath = this.createFolderForJson(outputFolderPath, stateName?.toLowerCase()); // folder by sytate state
            if (level == 'STATE') {
                this.writeJsonFile(`${statePath}`, stateName?.toLowerCase(), finalJson);
                return
            }
            const distPath = this.createFolderForJson(statePath, distName?.toLowerCase()); //folder by dist Name
            if (level == 'DIST') {
                this.writeJsonFile(`${distPath}`, distName?.toLowerCase(), finalJson);
                return
            }
            const subdistPath = this.createFolderForJson(`${distPath}`, subDistName?.toLowerCase()); //folder by sub dist 
            if (level == 'SUBDIST') {
                this.writeJsonFile(`${subdistPath}`, subDistName?.toLowerCase(), finalJson);
                return
            }
            const villagePath = this.createFolderForJson(`${subdistPath}`, 'village'); //folder by sub dist 
            this.writeJsonFile(`${villagePath}`, villageName?.toLowerCase(), finalJson);
        })
    }

    replaceSpeChar(str: string): string {
        const specialCharPattern = /[!@#$%^&*()|/+{}\[\]:;<>,.?~\\\=]/g;
        if (specialCharPattern.test(str)) {
            return str.replace(specialCharPattern, '')
        }
        return str
    }

    //join multiple json file into single file
    async convertToSinglejson(inputfilePath: any, filesNames?: Array<string>) {
        this.toFeatureCollection()
        return
        let features = []
        if (!filesNames?.length) {
            filesNames = await this.readFilesFromFolder(inputfilePath)
        }
        //for test delete exsit data 
        //    await unlink('./src/assets/rawValidJson/totalvillage.json', (err: any) => { })
        await filesNames.forEach(async (fN: any) => {
            let data = await fsEx.readJson(`${inputfilePath}/${fN}`)
            if (typeof data == 'string') {
                data = JSON.parse(data);
            }
            features = [];
            data?.features?.forEach((a: any, i) => {
                let f = {
                    type: 'Feature',
                    geometry: a?.geometry,
                    properties: a?.attributes
                }
                // if (!a?.properties) {
                //     f.properties = a?.attributes
                // }
                f.geometry.coordinates = a?.geometry.rings
                f.geometry.type = 'Polygon'
                delete f?.geometry.rings
                features.push(f);
            })
            this.appendToJsonFile('./src/assets/rawValidJson/totalvillage.json', features)
            data = [];
        })
        // if (this.isFileExist('./src/assets/rawValidJson/totalvillage.json')) {
        //     let rJ = fsEx.readJson('./src/assets/rawValidJson/totalvillage.json');
        //     const validJson = this.createJsonData(rJ)
        //     this.writeJsonFile('./src/assets/rawValidJson', 'totalvillage', validJson)
        //     rJ = []
        // }
    }
    async appendToJsonFile(filePath, newData) {
        try {
            let eF = await this.isFileExist(filePath)
            if (eF) {
                const jsonString = JSON.stringify(newData, null, 2);
                appendFile(filePath, jsonString, (err) => { })
            } else {
                await this.writeJsonFile('./src/assets/rawValidJson', 'totalvillage', newData)
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

    async toFeatureCollection() {
        // const fs = require('fs');
        const geojsonStream = require('geojson-stream');
        const readline = require('readline');
        const inputFilePath = './src/assets/rawValidJson/totalvillage.json'; // Replace with your file path
        const outputFilePath = './src/assets/rawValidJson/indiavillage.json';
        const inputStream = fs.createReadStream(inputFilePath, 'utf8');
        // Create a writable stream for GeoJSON output
        const outputStream = fs.createWriteStream(outputFilePath);
        // Create a GeoJSON Feature Collection
        const featureCollection = { type: 'FeatureCollection', features: [] };
        // Parse JSON data from the input stream and convert to GeoJSON
        // const parseStream = await inputStream.pipe(geojsonStream.parse())
        const rl = readline.createInterface({
            input: inputStream,
            output: process.stdout,
            terminal: false
        });
        rl.on('line', (line) => {
            try {
                if (typeof line == 'string') {
                    const feature = JSON.parse(line);
                    featureCollection.features.push(feature)
                }
            } catch (error) {
                console.error('Error writing output file:', error);
            }
        });
        rl.on('close', () => {
            fs.writeFile(outputFilePath, JSON.stringify(featureCollection, null, 2), 'utf8', (err) => {
                if (err) {
                    console.error('Error writing output file:', err);
                } else {
                    console.log('Conversion completed.')
                }
            });
        });
        // parseStream?.on('data', (feature) => {
        //     console.log('Parsed feature:', feature);
        // });
        // for await (const feature of parseStream) {
        //     featureCollection.features.push(feature);
        // }
        // outputStream.write(JSON.stringify(featureCollection, null, 2), 'utf8');
        // await fs.writeFile(outputFilePath, JSON.stringify(featureCollection, null, 2), 'utf8');
        console.log('Conversion completed.');
        // .on('data', (feature) => {
        //     featureCollection.features.push(feature);
        // })
        // .on('end', () => {
        //     // Write the Feature Collection to the output GeoJSON file
        //     outputStream.write(JSON.stringify(featureCollection, null, 2), 'utf8');
        //     outputStream.end();
        //     console.log('Conversion completed.');
        // })
        // .on('error', (error) => {
        //     console.error('Error converting data:', error);
        // });

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
