'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import type { InstructorApplication } from '../instructor-application';
import { InstructorApplicationForm } from './instructor-application-form';
import styles from './become-instructor.module.css';

interface UserLike {
  id?: string;
  fullName?: string;
  email?: string;
}

interface ApplicationPanelProps {
  application: InstructorApplication;
  isLoading: boolean;
  isError: boolean;
  isGuest: boolean;
  isPreview: boolean;
  showDraft?: boolean;
  loginHref: string;
  user?: UserLike | null;
  onRetry: () => void;
  onOpenDraft?: () => void;
  onCloseDraft?: () => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

export function ApplicationPanel({
  application: initialApplication,
  isLoading,
  isError,
  isGuest,
  isPreview,
  loginHref,
  user,
  onRetry,
}: ApplicationPanelProps): React.JSX.Element {
  const [localApplication, setLocalApplication] = useState<InstructorApplication | null>(null);
  const [isEditingAfterReject, setIsEditingAfterReject] = useState(false);

  useEffect(() => {
    if (localApplication && initialApplication.status !== 'not-applied') {
      setLocalApplication(null);
    }
  }, [initialApplication, localApplication]);

  const activeApplication = localApplication ?? initialApplication;

  function handleSubmitSuccess(
    submittedData: NonNullable<InstructorApplication['applicantData']>,
  ): void {
    setLocalApplication({
      status: 'pending',
      submittedAt: new Date().toISOString(),
      applicantData: submittedData,
    });
    setIsEditingAfterReject(false);
  }

  function handleResetForDemo(): void {
    setLocalApplication({
      status: 'not-applied',
    });
    setIsEditingAfterReject(false);
  }

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
          <button type="button" className={styles.primaryButton} onClick={onRetry}>
            Thử lại
          </button>
          <Link className={styles.textLink} href={loginHref}>
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  // TRẠNG THÁI: CHỜ DUYỆT (PENDING)
  if (!isGuest && activeApplication.status === 'pending') {
    const data = activeApplication.applicantData;
    return (
      <div className={styles.applicationPanel} data-application-state="pending">
        <div className={styles.panelTitleGroup}>
          <span className={styles.panelBadgePending}>
            <Icon icon="lucide:clock" /> Đang chờ duyệt
          </span>
          <h2>Hồ sơ đăng ký đang được xử lý</h2>
        </div>

        <p className={styles.panelLead}>
          Ban quản trị Mindly đang xem xét hồ sơ năng lực giảng dạy của bạn. Chúng tôi sẽ phản hồi kết quả
          qua email trong vòng 24 - 48 giờ làm việc.
        </p>

        <div className={styles.statusDetail}>
          <Icon icon="lucide:clock-3" className={styles.statusIcon} />
          <div className={styles.statusDetailContent}>
            <strong>Thời gian gửi yêu cầu</strong>
            {activeApplication.submittedAt && (
              <p>{formatDate(activeApplication.submittedAt)}</p>
            )}
          </div>
        </div>

        {data && (
          <div className={styles.submittedSummaryCard}>
            <h4 className={styles.summaryTitle}>
              <Icon icon="lucide:clipboard-check" /> Tóm tắt thông tin đã gửi:
            </h4>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Họ và tên:</span>
                <span className={styles.summaryValue}>{data.fullName}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Email liên hệ:</span>
                <span className={styles.summaryValue}>{data.email}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Số điện thoại:</span>
                <span className={styles.summaryValue}>{data.phone}</span>
              </div>
              {data.cvFileName && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Tài liệu CV:</span>
                  <span className={styles.summaryValue}>
                    <Icon icon="lucide:file-text" /> {data.cvFileName}
                  </span>
                </div>
              )}
            </div>

            {data.expertises && data.expertises.length > 0 && (
              <div className={styles.summaryExpertises}>
                <span className={styles.summaryLabel}>Lĩnh vực đăng ký:</span>
                <div className={styles.summaryChips}>
                  {data.expertises.map((exp) => (
                    <span key={exp} className={styles.summaryChip}>
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className={styles.secondaryText}>
          Trong thời gian chờ duyệt, bạn không thể gửi thêm yêu cầu mới. Hãy khám phá thư viện bài giảng
          hoặc tham khảo quy chuẩn bài giảng Mindly.
        </p>

        <div className={styles.pendingActionsRow}>
          <Link className={styles.primaryButton} href="/courses?view=catalog">
            Khám phá khóa học Mindly
          </Link>
          {(isPreview || localApplication !== null) && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleResetForDemo}
              title="Chế độ thử nghiệm: Mở lại biểu mẫu"
            >
              Chỉnh sửa lại (Thử nghiệm)
            </button>
          )}
        </div>

        {isPreview && (
          <p className={styles.previewDisclaimer}>Trạng thái minh họa bằng dữ liệu mẫu.</p>
        )}
      </div>
    );
  }

  // TRẠNG THÁI: TỪ CHỐI (REJECTED) & CHƯA MỞ FORM LẠI
  if (!isGuest && activeApplication.status === 'rejected' && !isEditingAfterReject) {
    return (
      <div className={styles.applicationPanel} data-application-state="rejected">
        <div className={styles.panelTitleGroup}>
          <span className={styles.panelBadgeRejected}>
            <Icon icon="lucide:alert-triangle" /> Cần bổ sung hồ sơ
          </span>
          <h2>Kết quả đăng ký giảng viên</h2>
        </div>

        <p className={styles.panelLead}>
          Yêu cầu của bạn chưa được duyệt trong đợt xét này. Vui lòng xem kỹ phản hồi chi tiết từ Ban
          quản trị Mindly trước khi chuẩn bị cập nhật lại thông tin.
        </p>

        <div className={`${styles.statusDetail} ${styles.rejectedDetail}`}>
          <Icon icon="lucide:message-square-warning" className={styles.statusIcon} />
          <div className={styles.statusDetailContent}>
            <strong>Ghi chú từ Ban quản trị</strong>
            <p className={styles.rejectionReasonText}>
              {activeApplication.rejectionReason || 'Vui lòng bổ sung thêm thông tin về hồ sơ năng lực.'}
            </p>
            {activeApplication.reviewedAt && (
              <span className={styles.reviewDate}>
                Ngày phản hồi: {formatDate(activeApplication.reviewedAt)}
              </span>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setIsEditingAfterReject(true)}
          >
            <span>Cập nhật thông tin & Đăng ký lại</span>
            <Icon icon="lucide:arrow-right" />
          </button>
          <Link className={styles.textLink} href="/courses?view=catalog">
            Về trang danh mục khóa học
          </Link>
        </div>

        {isPreview && (
          <p className={styles.previewDisclaimer}>Kết quả và phản hồi minh họa bằng dữ liệu mẫu.</p>
        )}
      </div>
    );
  }

  // TRẠNG THÁI: HIỂN THỊ BIỂU MẪU ĐĂNG KÝ (NOT-APPLIED, GUEST, HOẶC ĐANG CHỈNH SỬA LẠI SAU KHI REJECT)
  return (
    <div
      className={styles.applicationPanel}
      data-application-state={isGuest ? 'guest' : activeApplication.status}
    >
      <div className={styles.panelHeaderRow}>
        <div>
          <h2>
            {activeApplication.status === 'rejected'
              ? 'Hoàn thiện lại hồ sơ đăng ký'
              : 'Đăng ký trở thành giảng viên Mindly'}
          </h2>
          <p className={styles.panelSubtext}>
            {activeApplication.status === 'rejected'
              ? 'Cập nhật lại các thông tin chuyên môn hoặc tải lên CV mới theo góp ý của Admin.'
              : 'Chia sẻ chuyên môn của bạn với hàng ngàn học viên. Vui lòng hoàn thành đầy đủ biểu mẫu dưới đây.'}
          </p>
        </div>
      </div>

      <InstructorApplicationForm
        user={user}
        isGuest={isGuest}
        loginHref={loginHref}
        onSubmitSuccess={handleSubmitSuccess}
        initialData={activeApplication.applicantData}
        onCancel={
          activeApplication.status === 'rejected' ? () => setIsEditingAfterReject(false) : undefined
        }
      />
    </div>
  );
}
