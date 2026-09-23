import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import {
  ICourse,
  IUser,
  RoleEnum,
  UserStatusEnum,
  CourseStatusEnum,
  CourseLevelEnum,
} from 'share-lib';
import { BaseService } from '../../base/index.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';

export interface CreateCourseInput {
  title: string;
  slug: string;
  instructorId: string;
  description?: string | null;
  shortDescription?: string | null;
  thumbnailUrl?: string | null;
  price?: number;
  status?: CourseStatusEnum;
  level?: CourseLevelEnum;
}

@Injectable()
export class CourseService extends BaseService<ICourse, string> {
  constructor(
    protected readonly courseRepository: CourseRepository,
    protected readonly userRepository: UserRepository,
    cls: ClsService,
  ) {
    super(courseRepository, cls, CourseService.name);
  }

  async validateInstructor(instructorId: string, session?: ClientSession): Promise<IUser> {
    const instructor = await this.userRepository.findById(instructorId, session);

    if (!instructor || instructor.deletedAt) {
      throw new NotFoundException(`Instructor with ID '${instructorId}' not found`);
    }

    if (instructor.status !== UserStatusEnum.ACTIVE) {
      throw new BadRequestException(
        `Instructor account is not active (current status: ${instructor.status})`,
      );
    }

    const authorizedRoles = [RoleEnum.INSTRUCTOR, RoleEnum.ADMIN];
    if (!authorizedRoles.includes(instructor.role)) {
      throw new ForbiddenException(
        `User with ID '${instructorId}' is not authorized to create courses (role: ${instructor.role})`,
      );
    }

    return instructor;
  }

  async ensureSlugNotTaken(slug: string, session?: ClientSession): Promise<void> {
    const normalizedSlug = slug.toLowerCase().trim();
    const existing = await this.courseRepository.findBySlug(normalizedSlug, session);
    if (existing) {
      throw new ConflictException(`Course with slug '${normalizedSlug}' already exists`);
    }
  }

  async findBySlug(slug: string, session?: ClientSession): Promise<ICourse | null> {
    return this.courseRepository.findBySlug(slug, session);
  }

  async findByInstructorId(instructorId: string, session?: ClientSession): Promise<ICourse[]> {
    return this.courseRepository.findByInstructorId(instructorId, session);
  }

  async createCourse(input: CreateCourseInput, session?: ClientSession): Promise<ICourse> {
    const normalizedSlug = input.slug.toLowerCase().trim();

    // 1. Validate instructor status and permissions
    await this.validateInstructor(input.instructorId, session);

    // 2. Validate price constraint (price >= 0)
    if (input.price !== undefined && input.price < 0) {
      throw new BadRequestException('Course price must be greater than or equal to 0');
    }

    // 3. Ensure slug uniqueness among active courses
    await this.ensureSlugNotTaken(normalizedSlug, session);

    // 4. Create course using BaseService (inherits audit context from cls)
    return this.create(
      {
        title: input.title.trim(),
        slug: normalizedSlug,
        instructorId: input.instructorId,
        description: input.description ?? null,
        shortDescription: input.shortDescription ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        price: input.price ?? 0,
        status: input.status ?? CourseStatusEnum.DRAFT,
        level: input.level ?? CourseLevelEnum.ALL_LEVELS,
      } as unknown as Partial<ICourse>,
      session,
    );
  }
}
