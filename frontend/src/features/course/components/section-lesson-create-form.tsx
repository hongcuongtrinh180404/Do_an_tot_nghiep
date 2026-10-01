'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { ILessonContent } from 'share-lib';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';

import {
  createLessonSchema,
  type CreateLessonFormData,
  ACCEPTED_LESSON_FILE_EXTENSIONS,
  MAX_VIDEO_FILE_SIZE,
  MAX_DOCUMENT_FILE_SIZE,
  isVideoFile,
  isDocumentFile,
} from '../schemas/create-lesson.schema';
import { useSectionLessonsQuery, useCreateLessonMutation } from '../api/course.api';
import { useUploadLessonContentMutation } from '../api/lesson-content.api';

export interface SectionLessonCreateFormProps {
  sectionId: string;
  sectionTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOrder?: number;
  onSubmit?: (data: CreateLessonFormData) => void;
  onCancel?: () => void;
}

type UploadStatus = 'IDLE' | 'UPLOADING' | 'UPLOADED' | 'UPLOAD_ERROR';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function SectionLessonCreateForm({
  sectionId,
  sectionTitle,
  open,
  onOpenChange,
  defaultOrder,
  onSubmit,
  onCancel,
}: SectionLessonCreateFormProps): React.JSX.Element {
  const createLessonMutation = useCreateLessonMutation(sectionId);
  const uploadMutation = useUploadLessonContentMutation();

  // Query existing lessons to calculate automatic order if defaultOrder is not passed
  const { data: existingLessons } = useSectionLessonsQuery(sectionId);
  const calculatedOrder = defaultOrder ?? (existingLessons ? existingLessons.length : 0);

  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadedContent, setUploadedContent] = useState<ILessonContent | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('IDLE');
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateLessonFormData>({
    resolver: zodResolver(createLessonSchema),
    defaultValues: {
      title: '',
      description: '',
      order: calculatedOrder,
      contentFile: null,
      isPreview: false,
    },
  });

  const selectedFile = useWatch({ control, name: 'contentFile' });

  const isUploading = uploadStatus === 'UPLOADING' || uploadMutation.isPending;
  const isCreating = isSubmitting || createLessonMutation.isPending;
  const isPending = isUploading || isCreating;

  // Reset form whenever the dialog opens or calculated order updates
  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
        order: calculatedOrder,
        contentFile: null,
        isPreview: false,
      });
    }
  }, [open, calculatedOrder, reset]);

  const performClose = () => {
    reset({
      title: '',
      description: '',
      order: calculatedOrder,
      contentFile: null,
      isPreview: false,
    });
    setUploadedContent(null);
    setUploadStatus('IDLE');
    setUploadErrorMessage(null);
    setShowExitConfirm(false);
    onCancel?.();
    onOpenChange(false);
  };

  const handleRequestClose = () => {
    if (isPending) return;

    // Nếu đã upload file thành công lên Cloudinary mà chưa submit bài học -> Hiện confirmation dialog
    if (uploadStatus === 'UPLOADED' && uploadedContent) {
      setShowExitConfirm(true);
      return;
    }

    performClose();
  };

  const executeUpload = async (file: File) => {
    setUploadStatus('UPLOADING');
    setUploadErrorMessage(null);

    try {
      const res = await uploadMutation.mutateAsync(file);
      setUploadedContent(res);
      setUploadStatus('UPLOADED');
    } catch (err: unknown) {
      setUploadStatus('UPLOAD_ERROR');
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Tải file lên Cloudinary thất bại. Vui lòng thử lại.';
      setUploadErrorMessage(msg || 'Lỗi tải file lên Cloudinary');
    }
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setValue('contentFile', null, { shouldValidate: true });
      setUploadedContent(null);
      setUploadStatus('IDLE');
      setUploadErrorMessage(null);
      return;
    }

    // Client-side file type validation
    const isVideo = isVideoFile(file);
    const isDoc = isDocumentFile(file);

    if (!isVideo && !isDoc) {
      toast.error('Định dạng file không được hỗ trợ', {
        description: 'Chỉ chấp nhận video (.mp4, .webm, .mov) hoặc tài liệu (.pdf, .docx).',
      });
      return;
    }

    // Client-side file size validation
    if (isVideo && file.size > MAX_VIDEO_FILE_SIZE) {
      toast.error('Dung lượng video vượt quá giới hạn', {
        description: `Dung lượng video (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá mức tối đa cho phép là 900MB.`,
      });
      return;
    }

    if (isDoc && file.size > MAX_DOCUMENT_FILE_SIZE) {
      toast.error('Dung lượng tài liệu vượt quá giới hạn', {
        description: `Dung lượng tài liệu (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá mức tối đa cho phép là 50MB.`,
      });
      return;
    }

    setValue('contentFile', file, { shouldValidate: true });
    await executeUpload(file);
  };

  const handleRetryUpload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedFile || isPending) return;
    await executeUpload(selectedFile);
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;
    handleFileSelect(null);
  };

  const onFormSubmit = async (data: CreateLessonFormData) => {
    // Chặn submit khi đang upload file
    if (uploadStatus === 'UPLOADING') {
      toast.warning('File đang được tải lên', {
        description: 'Vui lòng chờ quá trình tải file lên Cloudinary hoàn tất trước khi thêm bài học.',
      });
      return;
    }

    // Chặn submit khi file upload bị lỗi (không bao giờ silently ignore file)
    if (uploadStatus === 'UPLOAD_ERROR') {
      toast.error('File chưa được tải lên thành công', {
        description: 'Vui lòng nhấn "Thử lại" hoặc xóa file để tiếp tục tạo bài học.',
      });
      return;
    }

    if (isCreating) return;

    // Gắn metadata nếu upload thành công, ngược lại gửi null
    const payloadContent =
      uploadStatus === 'UPLOADED' && uploadedContent ? uploadedContent : null;

    try {
      await createLessonMutation.mutateAsync({
        title: data.title.trim(),
        description: data.description?.trim() ? data.description.trim() : undefined,
        order: data.order,
        content: payloadContent,
        isPreview: data.isPreview,
      });

      onSubmit?.(data);
      performClose();
    } catch {
      // Error notifications are handled inside useCreateLessonMutation's onError callback.
      // Dialog remains open, form retains user input, and uploadedContent is PRESERVED.
      // User can retry submit without re-uploading the file!
    }
  };

  const isVideo = selectedFile ? isVideoFile(selectedFile) : false;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (isPending) return;
          if (!nextOpen) {
            handleRequestClose();
          } else {
            onOpenChange(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Icon icon="lucide:play-circle" className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Thêm bài học mới
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {sectionTitle ? `Thêm vào chương: "${sectionTitle}"` : 'Thêm bài học mới vào chương học này.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-2">
            {/* Section ID (Hidden / Readonly by design) */}
            <input type="hidden" value={sectionId} readOnly />

            {/* Tiêu đề bài học */}
            <div className="space-y-1.5">
              <Label htmlFor="lesson-title" className="text-xs font-medium text-foreground">
                Tiêu đề bài học <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lesson-title"
                placeholder="Ví dụ: Giới thiệu khóa học và thiết lập môi trường..."
                disabled={isPending}
                aria-invalid={Boolean(errors.title)}
                {...register('title')}
              />
              {errors.title && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
                  <span>{errors.title.message}</span>
                </p>
              )}
            </div>

            {/* Mô tả bài học */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="lesson-description" className="text-xs font-medium text-foreground">
                  Mô tả bài học
                </Label>
                <span className="text-[11px] text-muted-foreground">Không bắt buộc</span>
              </div>
              <Textarea
                id="lesson-description"
                rows={3}
                placeholder="Tóm tắt ngắn gọn nội dung hoặc mục tiêu của bài học..."
                disabled={isPending}
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
                  <span>{errors.description.message}</span>
                </p>
              )}
            </div>

            {/* Thứ tự bài học */}
            <div className="space-y-1.5">
              <Label htmlFor="lesson-order" className="text-xs font-medium text-foreground">
                Thứ tự hiển thị <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lesson-order"
                type="number"
                min={0}
                step={1}
                placeholder="0"
                disabled={isPending}
                aria-invalid={Boolean(errors.order)}
                {...register('order', { valueAsNumber: true })}
              />
              <p className="text-[11px] text-muted-foreground">
                Số nguyên từ 0 trở lên dùng để sắp xếp thứ tự các bài học trong chương này.
              </p>
              {errors.order && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
                  <span>{errors.order.message}</span>
                </p>
              )}
            </div>

            {/* Tài liệu / Video bài học */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">
                  Tài liệu / Video bài học
                </Label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {uploadStatus === 'UPLOADING' && (
                    <span className="text-primary font-medium flex items-center gap-1">
                      <Icon icon="lucide:loader-2" className="size-3 animate-spin" />
                      Đang tải lên...
                    </span>
                  )}
                  {uploadStatus === 'UPLOADED' && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Icon icon="lucide:check-circle-2" className="size-3" />
                      Đã lưu Cloudinary
                    </span>
                  )}
                  {uploadStatus === 'UPLOAD_ERROR' && (
                    <span className="text-destructive font-medium flex items-center gap-1">
                      <Icon icon="lucide:alert-circle" className="size-3" />
                      Lỗi tải lên
                    </span>
                  )}
                  {uploadStatus === 'IDLE' && (selectedFile ? 'Sẵn sàng' : 'Không bắt buộc')}
                </span>
              </div>

              <input
                id="lesson-file-input"
                key={selectedFile ? selectedFile.name : 'empty-file-input'}
                type="file"
                accept={ACCEPTED_LESSON_FILE_EXTENSIONS}
                disabled={isPending || uploadStatus === 'UPLOADED'}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  handleFileSelect(file);
                }}
              />

              {!selectedFile ? (
                <label
                  htmlFor="lesson-file-input"
                  onDragOver={(e) => {
                    if (isPending) return;
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    if (isPending) return;
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0] ?? null;
                    if (file) handleFileSelect(file);
                  }}
                  className={`flex flex-col items-center justify-center p-4 border border-dashed rounded-lg transition-colors text-center ${
                    isPending
                      ? 'opacity-50 pointer-events-none border-border/40'
                      : isDragOver
                        ? 'border-primary bg-primary/5 cursor-pointer'
                        : 'border-border/60 hover:border-border hover:bg-muted/30 cursor-pointer'
                  }`}
                >
                  <div className="size-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-2">
                    <Icon icon="lucide:upload-cloud" className="size-4" />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    Nhấn hoặc kéo thả video / tài liệu vào đây
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Hỗ trợ Video (MP4, WebM, MOV ≤ 900MB) hoặc Tài liệu (PDF, DOCX ≤ 50MB)
                  </p>
                </label>
              ) : (
                <div
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                    uploadStatus === 'UPLOAD_ERROR'
                      ? 'border-destructive/40 bg-destructive/5'
                      : uploadStatus === 'UPLOADED'
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-border/60 bg-muted/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`size-8 rounded-md flex items-center justify-center shrink-0 ${
                        uploadStatus === 'UPLOAD_ERROR'
                          ? 'bg-destructive/10 text-destructive'
                          : uploadStatus === 'UPLOADED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {uploadStatus === 'UPLOADING' ? (
                        <Icon icon="lucide:loader-2" className="size-4 animate-spin" />
                      ) : (
                        <Icon
                          icon={isVideo ? 'lucide:file-video' : 'lucide:file-text'}
                          className="size-4"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate max-w-[240px] sm:max-w-[280px]">
                        {selectedFile.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {formatFileSize(selectedFile.size)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">•</span>
                        {uploadStatus === 'UPLOADING' && (
                          <span className="text-[11px] text-primary font-medium">
                            Đang tải lên...
                          </span>
                        )}
                        {uploadStatus === 'UPLOADED' && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Đã tải lên
                          </span>
                        )}
                        {uploadStatus === 'UPLOAD_ERROR' && (
                          <span className="text-[11px] text-destructive font-medium">
                            Tải lên thất bại
                          </span>
                        )}
                      </div>
                      {uploadStatus === 'UPLOAD_ERROR' && uploadErrorMessage && (
                        <p className="text-[11px] text-destructive mt-0.5 line-clamp-1">
                          {uploadErrorMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {uploadStatus === 'UPLOAD_ERROR' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={handleRetryUpload}
                        className="h-7 px-2 text-[11px] text-primary hover:text-primary gap-1"
                        title="Thử tải lại file này"
                      >
                        <Icon icon="lucide:rotate-cw" className="size-3" />
                        <span>Thử lại</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      onClick={handleRemoveFile}
                      className="size-7 text-muted-foreground hover:text-destructive"
                      title="Xóa file khỏi bài học"
                    >
                      <Icon icon="lucide:trash-2" className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle Học thử miễn phí (isPreview) */}
            <div className="rounded-lg border border-border/40 p-3 bg-muted/10">
              <Controller
                name="isPreview"
                control={control}
                render={({ field }) => (
                  <label
                    className={`flex items-start gap-3 select-none ${
                      isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={field.value}
                      disabled={isPending}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="size-4 mt-0.5 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-foreground block">
                        Cho phép học thử miễn phí
                      </span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5 leading-relaxed">
                        Học viên có thể xem trước nội dung bài học này mà không cần mua khóa học.
                      </span>
                    </div>
                  </label>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleRequestClose}
                disabled={isPending}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending || uploadStatus === 'UPLOAD_ERROR'}
                className="text-xs gap-1.5"
              >
                {isCreating ? (
                  <>
                    <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
                    <span>Đang thêm...</span>
                  </>
                ) : isUploading ? (
                  <>
                    <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
                    <span>Đang tải file...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:plus" className="size-3.5" />
                    <span>Thêm bài học</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Cảnh báo khi file đã upload lên Cloudinary nhưng chưa lưu vào Lesson */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Icon icon="lucide:alert-triangle" className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Hủy tạo bài học?
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  File nội dung đã được tải lên Cloudinary thành công nhưng chưa được lưu vào bài học nào.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Nếu bạn đóng form bây giờ, file đã tải lên sẽ không được liên kết với bài học này. Bạn có chắc chắn muốn hủy bỏ?
          </p>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowExitConfirm(false)}
              className="text-xs"
            >
              Ở lại tiếp tục
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={performClose}
              className="text-xs"
            >
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
