'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/features/auth';
import { ADMIN_NAV_ITEMS } from '../constants/admin-navigation';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps): React.JSX.Element {
  const pathname = usePathname();
  const { user } = useAuth();

  const currentItem = ADMIN_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  const pageTitle = currentItem?.title || 'Quản Trị Hệ Thống';

  return (
    <header className="h-16 px-4 sm:px-6 bg-card/80 backdrop-blur-md border-b border-border/60 flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left: Mobile Toggle & Page Title / Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden"
          aria-label="Mở menu"
        >
          <Icon icon="lucide:menu" className="size-5" />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="hidden sm:inline text-muted-foreground">Admin</span>
          <span className="hidden sm:inline text-muted-foreground/60">/</span>
          <h1 className="font-semibold text-foreground text-sm sm:text-base tracking-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: Quick Portal Link & User Info */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/"
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'text-xs text-muted-foreground hover:text-foreground gap-1.5',
          })}
        >
          <Icon icon="lucide:external-link" className="size-3.5" />
          <span className="hidden sm:inline">Về Cổng Chính</span>
        </Link>

        <div className="h-4 w-px bg-border/60 hidden sm:block" />

        <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/20">
            {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-none">
              {user?.firstName || user?.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Quản trị viên</span>
          </div>
        </div>
      </div>
    </header>
  );
}
