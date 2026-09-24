'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CourseLevelEnum } from 'share-lib';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

import {
  createCourseSchema,
  type CreateCourseFormData,
} from '../schemas/create-course.schema';
import { slugify } from '../utils/slugify';
import { useCreateCourseMutation } from '../api/course.api';

export function CreateCourseForm(): React.JSX.Element {
  const isSlugManuallyModified = useRef(false);
  const createCourseMutation = useCreateCourseMutation();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateCourseFormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      title: '',
      slug: '',
      shortDescription: '',
      description: '',
      price: 0,
      level: CourseLevelEnum.ALL_LEVELS,
    },
  });

  const isPending = isSubmitting || createCourseMutation.isPending;

  // Handle title change and auto-slugify if not manually touched
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setValue('title', newTitle, { shouldValidate: true });

    if (!isSlugManuallyModified.current) {
      const generatedSlug = slugify(newTitle);
      setValue('slug', generatedSlug, { shouldValidate: Boolean(generatedSlug) });
    }
  };

  // Handle manual slug input
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isSlugManuallyModified.current = true;
    setValue('slug', e.target.value.toLowerCase().trim(), { shouldValidate: true });
  };

  // Re-generate slug from current title
  const handleRegenerateSlug = () => {
    isSlugManuallyModified.current = false;
    const currentTitle = getValues('title');
    const generatedSlug = slugify(currentTitle || '');
    setValue('slug', generatedSlug, { shouldValidate: true });
    toast.info('Đã tạo lại slug từ tiêu đề');
  };

  const onSubmit = (data: CreateCourseFormData) => {
    createCourseMutation.mutate(
      {
        title: data.title,
        slug: data.slug,
        shortDescription: data.shortDescription?.trim() || undefined,
        description: data.description?.trim() || undefined,
        price: data.price !== undefined ? Number(data.price) : 0,
        level: data.level,
      },
      {
        onError: (error: unknown) => {
          const axiosError = error as {
            response?: {
              status?: number;
              data?: {
                message?: string | string[];
              };
            };
          };

          if (axiosError.response?.status === 409) {
            setError('slug', {
              type: 'server',
              message: 'Đường dẫn tĩnh (slug) này đã tồn tại, vui lòng chọn slug khác.',
            });
          }
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information Card */}
      <Card className="border-border/50 bg-card/60 shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Icon icon="lucide:book-marked" className="size-5 text-foreground/80" />
            Thông Tin Khóa Học
          </CardTitle>
          <CardDescription>
            Các thông tin cơ bản định danh và giới thiệu tổng quan khóa học đến học viên
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Title Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">
                Tiêu đề khóa học <span className="text-destructive">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">3 - 200 ký tự</span>
            </div>
            <Input
              id="title"
              placeholder="Ví dụ: Lập trình Full-Stack Web với Next.js & NestJS"
              aria-invalid={Boolean(errors.title)}
              disabled={isPending}
              {...register('title')}
              onChange={handleTitleChange}
            />
            {errors.title && (
              <p className="text-xs font-medium text-destructive mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Slug Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="slug">
                Đường dẫn tĩnh (Slug) <span className="text-destructive">*</span>
              </Label>
              <button
                type="button"
                onClick={handleRegenerateSlug}
                disabled={isPending}
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon="lucide:refresh-cw" className="size-3" />
                Tạo lại từ tiêu đề
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none pointer-events-none">
                /courses/
              </span>
              <Input
                id="slug"
                className="pl-18 font-mono text-xs sm:text-sm"
                placeholder="lap-trinh-full-stack-web"
                aria-invalid={Boolean(errors.slug)}
                disabled={isPending}
                {...register('slug')}
                onChange={handleSlugChange}
              />
            </div>
            {errors.slug ? (
              <p className="text-xs font-medium text-destructive mt-1">
                {errors.slug.message}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">
                Đường dẫn chuẩn SEO chỉ bao gồm chữ cái thường, số và dấu gạch ngang
              </p>
            )}
          </div>

          {/* Price & Level Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Price Field */}
            <div className="space-y-1.5">
              <Label htmlFor="price">
                Học phí (VND) <span className="text-xs text-muted-foreground">(Tùy chọn)</span>
              </Label>
              <div className="relative">
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="0"
                  aria-invalid={Boolean(errors.price)}
                  disabled={isPending}
                  {...register('price', { valueAsNumber: true })}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none pointer-events-none font-medium">
                  đ
                </span>
              </div>
              {errors.price ? (
                <p className="text-xs font-medium text-destructive mt-1">
                  {errors.price.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Nhập 0 hoặc để trống nếu là khóa học miễn phí
                </p>
              )}
            </div>

            {/* Level Field */}
            <div className="space-y-1.5">
              <Label htmlFor="level">
                Cấp độ <span className="text-xs text-muted-foreground">(Tùy chọn)</span>
              </Label>
              <select
                id="level"
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
                aria-invalid={Boolean(errors.level)}
                disabled={isPending}
                {...register('level')}
              >
                <option
                  value={CourseLevelEnum.ALL_LEVELS}
                  className="bg-popover text-popover-foreground"
                >
                  Tất cả cấp độ
                </option>
                <option
                  value={CourseLevelEnum.BEGINNER}
                  className="bg-popover text-popover-foreground"
                >
                  Cơ bản
                </option>
                <option
                  value={CourseLevelEnum.INTERMEDIATE}
                  className="bg-popover text-popover-foreground"
                >
                  Trung cấp
                </option>
                <option
                  value={CourseLevelEnum.ADVANCED}
                  className="bg-popover text-popover-foreground"
                >
                  Nâng cao
                </option>
              </select>
              {errors.level && (
                <p className="text-xs font-medium text-destructive mt-1">
                  {errors.level.message}
                </p>
              )}
            </div>
          </div>

          {/* Short Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="shortDescription">
                Mô tả ngắn <span className="text-xs text-muted-foreground">(Tùy chọn)</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">Tối đa 500 ký tự</span>
            </div>
            <Textarea
              id="shortDescription"
              rows={3}
              placeholder="Tóm tắt ngắn gọn các kỹ năng và giá trị học viên sẽ đạt được sau khóa học..."
              aria-invalid={Boolean(errors.shortDescription)}
              disabled={isPending}
              {...register('shortDescription')}
            />
            {errors.shortDescription && (
              <p className="text-xs font-medium text-destructive mt-1">
                {errors.shortDescription.message}
              </p>
            )}
          </div>

          {/* Detailed Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">
              Mô tả chi tiết <span className="text-xs text-muted-foreground">(Tùy chọn)</span>
            </Label>
            <Textarea
              id="description"
              rows={6}
              placeholder="Nội dung giới thiệu chi tiết lộ trình học tập, yêu cầu kiến thức tiên quyết, công cụ thực hành..."
              aria-invalid={Boolean(errors.description)}
              disabled={isPending}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs font-medium text-destructive mt-1">
                {errors.description.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/instructor/courses"
          className={buttonVariants({
            variant: 'outline',
            size: 'default',
            className: isPending ? 'pointer-events-none opacity-50' : '',
          })}
          aria-disabled={isPending}
        >
          Hủy
        </Link>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Icon icon="lucide:loader-2" className="size-4 mr-1.5 animate-spin" />
              Đang tạo khóa học...
            </>
          ) : (
            <>
              <Icon icon="lucide:check" className="size-4 mr-1.5" />
              Tạo khóa học
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
