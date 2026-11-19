'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, BookOpen } from 'lucide-react';

export interface PaymentSuccessProps {
  courseTitle?: string;
  orderCode?: string;
  amount?: string;
  onStartLearning: () => void;
  onViewMyCourses?: () => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({
  courseTitle = 'Lập trình Fullstack Next.js & NestJS thực chiến',
  orderCode = 'ORD-20261117',
  amount = '499.000 ₫',
  onStartLearning,
  onViewMyCourses,
}) => {
  // 1. Kích hoạt hiệu ứng bắn pháo giấy 1 lần khi màn hình thành công được hiển thị
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.55 },
        colors: ['#10b981', '#34d399', '#027D88', '#f59e0b'],
        disableForReducedMotion: true,
      });
    }, 250); // Khớp nhịp ngay khi nét vẽ tích xanh hoàn thành

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-xl p-7 text-center animate-card-enter">
      {/* CSS Keyframes nhúng trực tiếp để không cần sửa tailwind.config */}
      <style>{`
        @keyframes cardEnter {
          0% { opacity: 0; transform: translateY(14px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes circlePop {
          0% { transform: scale(0.5); opacity: 0; }
          65% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulseHalo {
          0% { transform: scale(0.95); opacity: 0.65; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        .animate-card-enter {
          animation: cardEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-circle-pop {
          animation: circlePop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-draw-check {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: drawCheck 0.35s ease-out 0.22s forwards;
        }
        .animate-halo {
          animation: pulseHalo 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
        }
      `}</style>

      {/* Cụm Icon Checkmark tự vẽ nét + Hào quang tỏa */}
      <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
        {/* Vòng hào quang lan tỏa */}
        <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-halo" />

        {/* Vòng tròn xanh nảy nhẹ */}
        <div className="relative w-20 h-20 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 ring-8 ring-emerald-500/15 flex items-center justify-center animate-circle-pop">
          <svg
            className="w-10 h-10 text-white"
            viewBox="0 0 52 52"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path className="animate-draw-check" d="M14 27l7.5 7.5L38 18" />
          </svg>
        </div>
      </div>

      {/* Tiêu đề xác nhận */}
      <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
        <span>Kích hoạt khóa học thành công</span>
      </div>

      <h2 className="text-xl font-bold text-slate-900">
        Thanh toán hoàn tất!
      </h2>
      <p className="text-xs text-slate-500 mt-1">
        Cảm ơn bạn đã đăng ký. Toàn bộ nội dung khóa học đã sẵn sàng để học tập.
      </p>

      {/* Thẻ tóm tắt giao dịch */}
      <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-left space-y-2.5 text-xs">
        <div className="flex items-start justify-between gap-3">
          <span className="text-slate-500 shrink-0">Khóa học</span>
          <span className="font-semibold text-slate-800 text-right line-clamp-1">
            {courseTitle}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Mã đơn hàng</span>
          <span className="font-mono font-semibold text-slate-700">{orderCode}</span>
        </div>
        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-slate-500">Đã thanh toán</span>
          <span className="text-sm font-extrabold text-emerald-600">{amount}</span>
        </div>
      </div>

      {/* Nút hành động chính và phụ (học viên chủ động thao tác) */}
      <div className="mt-6 space-y-2.5">
        <button
          type="button"
          onClick={onStartLearning}
          className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer group"
        >
          <span>Vào học ngay</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>

        {onViewMyCourses && (
          <button
            type="button"
            onClick={onViewMyCourses}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200/90 hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Xem khóa học đã mua</span>
          </button>
        )}
      </div>
    </div>
  );
};
