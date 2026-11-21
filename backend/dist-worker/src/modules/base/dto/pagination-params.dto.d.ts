import { PaginationOptions, SortOption } from './pagination-result.dto.js';
export declare class PaginationParamsDto implements PaginationOptions {
    page: number;
    limit: number;
    isPagination: boolean;
    sort?: SortOption[];
    filters?: Record<string, unknown>;
}
