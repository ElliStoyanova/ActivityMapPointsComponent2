import { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

export function setStylesByFeatureType(feature: any) {
    if (!feature) {
        return {};
    }

    const geometry = feature.getGeometry();
    const geometryType = geometry?.getType();
    
    switch(geometryType) {
        case 'Point':
        case 'MultiPoint': {
            const icon = feature.getProperty('icon');
            const title = feature.getProperty('name');

            return {
                icon,
                title
            }
        }
        case 'LineString':
        case 'MultiLineString': {
            const strokeColor = feature.getProperty('stroke') || '#000000';
            const strokeOpacity = feature.getProperty('stroke-opacity') || 1;
            const strokeWeight = feature.getProperty('stroke-width') || 1;

            return {
                strokeColor,
                strokeOpacity,
                strokeWeight
            };
        }
        
        case 'Polygon':
        case 'MultiPolygon': {
            const strokeColor = feature.getProperty('stroke') || '#000000';
            const strokeOpacity = feature.getProperty('stroke-opacity') || 1;
            const strokeWeight = feature.getProperty('stroke-width') || 1;
            const fillOpacity = feature.getProperty('fill-opacity') || 0.5;
            const fillColor = feature.getProperty('fill') || '#000000';

            return {
                fillOpacity,
                fillColor,
                strokeColor,
                strokeOpacity,
                strokeWeight
            };
        }

        default: {
            return {}
        }
    }
}

async function validateIconUrl(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: "HEAD" });
        console.log('RESPONSE FROM HEAD REQUEST: ', response);
        return response.ok;
    } catch (error) {
        console.log('ERROR GETTING ICON URL: ', error);
        return false;
    }
}

export async function preprocessGeoJSON(geoJSON: FeatureCollection<Geometry | null, GeoJsonProperties> | null, defaultIconUrl: string): 
    Promise<FeatureCollection<Geometry | null, GeoJsonProperties> | null> {
    
    if (!geoJSON) {
        return null;
    }
    
    const features = geoJSON.features;
    const checkedUrls: Record<string, boolean> = {};

    const pointFeaturesWithIconUrl = features.filter(feature => feature?.geometry?.type === 'Point' && feature?.properties?.['icon']);

    for (const feature of pointFeaturesWithIconUrl) {

        const iconUrl = feature?.properties?.['icon'];
        console.log('Icon url: ', iconUrl);

        if (feature.properties && iconUrl in checkedUrls && !checkedUrls[iconUrl]) {
            feature.properties.icon = defaultIconUrl;
        } else if (feature.properties && !(iconUrl in checkedUrls)) {
            const isValid = await validateIconUrl(iconUrl);
            
            if (!isValid) {
                feature.properties.icon = defaultIconUrl;
            }
            
            console.log('Is valid? ', isValid);
    
            checkedUrls[iconUrl] = isValid;
        }  
    }

    console.log('checked urls: ', checkedUrls);
    console.log('FEATURES COUNT: ', geoJSON.features?.length);

    return geoJSON;
}