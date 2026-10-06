'use client';

import React, { useState, useRef } from 'react';
import type { ILesson } from 'share-lib';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { useUploadLessonMaterialMutation } from '../api/course.api';

const ACCEPTED_EXTENSIONS = '.pdf, .docx, .zip, .rar, .pptx, .xlsx, .txt';
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export interface UploadLessonDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: ILesson | null;
  courseId?: string;
  onSuccess?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadLessonDocDialog({
  open,
  onOpenChange,
  lesson,
  courseId,
  onSuccess,
}: UploadLessonDocDialogProps): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadMutation = useUploadLessonMaterialMutation({
    courseId,
    sectionId: lesson?.sectionId,
  });
  const isUploading = uploadMutation.isPending;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setSelectedFile(null);
    setIsDragOver(false);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('Dung lượng tệp vượt quá giới hạn 100MB', {
        description: `Tệp đã chọn (${formatFileSize(file.size)}) vượt quá dung lượng tối đa cho phép.`,
      });
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);

    // Tự động điền tên tài liệu nếu ô tiêu đề đang để trống
    if (!title.trim()) {
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(fileNameWithoutExt);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('Vui lòng nhập tên tài liệu.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Vui lòng chọn hoặc kéo thả tệp tài liệu cần đính kèm.');
      return;
    }

    if (!lesson?.id) {
      setErrorMessage('Không tìm thấy thông tin bài học để tải tài liệu.');
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        lessonId: lesson.id,
        file: selectedFile,
        title: trimmedTitle,
      });
      resetForm();
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // Notification handled in mutation onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md w-full gap-5">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">
            Thêm tài liệu đính kèm
          </DialogTitle>
          <DialogDescription className="sr-only">
            Tải lên tài liệu đính kèm cho bài học video
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TRƯỜNG 1: Tên tài liệu */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-title" className="text-xs font-medium text-foreground">
              Tên tài liệu <span className="text-destructive">*</span>
            </Label>
            <Input
              id="doc-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMessage && e.target.value.trim()) {
                  setErrorMessage(null);
                }
              }}
              placeholder="Ví dụ: Slide bài giảng vòng lặp for, Source code mẫu..."
              className="h-9 text-xs"
              disabled={isUploading}
              autoFocus
            />
          </div>

          {/* TRƯỜNG 2: Khung tải tệp */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              Tệp đính kèm <span className="text-destructive">*</span>
            </Label>

            <input
              ref={fileInputRef}
              id="doc-file-input"
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              disabled={isUploading}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                handleFileSelect(file);
              }}
            />

            {!selectedFile ? (
              <label
                htmlFor="doc-file-input"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0] ?? null;
                  handleFileSelect(file);
                }}
                className={`flex flex-col items-center justify-center p-5 border border-dashed rounded-xl transition-all text-center cursor-pointer select-none ${
                  isDragOver
                    ? 'border-sky-500 bg-sky-500/5'
                    : 'border-border/70 hover:border-border hover:bg-muted/30 bg-muted/10'
                }`}
              >
                <div className="size-9 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-2.5">
                  <Icon icon="lucide:upload-cloud" className="size-4.5" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  Kéo thả tệp vào đây hoặc <span className="text-primary font-semibold underline underline-offset-2">chọn tệp</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                  Hỗ trợ .pdf, .docx, .zip, .rar, .pptx, .xlsx, .txt (≤ 100MB)
                </p>
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon icon="lucide:file-text" className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="size-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition shrink-0 cursor-pointer"
                  title="Gỡ bỏ tệp để chọn tệp khác"
                  aria-label="Gỡ bỏ tệp"
                >
                  <Icon icon="lucide:x" className="size-4" />
                </button>
              </div>
            )}
          </div>

          {/* Thông báo lỗi validation */}
          {errorMessage && (
            <div className="flex items-center gap-1.5 text-destructive text-xs py-1">
              <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <DialogFooter className="mt-5 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isUploading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isUploading}
              className="min-w-[90px]"
            >
              {isUploading ? (
                <>
                  <Icon icon="lucide:loader-2" className="size-3.5 animate-spin mr-1.5" />
                  Đang tải...
                </>
              ) : (
                <>
                  <Icon icon="lucide:upload" className="size-3.5 mr-1.5" />
                  Tải lên
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
