'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

export function AuthTopNav(): React.JSX.Element {
  return (
    <header className="w-full flex items-center justify-between pb-4 sm:pb-6">
      {/* Back to Home Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted/80 border border-transparent hover:border-border/50 group"
        aria-label="Quay lại trang chủ"
      >
        <Icon
          icon="lucide:arrow-left"
          className="size-3.5 transition-transform group-hover:-translate-x-0.5"
        />
        <span>Về trang chủ</span>
      </Link>

      {/* Subtle brand tag visible on mobile */}
      <div className="lg:hidden flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <span>Mindly Portal</span>
      </div>
    </header>
  );
}
