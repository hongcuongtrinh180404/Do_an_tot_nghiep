import * as React from 'react';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';

export function UserRoleBadge({ role }: { role: RoleEnum }): React.JSX.Element {
  switch (role) {
    case RoleEnum.ADMIN:
      return (
        <Badge variant="warning" className="gap-1 font-medium">
          <Icon icon="lucide:shield-check" className="size-3" />
          <span>Quản trị viên</span>
        </Badge>
      );
    case RoleEnum.INSTRUCTOR:
      return (
        <Badge variant="info" className="gap-1 font-medium">
          <Icon icon="lucide:graduation-cap" className="size-3" />
          <span>Giảng viên</span>
        </Badge>
      );
    case RoleEnum.STUDENT:
    default:
      return (
        <Badge variant="secondary" className="gap-1 font-medium bg-muted/80 text-muted-foreground border-border/60">
          <Icon icon="lucide:user" className="size-3" />
          <span>Sinh viên</span>
        </Badge>
      );
  }
}

export function UserStatusBadge({ status }: { status: UserStatusEnum }): React.JSX.Element {
  switch (status) {
    case UserStatusEnum.ACTIVE:
      return (
        <Badge variant="success" className="gap-1.5 font-medium">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Hoạt động</span>
        </Badge>
      );
    case UserStatusEnum.BANNED:
      return (
        <Badge variant="destructive" className="gap-1.5 font-medium">
          <span className="size-1.5 rounded-full bg-destructive" />
          <span>Bị khóa</span>
        </Badge>
      );
    case UserStatusEnum.INACTIVE:
    default:
      return (
        <Badge variant="secondary" className="gap-1.5 font-medium text-muted-foreground border-border/60">
          <span className="size-1.5 rounded-full bg-muted-foreground/60" />
          <span>Chưa kích hoạt</span>
        </Badge>
      );
  }
}
