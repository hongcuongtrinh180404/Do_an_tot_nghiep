import { Module } from '@nestjs/common';
import { GeminiKeyManager } from './gemini-key.manager.js';
import { RiverKeyManager } from './river-key.manager.js';
import { GeminiService } from './gemini.service.js';

@Module({
  providers: [GeminiKeyManager, RiverKeyManager, GeminiService],
  exports: [GeminiKeyManager, RiverKeyManager, GeminiService],
})
export class GeminiModule {}
