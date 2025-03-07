import { Point, Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

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

export function createGeoJson(coordinates: { latitude: number; longitude: number; properties: GeoJsonProperties }[]): FeatureCollection<Geometry, GeoJsonProperties> {
    const features: Feature[] = coordinates.map((coord) =>
        createGeoJsonFeature(coord.longitude, coord.latitude, coord.properties)
    );
    return createGeoJsonFeatureCollection(features);
}