import { GeoJsonProperties } from "geojson";

export enum MarkerLabelProperty {
    Date = 'date',
    Title = 'title',
    Category = 'category',
    Description = 'description'
}

export enum FeatureProperty {
    Name = 'name',
    Category = 'category',
    Description = 'description',
    DateAndTime = 'dateAndTime'
}

export interface FeatureRecord {
    latitude: number; 
    longitude: number; 
    properties: GeoJsonProperties
}