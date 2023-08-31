import { Injectable } from "@nestjs/common";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import * as xmljs from 'xml-js';
import * as xml2js from 'xml2js';
import * as fs from 'fs';


@Injectable()
export class KmlService {

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


}