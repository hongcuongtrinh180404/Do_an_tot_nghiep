import { Module } from '@nestjs/common';
import { GeminiKeyManager } from './gemini-key.manager.js';
import { GeminiService } from './gemini.service.js';

@Module({
  providers: [GeminiKeyManager, GeminiService],
  exports: [GeminiKeyManager, GeminiService],
})
export class GeminiModule {}
