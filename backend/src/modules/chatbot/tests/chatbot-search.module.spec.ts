import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { CourseEntity } from '../../course/schemas/course.schema.js';
import { CourseCategoryEntity } from '../../course/schemas/course-category.schema.js';
import { ChatbotAiClient } from '../chatbot-ai.client.js';
import { ChatbotSearchModule } from '../chatbot-search.module.js';
import { ChatbotSearchService } from '../services/chatbot-search.service.js';
import { SearchCoursesTool } from '../tools/search-courses.tool.js';

describe('ChatbotSearchModule', () => {
  it('wires the isolated AI client and read-only search without AppModule or business dependencies', async () => {
    const courseModel = { find: vi.fn(), countDocuments: vi.fn() };
    const categoryModel = { find: vi.fn() };
    const module = await Test.createTestingModule({
      imports: [ChatbotSearchModule],
    })
      .overrideProvider(ConfigService)
      .useValue({ get: () => undefined })
      .overrideProvider(getModelToken(CourseEntity.name))
      .useValue(courseModel)
      .overrideProvider(getModelToken(CourseCategoryEntity.name))
      .useValue(categoryModel)
      .compile();
    try {
      await module.init();
      expect(module.get(ChatbotAiClient)).toBeInstanceOf(ChatbotAiClient);
      expect(module.get(SearchCoursesTool)).toBeInstanceOf(SearchCoursesTool);
      expect(module.get(ChatbotSearchService)).toBeInstanceOf(
        ChatbotSearchService,
      );
      expect(courseModel.find).not.toHaveBeenCalled();
      expect(categoryModel.find).not.toHaveBeenCalled();
    } finally {
      await module.close();
    }
  });
});
