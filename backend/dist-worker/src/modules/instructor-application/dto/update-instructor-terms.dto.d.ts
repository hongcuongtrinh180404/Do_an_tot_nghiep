export declare class TermItemDto {
    id?: string;
    title: string;
    content: string;
    isMandatory?: boolean;
    order?: number;
}
export declare class UpdateInstructorTermsDto {
    terms: TermItemDto[];
}
