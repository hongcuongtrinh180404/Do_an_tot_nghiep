'use client';

import React from 'react';
import type { IUserProfile } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProfileInfoCardProps {
  user: IUserProfile;
}

export function ProfileInfoCard({ user }: ProfileInfoCardProps): React.JSX.Element {
  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-xs shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon icon="lucide:id-card" className="size-4 text-primary" />
          Tổng Quan Tài Khoản
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Email */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/30">
          <span className="text-muted-foreground">Địa chỉ Email</span>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span>{user.email}</span>
            <Icon icon="lucide:check-circle-2" className="size-3.5 text-emerald-500" />
          </div>
        </div>

        {/* Role */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/30">
          <span className="text-muted-foreground">Vai trò hệ thống</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            <Icon icon="lucide:shield" className="size-3" />
            {user.role}
          </span>
        </div>

        {/* Provider */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/30">
          <span className="text-muted-foreground">Phương thức đăng nhập</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground uppercase text-[11px]">
            {user.provider === 'GOOGLE' ? (
              <>
                <Icon icon="logos:google-icon" className="size-3" />
                Google
              </>
            ) : (
              <>
                <Icon icon="lucide:key-round" className="size-3 text-sky-500" />
                Tài khoản nội bộ
              </>
            )}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/30">
          <span className="text-muted-foreground">Trạng thái tài khoản</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            {user.status}
          </span>
        </div>

        {/* User ID */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/30">
          <span className="text-muted-foreground">Mã định danh (UID)</span>
          <span className="font-mono text-[11px] text-muted-foreground select-all">
            {user.id}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
