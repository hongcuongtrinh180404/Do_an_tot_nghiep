'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PublicProfileError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto max-w-xl space-y-4 px-6 py-16 text-foreground">
      <h1 className="text-2xl font-semibold">Không thể tải hồ sơ</h1>
      <p className="text-base text-muted-foreground">Kết nối đang gặp sự cố. Vui lòng thử lại sau.</p>
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={retry} className="min-h-11">Thử lại</Button>
        <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">Về trang chủ</Link>
      </div>
    </main>
  );
}
