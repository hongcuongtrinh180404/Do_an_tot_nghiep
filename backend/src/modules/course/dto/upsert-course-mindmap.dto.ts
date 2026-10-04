import { IsNotEmpty, IsObject } from 'class-validator';

export class UpsertCourseMindmapDto {
  @IsNotEmpty({ message: 'mindmapData không được để trống' })
  @IsObject({ message: 'mindmapData phải là một JSON object hợp lệ' })
  mindmapData: Record<string, unknown>;
}
