'use client';

import * as React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { ICourseCategory } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog/dialog-layout';
import { cn } from '@/lib/utils';
import { slugify } from '@/features/course/utils/slugify';
import {
  categoryFormSchema,
  type CategoryFormValues,
} from '../schemas/category.schema';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface SaveCategoryFormData extends CategoryFormValues {
  imageFile?: File | null;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: ICourseCategory | null;
  isSaving?: boolean;
  onSave: (data: SaveCategoryFormData) => Promise<void>;
}

export function CategoryModal({
  isOpen,
  onClose,
  category = null,
  isSaving = false,
  onSave,
}: CategoryModalProps): React.JSX.Element {
  const isEdit = Boolean(category);
  const isSlugManuallyModified = React.useRef(isEdit);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [filePreview, setFilePreview] = React.useState<string | null>(null);
  const [isImageRemoved, setIsImageRemoved] = React.useState(false);
  const [fileName, setFileName] = React.useState('');

  const previewUrl = filePreview ?? (isImageRemoved ? null : (category?.imageUrl ?? null));

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    values: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      order: category?.order ?? 0,
      isActive: category?.isActive ?? true,
    },
  });

  const watchedName = useWatch({ control, name: 'name' });

  const handleClose = () => {
    if (isSaving) return;
    setImageFile(null);
    setFilePreview(null);
    setIsImageRemoved(false);
    setFileName('');
    isSlugManuallyModified.current = false;
    onClose();
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    setValue('name', name, { shouldValidate: true });

    if (!isSlugManuallyModified.current) {
      setValue('slug', slugify(name), { shouldValidate: Boolean(name.trim()) });
    }
  };

  const handleSlugChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    isSlugManuallyModified.current = true;
    setValue('slug', event.target.value.toLowerCase(), { shouldValidate: true });
  };

  const handleRegenerateSlug = () => {
    isSlugManuallyModified.current = false;
    const generated = slugify(getValues('name') || '');
    setValue('slug', generated, { shouldValidate: true });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Định dạng ảnh không được hỗ trợ', {
        description: 'Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF.',
      });
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Ảnh quá lớn', {
        description: 'Dung lượng ảnh tối đa là 10MB.',
      });
      event.target.value = '';
      return;
    }

    setImageFile(file);
    setFileName(file.name);
    setIsImageRemoved(false);

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      setFilePreview(readerEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setFileName('');
    setFilePreview(null);
    setIsImageRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const submitHandler = async (values: CategoryFormValues) => {
    try {
      await onSave({
        ...values,
        order: category?.order ?? values.order ?? 0,
        slug: values.slug?.trim() || undefined,
        description: values.description?.trim() || undefined,
        imageFile,
      });
    } catch {
      // Mutation hook already surfaced the error via toast.
    }
  };

  return (
    <DialogLayout
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSaving) handleClose();
      }}
      title={isEdit ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
      description={
        isEdit
          ? 'Cập nhật thông tin, trạng thái hoạt động và ảnh đại diện của danh mục.'
          : 'Tạo danh mục mới để phân loại và tổ chức các khóa học trên hệ thống.'
      }
      icon={isEdit ? 'lucide:pencil-line' : 'lucide:folder-plus'}
      className="sm:max-w-[500px]"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={handleClose}
            disabled={isSaving}
            className="text-xs"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form="category-form"
            size="default"
            disabled={isSaving}
            className="text-xs font-semibold min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                Đang lưu...
              </>
            ) : isEdit ? (
              'Lưu thay đổi'
            ) : (
              'Tạo danh mục'
            )}
          </Button>
        </>
      }
    >
      <form
        id="category-form"
        onSubmit={handleSubmit(submitHandler)}
        className="space-y-4 pt-1"
      >
        {/* 1. Tên danh mục */}
        <div className="space-y-1.5">
          <Label htmlFor="category-name" className="text-xs font-semibold text-foreground">
            Tên danh mục <span className="text-destructive">*</span>
          </Label>
          <Input
            id="category-name"
            autoFocus
            placeholder="Ví dụ: Lập trình & Kỹ thuật"
            aria-invalid={Boolean(errors.name)}
            disabled={isSaving}
            {...register('name')}
            onChange={handleNameChange}
          />
          {errors.name && (
            <p className="text-xs font-medium text-destructive mt-1" role="alert">
              {errors.name.message}
            </p>
          )}

          {/* Live slug preview khi tạo mới */}
          {!isEdit && watchedName?.trim() && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <Icon icon="lucide:link-2" className="size-3 shrink-0 text-muted-foreground/70" />
              <span>Đường dẫn dự kiến:</span>
              <span className="text-foreground tracking-tight underline underline-offset-2 decoration-border">
                {slugify(watchedName)}
              </span>
            </div>
          )}
        </div>

        {/* 2. Đường dẫn slug (chỉ hiển thị khi chỉnh sửa) */}
        {isEdit ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="category-slug" className="text-xs font-semibold text-foreground">
                Đường dẫn tĩnh (Slug)
              </Label>
              <button
                type="button"
                onClick={handleRegenerateSlug}
                disabled={isSaving}
                aria-label="Tạo lại slug từ tên danh mục"
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <Icon icon="lucide:refresh-cw" className="size-3" />
                <span>Tạo lại từ tên</span>
              </button>
            </div>
            <Input
              id="category-slug"
              placeholder="lap-trinh-ky-thuat"
              aria-invalid={Boolean(errors.slug)}
              disabled={isSaving}
              {...register('slug')}
              onChange={handleSlugChange}
            />
            {errors.slug ? (
              <p className="text-xs font-medium text-destructive mt-1" role="alert">
                {errors.slug.message}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Để trống để hệ thống tự động đồng bộ slug theo tên danh mục.
              </p>
            )}
          </div>
        ) : null}

        {/* 3. Mô tả danh mục */}
        <div className="space-y-1.5">
          <Label htmlFor="category-description" className="text-xs font-semibold text-foreground">
            Mô tả <span className="text-[11px] font-normal text-muted-foreground">(Không bắt buộc)</span>
          </Label>
          <Textarea
            id="category-description"
            rows={3}
            placeholder="Mô tả ngắn gọn về chủ đề và nhóm khóa học trong danh mục này..."
            aria-invalid={Boolean(errors.description)}
            disabled={isSaving}
            {...register('description')}
          />
          {errors.description && (
            <p className="text-xs font-medium text-destructive mt-1" role="alert">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* 4. Trạng thái hiển thị (Status Bar Card - Horizontal Modern Component) */}
        <div className="rounded-xl border border-border/70 bg-muted/15 p-3 sm:p-3.5 transition-colors">
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'size-2 rounded-full shrink-0 transition-colors',
                        field.value ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                      )}
                      aria-hidden="true"
                    />
                    <Label
                      htmlFor="category-status-toggle"
                      className="text-xs font-semibold text-foreground cursor-pointer"
                    >
                      Trạng thái hoạt động
                    </Label>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                        field.value
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {field.value ? 'Đang hiển thị' : 'Tạm ẩn'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {field.value
                      ? 'Danh mục hiển thị công khai trên thanh điều hướng và bộ lọc.'
                      : 'Danh mục tạm ẩn, học viên sẽ không nhìn thấy trên hệ thống.'}
                  </p>
                </div>

                <button
                  id="category-status-toggle"
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  aria-label="Chuyển đổi trạng thái hiển thị danh mục"
                  disabled={isSaving}
                  onClick={() => field.onChange(!field.value)}
                  onBlur={field.onBlur}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
                    field.value ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block size-5 rounded-full bg-white shadow-xs ring-0 transition-transform',
                      field.value ? 'translate-x-5' : 'translate-x-0',
                    )}
                  />
                </button>
              </div>
            )}
          />
        </div>

        {/* 5. Ảnh đại diện danh mục (Compact Media Uploader) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            Ảnh đại diện / Biểu trưng{' '}
            <span className="text-[11px] font-normal text-muted-foreground">(Không bắt buộc)</span>
          </Label>

          <div className="flex items-center gap-3.5 rounded-xl border border-border/70 bg-muted/10 p-3 sm:p-3.5">
            {/* Thumbnail Preview Box */}
            <div className="relative size-16 sm:size-18 rounded-xl border border-border/80 bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={fileName || category?.name || 'Ảnh đại diện danh mục'}
                  className="size-full object-contain p-1"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground/50">
                  <Icon icon="lucide:image" className="size-6" />
                </div>
              )}
            </div>

            {/* Thông tin & Nút hành động */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {fileName || (previewUrl ? 'Ảnh hiện tại' : 'Chưa có ảnh đại diện')}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {fileName
                    ? 'Ảnh mới sẽ được tải lên khi bạn nhấn lưu.'
                    : 'Hỗ trợ JPEG, PNG, WebP hoặc GIF (tối đa 10MB).'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                  className="text-[11px] font-medium"
                >
                  <Icon icon="lucide:upload" className="size-3 mr-1" />
                  {previewUrl ? 'Thay đổi ảnh' : 'Tải ảnh lên'}
                </Button>

                {previewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleRemoveImage}
                    disabled={isSaving}
                    aria-label="Xóa ảnh đại diện đã chọn"
                    className="text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Icon icon="lucide:trash-2" className="size-3 mr-1" />
                    Gỡ bỏ
                  </Button>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              id="category-image-input"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isSaving}
            />
          </div>
        </div>
      </form>
    </DialogLayout>
  );
}
