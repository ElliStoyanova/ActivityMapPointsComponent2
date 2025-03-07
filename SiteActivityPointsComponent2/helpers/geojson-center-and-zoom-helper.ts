import { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

export function getCenterAndZoomGeoJsonBounds(geojson: FeatureCollection<Geometry | null, GeoJsonProperties> | null): google.maps.LatLngBounds | null {
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        return null;
    }

    const bounds = new google.maps.LatLngBounds();

    geojson.features.forEach(feature => {
        if (feature.geometry && (feature.geometry as any).coordinates) {
            if (feature.geometry.type === 'Point') {
                const coords = feature.geometry.coordinates;
                bounds.extend(new google.maps.LatLng(coords[1], coords[0]));
            } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                const coordinates = feature.geometry.coordinates;
                flattenCoordinates(coordinates).forEach(coord => {
                    bounds.extend(new google.maps.LatLng(coord[1], coord[0]));
                });
            } else if (feature.geometry.type === 'MultiPoint') {
                const coordinates = feature.geometry.coordinates;
                coordinates.forEach(coord => {
                    bounds.extend(new google.maps.LatLng(coord[1], coord[0]));
                });
            } else if (feature.geometry.type === 'MultiLineString') {
                const coordinates = feature.geometry.coordinates;
                coordinates.forEach(line => {
                    line.forEach(coord => {
                        bounds.extend(new google.maps.LatLng(coord[1], coord[0]));
                    });
                });
            }
        }
    });

    return bounds;
}

function flattenCoordinates(coordinates: any[]) {
    let flattened: any[] = [];
    coordinates.forEach(coord => {
        if (Array.isArray(coord) && Array.isArray(coord[0])) {
            flattened = flattened.concat(flattenCoordinates(coord));
        } else {
            flattened.push(coord);
        }
    });
    return flattened;
}