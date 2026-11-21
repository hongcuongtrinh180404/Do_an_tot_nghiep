import { PipeTransform } from '@nestjs/common';
export declare class CourseTrailerValidationPipe implements PipeTransform<Express.Multer.File, Express.Multer.File> {
    transform(file: Express.Multer.File): Express.Multer.File;
}
