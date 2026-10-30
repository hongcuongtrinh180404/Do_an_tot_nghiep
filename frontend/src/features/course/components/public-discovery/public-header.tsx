'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrentUserQuery, useLogoutMutation } from '@/features/auth/api/auth.api';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
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
            <div className="flex items-center gap-3">
              {/* My courses link (Text link, no box border, clean hover effect) */}
              <Link
                href="/instructor/courses"
                className="hidden sm:inline-flex items-center text-sm font-medium text-neutral-300 transition-colors hover:text-white px-2 py-1.5 rounded-md hover:bg-neutral-800/50"
              >
                Khóa học của tôi
              </Link>

              {/* User Avatar & Dropdown Popover */}
              <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <PopoverTrigger
                  className="relative size-9 sm:size-10 rounded-full border border-neutral-700 hover:border-neutral-500 overflow-hidden bg-neutral-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 cursor-pointer flex items-center justify-center shrink-0"
                  aria-label="Menu tài khoản cá nhân"
                >
                  {user.avatarUrl && !avatarError ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.fullName || user.email}
                      fill
                      sizes="40px"
                      className="object-cover rounded-full"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-neutral-700 text-neutral-300">
                      <Icon icon="lucide:user" className="size-5 text-neutral-300" />
                    </div>
                  )}
                </PopoverTrigger>

                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={8}
                  className="w-64 p-1.5 rounded-xl border border-neutral-800 bg-[#1e1e1e] text-neutral-200 shadow-2xl shadow-black/80"
                >
                  {/* Account Summary Header */}
                  <div className="px-3 py-2.5 border-b border-neutral-800/80 mb-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {user.fullName || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email.split('@')[0])}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>

                  {/* 1. Xem hồ sơ */}
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-200 hover:text-white hover:bg-neutral-800/80 transition-colors"
                  >
                    <Icon icon="lucide:user" className="size-4 text-neutral-400" />
                    <span>Xem hồ sơ</span>
                  </Link>

                  {/* 2. Khóa học của tôi */}
                  <Link
                    href="/instructor/courses"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-200 hover:text-white hover:bg-neutral-800/80 transition-colors"
                  >
                    <Icon icon="lucide:bookmark" className="size-4 text-neutral-400" />
                    <span>Khóa học của tôi</span>
                  </Link>

                  {/* 3. Cài đặt tài khoản */}
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-200 hover:text-white hover:bg-neutral-800/80 transition-colors"
                  >
                    <Icon icon="lucide:settings" className="size-4 text-neutral-400" />
                    <span>Cài đặt tài khoản</span>
                  </Link>

                  {/* Divider */}
                  <div className="my-1 border-t border-neutral-800" />

                  {/* 4. Đăng xuất */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logoutMutation.mutate();
                    }}
                    disabled={logoutMutation.isPending}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-neutral-800/80 transition-colors text-left"
                  >
                    <Icon icon="lucide:log-out" className="size-4 text-red-400" />
                    <span>Đăng xuất</span>
                  </button>
                </PopoverContent>
              </Popover>
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
            <div data-ui="mobile-drawer-footer" className="pt-2 border-t border-neutral-800 flex flex-col gap-1">
              <div className="px-3 py-2 border-b border-neutral-800/60 mb-1">
                <p className="text-xs font-semibold text-white truncate">
                  {user.fullName || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email.split('@')[0])}
                </p>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-200 hover:text-white hover:bg-neutral-800/80"
              >
                <Icon icon="lucide:user" className="size-4 text-neutral-400" />
                <span>Xem hồ sơ</span>
              </Link>
              <Link
                href="/instructor/courses"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-200 hover:text-white hover:bg-neutral-800/80"
              >
                <Icon icon="lucide:bookmark" className="size-4 text-neutral-400" />
                <span>Khóa học của tôi</span>
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-200 hover:text-white hover:bg-neutral-800/80"
              >
                <Icon icon="lucide:settings" className="size-4 text-neutral-400" />
                <span>Cài đặt tài khoản</span>
              </Link>
              <div className="my-1 border-t border-neutral-800" />
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logoutMutation.mutate();
                }}
                disabled={logoutMutation.isPending}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-neutral-800/80 transition-colors text-left"
              >
                <Icon icon="lucide:log-out" className="size-4 text-red-400" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
