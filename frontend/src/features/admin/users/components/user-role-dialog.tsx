'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { RoleEnum, type IUserProfile } from 'share-lib';
import { Button } from '@/components/ui/button';
import { DialogLayout } from '@/components/shared/dialog';
import { FormSelect } from '@/components/shared/form-fields';
import { ROLE_FILTER_OPTIONS } from '../constants/user-filter-options';
import { useUpdateUserAdminMutation } from '../api/users-admin.api';

interface UserRoleDialogProps {
  user: IUserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RoleFormData {
  role: RoleEnum;
}

export function UserRoleDialog({
  user,
  open,
  onOpenChange,
}: UserRoleDialogProps): React.JSX.Element | null {
  const updateMutation = useUpdateUserAdminMutation();

  const { control, handleSubmit, reset } = useForm<RoleFormData>({
    defaultValues: {
      role: user?.role || RoleEnum.STUDENT,
    },
  });

  React.useEffect(() => {
    if (user) {
      reset({ role: user.role });
    }
  }, [user, reset]);

  if (!user) return null;

  const onSubmit = (data: RoleFormData) => {
    updateMutation.mutate(
      {
        userId: user.id,
        payload: { role: data.role },
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
      title="Thay Đổi Vai Trò Người Dùng"
      description={`Cập nhật quyền truy cập cho tài khoản "${user.fullName || user.email}".`}
      icon="lucide:user-cog"
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
            form="change-role-form"
            disabled={updateMutation.isPending}
            className="text-xs font-semibold"
          >
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <form id="change-role-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSelect
          name="role"
          control={control}
          label="Vai trò mới"
          description="Vai trò quyết định các chức năng và quyền truy cập trong hệ thống."
          options={ROLE_FILTER_OPTIONS}
          required
        />
      </form>
    </DialogLayout>
  );
}
