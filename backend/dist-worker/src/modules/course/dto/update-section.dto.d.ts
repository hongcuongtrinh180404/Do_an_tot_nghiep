import { IUpdateSectionPayload } from 'share-lib';
export declare class UpdateSectionDto implements IUpdateSectionPayload {
    title?: string;
    description?: string | null;
    order?: number;
}
