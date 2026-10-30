import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClsModule } from 'nestjs-cls';
import { envValidationSchema } from '../../config/env.validation.js';
import { BaseModule } from '../../modules/base/base.module.js';
import { UserModule } from '../../modules/user/user.module.js';
import {
  CourseCategoryEntity,
  CourseCategorySchema,
} from '../../modules/course/schemas/course-category.schema.js';
import { CourseCategoryRepository } from '../../modules/course/repositories/course-category.repository.js';
import { CourseCategorySeeder } from '../../modules/course/seeds/course-category.seeder.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : '.env',
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        dbName: configService.get<string>('MONGODB_DB_NAME', 'thc_datn'),
      }),
      inject: [ConfigService],
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    BaseModule,
    UserModule,
    MongooseModule.forFeature([
      { name: CourseCategoryEntity.name, schema: CourseCategorySchema },
    ]),
  ],
  providers: [CourseCategoryRepository, CourseCategorySeeder],
})
export class SeedModule {}
