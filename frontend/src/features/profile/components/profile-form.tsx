'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { IUserProfile } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { updateProfileSchema, type UpdateProfileFormData } from '../schemas/profile.schema';
import { useUpdateProfileMutation } from '../api/profile.api';

interface ProfileFormProps {
  user: IUserProfile;
}

export function ProfileForm({ user }: ProfileFormProps): React.JSX.Element {
  const updateMutation = useUpdateProfileMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    },
  });

  useEffect(() => {
    reset({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    });
  }, [user, reset]);

  const onSubmit = (data: UpdateProfileFormData) => {
    updateMutation.mutate({
      firstName: data.firstName || undefined,
      lastName: data.lastName || undefined,
    });
  };

  return (
    <Card className="border-border/50 bg-card shadow-xs">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Icon icon="lucide:user-cog" className="size-5 text-primary" />
          Thông Tin Cá Nhân
        </CardTitle>
        <CardDescription className="text-xs">
          Cập nhật họ và tên hiển thị trong toàn bộ hệ thống đồ án tốt nghiệp
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email (Read only) */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Icon icon="lucide:mail" className="size-3.5" />
              Địa chỉ Email (Không thể chỉnh sửa)
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted/40 cursor-not-allowed text-xs pr-8"
              />
              <Icon
                icon="lucide:lock"
                className="size-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Last Name */}
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs font-medium">
                Họ và tên đệm
              </Label>
              <Input
                id="lastName"
                placeholder="Ví dụ: Nguyễn Văn"
                {...register('lastName')}
                disabled={updateMutation.isPending}
                className="text-xs"
              />
              {errors.lastName && (
                <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                  <Icon icon="lucide:alert-circle" className="size-3" />
                  {errors.lastName.message}
                </p>
              )}
            </div>

            {/* First Name */}
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs font-medium">
                Tên
              </Label>
              <Input
                id="firstName"
                placeholder="Ví dụ: An"
                {...register('firstName')}
                disabled={updateMutation.isPending}
                className="text-xs"
              />
              {errors.firstName && (
                <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                  <Icon icon="lucide:alert-circle" className="size-3" />
                  {errors.firstName.message}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                reset({
                  firstName: user.firstName || '',
                  lastName: user.lastName || '',
                })
              }
              disabled={!isDirty || updateMutation.isPending}
              className="text-xs"
            >
              Đặt lại
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isDirty || updateMutation.isPending}
              className="text-xs shadow-xs"
            >
              {updateMutation.isPending ? (
                <>
                  <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Icon icon="lucide:check" className="size-3.5 mr-1.5" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
