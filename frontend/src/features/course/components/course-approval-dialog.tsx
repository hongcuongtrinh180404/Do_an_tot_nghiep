'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CourseStatusEnum, type ICourse, type ICourseApprovalChecklist } from 'share-lib';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  approvalChecklistOptions, approvalErrorMessage,
  useCourseApprovalWritesPending, useRequestCourseApprovalMutation,
} from '../api/course-approval.api';

interface CourseApprovalDialogProps {
  course: ICourse;
  onNavigateToMissing: (checklist: ICourseApprovalChecklist) => void;
  onOpenChecklist: () => void;
}

export function CourseApprovalDialog({
  course, onNavigateToMissing, onOpenChecklist,
}: CourseApprovalDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const closeGeneration = useRef(0);
  const submitted = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const queryClient = useQueryClient();
  const isSaving = useCourseApprovalWritesPending(course.id);
  const checklistQuery = useQuery({
    ...approvalChecklistOptions(course.id),
    enabled: open && !isSaving,
  });
  const requestMutation = useRequestCourseApprovalMutation(course.id);
  const checklist = checklistQuery.data;
  const isChecking = isSaving || checklistQuery.isPending || checklistQuery.isFetching;
  const completed = checklist?.items.filter((item) => item.complete).length ?? 0;
  const isDraft = course.status === CourseStatusEnum.DRAFT;

  useEffect(() => () => { closeGeneration.current += 1; }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (requestMutation.isPending) return;
    closeGeneration.current += 1;
    openRef.current = nextOpen;
    setOpen(nextOpen);
    if (nextOpen) {
      submitted.current = false;
      requestMutation.reset();
      onOpenChecklist();
    }
  };

  const afterClose = async () => {
    const generation = closeGeneration.current;
    if (submitted.current) {
      document.querySelector<HTMLElement>('[data-course-status]')?.focus({ preventScroll: true });
      return;
    }
    try {
      // Also handles dismissing the dialog before its initial request completes.
      const latest = await queryClient.fetchQuery(approvalChecklistOptions(course.id));
      if (generation !== closeGeneration.current || openRef.current) return;
      if (latest.items.some((item) => !item.complete)) onNavigateToMissing(latest);
      else triggerRef.current?.focus({ preventScroll: true });
    } catch {
      if (generation !== closeGeneration.current || openRef.current) return;
      if (checklist?.items.some((item) => !item.complete)) onNavigateToMissing(checklist);
      else triggerRef.current?.focus({ preventScroll: true });
    }
  };

  const submit = async () => {
    if (!checklist?.canSubmit || isChecking || requestMutation.isPending || !isDraft) return;
    try {
      await requestMutation.mutateAsync();
      submitted.current = true;
      openRef.current = false;
      setOpen(false);
      toast.success('Đã gửi yêu cầu phê duyệt', {
        description: 'Khóa học đã chuyển sang trạng thái Chờ duyệt.',
      });
    } catch {
      // The inline error and the server's latest checklist remain available to correct/retry.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={(isOpen) => { if (!isOpen) void afterClose(); }}
    >
      {isDraft && (
        <DialogTrigger render={<Button ref={triggerRef} type="button" className="h-11 shrink-0 gap-2 sm:h-9" />}>
          <Icon icon="lucide:send" className="size-4" />
          Yêu cầu phê duyệt
        </DialogTrigger>
      )}
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-hidden p-5 sm:max-w-lg sm:p-6"
        overlayClassName="bg-black/40 backdrop-blur-none supports-backdrop-filter:backdrop-blur-none"
        showCloseButton={false}
        initialFocus={headingRef}
        finalFocus={false}
      >
        <DialogHeader className="shrink-0 gap-2 pr-6">
          <DialogTitle ref={headingRef} tabIndex={-1} className="text-lg font-semibold leading-snug outline-none">Yêu cầu phê duyệt khóa học</DialogTitle>
          <DialogDescription>
            Hoàn thành các điều kiện dưới đây trước khi gửi. Checklist kiểm tra thông tin đã lưu.
          </DialogDescription>
        </DialogHeader>

        <DialogClose render={<Button variant="ghost" size="icon" className="absolute right-1 top-1 size-11 sm:right-2 sm:top-2 sm:size-8" disabled={requestMutation.isPending} aria-label="Đóng" />}>
          <Icon icon="lucide:x" className="size-4" />
        </DialogClose>

        <div className="min-h-0 overflow-y-auto overscroll-contain" data-approval-checklist-body="">
        {isChecking ? (
          <div role="status" className="flex items-center gap-3 rounded-lg bg-muted/50 p-4 text-sm">
            <Icon icon="lucide:loader-2" className="size-5 shrink-0 animate-spin motion-reduce:animate-none" />
            {isSaving ? 'Đang chờ lưu thông tin và tải lên hoàn tất…' : 'Đang kiểm tra điều kiện phê duyệt…'}
          </div>
        ) : checklistQuery.isError ? (
          <div role="alert" className="space-y-3 rounded-lg border border-destructive/25 p-4">
            <p className="font-medium">Không thể kiểm tra điều kiện</p>
            <p className="text-sm text-muted-foreground">{approvalErrorMessage(checklistQuery.error)}</p>
            <Button variant="outline" onClick={() => { void checklistQuery.refetch(); }}>Thử lại</Button>
          </div>
        ) : checklist ? (
          <div className="space-y-3">
            <p role="status" className="text-sm font-medium">
              Đã hoàn thành {completed}/{checklist.items.length} điều kiện
            </p>
            <ul className="divide-y divide-border/60 rounded-lg border border-border/70 px-4">
              {checklist.items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-3.5">
                  <Icon
                    icon={item.complete ? 'lucide:circle-check' : 'lucide:circle-x'}
                    className={`mt-0.5 size-5 shrink-0 ${item.complete
                      ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium">{item.label}</p>
                    <p className={`text-xs ${item.complete
                      ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {item.complete ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                    </p>
                    {!item.complete && (
                      <ul className="space-y-1 text-sm text-muted-foreground break-words">
                        {item.issues.map((issue, index) => <li key={index}>{issue.message}</li>)}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {completed < checklist.items.length && (
              <p className="text-sm text-muted-foreground">Đóng cửa sổ để đến mục còn thiếu đầu tiên.</p>
            )}
            {checklist.status !== CourseStatusEnum.DRAFT && (
              <p role="status" className="text-sm text-muted-foreground">
                Khóa học đã chuyển trạng thái. Chỉ bản nháp mới có thể gửi yêu cầu.
              </p>
            )}
          </div>
        ) : null}

        {requestMutation.isError && (
          <p role="alert" className="mt-3 text-sm text-destructive">{approvalErrorMessage(requestMutation.error)}</p>
        )}
        </div>

        <DialogFooter className="m-0 shrink-0 flex-row justify-end rounded-none border-0 bg-transparent p-0">
          <Button variant="outline" className="h-11 sm:h-9" disabled={requestMutation.isPending} onClick={() => handleOpenChange(false)}>
            Đóng
          </Button>
          <Button
            disabled={!checklist?.canSubmit || isChecking || checklistQuery.isError || requestMutation.isPending || !isDraft}
            onClick={() => { void submit(); }}
            className="h-11 gap-2 sm:h-9"
          >
            <Icon icon={requestMutation.isPending ? 'lucide:loader-2' : 'lucide:send'}
              className={`size-4 ${requestMutation.isPending ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            {requestMutation.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
