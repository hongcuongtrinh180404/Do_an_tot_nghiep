'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AUTH_CONSTANTS } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '../schemas/forgot-password.schema';
import { useForgotPasswordMutation } from '../api/auth.api';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
}

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordModal({
  open,
  onOpenChange,
  initialEmail = '',
}: ForgotPasswordModalProps): React.JSX.Element {
  const [mode, setMode] = React.useState<'form' | 'sent' | 'error'>('form');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [cooldown, setCooldown] = React.useState(0);

  const forgotMutation = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: initialEmail },
  });

  React.useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const submitRequest = (data: ForgotPasswordFormData): void => {
    forgotMutation.mutate(
      { email: data.email },
      {
        onSuccess: () => {
          setMode('sent');
          setCooldown(RESEND_COOLDOWN_SECONDS);
        },
        onError: (error: unknown) => {
          const message =
            error && typeof error === 'object' && 'response' in error
              ? (error as { response?: { data?: { message?: string } } }).response?.data
                  ?.message
              : undefined;
          setErrorMessage(
            message || 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.',
          );
          setMode('error');
        },
      },
    );
  };

  const handleResend = (): void => {
    if (cooldown > 0) {
      return;
    }
    submitRequest({ email: getValues('email') });
  };

  const handleRetry = (): void => {
    setMode('form');
    setErrorMessage('');
  };

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
        Hủy
      </Button>

      {mode === 'form' && (
        <Button
          type="submit"
          form="forgot-password-form"
          disabled={forgotMutation.isPending}
        >
          {forgotMutation.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Icon icon="lucide:loader-2" className="size-4 animate-spin" />
              Đang gửi...
            </span>
          ) : (
            'Gửi liên kết'
          )}
        </Button>
      )}

      {mode === 'sent' && (
        <Button
          type="button"
          onClick={handleResend}
          disabled={forgotMutation.isPending || cooldown > 0}
        >
          {forgotMutation.isPending
            ? 'Đang gửi...'
            : cooldown > 0
              ? `Gửi lại sau ${cooldown}s`
              : 'Gửi lại'}
        </Button>
      )}

      {mode === 'error' && (
        <Button type="button" onClick={handleRetry}>
          Thử lại
        </Button>
      )}
    </>
  );

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Quên mật khẩu"
      description="Nhập email để tạo hoặc đặt lại mật khẩu Mindly."
      icon="lucide:key-round"
      footer={footer}
    >
      {mode === 'form' && (
        <form
          id="forgot-password-form"
          onSubmit={handleSubmit(submitRequest)}
          className="space-y-3"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email" className="text-xs font-medium text-foreground/85">
              Địa chỉ Email
            </Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="nguyenvana@university.edu.vn"
              autoComplete="email"
              disabled={forgotMutation.isPending}
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
            )}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Đã đăng nhập bằng Google? Bạn có thể dùng email đó để tạo thêm mật khẩu
            riêng cho Mindly.
          </p>
        </form>
      )}

      {mode === 'sent' && (
        <div className="space-y-3 py-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <Icon icon="lucide:mail-check" className="size-6" />
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Liên kết có hiệu lực trong 15 phút. Nếu chưa nhận được email, vui lòng
            kiểm tra thư mục Spam hoặc thử lại sau ít phút.
          </p>
        </div>
      )}

      {mode === 'error' && (
        <div className="space-y-3 py-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Icon icon="lucide:alert-circle" className="size-6" />
          </div>
          <p className="text-sm leading-relaxed text-foreground">{errorMessage}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Bạn có thể thử lại ngay. Nếu tình trạng kéo dài, vui lòng liên hệ quản
            trị viên.
          </p>
        </div>
      )}
    </DialogLayout>
  );
}
