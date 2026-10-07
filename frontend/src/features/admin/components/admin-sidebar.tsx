'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { ADMIN_NAV_ITEMS } from '../constants/admin-navigation';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const { user, logout, isLoggingOut } = useAuth();

  const userInitial = user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A';
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Quản trị viên';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-card border-r border-border/60 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 shrink-0 h-screen',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand / Logo Section */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border/60 shrink-0">
          <Link href="/admin/users" className="flex items-center gap-3 group">
            <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shadow-sm group-hover:opacity-95 transition-opacity">
              <Icon icon="lucide:shield" className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground leading-tight">
                DATN Portal
              </span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Quản Trị Viên
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden"
            aria-label="Đóng menu"
          >
            <Icon icon="lucide:x" className="size-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
            Phân hệ Quản lý
          </div>

          <nav className="space-y-1" aria-label="Admin Navigation">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (onClose) onClose();
                  }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                  )}
                >
                  <Icon
                    icon={item.icon}
                    className={cn(
                      'size-4.5 shrink-0 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  />
                  <span className="truncate">{item.title}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-border/60 bg-muted/20 shrink-0 space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-primary/20">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                  Admin
                </span>
                <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="w-full justify-center text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-colors"
          >
            <Icon icon="lucide:log-out" className="size-3.5 mr-1.5" />
            {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </Button>
        </div>
      </aside>
    </>
  );
}
