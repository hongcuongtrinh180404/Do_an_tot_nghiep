'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  FormInput,
  FormTextarea,
  FormSelect,
} from '@/components/shared/form-fields';
import {
  ROLE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from '../constants/user-filter-options';
import {
  useAdminUserDetailQuery,
  useUpdateUserAdminMutation,
} from '../api/users-admin.api';
import {
  updateUserAdminSchema,
  type UpdateUserAdminFormValues,
} from '../schemas/user-admin.schema';
import { UserRoleBadge, UserStatusBadge } from './users-status-badge';

interface UserDetailsViewProps {
  userId: string;
}

export function UserDetailsView({ userId }: UserDetailsViewProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL fallback để giữ nguyên params phân trang / tìm kiếm khi back về
  const returnUrl = searchParams.get('returnUrl') || '/admin/users';

  // API Queries & Mutations
  const { data: user, isLoading, isError, refetch } = useAdminUserDetailQuery(userId);
  const updateMutation = useUpdateUserAdminMutation();

  const [copiedId, setCopiedId] = React.useState(false);

  // Khởi tạo React Hook Form
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<UpdateUserAdminFormValues>({
    resolver: zodResolver(updateUserAdminSchema),
    defaultValues: {
      fullName: '',
      username: '',
      bio: '',
      role: RoleEnum.STUDENT,
      status: UserStatusEnum.ACTIVE,
    },
  });

  // Đổ dữ liệu từ API vào form khi fetch thành công
  React.useEffect(() => {
    if (user) {
      reset({
        fullName: user.fullName || '',
        username: user.username || '',
        bio: user.bio || '',
        role: user.role,
        status: user.status,
      });
    }
  }, [user, reset]);

  // Xử lý sao chép User ID
  const handleCopyId = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    toast.success('Đã sao chép ID người dùng vào bộ nhớ tạm.');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Hoàn tác các trường đã thay đổi về giá trị gốc của người dùng
  const handleResetForm = () => {
    if (user) {
      reset({
        fullName: user.fullName || '',
        username: user.username || '',
        bio: user.bio || '',
        role: user.role,
        status: user.status,
      });
      toast.info('Đã hoàn tác các thay đổi trên biểu mẫu.');
    }
  };

  // Submit cập nhật
  const onSubmit = (formData: UpdateUserAdminFormValues) => {
    updateMutation.mutate(
      {
        userId,
        payload: {
          fullName: formData.fullName.trim(),
          username: formData.username?.trim() || undefined,
          bio: formData.bio?.trim() || undefined,
          role: formData.role,
          status: formData.status,
        },
      },
      {
        onSuccess: (updated) => {
          // Reset form với dữ liệu mới để formState.isDirty trở lại false
          reset({
            fullName: updated.fullName || '',
            username: updated.username || '',
            bio: updated.bio || '',
            role: updated.role,
            status: updated.status,
          });
        },
      },
    );
  };

  // Màn hình Skeleton Loading
  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="h-8 w-48 bg-muted rounded-md" />
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-muted rounded-md" />
            <div className="h-8 w-32 bg-muted rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-muted/50 rounded-xl" />
          <div className="lg:col-span-2 h-96 bg-muted/50 rounded-xl" />
        </div>
      </div>
    );
  }

  // Màn hình Lỗi hoặc Không tìm thấy người dùng
  if (isError || !user) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="size-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <Icon icon="lucide:user-x" className="size-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Không tìm thấy người dùng</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Tài khoản không tồn tại hoặc đã bị xóa khỏi hệ thống quản trị.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(returnUrl)}>
            <Icon icon="lucide:arrow-left" className="size-4 mr-1.5" />
            Quay lại danh sách
          </Button>
          <Button variant="default" size="sm" onClick={() => refetch()}>
            <Icon icon="lucide:refresh-cw" className="size-4 mr-1.5" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const initialLetter = user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase();
  const isSaving = updateMutation.isPending || isSubmitting;

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header / Action Bar - Nút Save ở trên đỉnh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(returnUrl)}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Quay lại danh sách"
          >
            <Icon icon="lucide:arrow-left" className="size-3.5 mr-1" />
            Quay lại
          </Button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate max-w-xs sm:max-w-md">
                {user.fullName || user.email.split('@')[0]}
              </h1>
              {isDirty && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Chưa lưu thay đổi
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              ID: <span className="font-mono text-[11px]">{user.id}</span>
            </p>
          </div>
        </div>

        {/* Nút Hành Động Phía Trên (Header Actions) */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Nút Hoàn tác - Chỉ hiện khi form có thay đổi */}
          {isDirty && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetForm}
              disabled={isSaving}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Icon icon="lucide:undo-2" className="size-3.5 mr-1" />
              Hoàn tác
            </Button>
          )}

          {/* Nút Save phía trên: BẮT BUỘC chỉ ENABLE khi form dirty (có thay đổi) */}
          <Button
            type="submit"
            form="user-detail-form"
            disabled={!isDirty || isSaving}
            className="text-xs font-semibold shadow-xs transition-all gap-1.5 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:save" className="size-3.5" />
                <span>Lưu thay đổi</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Cột 1: Thông tin tóm tắt & Hồ sơ (Sidebar Card) */}
        <div className="bg-card text-card-foreground border border-border/60 rounded-xl p-5 space-y-5 shadow-xs">
          <div className="flex flex-col items-center text-center pb-4 border-b border-border/50">
            <div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl ring-2 ring-primary/20 mb-3 shadow-inner">
              {initialLetter}
            </div>
            <h3 className="font-semibold text-base text-foreground">
              {user.fullName || 'Chưa đặt họ tên'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user.email}
            </p>
            {user.username && (
              <span className="text-xs font-mono text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded">
                @{user.username}
              </span>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <UserRoleBadge role={user.role} />
              <UserStatusBadge status={user.status} />
            </div>
          </div>

          {/* Chi tiết bổ sung */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Mã ID tài khoản:</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="flex items-center gap-1 font-mono hover:text-foreground cursor-pointer text-[11px]"
                title="Sao chép ID"
              >
                <span>{user.id.slice(0, 10)}...</span>
                <Icon
                  icon={copiedId ? 'lucide:check' : 'lucide:copy'}
                  className={`size-3 ${copiedId ? 'text-emerald-500' : ''}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span>Ngày khởi tạo:</span>
              <span className="text-foreground font-medium">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span>Cập nhật gần nhất:</span>
              <span className="text-foreground font-medium">
                {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Cột 2: Biểu Mẫu Chỉnh Sửa Thông Tin (Form Card) */}
        <div className="lg:col-span-2 bg-card text-card-foreground border border-border/60 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="mb-5 pb-3 border-b border-border/50">
            <h2 className="text-base font-semibold text-foreground">
              Thông Tin Tài Khoản & Quyền Hạn
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chỉnh sửa các trường bên dưới. Nút &ldquo;Lưu thay đổi&rdquo; phía trên sẽ tự động kích hoạt khi có thay đổi.
            </p>
          </div>

          <form id="user-detail-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Họ và tên */}
            <FormInput
              name="fullName"
              control={control}
              label="Họ và tên"
              placeholder="Nhập họ và tên đầy đủ..."
              startIcon="lucide:user"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tên người dùng */}
              <FormInput
                name="username"
                control={control}
                label="Tên tài khoản (Username)"
                placeholder="vd: cuong_thc"
                startIcon="lucide:at-sign"
                description="Chỉ gồm chữ cái, chữ số và gạch dưới."
              />

              {/* Email - Readonly */}
              <FormInput
                name="email"
                label="Địa chỉ Email"
                value={user.email}
                disabled
                startIcon="lucide:mail"
                description="Email là định danh chính, không thể chỉnh sửa trực tiếp."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vai trò */}
              <FormSelect
                name="role"
                control={control}
                label="Vai trò (Role)"
                options={ROLE_FILTER_OPTIONS}
                description="Phân quyền quản trị và truy cập trong hệ thống."
                required
              />

              {/* Trạng thái */}
              <FormSelect
                name="status"
                control={control}
                label="Trạng thái tài khoản"
                options={STATUS_FILTER_OPTIONS}
                description="Khóa tài khoản sẽ chặn đăng nhập tức thì."
                required
              />
            </div>

            {/* Giới thiệu bản thân */}
            <FormTextarea
              name="bio"
              control={control}
              label="Giới thiệu bản thân (Bio)"
              placeholder="Nhập phần mô tả ngắn gọn về người dùng..."
              rows={4}
              maxLength={500}
              showCount
            />
          </form>
        </div>
      </div>
    </div>
  );
}
