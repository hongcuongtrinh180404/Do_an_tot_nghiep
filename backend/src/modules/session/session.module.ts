import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionEntity, SessionSchema } from './schemas/session.schema.js';
import { SessionRepository } from './repositories/session.repository.js';
import { SessionService } from './services/session.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SessionEntity.name, schema: SessionSchema },
    ]),
  ],
  providers: [SessionRepository, SessionService],
  exports: [SessionRepository, SessionService],
})
export class SessionModule {}
