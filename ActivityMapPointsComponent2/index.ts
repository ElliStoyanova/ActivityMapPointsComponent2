import { IInputs, IOutputs } from './generated/ManifestTypes';
import { FeatureCollection, GeoJsonProperties, Geometry, Point } from 'geojson';
import { FeatureProperty, FeatureRecord, MarkerLabelProperty } from './interfaces/interfaces';
import { getInitialGeoJSONFromFile } from './helpers/file-download-helper';
import { getCenterAndZoomGeoJsonBounds } from './helpers/geojson-center-and-zoom-helper';
import * as geoJSONBuildHelper from './helpers/geojson-build-helper';
import * as geoJSONStyleHelper from './helpers/geojson-style-helper';
import * as markerHelper from './helpers/marker-helper';
import * as config from './configuration/configuration';


export class ActivityMapPointsComponent2 implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container: HTMLDivElement;
    private context: ComponentFramework.Context<IInputs>;
    private notifyOutputChanged: () => void;

    private map: google.maps.Map | null = null;
    private AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement | null = null;
    private infoWindow: google.maps.InfoWindow;
    private initialGeoJSON: FeatureCollection<Geometry | null, GeoJsonProperties> | null;
    private geoJSON: FeatureCollection | null;
    private initialLocationTableName: string;
    private initialFileColumnName: string;
    private mapId: string;
    private markerLabelProp: MarkerLabelProperty | null;
    private initPromise: Promise<void> | null = null;
    private markers: google.maps.marker.AdvancedMarkerElement[] = [];
    private markerEventListeners: google.maps.MapsEventListener[] = [];
    private featureRecords: FeatureRecord[] = [];
    private featureRecordIds = new Set<string>();
    private isDataLoading = false;
    private pageSize: number;
    private pageNumber = 0;

    constructor() {}

    public async init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): Promise<void> {
        this.container = container;
        this.context = context;

        console.log('CONTEXT in init: ', { ...this.context });
        console.log('CONTEXT FILTER in update view: ', this.context.parameters.locationDataSet?.filtering?.getFilter());
  
        this.setContainerSize();
        this.initializeParameters();   
        // this.context.parameters.locationDataSet.paging.setPageSize(this.pageSize);  
        // console.log('Params initialLocationTableName: ', this.initialLocationTableName);

        this.initPromise = new Promise<void>((resolve, reject) => {

            this.loadGoogleMaps(this.context.parameters.googleApiKey.raw as string)
                .then(() => {
                    console.log('Google Maps API loaded successfully.');
                    return google.maps.importLibrary('marker') as Promise<google.maps.MarkerLibrary>;
                })
                .then(({ AdvancedMarkerElement }) => {
                    this.AdvancedMarkerElement = AdvancedMarkerElement;
                    this.initializeMap();
                    this.initializeInfoWindow();
                    this.attachClickEventListener();
                    return this.getInitialGeoJSON();
                })
                .then((initialGeoJSON) => {
                    return geoJSONStyleHelper.preprocessGeoJSON(initialGeoJSON, config.defaultIconUrl);
                })
                .then((preprocessedGeoJSON) => {
                    this.initialGeoJSON = preprocessedGeoJSON;
                    // console.log('INITIAL GEOJSON IN INIT(): ', JSON.stringify(this.initialGeoJSON));
                    this.addGeoJSONOnMap(this.initialGeoJSON);
                    this.applyCenterAndZoomBoundsOnMap();
                    this.applyInitialGeoJSONStyles();
                    console.log('EVERYTHING IN INIT COMPLETED!');
                    resolve();
                    return;
                })
                .catch((error) => {
                    console.error('Initialization error:', error);
                    reject(error);
                    return;
            });           
        });

        return this.initPromise;                    
    }

    public async updateView(context: ComponentFramework.Context<IInputs>): Promise<void> {

        console.log('CONTEXT in update view: ', {...context});
        console.log('CONTEXT FILTER in update view: ', context.parameters.locationDataSet?.filtering?.getFilter());

        if (this.initPromise) {
            try {
                await this.initPromise; // Wait for init to complete
                console.log("init finished, updateView can continue");

                if (!context.parameters.locationDataSet.loading) {

                    const datasetFeatureRecords = this.getFeatureRecords(context.parameters.locationDataSet);
                    this.featureRecords = this.isDataLoading ? this.featureRecords.concat(datasetFeatureRecords) : datasetFeatureRecords;
                    console.log('This FEATURE RECORDS: ', this.featureRecords);   
                    console.log('HAS NEXT PAGE?: ',{ ...context.parameters.locationDataSet.paging }.hasNextPage);   
                    this.toggleMarkerCountWarning();

                    if (context.parameters.locationDataSet.paging?.hasNextPage === true && this.featureRecords.length < this.pageSize) {
                    // if (context.parameters.locationDataSet.paging?.hasNextPage === true && this.featureRecords.length < config.maxMarkerCount) {

                        
                        this.isDataLoading = true;
                        this.pageNumber = this.pageNumber + 1;
                        console.log('About to load next page, pageNUmber: ', this.pageNumber);
                        context.parameters.locationDataSet.paging.setPageSize(this.pageSize);                    
                        // context.parameters.locationDataSet.paging.loadNextPage();                    
                        context.parameters.locationDataSet.paging.loadExactPage(this.pageNumber);                    
                    
                    } else {              
                        this.isDataLoading = false;     
                        this.pageNumber = 0;  
                        this.geoJSON = this.getGeoJsonFromFeatureRecords(this.featureRecords);
                        console.log('This GEOJSON: ', this.geoJSON);
        
                        this.applyCenterAndZoomBoundsOnMap();        
                        this.displayGeoJSONFromDataSet();                    
                    }
                }

            } catch (error) {
                console.error("Error waiting for init:", error);
            }
        } else {
            console.log("init was not called yet");
        }
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {

        this.clearMarkers();

        if (this.map) {
            google.maps.event.clearInstanceListeners(this.map);
            const mapContainer = this.map.getDiv();
            if (mapContainer && mapContainer.parentNode) {
                mapContainer.parentNode.removeChild(mapContainer);
            }
            this.map = null;    
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    
        console.log('Component destroyed and resources cleaned up.');
    }

    private setContainerSize(): void {
        this.container.style.width = "100%";
        this.container.style.height = "800px"; 
    }

    private initializeParameters(): void {
        this.initialLocationTableName = this.context.parameters.initialLocationTableName?.raw as string || config.initialLocationTableName;
        this.initialFileColumnName = this.context.parameters.initialFileColumnName?.raw as string || config.initialFileColumnName;
        this.mapId = this.context.parameters.mapId?.raw as string || config.mapId;
        this.markerLabelProp = this.context.parameters.markerLabelProperty?.raw as MarkerLabelProperty || MarkerLabelProperty.Date;
        this.pageSize = this.context.parameters.pageSize?.raw || config.defaultPageSize;
    }

    private initializeInfoWindow(): void {
        this.infoWindow = new google.maps.InfoWindow();
    }

    private applyInitialGeoJSONStyles(): void {

        if(!this.map) {
            return;
        }

        this.map?.data?.setStyle(geoJSONStyleHelper.setStylesByFeatureType);  
    }
 
    private getGeoJsonFromFeatureRecords(featureRecords: FeatureRecord[]): FeatureCollection<Geometry, GeoJsonProperties> | null {

        if (!featureRecords || !featureRecords.length) {
            return null;
        }

        return geoJSONBuildHelper.createGeoJson(featureRecords);
    }

    private getFeatureRecords(dataset: ComponentFramework.PropertyTypes.DataSet): FeatureRecord[] {

        if (!dataset || !dataset.sortedRecordIds?.length) {
            return [];
        }
          
        return dataset.sortedRecordIds.reduce(
            (arr: FeatureRecord[], recordId) => {

            const record = dataset.records[recordId];

            arr.push({
                latitude: (record.getValue('latitude') as number),
                longitude: (record.getValue('longitude') as number),
                properties: {
                    [FeatureProperty.Name]: record.getValue('name') as string || null,
                    [FeatureProperty.Description]: record.getValue('description') as string || null,
                    [FeatureProperty.Category]: (record.getValue('category') as any)?.name || null,
                    [FeatureProperty.DateAndTime]: record.getValue('dateAndTime') || null
                }
            });
            return arr;
        },[]);
    }


    private getInitialLocationEntityId(): string | null {
        const entityTypeName = (this.context as any).page?.entityTypeName;
        console.log('Entity type name: ', entityTypeName);
        return entityTypeName === this.initialLocationTableName ? (this.context as any).page?.entityId : null;
    }

    private async getInitialGeoJSON(): 
        Promise<FeatureCollection<Geometry | null, GeoJsonProperties> | null> {

        const initialLocationEntityId = this.getInitialLocationEntityId();
        
        if (!initialLocationEntityId) {
            return null;
        }

        try {
            return await this.getInitialGeoJSONFromLinkedEntityFile(initialLocationEntityId);            
        } catch (error) {
            console.log('Error getting Url: ', error); 
            return null;
        }
    }

    private async getInitialGeoJSONFromLinkedEntityFile(entityId: string): 
        Promise<FeatureCollection<Geometry | null, GeoJsonProperties> | null> {
        
        const orgUrl = (this.context as any).page.getClientUrl();
        console.log('ORG URL: ', orgUrl);
        
        try {
            const results = await this.context.webAPI.retrieveRecord(
                this.initialLocationTableName,
                entityId,
                `?$select=${this.initialFileColumnName}`
            );
            
            console.log('Results from API call: ', results);

            if (!results) {
                return null;
            }
            
            const downloadUrl = `${orgUrl}/${config.apiDataVersionUrlFragment}/${this.initialLocationTableName}s(${entityId})/${this.initialFileColumnName}/$value`;

            console.log('Download Url: ', downloadUrl);

            const fileName = results[`${this.initialFileColumnName}_name`];
            const fileNameFragments = fileName?.split('.');
            console.log('file name fragments: ', fileNameFragments);
            const fileExtension = fileNameFragments && fileNameFragments[fileNameFragments.length - 1] || '';        
            console.log('file extension: ', fileExtension);

            const initialGeoJSON = results[this.initialFileColumnName] ? await getInitialGeoJSONFromFile(downloadUrl, fileExtension): null;            

            return initialGeoJSON;

        } catch (error) {
            console.error('Error retrieving initial location data:', error);
            return null;
        }
    }

    private loadGoogleMaps(googleApiKey: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if ((window as any).google && (window as any).google.maps) {
                resolve(); // Google Maps is already loaded
                return;
            }

            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&v=beta`;
            script.async = true;
            script.defer = true;

            script.onload = () => {
                if ((window as any).google && (window as any).google.maps) {
                    resolve();
                } else {
                    reject(new Error("Google Maps API failed to load correctly."));
                }
            };
    
            script.onerror = () => reject(new Error("Failed to load Google Maps API script."));

            document.head.appendChild(script);
        });
    }

    private initializeMap(): void {
        
        console.log('IN INITIALZE MAP CONTAINER: ', this.container);
        
        if (!this.container) return;

        this.map = new google.maps.Map(this.container, {
            center: { lat: 0, lng: 0 },
            mapId: this.mapId
        });
        
        console.log('MAP: ', this.map);
    }

    private attachClickEventListener(): void {
        if (!this.map) {
            return;
        }

        this.map.data.addListener('click', (event: any) => {
                this.infoWindow.close();
                
                const feature = event.feature;
                
                if (!feature) {
                    return;
                }
                
                const name = feature.getProperty(FeatureProperty.Name) || null;
                const description = feature.getProperty(FeatureProperty.Description) || null;

                const infoWindowContent = markerHelper.createInfoWindowContent(description);

                const geometry = feature.getGeometry();
                console.log('get geometry: ', geometry);

                const geometryType = geometry?.getType();
                console.log('geometryType: ', geometryType);

                const geometryPosition = geometryType === 'Point' ? geometry?.get() : event.latLng;
                console.log('get geomertry get: ', geometryPosition);

                if (infoWindowContent || name) {
                    this.setupInfoWindow(infoWindowContent, geometryPosition, name);
            
                    console.log('ABOUT TO OPEN INFO WINDOW')
                    this.infoWindow.open(this.map);
                } 
            }
        );
    }

    private setupInfoWindow(content: string | Element | null, position: google.maps.LatLng | null, headerContent: string | null): void {
        this.infoWindow.setContent(content);
        this.infoWindow.setPosition(position);
        this.infoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -20), maxWidth: config.maxInfoWindowWidthInPx, minWidth: config.minInfoWindowWidthInPx });
        
        if (headerContent) {
            (this.infoWindow as any).setHeaderContent(headerContent);
        }
    }
 
    private addGeoJSONOnMap(geoJSON: FeatureCollection<Geometry | null, GeoJsonProperties> | null): void {
        if (!geoJSON || !this.map) {
            return;
        }

        try {
            this.map.data.addGeoJson(geoJSON);
        } catch (error) {
            console.error("Error adding GeoJSON:", error);
        }
    }

    private displayGeoJSONFromDataSet(): void {

        this.clearMarkers();

        const features = this.geoJSON?.features;

        if (!features?.length) {
            return;
        }

        // this.addGeoJSONOnMap(this.geoJSON);

        features.forEach(feature => {
            const coords = (feature.geometry as Point)?.coordinates;
            const latLng = new google.maps.LatLng(coords[1], coords[0]);

            const dateAndTimeText = feature.properties?.[FeatureProperty.DateAndTime] ? new Date(feature.properties?.[FeatureProperty.DateAndTime]).toLocaleString() : null ;
            const name = feature.properties?.[FeatureProperty.Name] || null;
            const description = feature.properties?.[FeatureProperty.Description] || null;
            const category = feature.properties?.[FeatureProperty.Category] || null;

            const infoWindowContent = markerHelper.createInfoWindowContent(description, dateAndTimeText, category);

            const markerContent = markerHelper.createMarkerContent(feature.properties, this.markerLabelProp);

            const marker = this.createMarkerElement(latLng, markerContent, true);

            if (marker) {
                this.markers.push(marker);
            }
            
            const markerClickListener = marker?.addListener('gmp-click', () => {
                this.infoWindow.close();
                console.log('closed the info window!');
                if (infoWindowContent || name) {
                    this.setupInfoWindow(infoWindowContent, latLng, name);
                    this.infoWindow.open(this.map);
                }                
            });

            if (markerClickListener) {
                this.markerEventListeners.push(markerClickListener);
            }
        })      
    }

    private clearMarkers(): void {
        this.markerEventListeners.forEach(listener => {
            google.maps.event.removeListener(listener);
        });
        this.markerEventListeners = [];

        this.markers.forEach(marker => {
            marker.map = null;
        });
        this.markers = [];
    }

    private createMarkerElement(position: google.maps.LatLng, content: Node | null | undefined, clickable: boolean): google.maps.marker.AdvancedMarkerElement | null {
        if (!this.map || !position) {
            return null;
        }

        return new this.AdvancedMarkerElement!({
            position,
            map: this.map,
            content,
            gmpClickable: clickable
        });
    }   

    private applyCenterAndZoomBoundsOnMap(): void {

        const geoJSON = this.geoJSON ? this.geoJSON : this.initialGeoJSON;

        const centerAndZoomBounds = getCenterAndZoomGeoJsonBounds(geoJSON);
        
        if (centerAndZoomBounds) {
            console.log('About to fit map bounds ', centerAndZoomBounds.toJSON());
            this.map?.fitBounds(centerAndZoomBounds, 0);
            console.log('Map bounds after fitting bounds: ', this.map?.getBounds()?.toJSON());
            console.log('Map after fitting bounds: ', this.map);
        } else {
            this.map?.setZoom(config.defaultZoom);
        }
    }

    private toggleMarkerCountWarning(): void {
        const markerCountWarningElement = this.container.getElementsByClassName('marker-count-warning-container')?.[0];

        if ((this.featureRecords?.length >= config.maxMarkerCount) && !markerCountWarningElement) {
            const markerCountWarningElement = markerHelper.getMarkerCountWarningElement();
            this.container.appendChild(markerCountWarningElement);
        } else if (markerCountWarningElement) {
            this.container.removeChild(markerCountWarningElement);
        }
    }
}
