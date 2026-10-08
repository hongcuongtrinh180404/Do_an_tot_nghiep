'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { IUserProfile } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DeleteConfirmDialog } from '@/components/shared/dialog';
import { UserRoleDialog } from './user-role-dialog';
import { UserStatusDialog } from './user-status-dialog';
import { useDeleteUserAdminMutation } from '../api/users-admin.api';

interface UsersTableRowActionsProps {
  user: IUserProfile;
}

export function UsersTableRowActions({ user }: UsersTableRowActionsProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const deleteMutation = useDeleteUserAdminMutation();

  const handleNavigateDetail = () => {
    setMenuOpen(false);
    const qs = searchParams.toString();
    const returnUrl = qs ? `${pathname}?${qs}` : pathname;
    router.push(`/admin/users/${user.id}?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(user.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
      },
    });
  };

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Tùy chọn thao tác"
            >
              <Icon icon="lucide:more-horizontal" className="size-4" />
            </Button>
          }
        />

        <PopoverContent align="end" className="w-44 p-1.5 space-y-0.5">
          <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            Thao tác
          </div>

          <button
            type="button"
            onClick={handleNavigateDetail}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
          >
            <Icon icon="lucide:eye" className="size-3.5 text-muted-foreground" />
            <span>Xem chi tiết</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setRoleDialogOpen(true);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
          >
            <Icon icon="lucide:user-cog" className="size-3.5 text-muted-foreground" />
            <span>Đổi vai trò</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setStatusDialogOpen(true);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
          >
            <Icon icon="lucide:shield-alert" className="size-3.5 text-amber-500" />
            <span>Đổi trạng thái</span>
          </button>

          <div className="my-1 border-t border-border/60" />

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setDeleteDialogOpen(true);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
          >
            <Icon icon="lucide:trash-2" className="size-3.5" />
            <span>Xóa tài khoản</span>
          </button>
        </PopoverContent>
      </Popover>

      {/* Dialog Đổi Vai Trò */}
      <UserRoleDialog
        user={user}
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
      />

      {/* Dialog Đổi Trạng Thái */}
      <UserStatusDialog
        user={user}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
      />

      {/* Dialog Xác Nhận Xóa */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Xác nhận xóa tài khoản"
        itemName={user.fullName || user.email}
        description={`Bạn có chắc chắn muốn xóa tài khoản "${user.fullName || user.email}" (${user.email})? Thao tác này sẽ chuyển tài khoản sang trạng thái xóa mềm.`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
