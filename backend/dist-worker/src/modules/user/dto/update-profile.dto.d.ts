export declare class UpdateSocialLinksDto {
    facebook?: string;
    youtube?: string;
    linkedin?: string;
    github?: string;
}
export declare class UpdateProfileDto {
    fullName?: string;
    bio?: string;
    firstName?: string;
    lastName?: string;
    socialLinks?: UpdateSocialLinksDto;
}
