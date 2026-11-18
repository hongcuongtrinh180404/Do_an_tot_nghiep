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
  implements OnModuleInit
{
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

    // 1. Cập nhật hồ sơ ứng viên
    const updatedApplication = await this.applicationRepository.updateStatus(
      id,
      InstructorApplicationStatusEnum.APPROVED,
      {
        reviewedById,
        reviewedByName: adminName,
        reviewedAt: now,
        rejectionReason: null,
      },
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

    const updatedApplication = await this.applicationRepository.updateStatus(
      id,
      InstructorApplicationStatusEnum.REJECTED,
      {
        reviewedById,
        reviewedByName: adminName,
        rejectionReason: trimmedReason,
        reviewedAt: now,
      },
    );

    if (!updatedApplication) {
      throw new NotFoundException('Cập nhật trạng thái từ chối thất bại');
    }

    this.logger.log(
      `[${this.getCorrelationId()}] Từ chối hồ sơ ${id} bởi admin ${adminName}. Lý do: ${trimmedReason}`,
    );

    return updatedApplication;
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
      // 1. Seed Terms
      const existingTerms = await this.termRepository.findAllOrdered();
      if (existingTerms.length === 0) {
        this.logger.log('Khởi tạo điều khoản giảng viên mặc định...');
        await this.termRepository.replaceAllTerms(DEFAULT_INSTRUCTOR_TERMS);
      }

      // 2. Seed Applications if empty
      const totalApplications = await this.applicationRepository.countPending();
      const stats = await this.applicationRepository.getStats();
      if (stats.totalCount === 0) {
        this.logger.log('Khởi tạo danh sách hồ sơ ứng viên mẫu...');
        const mockApplications: Partial<IInstructorApplication>[] = [
          {
            userId: new Types.ObjectId().toString(),
            applicantName: 'Nguyễn Văn Minh',
            email: 'minh.nguyen@example.com',
            phone: '0912 345 678',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
            expertises: ['Công nghệ Thông tin & Lập trình', 'AI & Khoa học Dữ liệu'],
            bio: 'Kỹ sư phần mềm cao cấp với 6 năm kinh nghiệm phát triển hệ thống phân tán và kiến trúc microservices tại VNG.',
            experience: 'Đã từng hướng dẫn và đào tạo hơn 500 học viên qua các workshop nội bộ và khóa học lập trình trực tuyến.',
            cvFileName: 'NguyenVanMinh_SeniorSoftwareEngineer_CV.pdf',
            status: InstructorApplicationStatusEnum.PENDING,
          },
          {
            userId: new Types.ObjectId().toString(),
            applicantName: 'Trần Thị Thu Hà',
            email: 'thuha.tran@example.com',
            phone: '0988 765 432',
            avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
            expertises: ['Thiết kế UI/UX & Đồ họa'],
            bio: 'Lead Product Designer với 7 năm kinh nghiệm tại các startup EdTech và Fintech hàng đầu Đông Nam Á.',
            experience: 'Giảng viên thỉnh giảng tại Đại học Kiến trúc và diễn giả tại Vietnam UX/UI Summit 2025.',
            cvFileName: 'TranThiThuHa_ProductDesignLead_Resume.pdf',
            status: InstructorApplicationStatusEnum.PENDING,
          },
          {
            userId: new Types.ObjectId().toString(),
            applicantName: 'Lê Hoàng Long',
            email: 'hoanglong.le@example.com',
            phone: '0903 112 233',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
            expertises: ['AI & Khoa học Dữ liệu'],
            bio: 'Tiến sĩ Khoa học Máy tính chuyên ngành Học sâu (Deep Learning) và Thị giác Máy tính (Computer Vision).',
            experience: 'Tác giả 4 bài báo khoa học Q1 IEEE/ACM và 3 năm kinh nghiệm giảng dạy môn Xử lý Ảnh & Trí tuệ Nhân tạo.',
            cvFileName: 'LeHoangLong_PhD_CV.pdf',
            status: InstructorApplicationStatusEnum.PENDING,
          },
          {
            userId: new Types.ObjectId().toString(),
            applicantName: 'Phạm Đức Anh',
            email: 'ducanh.pham@example.com',
            phone: '0977 889 900',
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
            expertises: ['Kinh doanh & Marketing số'],
            bio: 'Growth Marketing Director với hơn 8 năm dẫn dắt chiến lược tăng trưởng người dùng cho các ứng dụng giáo dục.',
            experience: 'Đã xây dựng cộng đồng 50.000 marketer và xuất bản 2 cuốn e-book chuyên sâu về Performance Ads.',
            cvFileName: 'PhamDucAnh_Marketing_Portfolio.pdf',
            status: InstructorApplicationStatusEnum.APPROVED,
            reviewedByName: 'Ban Quản Trị DATN',
            reviewedAt: new Date(Date.now() - 86400000 * 2),
          },
          {
            userId: new Types.ObjectId().toString(),
            applicantName: 'Vũ Quốc Bảo',
            email: 'quocbao.vu@example.com',
            phone: '0933 556 778',
            avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=160&auto=format&fit=crop&q=80',
            expertises: ['Dựng Video & Đa phương tiện'],
            bio: 'Chưa có kinh nghiệm thực tế, muốn thử sức làm khóa học bán kèm.',
            experience: 'Tự học Premiere Pro qua YouTube được 2 tháng.',
            cvFileName: 'Bao_CV_moi.docx',
            status: InstructorApplicationStatusEnum.REJECTED,
            reviewedByName: 'Ban Quản Trị DATN',
            reviewedAt: new Date(Date.now() - 86400000 * 4),
            rejectionReason:
              'Hồ sơ chuyên môn chưa đáp ứng tiêu chuẩn tối thiểu về số năm kinh nghiệm sư phạm và năng lực chuyên sâu trên nền tảng Mindly.',
          },
        ];

        for (const appData of mockApplications) {
          await this.applicationRepository.create(appData);
        }
      }
    } catch (error) {
      this.logger.warn(`Lỗi khi khởi tạo dữ liệu ban đầu cho instructor application: ${String(error)}`);
    }
  }
}
