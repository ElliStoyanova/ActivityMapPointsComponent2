import { kml } from "@tmcw/togeojson";
import toGeoJSON from '@mapbox/togeojson';
import * as geoXML3 from 'geoxml3';
import { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

export async function getInitialGeoJSONFromFile(downloadUrl: string, fileExtension: string): Promise< FeatureCollection<Geometry | null, GeoJsonProperties> | null > {
        
    if(!downloadUrl) {
        return null;
    }

    return fetch(downloadUrl)
        .then(async response => {
            console.log('RESPONSE FROM FETCH CALL: ', response);
            return response.blob();
        })
        .then(blob => blob.text())
        .then(fileText => {
            console.log('FILE TEXT: ', fileText);

            if (fileExtension === 'json' || fileExtension === 'geojson') {
                return JSON.parse(fileText);
            } else if (fileExtension === 'kml') {
                console.log('GEOXML 3', geoXML3);
                const kmlDoc = new DOMParser().parseFromString(fileText, 'text/xml');
                console.log('fileDOC: ', kmlDoc);
                const initialGeoJSON = toGeoJSON.kml(kmlDoc);
                console.log('initial geoJSON: ', initialGeoJSON);
                // const testGeoJSON = kml(kmlDoc);
                // console.log('test geoJSON: ', JSON.stringify(testGeoJSON));
                return initialGeoJSON;
            } else {
                console.error(`The file type .${fileExtension} is not supported.`);
                return null;
            }                            
        })
        .catch(error => {
            console.error("Error downloading or parsing KML:", error);
            return null;
        });
}