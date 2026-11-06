import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Model, Types } from 'mongoose';
import { CourseStatusEnum, CourseLevelEnum } from 'share-lib';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { EnrollmentEntity } from '../schemas/enrollment.schema.js';

describe('EnrollmentRepository', () => {
  let repository: EnrollmentRepository;
  let mockModel: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockModel = {
      find: vi.fn(),
      findOne: vi.fn(),
    };
    repository = new EnrollmentRepository(mockModel as unknown as Model<EnrollmentEntity>);
  });

  describe('findUserEnrollments', () => {
    it('should map populated instructor and category properly into course', async () => {
      const enrollmentObjId = new Types.ObjectId();
      const userObjId = new Types.ObjectId();
      const courseObjId = new Types.ObjectId();
      const instructorObjId = new Types.ObjectId();
      const categoryObjId = new Types.ObjectId();

      const mockEnrollmentDoc = {
        _id: enrollmentObjId,
        userId: userObjId,
        orderId: new Types.ObjectId(),
        enrolledAt: new Date(),
        deletedAt: null,
        courseId: {
          _id: courseObjId,
          title: 'Khóa học React & Next.js Thực Chiến',
          slug: 'khoa-hoc-react-nextjs-thuc-chien',
          price: 499000,
          status: CourseStatusEnum.PUBLISHED,
          level: CourseLevelEnum.INTERMEDIATE,
          instructorId: {
            _id: instructorObjId,
            fullName: 'ThS. Nguyễn Văn Cường',
            email: 'cuong.instructor@example.com',
            avatarUrl: 'https://cdn.example.com/avatars/cuong.jpg',
          },
          categoryId: {
            _id: categoryObjId,
            name: 'Lập trình Frontend',
            slug: 'lap-trinh-frontend',
            imageUrl: 'https://cdn.example.com/categories/frontend.png',
          },
        },
      };

      const mockExec = vi.fn().mockResolvedValue([mockEnrollmentDoc]);
      const mockSession = vi.fn().mockReturnValue({ exec: mockExec });
      const mockPopulate = vi.fn().mockReturnValue({ session: mockSession });
      const mockSort = vi.fn().mockReturnValue({ populate: mockPopulate });
      mockModel.find.mockReturnValue({ sort: mockSort });

      const results = await repository.findUserEnrollments(userObjId.toString());

      expect(results).toHaveLength(1);
      const enrollment = results[0];
      expect(enrollment.id).toBe(enrollmentObjId.toString());
      expect(enrollment.userId).toBe(userObjId.toString());
      expect(enrollment.courseId).toBe(courseObjId.toString());

      // Verify course mapping
      expect(enrollment.course).toBeDefined();
      expect(enrollment.course?.id).toBe(courseObjId.toString());
      expect(enrollment.course?.title).toBe('Khóa học React & Next.js Thực Chiến');

      // Verify instructor transformation
      expect(enrollment.course?.instructorId).toBe(instructorObjId.toString());
      expect(enrollment.course?.instructor).toEqual({
        id: instructorObjId.toString(),
        fullName: 'ThS. Nguyễn Văn Cường',
        email: 'cuong.instructor@example.com',
        avatarUrl: 'https://cdn.example.com/avatars/cuong.jpg',
      });

      // Verify category transformation
      expect(enrollment.course?.categoryId).toBe(categoryObjId.toString());
      expect(enrollment.course?.category).toEqual({
        id: categoryObjId.toString(),
        name: 'Lập trình Frontend',
        slug: 'lap-trinh-frontend',
        imageUrl: 'https://cdn.example.com/categories/frontend.png',
      });
    });

    it('should handle unpopulated courseId gracefully', async () => {
      const enrollmentObjId = new Types.ObjectId();
      const userObjId = new Types.ObjectId();
      const courseObjId = new Types.ObjectId();

      const mockEnrollmentDoc = {
        _id: enrollmentObjId,
        userId: userObjId,
        courseId: courseObjId,
        orderId: null,
        enrolledAt: new Date(),
        deletedAt: null,
      };

      const mockExec = vi.fn().mockResolvedValue([mockEnrollmentDoc]);
      const mockSession = vi.fn().mockReturnValue({ exec: mockExec });
      const mockPopulate = vi.fn().mockReturnValue({ session: mockSession });
      const mockSort = vi.fn().mockReturnValue({ populate: mockPopulate });
      mockModel.find.mockReturnValue({ sort: mockSort });

      const results = await repository.findUserEnrollments(userObjId.toString());

      expect(results).toHaveLength(1);
      expect(results[0].courseId).toBe(courseObjId.toString());
      expect(results[0].course).toBeNull();
    });
  });
});

