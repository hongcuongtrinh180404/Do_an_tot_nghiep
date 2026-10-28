'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RoleEnum } from 'share-lib';
import { useCurrentUserQuery, useLogoutMutation } from '@/features/auth/api/auth.api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { MindlyLogo } from '@/components/brand';

interface PublicHeaderProps {
  onSearchSubmit?: (query: string) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export function PublicHeader({
  onSearchSubmit,
  searchQuery = '',
  setSearchQuery,
}: PublicHeaderProps): React.JSX.Element {
  const isMounted = useIsMounted();
  const { data: user } = useCurrentUserQuery();
  const logoutMutation = useLogoutMutation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(localSearch.trim());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    setLocalSearch(val);
    if (setSearchQuery) {
      setSearchQuery(val);
    }
  };

  return (
    <header data-ui="header" className="sticky top-0 z-40 w-full border-b border-[#2b2b2b] bg-[#161616] text-white">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md py-1"
            aria-label="Mindly - Map Your Mind - Trang chủ"
          >
            <MindlyLogo
              variant="dark-header"
              className="h-9 sm:h-10 w-auto"
              showSlogan={true}
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Điều hướng chính">
            <Link
              href="#featured"
              className="text-sm font-medium text-neutral-300 transition-colors hover:text-white"
            >
              Khóa học nổi bật
            </Link>
            <Link
              href="#categories"
              className="text-sm font-medium text-neutral-300 transition-colors hover:text-white"
            >
              Danh mục
            </Link>
            <Link
              href="#recent"
              className="text-sm font-medium text-neutral-300 transition-colors hover:text-white"
            >
              Mới nhất
            </Link>
          </nav>
        </div>

        {/* Center: Search bar */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
              <Icon icon="lucide:search" className="size-4" />
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={handleInputChange}
              placeholder="Tìm kiếm khóa học, giảng viên, kỹ năng..."
              className="w-full h-10 rounded-lg border border-neutral-700 bg-[#282828] pl-9 pr-4 text-sm text-white placeholder:text-neutral-400 focus:bg-[#202020] focus:border-neutral-500 focus:outline-none transition-colors"
            />
          </form>
        </div>

        {/* Right: Auth / User Session Actions */}
        <div className="flex items-center gap-3">
          {isMounted && user ? (
            <div className="flex items-center gap-2">
              {user.role === RoleEnum.ADMIN && (
                <Link
                  href="/admin/dashboard"
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'hidden sm:inline-flex border-neutral-700 text-white hover:bg-neutral-800' })}
                >
                  <Icon icon="lucide:shield" className="size-3.5 mr-1.5 text-neutral-400" />
                  Quản trị
                </Link>
              )}
              {(user.role === RoleEnum.INSTRUCTOR || user.role === RoleEnum.ADMIN) && (
                <Link
                  href="/instructor/courses"
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'hidden sm:inline-flex border-neutral-700 text-white hover:bg-neutral-800' })}
                >
                  <Icon icon="lucide:book-open" className="size-3.5 mr-1.5 text-[#027D88]" />
                  Khóa học của tôi
                </Link>
              )}
              <Link
                href="/profile"
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'border-neutral-700 text-white hover:bg-neutral-800' })}
                title={user.email}
              >
                <Icon icon="lucide:user" className="size-3.5 mr-1.5" />
                <span className="max-w-[120px] truncate hidden sm:inline">
                  {user.firstName ? `${user.firstName}` : user.email.split('@')[0]}
                </span>
                <span className="sm:hidden">Hồ sơ</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="text-xs text-neutral-400 hover:text-white hover:bg-neutral-800"
                aria-label="Đăng xuất"
              >
                <Icon icon="lucide:log-out" className="size-3.5" />
                <span className="hidden sm:inline ml-1">Thoát</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-neutral-200 hover:text-white hover:bg-neutral-800' })}
              >
                <Icon icon="lucide:log-in" className="size-3.5 mr-1.5" />
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className={buttonVariants({ variant: 'coral', size: 'sm', className: 'font-bold shadow-none' })}
              >
                <Icon icon="lucide:user-plus" className="size-3.5 mr-1.5" />
                Tham gia miễn phí
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            className="md:hidden flex size-9 items-center justify-center rounded-md border border-neutral-700 text-white hover:bg-neutral-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Mở danh mục điều hướng"
            aria-expanded={mobileMenuOpen}
          >
            <Icon icon={mobileMenuOpen ? 'lucide:x' : 'lucide:menu'} className="size-5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div data-ui="mobile-menu" className="md:hidden border-t border-border bg-background px-4 py-4 space-y-4">
          <form onSubmit={handleSearch} className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
              <Icon icon="lucide:search" className="size-4" />
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={handleInputChange}
              placeholder="Tìm kiếm khóa học..."
              className="w-full h-10 rounded-lg border border-input bg-muted/40 pl-9 pr-4 text-sm"
            />
          </form>

          <nav className="flex flex-col space-y-2">
            <Link
              href="#featured"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-foreground hover:text-primary"
            >
              Khóa học nổi bật
            </Link>
            <Link
              href="#categories"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-foreground hover:text-primary"
            >
              Danh mục lĩnh vực
            </Link>
            <Link
              href="#recent"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-foreground hover:text-primary"
            >
              Khóa học mới nhất
            </Link>
          </nav>

          {isMounted && user && (
            <div data-ui="mobile-drawer-footer" className="pt-2 border-t border-border flex flex-col gap-2">
              {user.role === RoleEnum.ADMIN && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-full justify-start' })}
                >
                  <Icon icon="lucide:shield" className="size-4 mr-2 text-primary" />
                  Trang quản trị Admin
                </Link>
              )}
              {(user.role === RoleEnum.INSTRUCTOR || user.role === RoleEnum.ADMIN) && (
                <Link
                  href="/instructor/courses"
                  onClick={() => setMobileMenuOpen(false)}
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-full justify-start' })}
                >
                  <Icon icon="lucide:book-open" className="size-4 mr-2" />
                  Khóa học của tôi
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
