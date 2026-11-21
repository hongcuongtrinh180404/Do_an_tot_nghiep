import { PipeTransform } from '@nestjs/common';
export declare class LessonFileValidationPipe implements PipeTransform<Express.Multer.File, Express.Multer.File> {
    transform(file: Express.Multer.File): Express.Multer.File;
}
