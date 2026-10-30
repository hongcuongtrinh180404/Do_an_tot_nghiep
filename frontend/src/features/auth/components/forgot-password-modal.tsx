'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AUTH_CONSTANTS } from 'share-lib';
import { DotLottieReact, type DotLottie } from '@lottiefiles/dotlottie-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog';
import { cn } from '@/lib/utils';
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
const REPLAY_DELAY_MS = 1800; // Nghỉ 1.8s trước khi tự động phát lại (Phương án B)

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

export function ForgotPasswordModal({
  open,
  onOpenChange,
  initialEmail = '',
}: ForgotPasswordModalProps): React.JSX.Element {
  const [mode, setMode] = React.useState<'form' | 'sent' | 'error'>('form');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [cooldown, setCooldown] = React.useState(0);
  const [dotLottie, setDotLottie] = React.useState<DotLottie | null>(null);

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

  // Điều khiển vòng đời Animation:
  // - Khi backend xác nhận thành công ('sent'): Tua về đầu (frame 0) và phát 1 lượt.
  // - Khi quay lại 'form': Giữ tại frame 0.
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

  // Nhịp phát lại (Phương án B): Sau khi phát xong 1 lượt, nghỉ 1.8s rồi phát lại từ đầu
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
    if (dotLottie) {
      dotLottie.stop();
      dotLottie.setFrame(0);
      dotLottie.play();
    }
    submitRequest({ email: getValues('email') });
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

      {mode === 'form' && (
        <Button
          type="submit"
          form="forgot-password-form"
          disabled={forgotMutation.isPending}
          className="h-10 px-5 text-sm font-semibold rounded-xl shadow-sm hover:shadow active:scale-[0.99]"
        >
          {forgotMutation.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Icon icon="lucide:loader-2" className="size-4 animate-spin" aria-hidden="true" />
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
          className="h-10 px-5 text-sm font-semibold rounded-xl shadow-sm hover:shadow"
        >
          {forgotMutation.isPending
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
          className="h-10 px-5 text-sm font-semibold rounded-xl shadow-sm hover:shadow"
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
      title="Quên mật khẩu"
      description="Nhập email để tạo hoặc đặt lại mật khẩu Mindly."
      icon="lucide:key-round"
      footer={footer}
      className="sm:max-w-2xl md:max-w-3xl"
    >
      {/* CSS: Rung lắc sinh động rõ rệt cho bức thư ở Frame 0 cho tới khi gửi email thành công */}
      <style dangerouslySetInnerHTML={{ __html: SHAKE_CSS }} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-7 items-center py-2">
        {/* Cột trái: Form nhập email / Nội dung trạng thái (7 cột) */}
        <div
          className={cn(
            'md:col-span-7 flex flex-col justify-center space-y-4',
            mode === 'sent' ? 'order-2 md:order-1' : 'order-1 md:order-1',
          )}
        >
          {mode === 'form' && (
            <form
              id="forgot-password-form"
              onSubmit={handleSubmit(submitRequest)}
              className="space-y-3.5"
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
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={forgotMutation.isPending}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'forgot-email-error' : 'forgot-email-hint'}
                  className="h-10 text-sm rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary"
                  {...register('email')}
                />
                {errors.email && (
                  <p id="forgot-email-error" className="text-xs font-medium text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <p id="forgot-email-hint" className="text-xs leading-relaxed text-muted-foreground">
                Đã đăng nhập bằng Google? Bạn có thể dùng email đó để tạo thêm mật khẩu
                riêng cho Mindly.
              </p>
            </form>
          )}

          {mode === 'sent' && (
            <div role="status" aria-live="polite" className="space-y-3 text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/15 text-xs font-semibold">
                <Icon icon="lucide:mail-check" className="size-4 shrink-0" aria-hidden="true" />
                <span>Đã tiếp nhận yêu cầu</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Liên kết có hiệu lực trong 15 phút. Nếu chưa nhận được thư, vui lòng
                kiểm tra thư mục Spam hoặc thử gửi lại khi hết thời gian chờ.
              </p>
            </div>
          )}

          {mode === 'error' && (
            <div role="alert" aria-live="assertive" className="space-y-3 text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                <Icon icon="lucide:alert-circle" className="size-4 shrink-0" aria-hidden="true" />
                <span>Gửi không thành công</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {errorMessage}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Bạn có thể thử lại ngay. Nếu tình trạng kéo dài, vui lòng kiểm tra kết nối mạng
                hoặc liên hệ quản trị viên Mindly.
              </p>
            </div>
          )}
        </div>

        {/* Cột phải: Khu vực Animation Lottie (5 cột - kích thước to hơn) */}
        <div
          className={cn(
            'md:col-span-5 flex flex-col items-center justify-center',
            mode === 'sent' ? 'order-1 md:order-2' : 'order-2 md:order-2',
          )}
        >
          {/* Khung viền ngoài giữ cố định, vững chãi */}
          <div
            role="img"
            aria-label={
              mode === 'sent'
                ? 'Minh họa hoạt ảnh thư đã được gửi thành công'
                : 'Minh họa bức thư Mindly đang chờ gửi'
            }
            className="w-full max-w-[240px] sm:max-w-[270px] md:max-w-[290px] aspect-square flex items-center justify-center rounded-2xl border border-border/50 bg-muted/20 dark:bg-muted/10 p-4 sm:p-5 relative overflow-hidden transition-all duration-300 shadow-xs"
          >
            {/* Lớp bao bọc riêng cho bức thư: rung lắc liên tục ở mode 'form' cho tới khi gửi email thành công */}
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
