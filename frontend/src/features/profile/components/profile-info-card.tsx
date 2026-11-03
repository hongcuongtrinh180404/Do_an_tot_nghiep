'use client';

import React, { useState } from 'react';
import type { IUserProfile } from 'share-lib';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarUploader } from './avatar-uploader';

interface ProfileInfoCardProps {
  user: IUserProfile;
}

export function ProfileInfoCard({ user }: ProfileInfoCardProps): React.JSX.Element {
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const fullName =
    user.fullName ||
    (user.firstName && user.lastName
      ? `${user.lastName} ${user.firstName}`
      : user.firstName || user.lastName || user.email.split('@')[0]);

  const normalizedRole = (user.role || '').toLowerCase();
  const roleLabel =
    normalizedRole === RoleEnum.ADMIN
      ? 'Quản trị viên'
      : normalizedRole === RoleEnum.INSTRUCTOR
        ? 'Giảng viên'
        : 'Học viên';

  const roleIcon =
    normalizedRole === RoleEnum.ADMIN
      ? 'lucide:shield-check'
      : normalizedRole === RoleEnum.INSTRUCTOR
        ? 'lucide:graduation-cap'
        : 'lucide:user';

  const normalizedStatus = (user.status || '').toLowerCase();
  const statusLabel =
    normalizedStatus === UserStatusEnum.ACTIVE
      ? 'Đang hoạt động'
      : normalizedStatus === UserStatusEnum.INACTIVE
        ? 'Tạm khóa'
        : normalizedStatus === UserStatusEnum.BANNED
          ? 'Đã khóa'
          : 'Đang hoạt động';

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
      month: '2-digit',
      year: 'numeric',
    })
    : null;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setHasCopied(true);
      toast.success('Đã sao chép mã tài khoản vào bộ nhớ tạm');
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      toast.error('Không thể sao chép');
    }
  };

  return (
    <Card className="border border-border/70 bg-card shadow-none">
      <CardContent className="p-6 space-y-6">
        {/* Avatar & Main Identity */}
        <div className="flex flex-col items-start text-left space-y-3.5 w-full">
          <AvatarUploader currentAvatar={user.avatarUrl || user.avatar} userName={fullName} />

          <div className="space-y-1 pt-1 text-left w-full">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {fullName}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              {user.username ? `@${user.username}` : user.email}
            </p>
          </div>

          {/* Role & Status Badges */}
          <div className="flex items-center gap-2 pt-1 flex-wrap justify-start">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/60 text-foreground border border-border/80">
              <Icon icon={roleIcon} className="size-3 text-muted-foreground" />
              {roleLabel}
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/60 text-foreground border border-border/80">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Account Details List */}
        <div className="space-y-2.5 pt-4 border-t border-border/60 text-xs">
          {/* Email */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground">Email đăng nhập</span>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <span>{user.email}</span>
              {user.isEmailVerified !== false && (
                <span title="Email đã được xác thực" className="text-emerald-600 dark:text-emerald-400">
                  <Icon icon="lucide:badge-check" className="size-3.5" />
                </span>
              )}
            </div>
          </div>

          {/* Authentication Provider */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground">Phương thức liên kết</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              {user.googleSub || user.provider === 'GOOGLE' ? (
                <>
                  <Icon icon="logos:google-icon" className="size-3.5" />
                  Google Workspace
                </>
              ) : (
                <>
                  <Icon icon="lucide:key-round" className="size-3.5 text-muted-foreground" />
                  Mật khẩu nội bộ
                </>
              )}
            </span>
          </div>

          {/* Member Since */}
          {memberSince && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Thời gian gia nhập</span>
              <span className="font-medium text-foreground">Tháng {memberSince}</span>
            </div>
          )}
        </div>

        {/* Subdued Tech ID Copy Footer */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-mono">ID: {user.id.slice(0, 8)}...</span>
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer py-0.5 px-1 rounded hover:bg-muted"
            title="Sao chép toàn bộ mã tài khoản"
          >
            <Icon
              icon={hasCopied ? 'lucide:check' : 'lucide:copy'}
              className={`size-3 ${hasCopied ? 'text-emerald-500' : ''}`}
            />
            <span>{hasCopied ? 'Đã sao chép' : 'Sao chép ID'}</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
