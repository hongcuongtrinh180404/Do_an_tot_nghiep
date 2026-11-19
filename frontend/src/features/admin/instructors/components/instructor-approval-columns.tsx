'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { InstructorApplicationStatusEnum, type IInstructorApplication } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { InstructorStatusBadge } from './instructor-status-badge';

interface CreateInstructorApprovalColumnsOptions {
  onViewDetail: (application: IInstructorApplication) => void;
  onApprove: (application: IInstructorApplication) => void;
  onReject: (application: IInstructorApplication) => void;
  currentTab?: 'PENDING' | 'HISTORY';
}

export function createInstructorApprovalColumns({
  onViewDetail,
  onApprove,
  onReject,
  currentTab = 'PENDING',
}: CreateInstructorApprovalColumnsOptions): ColumnDef<IInstructorApplication>[] {
  const isHistoryTab = currentTab === 'HISTORY';

  const baseColumns: ColumnDef<IInstructorApplication>[] = [
    {
      id: 'applicant',
      header: 'Ứng viên',
      cell: ({ row }) => {
        const app = row.original;
        const initial = app.applicantName.charAt(0).toUpperCase() || 'U';

        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onViewDetail(app)}
                className="text-xs font-semibold text-foreground hover:text-primary transition-colors truncate block text-left cursor-pointer"
              >
                {app.applicantName}
              </button>
              <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                <span>{app.email}</span>
                <span>•</span>
                <span>{app.phone}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'expertises',
      header: 'Lĩnh vực chuyên môn',
      cell: ({ row }) => {
        const expertises = row.original.expertises || [];
        if (expertises.length === 0) {
          return <span className="text-xs text-muted-foreground italic">Chưa xác định</span>;
        }

        const visible = expertises.slice(0, 2);
        const remainder = expertises.length - 2;

        return (
          <div className="flex flex-wrap gap-1 items-center max-w-[240px]">
            {visible.map((exp) => (
              <span
                key={exp}
                className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/40 truncate max-w-[150px]"
                title={exp}
              >
                {exp}
              </span>
            ))}
            {remainder > 0 && (
              <span className="text-[10px] font-medium text-muted-foreground">
                +{remainder}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'experience',
      header: 'Kinh nghiệm tóm tắt',
      cell: ({ row }) => {
        const exp = row.original.experience || row.original.bio || 'Chưa cung cấp';
        return (
          <p
            className="text-xs text-muted-foreground line-clamp-2 max-w-[220px]"
            title={exp}
          >
            {exp}
          </p>
        );
      },
    },
    {
      id: 'cvFile',
      header: 'Hồ sơ CV',
      cell: ({ row }) => {
        const app = row.original;
        const fileName = app.cvFileName || 'Ho_so_CV.pdf';

        return (
          <button
            type="button"
            onClick={() => onViewDetail(app)}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium cursor-pointer"
            title={`Xem tài liệu: ${fileName}`}
          >
            <Icon icon="lucide:file-text" className="size-3.5" />
            <span className="truncate max-w-[130px]">{fileName}</span>
          </button>
        );
      },
    },
  ];

  if (isHistoryTab) {
    baseColumns.push(
      {
        id: 'reviewedBy',
        header: 'Người duyệt',
        cell: ({ row }) => {
          const app = row.original;
          const reviewerName = app.reviewedByName || 'Ban Quản Trị';

          return (
            <div className="flex items-center gap-2 min-w-[140px]">
              <span className="size-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Icon icon="lucide:shield-check" className="size-3.5" />
              </span>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-foreground truncate block" title={reviewerName}>
                  {reviewerName}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Quản trị viên
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'reviewedAt',
        header: 'Thời gian duyệt',
        cell: ({ row }) => {
          const date = row.original.reviewedAt || row.original.updatedAt;
          if (!date) return <span className="text-xs text-muted-foreground">-</span>;

          return (
            <div className="text-xs text-muted-foreground">
              {new Date(date).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          );
        },
      },
    );
  } else {
    baseColumns.push({
      id: 'submittedAt',
      header: 'Ngày nộp',
      cell: ({ row }) => {
        const date = row.original.createdAt;
        if (!date) return <span className="text-xs text-muted-foreground">-</span>;

        return (
          <div className="text-xs text-muted-foreground">
            {new Date(date).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </div>
        );
      },
    });
  }

  baseColumns.push(
    {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        return <InstructorStatusBadge status={row.original.status} />;
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Thao tác</div>,
      cell: ({ row }) => {
        const app = row.original;
        const isPending = app.status === InstructorApplicationStatusEnum.PENDING;

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onViewDetail(app)}
              className="text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Xem chi tiết hồ sơ"
            >
              <Icon icon="lucide:eye" className="size-3.5 mr-1" />
              <span>Chi tiết</span>
            </Button>

            {isPending && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReject(app)}
                  className="text-xs h-8 px-2 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
                  title="Từ chối hồ sơ"
                >
                  <Icon icon="lucide:x" className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onApprove(app)}
                  className="text-xs h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  title="Phê duyệt ứng viên"
                >
                  <Icon icon="lucide:check" className="size-3.5 mr-1" />
                  <span>Duyệt</span>
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  );

  return baseColumns;
}
