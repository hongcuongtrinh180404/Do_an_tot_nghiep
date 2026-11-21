export interface CourseCategorySeedItem {
    name: string;
    slug: string;
    description?: string;
    order: number;
    isActive: boolean;
    imageUrl?: string | null;
}
export declare const COURSE_CATEGORY_SEED_DATA: CourseCategorySeedItem[];
