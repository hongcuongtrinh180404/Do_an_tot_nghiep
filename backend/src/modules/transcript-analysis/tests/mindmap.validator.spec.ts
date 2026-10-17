import { describe, it, expect } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { MindmapValidator } from '../validators/mindmap.validator.js';
import { ILessonMindmapData } from 'share-lib';

describe('MindmapValidator', () => {
  const validData: ILessonMindmapData = {
    root: {
      id: 'root',
      title: 'React Server Components',
      timestamp: 0,
      children: [
        {
          id: 'node-1',
          title: 'Khái niệm RSC',
          timestamp: 15,
          children: [
            {
              id: 'node-1-1',
              title: 'Render trên Server',
              timestamp: 45,
              children: [
                {
                  id: 'node-1-1-1',
                  title: 'Zero Bundle Size',
                  timestamp: 60,
                },
              ],
            },
          ],
        },
        {
          id: 'node-2',
          title: 'Client Components',
          timestamp: 120,
        },
      ],
    },
  };

  it('should pass validation for a valid tree up to 3 levels within duration boundary', () => {
    const result = MindmapValidator.validate(validData, 300, 3);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if root is missing', () => {
    const invalid = {} as unknown as ILessonMindmapData;
    const result = MindmapValidator.validate(invalid, 300, 3);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('thiếu node gốc "root"');
  });

  it('should fail if node title is empty or missing', () => {
    const invalid: ILessonMindmapData = {
      root: {
        id: 'root',
        title: '   ',
        timestamp: 0,
      },
    };
    const result = MindmapValidator.validate(invalid, 300, 3);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('thiếu trường "title"'))).toBe(true);
  });

  it('should fail if timestamp is negative', () => {
    const invalid: ILessonMindmapData = {
      root: {
        id: 'root',
        title: 'Title',
        timestamp: -10,
      },
    };
    const result = MindmapValidator.validate(invalid, 300, 3);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('timestamp âm'))).toBe(true);
  });

  it('should fail if timestamp exceeds video duration', () => {
    const invalid: ILessonMindmapData = {
      root: {
        id: 'root',
        title: 'Title',
        timestamp: 0,
        children: [
          {
            id: 'node-1',
            title: 'Exceeding Node',
            timestamp: 500, // Duration is 300
          },
        ],
      },
    };
    const result = MindmapValidator.validate(invalid, 300, 3);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('vượt quá thời lượng video'))).toBe(true);
  });

  it('should fail if tree depth exceeds maximum allowed levels (Level 4+)', () => {
    const invalid: ILessonMindmapData = {
      root: {
        id: 'root',
        title: 'Root (L0)',
        timestamp: 0,
        children: [
          {
            id: 'n1',
            title: 'L1',
            timestamp: 10,
            children: [
              {
                id: 'n2',
                title: 'L2',
                timestamp: 20,
                children: [
                  {
                    id: 'n3',
                    title: 'L3',
                    timestamp: 30,
                    children: [
                      {
                        id: 'n4',
                        title: 'L4 - Invalid 4th level',
                        timestamp: 40,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const result = MindmapValidator.validate(invalid, 300, 3);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('vượt quá độ sâu tối đa'))).toBe(true);
  });

  it('should throw UnprocessableEntityException in validateOrFail', () => {
    const invalid = { root: { id: '', title: '', timestamp: -1 } } as ILessonMindmapData;
    expect(() => MindmapValidator.validateOrFail(invalid, 300, 3)).toThrow(
      UnprocessableEntityException,
    );
  });
});
