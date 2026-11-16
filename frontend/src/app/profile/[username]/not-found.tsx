import Link from 'next/link';

export default function ProfileNotFound() {
  return (
    <main className="mx-auto max-w-xl space-y-4 px-6 py-16 text-foreground">
      <h1 className="text-2xl font-semibold">Không tìm thấy hồ sơ</h1>
      <p className="text-base text-muted-foreground">Trang cá nhân không tồn tại hoặc hiện không công khai.</p>
      <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">Về trang chủ</Link>
    </main>
  );
}
