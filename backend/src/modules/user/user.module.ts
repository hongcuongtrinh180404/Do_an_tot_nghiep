import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserSchema } from './schemas/user.schema.js';
import { UserRepository } from './repositories/user.repository.js';
import { UserService } from './services/user.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { UserController } from './user.controller.js';
import { UserSeeder } from './seeds/user.seeder.js';

@Module({
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
export class UserModule {}

