import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ProfileCourseType } from 'share-lib';

export class ProfileCoursesDto {
  @IsIn(['learning', 'teaching'])
  type: ProfileCourseType = 'learning';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  cursor?: string;
}
