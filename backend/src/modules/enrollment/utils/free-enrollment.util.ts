import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CourseStatusEnum, UserStatusEnum } from 'share-lib';

/** Shared by the live free-registration service and the internal history importer. */
export function assertFreeEnrollmentAllowed(
  userId: string, courseId: string,
  user: { deletedAt?: unknown; status: string } | null | undefined,
  course: { deletedAt?: unknown; status: string; price: number; instructorId: string } | null | undefined,
): void {
  if (!user || user.deletedAt || user.status !== UserStatusEnum.ACTIVE) {
    throw new BadRequestException('Tài khoản người dùng không hợp lệ hoặc đã bị vô hiệu hóa');
  }
  if (!course || course.deletedAt) throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
  if (course.status !== CourseStatusEnum.PUBLISHED) throw new BadRequestException('Khóa học chưa được phê duyệt hoặc chưa công khai');
  if (course.price !== 0) throw new BadRequestException('Chỉ được đăng ký trực tiếp khóa học miễn phí. Khóa học có phí phải thanh toán qua SePay');
  if (course.instructorId === userId) throw new ConflictException('Bạn là giảng viên tạo khóa học này, không thể tự đăng ký khóa học của chính mình');
}
