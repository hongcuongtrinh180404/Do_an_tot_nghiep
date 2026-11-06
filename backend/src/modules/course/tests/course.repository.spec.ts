import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Model, Types } from 'mongoose';
import { CourseStatusEnum, CourseLevelEnum, type ICourse } from 'share-lib';
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
      const mockPopulate = vi.fn(); mockPopulate.mockReturnValue({ populate: mockPopulate, session: mockSession, exec: mockExec });
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
      const mockPopulate = vi.fn(); mockPopulate.mockReturnValue({ populate: mockPopulate, session: mockSession, exec: mockExec });
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
      const mockPopulate = vi.fn(); mockPopulate.mockReturnValue({ populate: mockPopulate, session: mockSession, exec: mockExec });
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

    it('should query find with instructorId in filterQuery when instructorId is provided', async () => {
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
      const mockPopulate = vi.fn();
      mockPopulate.mockReturnValue({ populate: mockPopulate, session: mockSession, exec: mockExec });
      const mockLimit = vi.fn().mockReturnValue({ populate: mockPopulate });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      mockModel.find.mockReturnValue({ sort: mockSort });
      mockModel.countDocuments = vi.fn().mockReturnValue({ session: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(1) }) });

      const result = await repository.findPublicCoursesWithPagination({ instructorId: instructorObjId.toString(), page: 1, limit: 10 });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CourseStatusEnum.PUBLISHED,
          deletedAt: null,
          instructorId: instructorObjId,
        }),
      );
      expect(result.items).toHaveLength(1);
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
      const mockPopulate = vi.fn(); mockPopulate.mockReturnValue({ populate: mockPopulate, session: mockSession, exec: mockExec });
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

  it('atomically submits only the checked, non-deleted draft and records the requesting actor', async () => {
    const course = {
      id: new Types.ObjectId().toString(), updatedAt: '2026-10-31T00:00:00.000Z',
    } as ICourse;
    const userId = new Types.ObjectId().toString();
    const exec = vi.fn().mockResolvedValue(null);
    const createChain = () => { const c = { populate: vi.fn(), exec }; c.populate.mockReturnValue(c); return c; }; mockModel.findOneAndUpdate = vi.fn().mockReturnValue(createChain());

    expect(await repository.requestApproval(course, userId)).toBeNull();
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: course.id, deletedAt: null, status: CourseStatusEnum.DRAFT, updatedAt: new Date(course.updatedAt) },
      { $set: {
        status: CourseStatusEnum.PENDING_APPROVAL, approvalRequestedAt: expect.any(Date),
        approvalRequestedById: userId, updatedById: userId, rejectionReason: null,
      } },
      { new: true, runValidators: true },
    );
  });
});
