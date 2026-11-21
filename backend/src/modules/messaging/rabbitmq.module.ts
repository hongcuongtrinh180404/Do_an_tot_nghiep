import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMqService } from './rabbitmq.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RabbitMqService],
  exports: [RabbitMqService],
})
export class RabbitMqModule {}
