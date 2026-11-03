'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { IUserProfile } from 'share-lib';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ChangeEmailModal } from './change-email-modal';
import { ForgotPasswordModal } from '@/features/auth/components/forgot-password-modal';
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from '../schemas/change-password.schema';
import { useChangePasswordMutation } from '@/features/auth/api/auth.api';

interface AccountSettingsContentProps {
  user: IUserProfile;
}

export function AccountSettingsContent({
  user,
}: AccountSettingsContentProps): React.JSX.Element {
  const [isChangeEmailOpen, setIsChangeEmailOpen] = React.useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = React.useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const changePasswordMutation = useChangePasswordMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ChangePasswordFormData) => {
    setErrorMessage(null);
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });

      toast.success('Đổi mật khẩu thành công!', {
        description: 'Mật khẩu tài khoản của bạn đã được cập nhật an toàn.',
      });

      reset();
    } catch (err: unknown) {
      let msg = 'Đã có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại.';
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message ===
        'string'
      ) {
        msg = (err as { response: { data: { message: string } } }).response.data.message;
      } else if (err instanceof Error && err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
      toast.error('Đổi mật khẩu thất bại', { description: msg });
    }
  };

  const isEmailVerified = user.isEmailVerified !== false;
  const hasLocalPassword =
    user.hasPassword !== false && (user.provider !== 'GOOGLE' || !!user.hasPassword);

  return (
    <div className="space-y-6">
      {/* Card 1: Quản lý Email */}
      <Card className="border border-border/70 bg-card shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                <Icon icon="lucide:mail" className="size-4 text-muted-foreground" />
                Địa chỉ Email
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Email chính được sử dụng để đăng nhập và nhận thông báo quan trọng.
              </CardDescription>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isEmailVerified
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}
            >
              <Icon
                icon={isEmailVerified ? 'lucide:badge-check' : 'lucide:alert-circle'}
                className="size-3.5"
              />
              {isEmailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/50">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground block">Email hiện tại</span>
              <span className="text-sm font-medium text-foreground font-mono">
                {user.email}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsChangeEmailOpen(true)}
              className="h-9 px-3.5 text-xs font-medium hover:bg-muted"
            >
              <Icon icon="lucide:pencil" className="size-3.5 mr-1.5 text-muted-foreground" />
              Thay đổi email
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Khi thay đổi email, hệ thống sẽ gửi liên kết xác thực dùng một lần đến địa chỉ email mới.
            Email hiện tại chỉ được cập nhật sau khi bạn xác nhận liên kết.
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Đổi Mật Khẩu */}
      <Card className="border border-border/70 bg-card shadow-none">
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Icon icon="lucide:key-round" className="size-4 text-muted-foreground" />
              Đổi Mật Khẩu
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Cập nhật mật khẩu thường xuyên để tăng cường bảo mật cho tài khoản của bạn.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!hasLocalPassword ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <Icon
                  icon="lucide:alert-triangle"
                  className="size-4 text-amber-600 dark:text-amber-400 shrink-0"
                />
                <span>Tài khoản chưa thiết lập mật khẩu riêng</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Tài khoản của bạn hiện đang đăng nhập qua Google và chưa có mật khẩu Mindly riêng. Bạn có thể sử dụng chức năng Quên mật khẩu để thiết lập mật khẩu đăng nhập trực tiếp.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsForgotModalOpen(true)}
                className="h-8 text-xs font-medium border-amber-500/30 hover:bg-amber-500/10"
              >
                <Icon icon="lucide:key-round" className="size-3.5 mr-1.5" />
                Thiết lập mật khẩu ngay
              </Button>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
                  <Icon icon="lucide:alert-circle" className="size-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Field: Current Password (chống browser autofill) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="currentPassword"
                      className="text-xs font-medium text-foreground"
                    >
                      Mật khẩu hiện tại <span className="text-destructive">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu đang sử dụng"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      disabled={isSubmitting || changePasswordMutation.isPending}
                      className="h-10 text-xs pr-10 bg-background"
                      {...register('currentPassword')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      <Icon
                        icon={showCurrentPassword ? 'lucide:eye-off' : 'lucide:eye'}
                        className="size-4"
                      />
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <Icon icon="lucide:alert-circle" className="size-3" />
                      {errors.currentPassword.message}
                    </p>
                  )}
                </div>

                {/* Field: New Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="newPassword"
                    className="text-xs font-medium text-foreground"
                  >
                    Mật khẩu mới <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      autoComplete="new-password"
                      disabled={isSubmitting || changePasswordMutation.isPending}
                      className="h-10 text-xs pr-10 bg-background"
                      {...register('newPassword')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      <Icon
                        icon={showNewPassword ? 'lucide:eye-off' : 'lucide:eye'}
                        className="size-4"
                      />
                    </button>
                  </div>
                  {errors.newPassword ? (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <Icon icon="lucide:alert-circle" className="size-3" />
                      {errors.newPassword.message}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Mật khẩu phải có ít nhất 6 ký tự và khác mật khẩu hiện tại.
                    </p>
                  )}
                </div>

                {/* Field: Confirm Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-xs font-medium text-foreground"
                  >
                    Xác nhận mật khẩu mới <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu mới"
                      autoComplete="new-password"
                      disabled={isSubmitting || changePasswordMutation.isPending}
                      className="h-10 text-xs pr-10 bg-background"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      <Icon
                        icon={showConfirmPassword ? 'lucide:eye-off' : 'lucide:eye'}
                        className="size-4"
                      />
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <Icon icon="lucide:alert-circle" className="size-3" />
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting || changePasswordMutation.isPending}
                    className="bg-foreground text-background hover:bg-foreground/90 h-9 px-5 text-xs font-medium"
                  >
                    {isSubmitting || changePasswordMutation.isPending ? (
                      <>
                        <div className="size-3.5 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                        Đang cập nhật...
                      </>
                    ) : (
                      <>
                        <Icon icon="lucide:save" className="size-3.5 mr-2" />
                        Cập nhật mật khẩu
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Security & Privacy Guidelines */}
      <Card className="border border-border/70 bg-card shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Icon icon="lucide:shield-check" className="size-4 text-muted-foreground" />
            An Toàn & Bảo Mật Tài Khoản
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            Bảo vệ tài khoản Mindly của bạn bằng cách tuân thủ các nguyên tắc bảo mật sau:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/40">
              <Icon
                icon="lucide:check-circle"
                className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
              />
              <div>
                <span className="font-medium text-foreground block mb-0.5">Mật khẩu mạnh</span>
                <span className="text-[11px] leading-normal">
                  Sử dụng mật khẩu độc nhất, kết hợp chữ số và ký tự đặc biệt. Không tái sử dụng mật khẩu.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/40">
              <Icon
                icon="lucide:lock"
                className="size-4 text-muted-foreground shrink-0 mt-0.5"
              />
              <div>
                <span className="font-medium text-foreground block mb-0.5">Bảo vệ thông tin</span>
                <span className="text-[11px] leading-normal">
                  Không chia sẻ mật khẩu hoặc mã OTP đăng nhập với bất kỳ ai, kể cả đội ngũ hỗ trợ.
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <ChangeEmailModal
        open={isChangeEmailOpen}
        onOpenChange={setIsChangeEmailOpen}
        currentEmail={user.email}
        hasLocalPassword={hasLocalPassword}
        onOpenForgotPassword={() => {
          setIsChangeEmailOpen(false);
          setIsForgotModalOpen(true);
        }}
      />

      <ForgotPasswordModal
        open={isForgotModalOpen}
        onOpenChange={setIsForgotModalOpen}
        initialEmail={user.email}
      />
    </div>
  );
}
