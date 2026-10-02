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
import { Icon } from '@/components/ui/icon';

import {
  createLessonSchema,
  type CreateLessonFormData,
  ACCEPTED_VIDEO_FILE_EXTENSIONS,
  ACCEPTED_DOCUMENT_FILE_EXTENSIONS,
  MAX_VIDEO_FILE_SIZE,
  MAX_DOCUMENT_FILE_SIZE,
  isVideoFile,
  isDocumentFile,
} from '../schemas/create-lesson.schema';
import { LessonKeyPointsInput } from './lesson-key-points-input';
import {
  serializeKeyPoints,
  generateKeyPointId,
} from '../utils/lesson-key-points.util';
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
      keyPoints: [{ id: generateKeyPointId(), text: '' }],
      order: calculatedOrder,
      contentType: 'video',
      contentFile: null,
      isPreview: false,
    },
  });

  const selectedFile = useWatch({ control, name: 'contentFile' });
  const contentType = useWatch({ control, name: 'contentType' }) ?? 'video';

  const isUploading = uploadStatus === 'UPLOADING' || uploadMutation.isPending;
  const isCreating = isSubmitting || createLessonMutation.isPending;
  const isPending = isUploading || isCreating;

  // Reset form whenever the dialog opens or calculated order updates
  useEffect(() => {
    if (open) {
      reset({
        title: '',
        keyPoints: [{ id: generateKeyPointId(), text: '' }],
        order: calculatedOrder,
        contentType: 'video',
        contentFile: null,
        isPreview: false,
      });
    }
  }, [open, calculatedOrder, reset]);

  const performClose = () => {
    reset({
      title: '',
      keyPoints: [{ id: generateKeyPointId(), text: '' }],
      order: calculatedOrder,
      contentType: 'video',
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

    // Nếu đã upload file thành công lên MinIO mà chưa submit bài học -> Hiện confirmation dialog
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
          : 'Tải file lên máy chủ lưu trữ thất bại. Vui lòng thử lại.';
      setUploadErrorMessage(msg || 'Lỗi tải file lên máy chủ lưu trữ');
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

    // Client-side file type and size validation according to contentType
    if (contentType === 'video') {
      if (!isVideoFile(file)) {
        toast.error('Định dạng file không phù hợp', {
          description:
            'Bạn đang chọn loại "Video bài giảng". Vui lòng chọn file video định dạng .mp4, .webm hoặc .mov.',
        });
        return;
      }
      if (file.size > MAX_VIDEO_FILE_SIZE) {
        toast.error('Dung lượng video vượt quá giới hạn', {
          description: `Dung lượng video (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá mức tối đa cho phép là 5GB.`,
        });
        return;
      }
    } else {
      if (!isDocumentFile(file)) {
        toast.error('Định dạng file không phù hợp', {
          description:
            'Bạn đang chọn loại "Tài liệu tham khảo / Bài đọc". Vui lòng chọn file tài liệu định dạng .pdf hoặc .docx.',
        });
        return;
      }
      if (file.size > MAX_DOCUMENT_FILE_SIZE) {
        toast.error('Dung lượng tài liệu vượt quá giới hạn', {
          description: `Dung lượng tài liệu (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá mức tối đa cho phép là 500MB.`,
        });
        return;
      }
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
        description: 'Vui lòng chờ quá trình tải file lên máy chủ lưu trữ hoàn tất trước khi thêm bài học.',
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
      const serializedDescription = serializeKeyPoints(data.keyPoints);

      await createLessonMutation.mutateAsync({
        title: data.title.trim(),
        description: serializedDescription,
        order: calculatedOrder,
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

            {/* Nội dung cốt lõi của bài học (Lesson Key Points) */}
            <Controller
              name="keyPoints"
              control={control}
              render={({ field }) => (
                <LessonKeyPointsInput
                  id="lesson-key-points"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                  error={errors.keyPoints?.message}
                />
              )}
            />

            {/* Loại nội dung bài học */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="lesson-content-type" className="text-xs font-medium text-foreground">
                  Loại nội dung bài học
                </Label>
                {selectedFile && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <Icon icon="lucide:info" className="size-3 shrink-0" />
                    <span>Xóa file hiện tại để đổi loại nội dung</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  id="lesson-content-type"
                  disabled={isPending || Boolean(selectedFile)}
                  {...register('contentType')}
                  className="h-9 w-full appearance-none rounded-lg border border-input bg-transparent px-3 py-1.5 pr-8 text-xs font-medium text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-75 dark:bg-input/30"
                >
                  <option value="video" className="bg-popover text-popover-foreground">
                    🎬 Video bài giảng (MP4, WebM, MOV)
                  </option>
                  <option value="document" className="bg-popover text-popover-foreground">
                    📄 Tài liệu tham khảo / Bài đọc (PDF, DOCX)
                  </option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
                  <Icon icon="lucide:chevron-down" className="size-3.5" />
                </div>
              </div>
            </div>

            {/* Tài liệu / Video bài học */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">
                  {contentType === 'video' ? 'Video bài giảng' : 'Tài liệu học tập'}
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
                      Đã lưu MinIO
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
                key={`${contentType}-${selectedFile ? selectedFile.name : 'empty'}`}
                type="file"
                accept={
                  contentType === 'video'
                    ? ACCEPTED_VIDEO_FILE_EXTENSIONS
                    : ACCEPTED_DOCUMENT_FILE_EXTENSIONS
                }
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
                    <Icon
                      icon={contentType === 'video' ? 'lucide:video' : 'lucide:file-text'}
                      className="size-4"
                    />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    {contentType === 'video'
                      ? 'Nhấn hoặc kéo thả video bài giảng vào đây'
                      : 'Nhấn hoặc kéo thả tài liệu học tập vào đây'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {contentType === 'video'
                      ? 'Hỗ trợ Video (MP4, WebM, MOV ≤ 5GB)'
                      : 'Hỗ trợ Tài liệu (PDF, Word .docx ≤ 500MB)'}
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
                          icon={isVideo ? 'lucide:video' : 'lucide:file-text'}
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

            {/* Interactive Toggle Card: Cho phép học thử miễn phí (isPreview) */}
            <Controller
              name="isPreview"
              control={control}
              render={({ field }) => {
                const isChecked = Boolean(field.value);
                return (
                  <div
                    className={`rounded-xl border p-3.5 transition-all duration-200 ${
                      isChecked
                        ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/25 shadow-xs'
                        : 'border-border/60 bg-muted/10 hover:border-border/80'
                    } ${isPending ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            isChecked
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon
                            icon={isChecked ? 'lucide:lock-open' : 'lucide:lock'}
                            className="size-4.5"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              Cho phép học thử miễn phí
                            </span>
                            {isChecked ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                Mở phễu
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Khóa
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">
                            {isChecked
                              ? 'Học viên có thể xem trước nội dung bài học này mà không cần mua khóa học.'
                              : 'Chỉ học viên đã đăng ký khóa học mới có quyền truy cập bài học này.'}
                          </p>
                        </div>
                      </div>

                      {/* Switch toggle control */}
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isPending}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 dark:peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>
                );
              }}
            />

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

      {/* Confirmation Dialog: Cảnh báo khi file đã upload lên MinIO nhưng chưa lưu vào Lesson */}
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
                  File nội dung đã được tải lên máy chủ lưu trữ (MinIO) thành công nhưng chưa được lưu vào bài học nào.
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
