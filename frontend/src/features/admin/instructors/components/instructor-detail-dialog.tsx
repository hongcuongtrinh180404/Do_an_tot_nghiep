'use client';

import * as React from 'react';
import { InstructorApplicationStatusEnum, type IInstructorApplication } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog';
import { InstructorStatusBadge } from './instructor-status-badge';

interface InstructorDetailDialogProps {
  application: IInstructorApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (application: IInstructorApplication) => void;
  onReject?: (application: IInstructorApplication) => void;
}

export function InstructorDetailDialog({
  application,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: InstructorDetailDialogProps): React.JSX.Element {
  if (!application) {
    return (
      <DialogLayout open={open} onOpenChange={onOpenChange} title="Chi tiết hồ sơ">
        <div />
      </DialogLayout>
    );
  }

  const isPending = application.status === InstructorApplicationStatusEnum.PENDING;

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết hồ sơ đăng ký giảng viên"
      description={`Mã hồ sơ: #${application.id.slice(-8)} • Nộp lúc: ${application.createdAt
          ? new Date(application.createdAt).toLocaleString('vi-VN')
          : 'Không xác định'
        }`}
      icon="lucide:user"
      iconClassName="bg-primary/10 text-primary ring-primary/20"
      className="sm:max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9 cursor-pointer"
          >
            Đóng
          </Button>

          {isPending && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onReject?.(application);
                }}
                className="text-xs h-9 gap-1.5 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
              >
                <Icon icon="lucide:x" className="size-3.5" />
                <span>Từ chối</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onApprove?.(application);
                }}
                className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <Icon icon="lucide:check" className="size-3.5" />
                <span>Phê duyệt</span>
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
        {/* Header Profile Summary */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20 shrink-0">
              {application.applicantName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {application.applicantName}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{application.email}</span>
                <span>•</span>
                <span>{application.phone}</span>
              </div>
            </div>
          </div>
          <InstructorStatusBadge status={application.status} />
        </div>

        {/* Lĩnh vực chuyên môn */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Lĩnh vực chuyên môn
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {application.expertises?.map((exp) => (
              <span
                key={exp}
                className="text-xs px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium border border-border/40"
              >
                {exp}
              </span>
            ))}
          </div>
        </div>

        {/* Tiểu sử tóm tắt */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tiểu sử chuyên môn
          </h4>
          <p className="text-xs text-foreground/90 bg-muted/20 p-3 rounded-lg border border-border/40 leading-relaxed">
            {application.bio || 'Chưa cung cấp tiểu sử.'}
          </p>
        </div>

        {/* Kinh nghiệm sư phạm & giảng dạy */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Kinh nghiệm giảng dạy & đào tạo
          </h4>
          <p className="text-xs text-foreground/90 bg-muted/20 p-3 rounded-lg border border-border/40 leading-relaxed">
            {application.experience || 'Chưa cung cấp thông tin kinh nghiệm.'}
          </p>
        </div>

        {/* Hồ sơ CV đính kèm */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Hồ sơ năng lực (CV đính kèm)
          </h4>
          <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/60">
            <div className="flex items-center gap-2.5">
              <Icon icon="lucide:file-text" className="size-5 text-primary" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  {application.cvFileName || 'Ho_so_ung_vien.pdf'}
                </p>
                <p className="text-[11px] text-muted-foreground">Tài liệu đính kèm (PDF/Word)</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5 cursor-pointer"
              onClick={() => {
                if (application.cvFileUrl) {
                  window.open(application.cvFileUrl, '_blank');
                } else {
                  alert(`Đang mở tài liệu: ${application.cvFileName || 'Ho_so_ung_vien.pdf'}`);
                }
              }}
            >
              <Icon icon="lucide:download" className="size-3.5" />
              <span>Xem tài liệu</span>
            </Button>
          </div>
        </div>

        {/* Lịch sử phê duyệt & xử lý */}
        <div className="space-y-2.5 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Icon icon="lucide:history" className="size-3.5 text-primary" />
              <span>Lịch sử xét duyệt & xử lý hồ sơ</span>
            </h4>
            {application.reviewedByName && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Duyệt bởi: {application.reviewedByName}
              </span>
            )}
          </div>

          {/* Timeline chi tiết */}
          {application.history && application.history.length > 0 ? (
            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/70 pl-7">
              {application.history.map((event, idx) => {
                const isApprove = event.action === 'APPROVED';
                const isReject = event.action === 'REJECTED';
                const isResubmit = event.action === 'RESUBMITTED';

                const dotColor = isApprove
                  ? 'bg-emerald-600 ring-emerald-500/20'
                  : isReject
                    ? 'bg-rose-600 ring-rose-500/20'
                    : isResubmit
                      ? 'bg-blue-600 ring-blue-500/20'
                      : 'bg-primary ring-primary/20';

                const iconName = isApprove
                  ? 'lucide:check'
                  : isReject
                    ? 'lucide:x'
                    : isResubmit
                      ? 'lucide:refresh-cw'
                      : 'lucide:file-plus';

                const actionTitle = isApprove
                  ? 'Phê duyệt hồ sơ'
                  : isReject
                    ? 'Từ chối hồ sơ'
                    : isResubmit
                      ? 'Nộp lại hồ sơ'
                      : 'Nộp hồ sơ ban đầu';

                return (
                  <div key={idx} className="relative group">
                    <span
                      className={`absolute -left-7 top-0.5 size-5 rounded-full ${dotColor} text-white flex items-center justify-center ring-4 shrink-0 shadow-xs`}
                    >
                      <Icon icon={iconName} className="size-3" />
                    </span>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{actionTitle}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${event.actorRole === 'ADMIN'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-secondary text-secondary-foreground'
                              }`}
                          >
                            {event.actorRole === 'ADMIN' ? 'Quản trị viên' : 'Học viên'}
                          </span>
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {event.timestamp
                            ? new Date(event.timestamp).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                            : ''}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span>Người thực hiện:</span>
                        <strong className="text-foreground font-semibold">{event.actorName}</strong>
                      </div>

                      {event.comment && (
                        <div
                          className={`mt-1.5 p-2 rounded text-[11px] leading-relaxed ${isReject
                              ? 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20'
                              : isApprove
                                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                                : 'bg-muted/60 text-muted-foreground'
                            }`}
                        >
                          <strong>{isReject ? 'Lý do từ chối: ' : 'Ghi chú: '}</strong>
                          <span>{event.comment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-muted/30 border border-border/50 space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Người duyệt:</span>
                <span className="font-semibold text-foreground">
                  {application.reviewedByName || 'Ban Quản Trị'}
                </span>
              </div>
              {application.reviewedAt && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Thời gian duyệt:</span>
                  <span className="font-medium text-foreground">
                    {new Date(application.reviewedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              )}
              {application.rejectionReason && (
                <div className="pt-2 border-t border-border/40 space-y-1">
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    Lý do từ chối:
                  </span>
                  <p className="text-xs text-foreground/90 italic bg-rose-500/5 p-2 rounded border border-rose-500/20">
                    "{application.rejectionReason}"
                  </p>
                </div>
              )}
              {application.status === InstructorApplicationStatusEnum.PENDING && (
                <div className="text-xs text-muted-foreground italic">
                  Hồ sơ đang chờ Quản trị viên thẩm định và phê duyệt.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DialogLayout>
  );
}
