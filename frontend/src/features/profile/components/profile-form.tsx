'use client';

import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { IUserProfile } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { updateProfileSchema, type UpdateProfileFormData } from '../schemas/profile.schema';
import { useUpdateProfileMutation } from '../api/profile.api';

interface ProfileFormProps {
  user: IUserProfile;
}

export function ProfileForm({ user }: ProfileFormProps): React.JSX.Element {
  const updateMutation = useUpdateProfileMutation();

  const initialFullName = user.fullName || [user.lastName, user.firstName].filter(Boolean).join(' ');

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: initialFullName,
      bio: user.bio || '',
    },
  });

  const currentBio = useWatch({ control, name: 'bio' }) || '';

  useEffect(() => {
    reset({
      fullName: initialFullName,
      bio: user.bio || '',
    });
  }, [user, reset, initialFullName]);

  const onSubmit = (data: UpdateProfileFormData) => {
    updateMutation.mutate({
      fullName: data.fullName,
      bio: data.bio?.trim() ?? '',
    });
  };

  return (
    <Card className="border border-border/70 bg-card shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-foreground">
          Thông Tin Cá Nhân
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Cập nhật thông tin hiển thị trên chứng chỉ, bài học và thảo luận cộng đồng
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-medium text-foreground">
                Họ và tên <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder="Nguyễn Văn A"
                {...register('fullName')}
                disabled={updateMutation.isPending}
                className="h-9 text-xs border-border/70"
              />
              {errors.fullName && (
                <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                  <Icon icon="lucide:alert-circle" className="size-3 shrink-0" />
                  {errors.fullName.message}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio" className="text-xs font-medium text-foreground">
                Giới thiệu bản thân
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {currentBio.length}/500
              </span>
            </div>
            <textarea
              id="bio"
              rows={3}
              placeholder="Chia sẻ ngắn gọn về sở thích, mục tiêu học tập hoặc chuyên môn của bạn..."
              {...register('bio')}
              disabled={updateMutation.isPending}
              maxLength={500}
              className="w-full rounded-md border border-border/70 bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors"
            />
            {errors.bio?.message && (
              <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                <Icon icon="lucide:alert-circle" className="size-3 shrink-0" />
                {errors.bio.message}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                reset({
                  fullName: initialFullName,
                  bio: user.bio || '',
                })
              }
              disabled={!isDirty || updateMutation.isPending}
              className="text-xs h-8 px-3 border-border/70"
            >
              Đặt lại
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isDirty || updateMutation.isPending}
              className="text-xs h-8 px-4 bg-foreground text-background hover:bg-foreground/90 transition-colors shadow-none"
            >
              {updateMutation.isPending ? (
                <>
                  <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
