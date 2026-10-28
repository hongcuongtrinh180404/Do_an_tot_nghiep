import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { VerifyEmailContent, AuthCardWrapper } from '@/features/auth';
import { Icon } from '@/components/ui/icon';

export const metadata: Metadata = {
  title: 'Xác Thực Email | Mindly Portal',
  description: 'Xác thực địa chỉ email và kích hoạt tài khoản Mindly của bạn',
};

function VerifyEmailFallback(): React.JSX.Element {
  return (
    <AuthCardWrapper
      headerTitle="Đang Tải..."
      headerDescription="Vui lòng đợi trong giây lát"
      backButtonLabel="Gặp sự cố?"
      backButtonText="Quay lại đăng nhập"
      backButtonHref="/login"
    >
      <div className="py-8 space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon icon="lucide:loader-2" className="size-6 animate-spin" />
        </div>
        <p className="text-xs text-muted-foreground">Đang tải thông tin xác thực...</p>
      </div>
    </AuthCardWrapper>
  );
}

export default function VerifyEmailPage(): React.JSX.Element {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
