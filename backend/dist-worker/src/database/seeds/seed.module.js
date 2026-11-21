var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClsModule } from 'nestjs-cls';
import { envValidationSchema } from '../../config/env.validation.js';
import { BaseModule } from '../../modules/base/base.module.js';
import { UserModule } from '../../modules/user/user.module.js';
import { CourseCategoryEntity, CourseCategorySchema, } from '../../modules/course/schemas/course-category.schema.js';
import { CourseCategoryRepository } from '../../modules/course/repositories/course-category.repository.js';
import { CourseCategorySeeder } from '../../modules/course/seeds/course-category.seeder.js';
let SeedModule = class SeedModule {
};
SeedModule = __decorate([
    Module({
        imports: [
            ConfigModule.forRoot({
                envFilePath: process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : '.env',
                isGlobal: true,
                validationSchema: envValidationSchema,
            }),
            MongooseModule.forRootAsync({
                imports: [ConfigModule],
                useFactory: (configService) => ({
                    uri: configService.get('MONGODB_URI'),
                    dbName: configService.get('MONGODB_DB_NAME', 'thc_datn'),
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
], SeedModule);
export { SeedModule };
//# sourceMappingURL=seed.module.js.map