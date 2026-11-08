import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateOrderDto {
  @IsNotEmpty({ message: 'courseId không được để trống' })
  @IsMongoId({ message: 'courseId không đúng định dạng ObjectId' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  courseId: string;
}

