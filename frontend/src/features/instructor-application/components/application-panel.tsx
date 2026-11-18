'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import type { InstructorApplication } from '../instructor-application';
import styles from './become-instructor.module.css';

interface ApplicationPanelProps {
  application: InstructorApplication;
  isLoading: boolean;
  isError: boolean;
  isGuest: boolean;
  isPreview: boolean;
  showDraft: boolean;
  loginHref: string;
  onRetry: () => void;
  onOpenDraft: () => void;
  onCloseDraft: () => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'long',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

export function ApplicationPanel({
  application, isLoading, isError, isGuest, isPreview, showDraft, loginHref,
  onRetry, onOpenDraft, onCloseDraft,
}: ApplicationPanelProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className={styles.applicationPanel} aria-busy="true">
        <h2>Đăng ký giảng dạy</h2>
        <p role="status">Đang tải thông tin tài khoản…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.applicationPanel}>
        <h2>Chưa tải được tài khoản</h2>
        <p role="alert">Vui lòng thử lại hoặc đăng nhập để tiếp tục đăng ký giảng viên.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={onRetry}>Thử lại</button>
          <Link className={styles.textLink} href={loginHref}>Đăng nhập</Link>
        </div>
      </div>
    );
  }

  if (!isGuest && application.status === 'pending') {
    return (
      <div className={styles.applicationPanel} data-application-state="pending">
        <h2>Yêu cầu đang chờ duyệt</h2>
        <p>Admin đang xem xét yêu cầu đăng ký giảng viên của bạn. Bạn có thể quay lại đây để theo dõi kết quả.</p>
        <div className={styles.statusDetail}>
          <Icon icon="lucide:clock-3" className={styles.statusIcon} />
          <div>
            <strong>Đang chờ Admin duyệt</strong>
            {application.submittedAt && <p>Ngày gửi: {formatDate(application.submittedAt)}</p>}
          </div>
        </div>
        <p className={styles.secondaryText}>Bạn đã có yêu cầu chờ duyệt nên chưa thể gửi thêm yêu cầu mới.</p>
        <Link className={styles.secondaryButton} href="/courses?view=catalog">Khám phá khóa học</Link>
        {isPreview && <p className={styles.previewDisclaimer}>Trạng thái minh họa bằng dữ liệu mẫu.</p>}
      </div>
    );
  }

  return (
    <div className={styles.applicationPanel} data-application-state={isGuest ? 'guest' : application.status}>
      <h2>{application.status === 'rejected' ? 'Kết quả đăng ký' : 'Đăng ký giảng dạy'}</h2>

      {!isGuest && application.status === 'rejected' ? (
        <>
          <p>Yêu cầu của bạn chưa được chấp nhận. Xem góp ý từ Admin trước khi chuẩn bị đăng ký lại.</p>
          <div className={`${styles.statusDetail} ${styles.rejectedDetail}`}>
            <Icon icon="lucide:message-square-text" className={styles.statusIcon} />
            <div>
              <strong>Lý do từ chối</strong>
              <p>{application.rejectionReason || 'Chưa có ghi chú từ Admin.'}</p>
              {application.reviewedAt && <p>Ngày phản hồi: {formatDate(application.reviewedAt)}</p>}
            </div>
          </div>
          {isPreview && <p className={styles.previewDisclaimer}>Kết quả và góp ý minh họa bằng dữ liệu mẫu.</p>}
        </>
      ) : (
        <p>Bắt đầu từ tài khoản học viên của bạn. Yêu cầu đăng ký giảng viên sẽ được Admin xem xét trước khi bạn bắt đầu giảng dạy.</p>
      )}

      {showDraft && !isGuest ? (
        <div className={styles.registrationDraft} role="status">
          <h3>{application.status === 'rejected' ? 'Chuẩn bị đăng ký lại' : 'Biểu mẫu đăng ký'}</h3>
          <p>Biểu mẫu đang được hoàn thiện. Các thông tin cần cung cấp sẽ được bổ sung ở bước tiếp theo.</p>
          <p>Hiện chưa có yêu cầu nào được gửi từ giao diện này.</p>
          <button type="button" className={styles.textLink} onClick={onCloseDraft}>
            {application.status === 'rejected' ? 'Quay lại kết quả' : 'Quay lại'}
          </button>
        </div>
      ) : (
        <div className={styles.actions}>
          {isGuest ? (
            <Link href={loginHref} className={styles.primaryButton}>Gửi yêu cầu đăng ký</Link>
          ) : (
            <button type="button" className={styles.primaryButton} onClick={onOpenDraft}>
              {application.status === 'rejected' ? 'Đăng ký lại' : 'Gửi yêu cầu đăng ký'}
            </button>
          )}
          {isGuest && <p className={styles.secondaryText}>Đăng nhập để tiếp tục. Bạn sẽ quay lại trang này.</p>}
        </div>
      )}
    </div>
  );
}
