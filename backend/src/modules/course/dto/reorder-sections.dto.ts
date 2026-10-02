import { IsArray, ArrayMinSize, IsMongoId } from 'class-validator';

export class ReorderSectionsDto {
  @IsArray({ message: 'Danh sách ID chương học phải là một mảng' })
  @ArrayMinSize(1, { message: 'Danh sách ID chương học không được để trống' })
  @IsMongoId({ each: true, message: 'Mỗi ID chương học phải là ObjectId hợp lệ' })
  sectionIds: string[];
}
