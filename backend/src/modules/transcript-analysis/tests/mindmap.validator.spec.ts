import { describe, it, expect } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { MindmapValidator } from '../validators/mindmap.validator.js';
import { ILessonMindmapData } from 'share-lib';

describe('MindmapValidator', () => {
  // Cây mẫu 4 level chuẩn
  const valid4LevelData: ILessonMindmapData = {
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

  // Cây mẫu 5 level chuẩn (Level 1: Root, Level 2: Chủ đề, Level 3: Ý chi tiết, Level 4: Khái niệm con, Level 5: Dữ kiện)
  const valid5LevelData: ILessonMindmapData = {
    root: {
      id: 'root',
      title: 'Trận Bạch Đằng năm 938',
      timestamp: 0,
      children: [
        {
          id: 'node-1',
          title: 'Chuẩn bị của Ngô Quyền',
          timestamp: 20,
          children: [
            {
              id: 'node-1-1',
              title: 'Nghiên cứu địa hình sông Bạch Đằng',
              timestamp: 50,
              children: [
                {
                  id: 'node-1-1-1',
                  title: 'Đặc điểm sông Bạch Đằng',
                  timestamp: 90,
                  children: [
                    {
                      id: 'node-1-1-1-1',
                      title: 'Dài hơn 20 km, giữa Quảng Ninh và Hải Phòng',
                      timestamp: 110,
                    },
                    {
                      id: 'node-1-1-1-2',
                      title: 'Cửa biển thuận lợi nhất từ biển Đông vào nước ta',
                      timestamp: 130,
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

  it('should pass validation for a valid tree up to 4 levels with maxDepth = 3', () => {
    const result = MindmapValidator.validate(valid4LevelData, 300, 3);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass validation for a valid tree up to 5 levels with default maxDepth = 4', () => {
    const result = MindmapValidator.validate(valid5LevelData, 300);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if root is missing', () => {
    const invalid = {} as unknown as ILessonMindmapData;
    const result = MindmapValidator.validate(invalid, 300, 4);
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
    const result = MindmapValidator.validate(invalid, 300, 4);
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
    const result = MindmapValidator.validate(invalid, 300, 4);
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
    const result = MindmapValidator.validate(invalid, 300, 4);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('vượt quá thời lượng video'))).toBe(true);
  });

  it('should fail if tree depth exceeds maximum allowed levels (Level 6 with maxDepth = 4)', () => {
    const invalid: ILessonMindmapData = {
      root: {
        id: 'root',
        title: 'Root (L1)',
        timestamp: 0,
        children: [
          {
            id: 'n1',
            title: 'L2',
            timestamp: 10,
            children: [
              {
                id: 'n2',
                title: 'L3',
                timestamp: 20,
                children: [
                  {
                    id: 'n3',
                    title: 'L4',
                    timestamp: 30,
                    children: [
                      {
                        id: 'n4',
                        title: 'L5',
                        timestamp: 40,
                        children: [
                          {
                            id: 'n5',
                            title: 'L6 - Invalid 6th level',
                            timestamp: 50,
                          },
                        ],
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
    const result = MindmapValidator.validate(invalid, 300, 4);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('vượt quá độ sâu tối đa'))).toBe(true);
  });

  it('should throw UnprocessableEntityException in validateOrFail when tree is invalid', () => {
    const invalid = { root: { id: '', title: '', timestamp: -1 } } as ILessonMindmapData;
    expect(() => MindmapValidator.validateOrFail(invalid, 300, 4)).toThrow(
      UnprocessableEntityException,
    );
  });

  describe('MindmapValidator.sanitize (Auto-Sanitizer & Pruning)', () => {
    it('should defensively prune excess branches beyond maxDepth = 4 so that Level 5 nodes never have children', () => {
      // Cây 7 level sâu vượt trần
      const deepTree = {
        root: {
          id: 'root',
          title: 'Bài học Lịch sử',
          timestamp: 0,
          children: [
            {
              id: 'c1',
              title: 'Cấp 2',
              timestamp: 10,
              children: [
                {
                  id: 'c2',
                  title: 'Cấp 3',
                  timestamp: 20,
                  children: [
                    {
                      id: 'c3',
                      title: 'Cấp 4',
                      timestamp: 30,
                      children: [
                        {
                          id: 'c4',
                          title: 'Cấp 5 (Level tối đa)',
                          timestamp: 40,
                          children: [
                            {
                              id: 'c5',
                              title: 'Cấp 6 (Vượt trần)',
                              timestamp: 50,
                              children: [
                                {
                                  id: 'c6',
                                  title: 'Cấp 7 (Vượt trần)',
                                  timestamp: 60,
                                },
                              ],
                            },
                          ],
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

      const sanitized = MindmapValidator.sanitize(deepTree, 300, 4);

      // Node cấp 5 (c4) phải không còn trường children
      const level5Node = sanitized.root.children![0].children![0].children![0].children![0];
      expect(level5Node.id).toBe('c4');
      expect(level5Node.children).toBeUndefined();

      // Sau khi sanitize, cây phải pass validateOrFail 100%
      expect(() => MindmapValidator.validateOrFail(sanitized, 300, 4)).not.toThrow();
    });

    it('should normalize envelope variations such as { mindmap: { root: ... } } and { data: { root: ... } }', () => {
      const wrappedMindmap = {
        mindmap: {
          root: {
            id: 'r1',
            title: 'Envelope Mindmap',
            timestamp: 0,
            children: [{ id: 'sub', title: 'Sub branch', timestamp: 15 }],
          },
        },
      };

      const sanitized = MindmapValidator.sanitize(wrappedMindmap, 300, 4);
      expect(sanitized.root).toBeDefined();
      expect(sanitized.root.id).toBe('root');
      expect(sanitized.root.title).toBe('Envelope Mindmap');
      expect(sanitized.root.children?.[0].title).toBe('Sub branch');
    });

    it('should fix missing IDs, empty titles, negative timestamps, and clamp exceeding timestamps', () => {
      const malformedData = {
        root: {
          id: '',
          title: '   ',
          timestamp: -15,
          children: [
            {
              id: '   ',
              title: '',
              timestamp: 9999, // Exceeds duration 300s
            },
          ],
        },
      };

      const sanitized = MindmapValidator.sanitize(malformedData, 300, 4, 'Tiêu đề dự phòng');

      expect(sanitized.root.id).toBe('root');
      expect(sanitized.root.title).toBe('Tiêu đề dự phòng');
      expect(sanitized.root.timestamp).toBe(0);

      const child = sanitized.root.children![0];
      expect(child.id).toBe('node-1-0');
      expect(child.title).toBe('Nội dung cấp 2');
      expect(child.timestamp).toBe(300); // Clamped to max duration 300

      // Đảm bảo sau sanitize dữ liệu luôn hợp lệ
      expect(() => MindmapValidator.validateOrFail(sanitized, 300, 4)).not.toThrow();
    });

    it('should resolve the real-world Bạch Đằng lesson failure where Level 5 nodes were previously rejected under maxDepth = 3', () => {
      // Dữ liệu mô phỏng bài học Bạch Đằng với các node tại Level 4 có con ở Level 5
      const bachDangData = {
        root: {
          id: 'root',
          title: 'Trận Bạch Đằng năm 938',
          timestamp: 0,
          children: [
            {
              id: 'n-cd1',
              title: 'Chuẩn bị kế sách',
              timestamp: 30,
              children: [
                {
                  id: 'n-cd1-1',
                  title: 'Bố phòng & Nghiên cứu địa hình',
                  timestamp: 60,
                  children: [
                    {
                      id: 'n-cd1-1-1',
                      title: 'Đặc điểm sông Bạch Đằng',
                      timestamp: 90,
                      children: [
                        {
                          id: 'n-bd-1',
                          title: 'Dài hơn 20 km, giữa Quảng Ninh và Hải Phòng',
                          timestamp: 100,
                        },
                        {
                          id: 'n-bd-2',
                          title: 'Giao nhau của sông Giá, sông Chanh, sông Đá Bạc',
                          timestamp: 110,
                        },
                      ],
                    },
                    {
                      id: 'n-cd1-1-2',
                      title: 'Địa hình hai bên: rừng cây, núi đá vôi, kênh rạch',
                      timestamp: 120,
                      children: [
                        {
                          id: 'n-dh-1',
                          title: 'Thích hợp để mai phục',
                          timestamp: 130,
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

      // Dưới cấu hình cũ (maxDepth = 3), dữ liệu này từng bị ném lỗi
      const oldCheck = MindmapValidator.validate(bachDangData as ILessonMindmapData, 600, 3);
      expect(oldCheck.isValid).toBe(false);
      expect(oldCheck.errors.length).toBeGreaterThan(0);

      // Dưới cấu hình mới (maxDepth = 4) kèm sanitize, dữ liệu được chấp nhận hoàn hảo
      const sanitized = MindmapValidator.sanitize(bachDangData, 600, 4, 'Trận Bạch Đằng năm 938');
      const newCheck = MindmapValidator.validate(sanitized, 600, 4);
      expect(newCheck.isValid).toBe(true);
      expect(newCheck.errors).toHaveLength(0);
      expect(() => MindmapValidator.validateOrFail(sanitized, 600, 4)).not.toThrow();
    });
  });
});
