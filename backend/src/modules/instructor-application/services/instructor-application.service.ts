import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Types } from 'mongoose';
import {
  IInstructorApplication,
  IInstructorTerm,
  InstructorApplicationStatusEnum,
  RoleEnum,
  type IAdminInstructorApplicationsStats,
} from 'share-lib';
import { BaseService, PaginationResult } from '../../base/index.js';
import { InstructorApplicationRepository } from '../repositories/instructor-application.repository.js';
import { InstructorTermRepository } from '../repositories/instructor-term.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { QueryInstructorApplicationsDto } from '../dto/query-instructor-applications.dto.js';
import { UpdateInstructorTermsDto } from '../dto/update-instructor-terms.dto.js';
import { ApplyInstructorApplicationDto } from '../dto/apply-instructor-application.dto.js';

export const DEFAULT_INSTRUCTOR_TERMS = [
  {
    title: 'Quyền sở hữu trí tuệ & Bản quyền nội dung',
    content:
      'Giảng viên cam kết sở hữu bản quyền hoặc có quyền hợp pháp đối với toàn bộ nội dung, bài giảng video, sơ đồ tư duy và tài liệu được phát hành trên nền tảng Mindly.',
    isMandatory: true,
    order: 1,
  },
  {
    title: 'Tiêu chuẩn chất lượng sư phạm',
    content:
      'Giảng viên đồng ý tuân thủ tiêu chuẩn chất lượng sư phạm của Mindly và phối hợp cùng ban quản trị trong quá trình xét duyệt, hoàn thiện học liệu.',
    isMandatory: true,
    order: 2,
  },
  {
    title: 'Bảo mật hồ sơ & Minh bạch doanh thu',
    content:
      'Mindly cam kết bảo mật hồ sơ chuyên môn của ứng viên và thực hiện chính sách đối soát, chi trả doanh thu minh bạch theo thỏa thuận hợp tác giảng dạy.',
    isMandatory: true,
    order: 3,
  },
];

@Injectable()
export class InstructorApplicationService
  extends BaseService<IInstructorApplication, string>
  implements OnModuleInit {
  constructor(
    private readonly applicationRepository: InstructorApplicationRepository,
    private readonly termRepository: InstructorTermRepository,
    private readonly userRepository: UserRepository,
    cls: ClsService,
  ) {
    super(applicationRepository, cls, 'InstructorApplicationService');
  }

  async onModuleInit(): Promise<void> {
    await this.seedInitialDataIfEmpty();
  }

  async getApplications(
    queryDto: QueryInstructorApplicationsDto,
  ): Promise<PaginationResult<IInstructorApplication>> {
    return this.applicationRepository.findApplicationsWithFilter(queryDto);
  }

  async getPendingCount(): Promise<{ pendingCount: number }> {
    const pendingCount = await this.applicationRepository.countPending();
    return { pendingCount };
  }

  async getStats(): Promise<IAdminInstructorApplicationsStats> {
    return this.applicationRepository.getStats();
  }

  async getApplicationDetail(id: string): Promise<IInstructorApplication> {
    const application = await this.applicationRepository.findById(id);
    if (!application) {
      throw new NotFoundException(`Không tìm thấy hồ sơ đăng ký giảng viên với id: ${id}`);
    }
    return application;
  }

  async approveApplication(
    id: string,
    adminId: string,
    adminName: string,
  ): Promise<IInstructorApplication> {
    const application = await this.applicationRepository.findById(id);
    if (!application) {
      throw new NotFoundException(`Không tìm thấy hồ sơ đăng ký với id: ${id}`);
    }

    if (application.status === InstructorApplicationStatusEnum.APPROVED) {
      throw new BadRequestException('Hồ sơ này đã được phê duyệt trước đó');
    }

    const reviewedById = Types.ObjectId.isValid(adminId) ? new Types.ObjectId(adminId) : null;
    const now = new Date();

    const historyItem = {
      action: 'APPROVED',
      actorId: reviewedById || new Types.ObjectId(),
      actorName: adminName,
      actorRole: RoleEnum.ADMIN,
      comment: 'Hồ sơ đã được phê duyệt và cấp quyền Giảng viên',
      timestamp: now,
    };

    // 1. Cập nhật hồ sơ ứng viên kèm lịch sử
    const updatedApplication = await this.applicationRepository.updateStatus(
      id,
      InstructorApplicationStatusEnum.APPROVED,
      {
        reviewedById,
        reviewedByName: adminName,
        reviewedAt: now,
        rejectionReason: null,
      },
      historyItem,
    );

    if (!updatedApplication) {
      throw new NotFoundException('Cập nhật trạng thái phê duyệt thất bại');
    }

    // 2. Nâng quyền của người dùng lên INSTRUCTOR
    if (application.userId && Types.ObjectId.isValid(application.userId)) {
      await this.userRepository.update(application.userId, {
        role: RoleEnum.INSTRUCTOR,
      });
      this.logger.log(
        `[${this.getCorrelationId()}] Nâng quyền thành INSTRUCTOR cho user ${application.userId} bởi admin ${adminName}`,
      );
    }

    return updatedApplication;
  }

  async rejectApplication(
    id: string,
    adminId: string,
    adminName: string,
    rejectionReason: string,
  ): Promise<IInstructorApplication> {
    const trimmedReason = rejectionReason?.trim();
    if (!trimmedReason || trimmedReason.length < 10) {
      throw new BadRequestException('Lý do từ chối phải có ít nhất 10 ký tự');
    }

    const application = await this.applicationRepository.findById(id);
    if (!application) {
      throw new NotFoundException(`Không tìm thấy hồ sơ đăng ký với id: ${id}`);
    }

    if (application.status === InstructorApplicationStatusEnum.REJECTED) {
      throw new BadRequestException('Hồ sơ này đã bị từ chối trước đó');
    }

    const reviewedById = Types.ObjectId.isValid(adminId) ? new Types.ObjectId(adminId) : null;
    const now = new Date();

    const historyItem = {
      action: 'REJECTED',
      actorId: reviewedById || new Types.ObjectId(),
      actorName: adminName,
      actorRole: RoleEnum.ADMIN,
      comment: trimmedReason,
      timestamp: now,
    };

    const updatedApplication = await this.applicationRepository.updateStatus(
      id,
      InstructorApplicationStatusEnum.REJECTED,
      {
        reviewedById,
        reviewedByName: adminName,
        rejectionReason: trimmedReason,
        reviewedAt: now,
      },
      historyItem,
    );

    if (!updatedApplication) {
      throw new NotFoundException('Cập nhật trạng thái từ chối thất bại');
    }

    this.logger.log(
      `[${this.getCorrelationId()}] Từ chối hồ sơ ${id} bởi admin ${adminName}. Lý do: ${trimmedReason}`,
    );

    return updatedApplication;
  }

  async applyOrResubmitApplication(
    userId: string,
    userEmail: string,
    userName: string,
    dto: ApplyInstructorApplicationDto,
  ): Promise<IInstructorApplication> {
    const existing = await this.applicationRepository.findByUserId(userId);
    const now = new Date();
    const userObjectId = new Types.ObjectId(userId);

    if (existing) {
      if (existing.status === InstructorApplicationStatusEnum.PENDING) {
        throw new BadRequestException('Bạn đã có một hồ sơ đăng ký đang chờ xét duyệt');
      }

      if (existing.status === InstructorApplicationStatusEnum.APPROVED) {
        throw new BadRequestException('Tài khoản của bạn đã được phê duyệt làm Giảng viên');
      }

      // If REJECTED -> Allow resubmit
      const historyItem = {
        action: 'RESUBMITTED',
        actorId: userObjectId,
        actorName: userName,
        actorRole: RoleEnum.STUDENT,
        comment: 'Cập nhật lại hồ sơ sau khi bị từ chối',
        timestamp: now,
      };

      const resubmitted = await this.applicationRepository.resubmitApplication(
        existing.id,
        {
          applicantName: userName,
          phone: dto.phone,
          expertises: dto.expertises,
          bio: dto.bio,
          experience: dto.experience,
          cvFileName: dto.cvFileName || existing.cvFileName,
          cvFileUrl: dto.cvFileUrl || existing.cvFileUrl,
        },
        historyItem,
      );

      if (!resubmitted) {
        throw new BadRequestException('Nộp lại hồ sơ thất bại');
      }

      this.logger.log(`[${this.getCorrelationId()}] User ${userId} nộp lại hồ sơ ${existing.id}`);
      return resubmitted;
    }

    // First time application
    const historyItem = {
      action: 'SUBMITTED',
      actorId: userObjectId,
      actorName: userName,
      actorRole: RoleEnum.STUDENT,
      comment: 'Nộp hồ sơ đăng ký giảng viên lần đầu',
      timestamp: now,
    };

    const newApp = await this.applicationRepository.createWithHistory(
      {
        userId: userObjectId,
        applicantName: userName,
        email: userEmail.toLowerCase(),
        phone: dto.phone,
        expertises: dto.expertises,
        bio: dto.bio,
        experience: dto.experience,
        cvFileName: dto.cvFileName || null,
        cvFileUrl: dto.cvFileUrl || null,
        status: InstructorApplicationStatusEnum.PENDING,
      },
      historyItem,
    );

    this.logger.log(`[${this.getCorrelationId()}] User ${userId} nộp hồ sơ đăng ký mới thành công`);
    return newApp;
  }

  async getMyApplication(userId: string): Promise<IInstructorApplication | null> {
    return this.applicationRepository.findByUserId(userId);
  }

  async getTerms(): Promise<IInstructorTerm[]> {
    return this.termRepository.findAllOrdered();
  }

  async updateTerms(dto: UpdateInstructorTermsDto): Promise<IInstructorTerm[]> {
    if (!dto.terms || !Array.isArray(dto.terms)) {
      throw new BadRequestException('Danh sách điều khoản không hợp lệ');
    }
    return this.termRepository.replaceAllTerms(dto.terms);
  }

  async seedInitialDataIfEmpty(): Promise<void> {
    try {
      // 1. Seed Terms if empty
      const existingTerms = await this.termRepository.findAllOrdered();
      if (existingTerms.length === 0) {
        this.logger.log('Khởi tạo điều khoản giảng viên mặc định...');
        await this.termRepository.replaceAllTerms(DEFAULT_INSTRUCTOR_TERMS);
      }

      // 2. Dọn dẹp dữ liệu mock cũ không có tài khoản thật
      const legacyMockEmails = [
        'minh.nguyen@example.com',
        'thuha.tran@example.com',
        'hoanglong.le@example.com',
        'ducanh.pham@example.com',
        'quocbao.vu@example.com',
      ];
      await this.applicationRepository.deleteMany({
        email: { $in: legacyMockEmails },
      });

      // 3. Liên kết với các tài khoản học viên thật trong hệ thống nếu chưa có hồ sơ
      const student1 = await this.userRepository.findByEmail('student1@thc.edu.vn');
      const student2 = await this.userRepository.findByEmail('student2@thc.edu.vn');
      const student3 = await this.userRepository.findByEmail('student3@thc.edu.vn');
      const adminUser = await this.userRepository.findByEmail('sseu1804@gmail.com');

      const adminId = adminUser ? new Types.ObjectId(adminUser.id) : new Types.ObjectId();
      const adminName = adminUser?.fullName || 'CUONG TRINH';

      // 3.1 student1 -> Chờ duyệt (PENDING)
      if (student1) {
        const existingApp1 = await this.applicationRepository.findByUserId(student1.id);
        if (!existingApp1) {
          const s1ObjectId = new Types.ObjectId(student1.id);
          await this.applicationRepository.createWithHistory(
            {
              userId: s1ObjectId,
              applicantName: student1.fullName || 'Phạm Minh Quân',
              email: student1.email,
              phone: '0912 345 678',
              avatarUrl: student1.avatarUrl || null,
              expertises: ['Công nghệ Thông tin & Lập trình', 'AI & Khoa học Dữ liệu'],
              bio: 'Sinh viên năm cuối ngành Công Nghệ Thông Tin tại ĐH Bách Khoa, có 2 năm kinh nghiệm thực tập Fullstack và trợ giảng lập trình Web.',
              experience: 'Đã từng hướng dẫn và trợ giảng hơn 150 học viên qua các workshop nội bộ và dự án mã nguồn mở.',
              cvFileName: 'PhamMinhQuan_SeniorFullstack_CV.pdf',
              status: InstructorApplicationStatusEnum.PENDING,
            },
            {
              action: 'SUBMITTED',
              actorId: s1ObjectId,
              actorName: student1.fullName || 'Phạm Minh Quân',
              actorRole: RoleEnum.STUDENT,
              comment: 'Nộp hồ sơ đăng ký giảng viên lần đầu',
              timestamp: new Date(Date.now() - 3600000 * 4),
            },
          );
          this.logger.log(`[SEED] Khởi tạo hồ sơ PENDING thật cho student1: ${student1.email}`);
        }
      }

      // 3.2 student2 -> Đã duyệt (APPROVED) với lịch sử duyệt thật
      if (student2) {
        const existingApp2 = await this.applicationRepository.findByUserId(student2.id);
        if (!existingApp2) {
          const s2ObjectId = new Types.ObjectId(student2.id);
          const approvedAt = new Date(Date.now() - 86400000);
          const submittedAt = new Date(Date.now() - 86400000 * 2);

          const app2 = await this.applicationRepository.createWithHistory(
            {
              userId: s2ObjectId,
              applicantName: student2.fullName || 'Lê Thùy Dung',
              email: student2.email,
              phone: '0988 765 432',
              avatarUrl: student2.avatarUrl || null,
              expertises: ['Thiết kế UI/UX & Đồ họa'],
              bio: 'Product Designer với 3 năm kinh nghiệm thiết kế giao diện ứng dụng di động và trải nghiệm người dùng EdTech.',
              experience: 'Chủ nhiệm câu lạc bộ thiết kế và giảng viên trợ giảng khóa học Design System cơ bản.',
              cvFileName: 'LeThuyDung_ProductDesign_CV.pdf',
              status: InstructorApplicationStatusEnum.APPROVED,
              reviewedById: adminId,
              reviewedByName: adminName,
              reviewedAt: approvedAt,
            },
            {
              action: 'SUBMITTED',
              actorId: s2ObjectId,
              actorName: student2.fullName || 'Lê Thùy Dung',
              actorRole: RoleEnum.STUDENT,
              comment: 'Nộp hồ sơ xét duyệt năng lực giảng dạy',
              timestamp: submittedAt,
            },
          );

          // Push sự kiện APPROVED vào lịch sử
          await this.applicationRepository.updateStatus(
            app2.id,
            InstructorApplicationStatusEnum.APPROVED,
            {
              reviewedById: adminId,
              reviewedByName: adminName,
              reviewedAt: approvedAt,
            },
            {
              action: 'APPROVED',
              actorId: adminId,
              actorName: adminName,
              actorRole: RoleEnum.ADMIN,
              comment: 'Hồ sơ chuyên môn xuất sắc, đủ tiêu chuẩn phát hành khóa học trên Mindly.',
              timestamp: approvedAt,
            },
          );
          this.logger.log(`[SEED] Khởi tạo hồ sơ APPROVED thật cho student2: ${student2.email}`);
        }
      }

      // 3.3 student3 -> Đã từ chối (REJECTED) với lịch sử từ chối thật
      if (student3) {
        const existingApp3 = await this.applicationRepository.findByUserId(student3.id);
        if (!existingApp3) {
          const s3ObjectId = new Types.ObjectId(student3.id);
          const rejectedAt = new Date(Date.now() - 86400000 * 3);
          const submittedAt = new Date(Date.now() - 86400000 * 4);
          const reason =
            'Hồ sơ chưa đạt tiêu chuẩn tối thiểu về số năm kinh nghiệm sư phạm và năng lực chuyên sâu trên nền tảng Mindly. Vui lòng bổ sung chứng chỉ hoặc sản phẩm thực tế.';

          const app3 = await this.applicationRepository.createWithHistory(
            {
              userId: s3ObjectId,
              applicantName: student3.fullName || 'Đỗ Hoàng Khang',
              email: student3.email,
              phone: '0903 112 233',
              avatarUrl: student3.avatarUrl || null,
              expertises: ['Dựng Video & Đa phương tiện'],
              bio: 'Người học chuyển ngành sang lập trình web, muốn thử sức làm khóa học bán kèm.',
              experience: 'Tự học Premiere Pro qua YouTube được 2 tháng.',
              cvFileName: 'DoHoangKhang_CV.docx',
              status: InstructorApplicationStatusEnum.REJECTED,
              reviewedById: adminId,
              reviewedByName: adminName,
              reviewedAt: rejectedAt,
              rejectionReason: reason,
            },
            {
              action: 'SUBMITTED',
              actorId: s3ObjectId,
              actorName: student3.fullName || 'Đỗ Hoàng Khang',
              actorRole: RoleEnum.STUDENT,
              comment: 'Nộp hồ sơ đăng ký giảng viên',
              timestamp: submittedAt,
            },
          );

          // Push sự kiện REJECTED vào lịch sử
          await this.applicationRepository.updateStatus(
            app3.id,
            InstructorApplicationStatusEnum.REJECTED,
            {
              reviewedById: adminId,
              reviewedByName: adminName,
              reviewedAt: rejectedAt,
              rejectionReason: reason,
            },
            {
              action: 'REJECTED',
              actorId: adminId,
              actorName: adminName,
              actorRole: RoleEnum.ADMIN,
              comment: reason,
              timestamp: rejectedAt,
            },
          );
          this.logger.log(`[SEED] Khởi tạo hồ sơ REJECTED thật cho student3: ${student3.email}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Lỗi khi khởi tạo dữ liệu ban đầu cho instructor application: ${String(error)}`);
    }
  }
}
