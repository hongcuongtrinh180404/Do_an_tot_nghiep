import { ICreateReviewPayload } from 'share-lib';
export declare class CreateReviewDto implements ICreateReviewPayload {
    rating: number;
    comment?: string | null;
}
