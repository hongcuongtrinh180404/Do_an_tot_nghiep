import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Model, Types } from 'mongoose';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { CourseCategoryEntity } from '../schemas/course-category.schema.js';

describe('CourseCategoryRepository', () => {
  let repository: CourseCategoryRepository;
  let mockModel: any;

  beforeEach(() => {
    mockModel = {
      findOne: vi.fn(),
      find: vi.fn(),
    };
    repository = new CourseCategoryRepository(
      mockModel as unknown as Model<CourseCategoryEntity>,
    );
  });

  describe('findBySlug', () => {
    it('should query lowercase trimmed slug with deletedAt: null and map id', async () => {
      const mockDoc = {
        _id: new Types.ObjectId(),
        name: 'Lập trình',
        slug: 'lap-trinh',
        description: null,
        imageUrl: null,
        order: 0,
        isActive: true,
        deletedAt: null,
      };

      const exec = vi.fn().mockResolvedValue(mockDoc);
      const session = vi.fn().mockReturnValue({ exec });
      mockModel.findOne.mockReturnValue({ session });

      const result = await repository.findBySlug('  LAP-TRINH  ');

      expect(mockModel.findOne).toHaveBeenCalledWith({
        slug: 'lap-trinh',
        deletedAt: null,
      });
      expect(result?.id).toBe(mockDoc._id.toString());
      expect(result?.slug).toBe('lap-trinh');
    });
  });

  describe('findBySlugIncludingDeleted', () => {
    it('should find a soft-deleted category without the deletedAt filter', async () => {
      const mockDoc = {
        _id: new Types.ObjectId(),
        name: 'Lập trình',
        slug: 'lap-trinh',
        order: 0,
        isActive: true,
        deletedAt: new Date(),
      };

      const exec = vi.fn().mockResolvedValue(mockDoc);
      const session = vi.fn().mockReturnValue({ exec });
      mockModel.findOne.mockReturnValue({ session });

      const result = await repository.findBySlugIncludingDeleted('  LAP-TRINH ');

      expect(mockModel.findOne).toHaveBeenCalledWith({ slug: 'lap-trinh' });
      expect(result?.deletedAt).toBe(mockDoc.deletedAt);
    });
  });

  describe('findAllSorted', () => {
    it('should return every non-deleted category sorted by order then name', async () => {
      const docs = [
        {
          _id: new Types.ObjectId(),
          name: 'AI',
          slug: 'ai',
          order: 0,
          isActive: true,
          deletedAt: null,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Thiết kế',
          slug: 'thiet-ke',
          order: 1,
          isActive: false,
          deletedAt: null,
        },
      ];

      const exec = vi.fn().mockResolvedValue(docs);
      const session = vi.fn().mockReturnValue({ exec });
      const sort = vi.fn().mockReturnValue({ session });
      mockModel.find.mockReturnValue({ sort });

      const result = await repository.findAllSorted();

      expect(mockModel.find).toHaveBeenCalledWith({ deletedAt: null });
      expect(sort).toHaveBeenCalledWith({ order: 1, name: 1 });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(docs[0]._id.toString());
    });
  });
});
