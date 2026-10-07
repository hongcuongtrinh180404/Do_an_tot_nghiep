'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import type { IUserProfile } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { DataTableColumnHeader } from '@/components/shared/data-table';
import { UserRoleBadge, UserStatusBadge } from './components/users-status-badge';
import { UsersTableRowActions } from './components/users-row-actions';

function UserNameCell({ user }: { user: IUserProfile }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleNavigate = () => {
    const qs = searchParams.toString();
    const returnUrl = qs ? `${pathname}?${qs}` : pathname;
    router.push(`/admin/users/${user.id}?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  const initial = user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigate();
        }
      }}
      className="flex items-center gap-3 group cursor-pointer text-left select-none focus:outline-none"
    >
      <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-primary/20 group-hover:ring-primary/40 transition-all">
        {initial}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-foreground text-xs sm:text-sm truncate group-hover:text-primary transition-colors">
          {user.fullName || user.email.split('@')[0]}
        </span>
        <span className="text-[11px] text-muted-foreground truncate">
          {user.email}
        </span>
      </div>
    </div>
  );
}

export const userColumns: ColumnDef<IUserProfile>[] = [
  {
    accessorKey: 'fullName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Người dùng" allowSorting={true} />
    ),
    cell: ({ row }) => <UserNameCell user={row.original} />,
    enableSorting: true,
  },
  {
    accessorKey: 'username',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tên tài khoản" allowSorting={true} />
    ),
    cell: ({ row }) => {
      const username = row.getValue('username') as string | null | undefined;
      return (
        <span className="text-xs text-muted-foreground font-mono">
          {username ? `@${username}` : '—'}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Vai trò" allowSorting={true} />
    ),
    cell: ({ row }) => {
      return <UserRoleBadge role={row.original.role} />;
    },
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Trạng thái" allowSorting={true} />
    ),
    cell: ({ row }) => {
      return <UserStatusBadge status={row.original.status} />;
    },
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: true,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ngày tạo" allowSorting={true} />
    ),
    cell: ({ row }) => {
      const dateVal = row.original.createdAt;
      if (!dateVal) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      const d = new Date(dateVal);
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          <Icon icon="lucide:calendar" className="size-3.5 text-muted-foreground/70 shrink-0" />
          <span>{d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          <span className="text-[11px] text-muted-foreground/60">{d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    header: () => <div className="text-right pr-2 select-none">Thao tác</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right">
          <UsersTableRowActions user={row.original} />
        </div>
      );
    },
    enableSorting: false,
  },
];
