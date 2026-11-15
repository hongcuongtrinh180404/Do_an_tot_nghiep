'use client';

import React from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CourseLevelEnum } from 'share-lib';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

import {
  createCourseSchema,
  type CreateCourseFormData,
} from '../schemas/create-course.schema';
import { useCreateCourseMutation } from '../api/course.api';
import { CourseLevelSelect } from './course-level-select';
import { CourseCategorySelect } from './course-category-select';

export function CreateCourseForm(): React.JSX.Element {
  const createCourseMutation = useCreateCourseMutation();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateCourseFormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      level: CourseLevelEnum.ALL_LEVELS,
      categoryId: '',
    },
  });

  const isPending = isSubmitting || createCourseMutation.isPending;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('title', e.target.value, { shouldValidate: true });
  };

  const onSubmit = (data: CreateCourseFormData) => {
    createCourseMutation.mutate({
      title: data.title,
      description: data.description?.trim() || undefined,
      price: data.price !== undefined ? Number(data.price) : 0,
      level: data.level,
      categoryId: data.categoryId || undefined,
    });
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

          {/* Price, Level & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  className="rounded-xl"
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
              <Controller
                control={control}
                name="level"
                render={({ field, fieldState }) => (
                  <CourseLevelSelect
                    id="level"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isPending}
                    isInvalid={Boolean(fieldState.error)}
                  />
                )}
              />
              {errors.level && (
                <p className="text-xs font-medium text-destructive mt-1">
                  {errors.level.message}
                </p>
              )}
            </div>

            {/* Category Field */}
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">
                Danh mục <span className="text-xs text-muted-foreground">(Tùy chọn)</span>
              </Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field, fieldState }) => (
                  <CourseCategorySelect
                    id="categoryId"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isPending}
                    isInvalid={Boolean(fieldState.error)}
                  />
                )}
              />
              {errors.categoryId ? (
                <p className="text-xs font-medium text-destructive mt-1">
                  {errors.categoryId.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Phân loại khóa học trên trang khám phá
                </p>
              )}
            </div>
          </div>

          {/* Detailed Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">
              Mô tả chi tiết <span className="text-xs text-muted-foreground">(Tùy chọn)</span>
            </Label>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <RichTextEditor
                  id="description"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Nội dung giới thiệu chi tiết lộ trình học tập, yêu cầu kiến thức tiên quyết, công cụ thực hành..."
                  disabled={isPending}
                  aria-invalid={Boolean(errors.description)}
                  minHeight="280px"
                />
              )}
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
          href="/courses"
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
