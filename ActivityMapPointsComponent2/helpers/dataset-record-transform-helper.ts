import { FeatureProperty, FeatureRecord } from '../interfaces/interfaces';

export function getFeatureRecords(recordIds: string[], records: Record<string, ComponentFramework.PropertyHelper.DataSetApi.EntityRecord>): FeatureRecord[] {

    if (!recordIds?.length || !records) {
        return [];
    }
        
    return recordIds.reduce(
        (arr: FeatureRecord[], recordId) => {

        const record = records[recordId];

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

export function getRecordIds(dataset: ComponentFramework.PropertyTypes.DataSet, currentRecordIds: Set<string>): 
    { recordIds: Set<string>, newRecordIds: string[] } {
    if (!dataset || !dataset.sortedRecordIds?.length) {
        return { recordIds: currentRecordIds, newRecordIds: [] };
    }

    const newRecordIds: string[] = [];

    dataset.sortedRecordIds.forEach(recordId => {
        if (!currentRecordIds.has(recordId)) {
            newRecordIds.push(recordId);
            currentRecordIds.add(recordId);
        }
    });

    return {
        recordIds: currentRecordIds,
        newRecordIds
    }
}