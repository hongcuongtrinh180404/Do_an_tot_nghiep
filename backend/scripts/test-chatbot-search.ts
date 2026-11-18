import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import mongoose, { type Connection, Types } from 'mongoose';
import { CourseStatusEnum } from 'share-lib';
import { ChatbotModule } from '../src/modules/chatbot/chatbot.module.js';
import { ChatbotAiClient } from '../src/modules/chatbot/chatbot-ai.client.js';
import { ChatbotAiError } from '../src/modules/chatbot/chatbot.errors.js';
import { parseChatbotConfig } from '../src/modules/chatbot/chatbot.config.js';
import { ChatbotSearchService } from '../src/modules/chatbot/services/chatbot-search.service.js';
import { parseSearchCoursesArguments } from '../src/modules/chatbot/tools/search-courses.contract.js';
import { SearchCoursesTool } from '../src/modules/chatbot/tools/search-courses.tool.js';
import { PublicCourseSearchService } from '../src/modules/course/services/public-course-search.service.js';
import { PublicCourseSearchRepository } from '../src/modules/course/repositories/public-course-search.repository.js';
import {
  CourseEntity,
  CourseSchema,
} from '../src/modules/course/schemas/course.schema.js';
import {
  CourseCategoryEntity,
  CourseCategorySchema,
} from '../src/modules/course/schemas/course-category.schema.js';

@Module({ imports: [ChatbotModule] })
class SearchSmokeModule {}

let stage = 'configuration';

async function main(): Promise<void> {
  const envFile = new URL('../.env', import.meta.url);
  if (existsSync(envFile)) loadEnvFile(envFile);
  if (!parseChatbotConfig(process.env).enabled)
    throw new ChatbotAiError('CHATBOT_DISABLED');
  const uri = process.env.MONGODB_URI;
  assert.ok(uri);
  const app = await NestFactory.createApplicationContext(SearchSmokeModule, {
    logger: false,
    abortOnError: false,
  });
  let connection: Connection | undefined;
  try {
    stage = 'read_only_connection';
    connection = await mongoose
      .createConnection(uri, {
        dbName: process.env.MONGODB_DB_NAME,
        autoCreate: false,
        autoIndex: false,
        serverSelectionTimeoutMS: 5000,
      })
      .asPromise();
    // No AppModule, schema initialization/index writes, seed data, transactions or mutations.
    const courses = connection.model(CourseEntity.name, CourseSchema);
    const categories = connection.model(
      CourseCategoryEntity.name,
      CourseCategorySchema,
    );
    const search = new ChatbotSearchService(
      app.get(ChatbotAiClient),
      new SearchCoursesTool(
        new PublicCourseSearchService(
          new PublicCourseSearchRepository(courses, categories),
        ),
      ),
    );
    const absentKeyword = `zz_${randomUUID()}`;
    const cases: Array<{
      label: string;
      question: string;
      filters: Record<string, unknown>;
    }> = [
      {
        label: 'react',
        question: 'Có khóa học React không?',
        filters: { keyword: 'React' },
      },
      {
        label: 'under_500k',
        question: 'Khóa học nào dưới 500k?',
        filters: { maxPrice: 500000, maxPriceExclusive: true },
      },
      {
        label: 'python_beginner',
        question: 'Tìm khóa Python cho người mới',
        filters: { keyword: 'Python', level: 'beginner' },
      },
      {
        label: 'free',
        question: 'Có khóa học miễn phí không?',
        filters: { isFree: true },
      },
      {
        label: 'design_price_range',
        question: 'Có khóa học thiết kế nào từ 200k đến 500k?',
        filters: { keyword: 'thiết kế', minPrice: 200000, maxPrice: 500000 },
      },
      {
        label: 'empty',
        question: `Tìm khóa học với từ khóa chính xác "${absentKeyword}"`,
        filters: { keyword: absentKeyword },
      },
    ];
    // Keep the default run to the five acceptance questions. Run the empty-result
    // probe separately when the provider's request-rate allowance permits it.
    const args = process.argv.slice(2);
    assert.ok(args.length <= 1);
    const selectedCase = args[0]?.startsWith('--case=')
      ? args[0].slice(7)
      : undefined;
    assert.ok(
      args.length === 0 ||
        cases.some((testCase) => testCase.label === selectedCase),
    );
    const selected = selectedCase
      ? cases.filter((testCase) => testCase.label === selectedCase)
      : cases.filter((testCase) => testCase.label !== 'empty');
    const results: Array<{
      case: string;
      status: string;
      total: number;
      displayed: number;
    }> = [];
    for (const testCase of selected) {
      stage = testCase.label;
      const reply = await search.search(testCase.question);
      const actual = reply.result;
      assert.ok(actual);
      assert.deepEqual(
        actual.filtersApplied,
        parseSearchCoursesArguments(JSON.stringify(testCase.filters)),
      );
      const filters = actual.filtersApplied;
      for (const item of actual.items) {
        const doc = await courses
          .findOne({
            _id: new Types.ObjectId(item.id),
            status: CourseStatusEnum.PUBLISHED,
            deletedAt: null,
          })
          .select('title price level categoryId')
          .lean()
          .exec();
        assert.ok(doc);
        assert.equal(item.title, doc.title);
        assert.equal(item.price, doc.price);
        assert.equal(item.level, doc.level);
        assert.equal(item.url, `/courses/${item.id}`);
        if (filters.level) assert.equal(doc.level, filters.level);
        if (filters.minPrice !== undefined)
          assert.ok(doc.price >= filters.minPrice);
        if (filters.maxPrice !== undefined)
          assert.ok(
            filters.maxPriceExclusive
              ? doc.price < filters.maxPrice
              : doc.price <= filters.maxPrice,
          );
        if (filters.isFree !== undefined)
          assert.equal(doc.price === 0, filters.isFree);
        if (
          filters.keyword &&
          !doc.title.toLowerCase().includes(filters.keyword.toLowerCase())
        ) {
          const category = await categories
            .findOne({ _id: doc.categoryId, isActive: true, deletedAt: null })
            .lean()
            .exec();
          assert.ok(
            category?.name
              .toLowerCase()
              .includes(filters.keyword.toLowerCase()),
          );
        }
      }
      if (testCase.label === 'empty') {
        assert.equal(reply.status, 'empty');
        assert.equal(actual.total, 0);
        assert.equal(
          reply.answer,
          'Hiện chưa tìm thấy khóa học công khai phù hợp với các điều kiện bạn yêu cầu.',
        );
      }
      results.push({
        case: testCase.label,
        status: reply.status,
        total: actual.total,
        displayed: actual.items.length,
      });
      console.log(
        JSON.stringify({ ...results.at(-1), verification: 'passed' }),
      );
    }
    console.log(
      JSON.stringify(
        {
          status: 'passed',
          providerRequests: selected.length,
          databaseAccess: 'read-only',
          cases: results,
        },
        null,
        2,
      ),
    );
  } finally {
    await connection?.close();
    await app.close();
  }
}

await main().catch((error: unknown) => {
  // No provider bodies, query contents, assertion diffs or secrets.
  console.error(
    JSON.stringify({
      status: 'failed',
      stage,
      code:
        error instanceof ChatbotAiError
          ? error.code
          : 'CHATBOT_SEARCH_SMOKE_FAILED',
    }),
  );
  process.exitCode = 1;
});
