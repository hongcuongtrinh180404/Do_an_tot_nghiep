'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { UserStatusEnum, type IUserProfile } from 'share-lib';
import { Button } from '@/components/ui/button';
import { DialogLayout } from '@/components/shared/dialog';
import { FormSelect } from '@/components/shared/form-fields';
import { STATUS_FILTER_OPTIONS } from '../constants/user-filter-options';
import { useUpdateUserAdminMutation } from '../api/users-admin.api';

interface UserStatusDialogProps {
  user: IUserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StatusFormData {
  status: UserStatusEnum;
}

export function UserStatusDialog({
  user,
  open,
  onOpenChange,
}: UserStatusDialogProps): React.JSX.Element | null {
  const updateMutation = useUpdateUserAdminMutation();

  const { control, handleSubmit, reset } = useForm<StatusFormData>({
    defaultValues: {
      status: user?.status || UserStatusEnum.ACTIVE,
    },
  });

  React.useEffect(() => {
    if (user) {
      reset({ status: user.status });
    }
  }, [user, reset]);

  if (!user) return null;

  const onSubmit = (data: StatusFormData) => {
    updateMutation.mutate(
      {
        userId: user.id,
        payload: { status: data.status },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Thay Đổi Trạng Thái Tài Khoản"
      description={`Cập nhật tình trạng hoạt động cho tài khoản "${user.fullName || user.email}".`}
      icon="lucide:shield-alert"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
            className="text-xs"
          >
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            size="sm"
            form="change-status-form"
            disabled={updateMutation.isPending}
            className="text-xs font-semibold"
          >
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <form id="change-status-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSelect
          name="status"
          control={control}
          label="Trạng thái tài khoản"
          description="Tài khoản bị khóa (BANNED) sẽ không thể đăng nhập vào hệ thống."
          options={STATUS_FILTER_OPTIONS}
          required
        />
      </form>
    </DialogLayout>
  );
}
