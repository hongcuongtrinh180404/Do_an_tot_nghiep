'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DotLottieReact, type DotLottie } from '@lottiefiles/dotlottie-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog';
import { cn } from '@/lib/utils';
import {
  changeEmailSchema,
  type ChangeEmailFormData,
} from '../schemas/change-email.schema';
import { useChangeEmailRequestMutation } from '@/features/auth/api/auth.api';

interface ChangeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  hasLocalPassword?: boolean;
  onOpenForgotPassword?: () => void;
}

const RESEND_COOLDOWN_SECONDS = 60;
const REPLAY_DELAY_MS = 1800;

const SHAKE_CSS = `
  @keyframes mailActiveShake {
    0%, 100% {
      transform: translate3d(0, 0, 0) rotate(0deg);
    }
    15% {
      transform: translate3d(-5px, -2px, 0) rotate(-6deg) scale(1.03);
    }
    30% {
      transform: translate3d(5px, 2px, 0) rotate(6deg) scale(1.03);
    }
    45% {
      transform: translate3d(-4px, 1px, 0) rotate(-4.5deg);
    }
    60% {
      transform: translate3d(4px, -1px, 0) rotate(4.5deg);
    }
    75% {
      transform: translate3d(-2px, 1px, 0) rotate(-2deg);
    }
    90% {
      transform: translate3d(2px, -1px, 0) rotate(2deg);
    }
  }
  .animate-mail-active-shake {
    animation: mailActiveShake 0.85s ease-in-out infinite !important;
    transform-origin: center center !important;
    will-change: transform;
  }
`;

export function ChangeEmailModal({
  open,
  onOpenChange,
  currentEmail,
  hasLocalPassword = true,
  onOpenForgotPassword,
}: ChangeEmailModalProps): React.JSX.Element {
  const [mode, setMode] = React.useState<'form' | 'sent' | 'error'>('form');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [sentEmail, setSentEmail] = React.useState('');
  const [cooldown, setCooldown] = React.useState(0);
  const [showPassword, setShowPassword] = React.useState(false);
  const [dotLottie, setDotLottie] = React.useState<DotLottie | null>(null);

  const changeEmailMutation = useChangeEmailRequestMutation();

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<ChangeEmailFormData>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      newEmail: '',
      currentPassword: '',
    },
  });

  // Reset form khi đóng mở modal
  React.useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode('form');
      setErrorMessage('');
      setSentEmail('');
      setShowPassword(false);
      reset({ newEmail: '', currentPassword: '' });
    }
  }, [open, reset]);

  // Đếm ngược thời gian gửi lại (Cooldown 60s)
  React.useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  // Đảm bảo tại frame 0 (khi chưa gửi), bức thư luôn được vẽ sẵn ngay khi load xong
  React.useEffect(() => {
    if (!dotLottie) {
      return;
    }

    const renderFrameZero = (): void => {
      if (mode === 'form') {
        dotLottie.stop();
        dotLottie.setFrame(0);
      }
    };

    if (dotLottie.isLoaded && mode === 'form') {
      renderFrameZero();
    }

    dotLottie.addEventListener('load', renderFrameZero);
    dotLottie.addEventListener('ready', renderFrameZero);

    return () => {
      dotLottie.removeEventListener('load', renderFrameZero);
      dotLottie.removeEventListener('ready', renderFrameZero);
    };
  }, [dotLottie, mode]);

  // Điều khiển vòng đời Animation
  React.useEffect(() => {
    if (!dotLottie) {
      return;
    }

    if (mode === 'sent') {
      dotLottie.stop();
      dotLottie.setFrame(0);
      dotLottie.play();
    } else if (mode === 'form') {
      dotLottie.stop();
      dotLottie.setFrame(0);
    }
  }, [mode, dotLottie]);

  // Nhịp phát lại sau khi phát xong 1 lượt
  React.useEffect(() => {
    if (!dotLottie) {
      return;
    }

    let replayTimer: ReturnType<typeof setTimeout> | null = null;

    const handleComplete = (): void => {
      if (mode === 'sent') {
        replayTimer = setTimeout(() => {
          if (dotLottie) {
            dotLottie.setFrame(0);
            dotLottie.play();
          }
        }, REPLAY_DELAY_MS);
      }
    };

    dotLottie.addEventListener('complete', handleComplete);

    return () => {
      dotLottie.removeEventListener('complete', handleComplete);
      if (replayTimer) {
        clearTimeout(replayTimer);
      }
    };
  }, [dotLottie, mode]);

  const submitRequest = (data: ChangeEmailFormData): void => {
    if (data.newEmail.toLowerCase().trim() === currentEmail.toLowerCase().trim()) {
      setErrorMessage('Địa chỉ email mới phải khác với địa chỉ email hiện tại.');
      setMode('error');
      return;
    }

    changeEmailMutation.mutate(
      {
        newEmail: data.newEmail,
        currentPassword: data.currentPassword,
      },
      {
        onSuccess: () => {
          setSentEmail(data.newEmail);
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
            message || 'Không thể gửi yêu cầu thay đổi email. Vui lòng kiểm tra lại thông tin.',
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
    if (dotLottie) {
      dotLottie.stop();
      dotLottie.setFrame(0);
      dotLottie.play();
    }
    const currentValues = getValues();
    submitRequest(currentValues);
  };

  const handleRetry = (): void => {
    setMode('form');
    setErrorMessage('');
    if (dotLottie) {
      dotLottie.stop();
      dotLottie.setFrame(0);
    }
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="h-10 px-4 text-sm rounded-xl font-medium"
      >
        Hủy
      </Button>

      {hasLocalPassword && mode === 'form' && (
        <Button
          type="submit"
          form="change-email-form"
          disabled={changeEmailMutation.isPending}
          className="h-10 px-5 text-sm font-semibold rounded-xl shadow-xs hover:shadow active:scale-[0.99]"
        >
          {changeEmailMutation.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Icon icon="lucide:loader-2" className="size-4 animate-spin" aria-hidden="true" />
              Đang xác minh...
            </span>
          ) : (
            'Gửi email xác nhận'
          )}
        </Button>
      )}

      {mode === 'sent' && (
        <Button
          type="button"
          onClick={handleResend}
          disabled={changeEmailMutation.isPending || cooldown > 0}
          className="h-10 px-5 text-sm font-semibold rounded-xl shadow-xs hover:shadow"
        >
          {changeEmailMutation.isPending
            ? 'Đang gửi...'
            : cooldown > 0
              ? `Gửi lại sau ${cooldown}s`
              : 'Gửi lại'}
        </Button>
      )}

      {mode === 'error' && (
        <Button
          type="button"
          onClick={handleRetry}
          className="h-10 px-5 text-sm font-semibold rounded-xl shadow-xs hover:shadow"
        >
          Thử lại
        </Button>
      )}
    </>
  );

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Thay đổi địa chỉ email"
      description="Xác thực mật khẩu hiện tại và nhận liên kết kích hoạt hòm thư mới."
      icon="lucide:mail-cog"
      footer={footer}
      className="sm:max-w-2xl md:max-w-3xl"
    >
      <style dangerouslySetInnerHTML={{ __html: SHAKE_CSS }} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-7 items-center py-2">
        {/* Cột trái: Form hoặc trạng thái phản hồi (7 cột) */}
        <div
          className={cn(
            'md:col-span-7 flex flex-col justify-center space-y-4',
            mode === 'sent' ? 'order-2 md:order-1' : 'order-1 md:order-1',
          )}
        >
          {!hasLocalPassword ? (
            <div className="space-y-4 text-left">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Icon icon="lucide:alert-triangle" className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Yêu cầu thiết lập mật khẩu</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Tài khoản của bạn được liên kết qua Google và chưa có mật khẩu Mindly riêng. Để bảo đảm an toàn, bạn cần tạo mật khẩu nội bộ trước khi thực hiện đổi email.
                </p>
              </div>

              {onOpenForgotPassword && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenForgotPassword();
                  }}
                  className="w-full text-xs h-9 rounded-xl font-medium"
                >
                  <Icon icon="lucide:key-round" className="size-3.5 mr-2" />
                  Thiết lập mật khẩu ngay
                </Button>
              )}
            </div>
          ) : mode === 'form' ? (
            <form
              id="change-email-form"
              onSubmit={handleSubmit(submitRequest)}
              className="space-y-3.5 text-left"
              noValidate
            >
              {/* Email hiện tại (Static display - tránh Browser Autofill) */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground block font-medium">Email hiện tại</span>
                  <span className="text-xs font-mono font-medium text-foreground select-all">{currentEmail}</span>
                </div>
                <div className="size-7 rounded-lg bg-background/80 border border-border/50 flex items-center justify-center">
                  <Icon icon="lucide:lock" className="size-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Email mới */}
              <div className="space-y-1.5">
                <Label htmlFor="new-email" className="text-xs font-medium text-foreground/85">
                  Email mới cần thay đổi <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={changeEmailMutation.isPending}
                  aria-invalid={!!errors.newEmail}
                  className="h-10 text-sm rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary"
                  {...register('newEmail')}
                />
                {errors.newEmail && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.newEmail.message}
                  </p>
                )}
              </div>

              {/* Mật khẩu hiện tại (Bắt buộc nhập tay - chặn Browser Autofill) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="current-password" className="text-xs font-medium text-foreground/85">
                    Mật khẩu hiện tại <span className="text-destructive">*</span>
                  </Label>
                  {onOpenForgotPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenForgotPassword();
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu hiện tại để xác minh"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={changeEmailMutation.isPending}
                    aria-invalid={!!errors.currentPassword}
                    className="h-10 text-sm rounded-xl border-border/80 pr-10 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary"
                    {...register('currentPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <Icon
                      icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'}
                      className="size-4"
                    />
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground pt-1">
                Sau khi gửi yêu cầu, một liên kết xác minh có hiệu lực trong 15 phút sẽ được gửi đến hòm thư mới.
              </p>
            </form>
          ) : mode === 'sent' ? (
            <div role="status" aria-live="polite" className="space-y-3 text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/15 text-xs font-semibold">
                <Icon icon="lucide:mail-check" className="size-4 shrink-0" aria-hidden="true" />
                <span>Đã gửi liên kết xác nhận</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                Chúng tôi đã gửi email xác minh đến: <strong className="font-mono text-foreground">{sentEmail || getValues('newEmail')}</strong>.
              </p>
              <div className="text-xs space-y-1.5 leading-relaxed text-muted-foreground">
                <p>
                  • Vui lòng mở email mới và nhấp vào liên kết xác nhận để hoàn tất.
                </p>
                <p>
                  • Địa chỉ email hiện tại vẫn được giữ nguyên cho tới khi bạn kích hoạt liên kết này.
                </p>
                <p>
                  • Liên kết có hiệu lực trong <strong>15 phút</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div role="alert" aria-live="assertive" className="space-y-3 text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                <Icon icon="lucide:alert-circle" className="size-4 shrink-0" aria-hidden="true" />
                <span>Yêu cầu không thành công</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {errorMessage}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Vui lòng kiểm tra lại mật khẩu hiện tại hoặc nhập địa chỉ email khác chưa từng đăng ký trên hệ thống.
              </p>
            </div>
          )}
        </div>

        {/* Cột phải: Khu vực Animation Lottie (5 cột) */}
        <div
          className={cn(
            'md:col-span-5 flex flex-col items-center justify-center',
            mode === 'sent' ? 'order-1 md:order-2' : 'order-2 md:order-2',
          )}
        >
          <div
            role="img"
            aria-label={
              mode === 'sent'
                ? 'Minh họa hoạt ảnh thư đã được gửi thành công'
                : 'Minh họa bức thư Mindly đang chờ gửi'
            }
            className="w-full max-w-[240px] sm:max-w-[270px] md:max-w-[290px] aspect-square flex items-center justify-center rounded-2xl border border-border/50 bg-muted/20 dark:bg-muted/10 p-4 sm:p-5 relative overflow-hidden transition-all duration-300 shadow-xs"
          >
            <div
              className={cn(
                'w-full h-full flex items-center justify-center origin-center select-none',
                mode === 'form' && 'animate-mail-active-shake',
              )}
              style={
                mode === 'form'
                  ? {
                    animation: 'mailActiveShake 0.85s ease-in-out infinite',
                    transformOrigin: 'center center',
                  }
                  : undefined
              }
            >
              <DotLottieReact
                src="/animations/mail-sent.lottie"
                autoplay={false}
                loop={false}
                dotLottieRefCallback={setDotLottie}
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>
    </DialogLayout>
  );
}

