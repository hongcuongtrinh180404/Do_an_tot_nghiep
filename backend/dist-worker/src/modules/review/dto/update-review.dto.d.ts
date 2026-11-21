import { IUpdateReviewPayload } from 'share-lib';
export declare class UpdateReviewDto implements IUpdateReviewPayload {
    rating?: number;
    comment?: string | null;
}
