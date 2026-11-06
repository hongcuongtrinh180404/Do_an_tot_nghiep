'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { RoleEnum } from 'share-lib';
import { toast } from 'sonner';
import { useGoogleAuthMutation } from '../api/auth.api';

interface GoogleLoginButtonProps {
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export function GoogleLoginButton({
  text = 'continue_with',
}: GoogleLoginButtonProps): React.JSX.Element {
  const router = useRouter();
  const googleAuthMutation = useGoogleAuthMutation();

  const handleSuccess = (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error('Không nhận được token xác thực từ Google');
      return;
    }

    googleAuthMutation.mutate(
      { idToken: credentialResponse.credential },
      {
        onSuccess: (authData) => {
          if (authData.user.role === RoleEnum.ADMIN) {
            router.push('/admin/dashboard');
          } else if (authData.user.role === RoleEnum.INSTRUCTOR) {
            router.push('/instructor/courses');
          } else {
            router.push('/');
          }
        },
      },
    );
  };

  const handleError = () => {
    toast.error('Đăng nhập Google thất bại', {
      description: 'Cửa sổ xác thực đã bị đóng hoặc đã xảy ra lỗi kết nối.',
    });
  };

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div className="w-full flex justify-center overflow-hidden rounded-md transition-all duration-200 hover:opacity-95 shadow-sm">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          text={text}
          shape="rectangular"
          theme="outline"
          size="large"
          useOneTap={false}
        />
      </div>
      {googleAuthMutation.isPending && (
        <p className="mt-2 text-xs text-muted-foreground animate-pulse text-center">
          Đang xác thực tài khoản Google với máy chủ...
        </p>
      )}
    </div>
  );
}
