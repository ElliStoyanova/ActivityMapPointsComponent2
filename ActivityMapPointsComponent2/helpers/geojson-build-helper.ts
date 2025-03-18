import { Point, Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import { FeatureRecord } from 'ActivityMapPointsComponent2/interfaces/interfaces';

export function createGeoJsonPoint(longitude: number, latitude: number): Point {
    return {
        type: 'Point',
        coordinates: [longitude, latitude],
    };
}

export function createGeoJsonFeature(
    longitude: number,
    latitude: number,
    properties: GeoJsonProperties
): Feature {
    return {
        type: 'Feature',
        geometry: createGeoJsonPoint(longitude, latitude),
        properties: properties,
    };
}

export function createGeoJsonFeatureCollection(
    features: Feature[]
): FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: features,
    };
}

export function createGeoJson(featureRecords: FeatureRecord[]): FeatureCollection<Geometry, GeoJsonProperties> {
    const features: Feature[] = featureRecords.map((featureRecord) =>
        createGeoJsonFeature(featureRecord.longitude, featureRecord.latitude, featureRecord.properties)
    );
    return createGeoJsonFeatureCollection(features);
}