'use client';

interface PublicCoursesQueryErrorProps {
  onRetry: () => void;
}

export function PublicCoursesQueryError({ onRetry }: PublicCoursesQueryErrorProps) {
  return (
    <div role="alert" className="rounded-xl bg-neutral-100 p-6 text-center text-[#161616]">
      <p className="text-base font-semibold">Không thể tải danh sách khóa học</p>
      <p className="mt-1 text-sm">Vui lòng thử lại để lấy dữ liệu mới nhất.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-11 rounded-lg bg-[#027D88] px-5 text-sm font-semibold text-white hover:bg-[#02666F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#027D88]"
      >
        Thử lại
      </button>
    </div>
  );
}
