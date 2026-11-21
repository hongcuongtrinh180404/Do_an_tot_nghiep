var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserSchema } from './schemas/user.schema.js';
import { UserRepository } from './repositories/user.repository.js';
import { UserService } from './services/user.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { UserController } from './user.controller.js';
import { UserSeeder } from './seeds/user.seeder.js';
let UserModule = class UserModule {
};
UserModule = __decorate([
    Module({
        imports: [
            MongooseModule.forFeature([
                { name: UserEntity.name, schema: UserSchema },
            ]),
            StorageModule,
        ],
        controllers: [UserController],
        providers: [UserRepository, UserService, UserSeeder],
        exports: [UserRepository, UserService, UserSeeder],
    })
], UserModule);
export { UserModule };
//# sourceMappingURL=user.module.js.map