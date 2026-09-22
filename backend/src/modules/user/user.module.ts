import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserSchema } from './schemas/user.schema.js';
import { UserRepository } from './repositories/user.repository.js';
import { UserService } from './services/user.service.js';
import { CloudinaryService } from './services/cloudinary.service.js';
import { UserController } from './user.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserRepository, UserService, CloudinaryService],
  exports: [UserRepository, UserService, CloudinaryService],
})
export class UserModule {}

