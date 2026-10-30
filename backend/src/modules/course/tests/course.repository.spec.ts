import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Model, Types } from 'mongoose';
import { CourseStatusEnum, CourseLevelEnum } from 'share-lib';
import { CourseRepository } from '../repositories/course.repository.js';
import { CourseEntity } from '../schemas/course.schema.js';

describe('CourseRepository', () => {
  let repository: CourseRepository;
  let mockModel: any;

  beforeEach(() => {
    mockModel = {
      findOne: vi.fn(),
      find: vi.fn(),
    };
    repository = new CourseRepository(mockModel as unknown as Model<CourseEntity>);
  });

  describe('findBySlug', () => {
    it('should query findOne with lowercase trimmed slug and deletedAt: null', async () => {
      const mockCourseDoc = {
        _id: new Types.ObjectId(),
        title: 'NestJS Pro',
        slug: 'nestjs-pro',
        instructorId: new Types.ObjectId(),
        price: 100000,
        status: CourseStatusEnum.PUBLISHED,
        level: CourseLevelEnum.ADVANCED,
        deletedAt: null,
      };

      const mockExec = vi.fn().mockResolvedValue(mockCourseDoc);
      const mockSession = vi.fn().mockReturnValue({ exec: mockExec });
      const mockPopulate = vi.fn().mockReturnValue({ session: mockSession });
      mockModel.findOne.mockReturnValue({ populate: mockPopulate });

      const result = await repository.findBySlug('  NESTJS-PRO  ');

      expect(mockModel.findOne).toHaveBeenCalledWith({
        slug: 'nestjs-pro',
        deletedAt: null,
      });
      expect(result).toBeDefined();
      expect(result?.slug).toBe('nestjs-pro');
      expect(result?.instructorId).toBe(mockCourseDoc.instructorId.toString());
      expect(result?.id).toBe(mockCourseDoc._id.toString());
    });

    it('should map an unpopulated categoryId ObjectId without category details', async () => {
      const categoryObjId = new Types.ObjectId();
      const mockCourseDoc = {
        _id: new Types.ObjectId(),
        title: 'NestJS Pro',
        slug: 'nestjs-pro',
        instructorId: new Types.ObjectId(),
        categoryId: categoryObjId,
        price: 100000,
        status: CourseStatusEnum.PUBLISHED,
        level: CourseLevelEnum.ADVANCED,
        deletedAt: null,
      };

      const mockExec = vi.fn().mockResolvedValue(mockCourseDoc);
      const mockSession = vi.fn().mockReturnValue({ exec: mockExec });
      const mockPopulate = vi.fn().mockReturnValue({ session: mockSession });
      mockModel.findOne.mockReturnValue({ populate: mockPopulate });

      const result = await repository.findBySlug('nestjs-pro');

      expect(result?.categoryId).toBe(categoryObjId.toString());
      expect(result?.category).toBeNull();
    });

    it('should map a populated category document into categoryId and summary', async () => {
      const categoryObjId = new Types.ObjectId();
      const mockCourseDoc = {
        _id: new Types.ObjectId(),
        title: 'NestJS Pro',
        slug: 'nestjs-pro',
        instructorId: new Types.ObjectId(),
        categoryId: {
          _id: categoryObjId,
          name: 'Lập trình',
          slug: 'lap-trinh',
          imageUrl: 'https://cdn.example.com/category.webp',
        },
        price: 100000,
        status: CourseStatusEnum.PUBLISHED,
        level: CourseLevelEnum.ADVANCED,
        deletedAt: null,
      };

      const mockExec = vi.fn().mockResolvedValue(mockCourseDoc);
      const mockSession = vi.fn().mockReturnValue({ exec: mockExec });
      const mockPopulate = vi.fn().mockReturnValue({ session: mockSession });
      mockModel.findOne.mockReturnValue({ populate: mockPopulate });

      const result = await repository.findBySlug('nestjs-pro');

      expect(result?.categoryId).toBe(categoryObjId.toString());
      expect(result?.category).toEqual({
        id: categoryObjId.toString(),
        name: 'Lập trình',
        slug: 'lap-trinh',
        imageUrl: 'https://cdn.example.com/category.webp',
      });
    });
  });

  describe('findByInstructorId', () => {
    it('should query find with instructorId and sort by createdAt DESC', async () => {
      const instructorObjId = new Types.ObjectId();
      const mockCourseDoc = {
        _id: new Types.ObjectId(),
        title: 'NestJS Pro',
        slug: 'nestjs-pro',
        instructorId: instructorObjId,
        price: 100000,
        status: CourseStatusEnum.PUBLISHED,
        level: CourseLevelEnum.ADVANCED,
        deletedAt: null,
      };

      const mockExec = vi.fn().mockResolvedValue([mockCourseDoc]);
      const mockSession = vi.fn().mockReturnValue({ exec: mockExec });
      const mockPopulate = vi.fn().mockReturnValue({ session: mockSession });
      const mockSort = vi.fn().mockReturnValue({ populate: mockPopulate });
      mockModel.find.mockReturnValue({ sort: mockSort });

      const result = await repository.findByInstructorId(instructorObjId.toString());

      expect(mockModel.find).toHaveBeenCalledWith({
        instructorId: instructorObjId.toString(),
        deletedAt: null,
      });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toHaveLength(1);
      expect(result[0].instructorId).toBe(instructorObjId.toString());
    });
  });
});
