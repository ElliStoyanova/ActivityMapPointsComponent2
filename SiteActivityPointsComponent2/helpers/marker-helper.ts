import { GeoJsonProperties } from 'geojson';
import { FeatureProperty, MarkerLabelProperty } from '../interfaces/interfaces';
import { defaultIconUrl } from '../configuration/configuration';

export function createInfoWindowContent( description: string, dateAndTime?: string, category?: string ): HTMLDivElement | null {

    if (!description && !dateAndTime && !category) {
        return null;
    }

    const outerDiv = document.createElement('div');
     
    const descriptionParagraph = document.createElement('p');
    descriptionParagraph.className = 'description';
    descriptionParagraph.textContent = description || '';   

    const dateParagraph = document.createElement('p');
    dateParagraph.textContent = dateAndTime || '';
  
    const categoryHeading = document.createElement('h4');
    categoryHeading.className = 'category';
    categoryHeading.textContent = category || '';

    if (dateAndTime) {
        outerDiv.appendChild(dateParagraph);
    }
    
    if (category) {
        outerDiv.appendChild(categoryHeading);  
    }
   
    if (description) {
        outerDiv.appendChild(descriptionParagraph);
    }    
  
    return outerDiv;
}

export function createMarkerContent(featureProperties: GeoJsonProperties, markerLabelProp: MarkerLabelProperty): Node | null {
    const markerContent = document.createElement('div');
    markerContent.style.position = 'relative';

    const pinElement = document.createElement('div');
    pinElement.className = 'marker-pin';
    pinElement.style.backgroundImage = `url(${defaultIconUrl})`;

    const labelElement = getLabelElement(featureProperties, markerLabelProp);

    markerContent.appendChild(pinElement);

    if (labelElement) {
        markerContent.appendChild(labelElement);
    }

    return markerContent;
}

export function getLabelElement(featureProperties: GeoJsonProperties, markerLabelProp: MarkerLabelProperty): HTMLElement | null {
    if (!featureProperties) {
        return null;
    }

    const featurePropertyToDisplay = getFeaturePropertyByMarkerLabelProperty(markerLabelProp);
        
    const labelElement = getLabelElementByFeatureProperty(featurePropertyToDisplay, featureProperties);
    labelElement?.classList.add('marker-label');
    labelElement?.setAttribute('title', featureProperties[featurePropertyToDisplay]);
    
    return labelElement;
}

function getFeaturePropertyByMarkerLabelProperty(markerLabelProp: MarkerLabelProperty): FeatureProperty {
    switch(markerLabelProp) {
        case MarkerLabelProperty.Title: {
            return FeatureProperty.Name;
        }
        case MarkerLabelProperty.Description: {
            return FeatureProperty.Description;
        }
        case MarkerLabelProperty.Category: {
            return FeatureProperty.Category;
        }
        case MarkerLabelProperty.Date: {
            return FeatureProperty.DateAndTime;
        }
        default: {
            return FeatureProperty.DateAndTime;
        }
    }
}

function getLabelElementByFeatureProperty(featureProperty: FeatureProperty, properties: GeoJsonProperties): HTMLDivElement | null {
    if (!properties) {
        return null;
    }

    const container = document.createElement('div');

    if (featureProperty === FeatureProperty.DateAndTime) {
        const dateAndTimeText = properties?.[FeatureProperty.DateAndTime] ? new Date(properties?.[FeatureProperty.DateAndTime]).toLocaleString() : null ;
        const dateAndTimeFragments = dateAndTimeText?.split(',');
        const date = dateAndTimeFragments?.[0] || '';
        const time = (dateAndTimeFragments?.[1])?.trim() || '';

        const dateParagraph = document.createElement('p');
        dateParagraph.textContent = date || ''; 

        const timeParagraph = document.createElement('p');
        timeParagraph.textContent = time || '';

        container.appendChild(dateParagraph);
        container.appendChild(timeParagraph);
    } else {
        const content = document.createElement('div');
        content.textContent = properties[featureProperty];
        content.classList.add('marker-label-long-text');
        container.appendChild(content);
    }

    return container;
}
