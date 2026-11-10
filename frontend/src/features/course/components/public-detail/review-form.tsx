'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { StarRatingInput } from './star-rating-input';

interface ReviewFormProps {
  initialRating?: number;
  initialComment?: string | null;
  onSubmit: (data: { rating: number; comment?: string }) => void;
  isSubmitting: boolean;
  isEdit?: boolean;
  onCancel?: () => void;
}

export function ReviewForm({
  initialRating = 0,
  initialComment = '',
  onSubmit,
  isSubmitting,
  isEdit = false,
  onCancel,
}: ReviewFormProps): React.JSX.Element {
  const [rating, setRating] = useState<number>(initialRating);
  const [comment, setComment] = useState<string>(initialComment || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setErrorMessage('Vui lòng chọn số sao đánh giá (từ 1 đến 5 sao) trước khi gửi.');
      return;
    }
    setErrorMessage(null);
    const trimmedComment = comment.trim();
    onSubmit({
      rating,
      comment: trimmedComment.length > 0 ? trimmedComment : undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#027D88]/20 bg-[#f8fdfd] p-5 sm:p-6 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-base sm:text-lg font-bold text-[#161616]">
          {isEdit ? 'Chỉnh sửa đánh giá của bạn' : 'Viết đánh giá & nhận xét khóa học'}
        </h4>
        {isEdit && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-xs text-[#666666] hover:text-[#161616] font-medium transition-colors"
          >
            Đóng
          </button>
        )}
      </div>

      {/* Star Selector */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-[#161616] uppercase tracking-wider">
          Mức độ hài lòng của bạn <span className="text-destructive">*</span>
        </label>
        <StarRatingInput
          value={rating}
          onChange={(newRating) => {
            setRating(newRating);
            if (errorMessage) setErrorMessage(null);
          }}
          disabled={isSubmitting}
        />
        {errorMessage && (
          <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
            <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        )}
      </div>

      {/* Comment Textarea */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="review-comment"
            className="block text-xs font-semibold text-[#161616] uppercase tracking-wider"
          >
            Nhận xét chi tiết (Không bắt buộc)
          </label>
          <span className="text-[11px] text-[#666666]">
            {comment.length}/2000 ký tự
          </span>
        </div>
        <textarea
          id="review-comment"
          rows={4}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isSubmitting}
          placeholder="Chia sẻ cảm nhận về lộ trình học, chất lượng video, tính năng Mindmap AI hoặc các câu hỏi In-video Quiz..."
          className="w-full rounded-xl border border-[#e5e7eb] bg-white p-3 text-sm text-[#161616] placeholder:text-neutral-400 focus:border-[#027D88] focus:ring-1 focus:ring-[#027D88] focus:outline-hidden transition-all disabled:opacity-60"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {isEdit && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-[#e5e7eb] bg-white text-xs font-semibold text-[#161616] hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Icon icon="lucide:loader-2" className="size-4 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <Icon icon="lucide:send" className="size-3.5" />
              <span>{isEdit ? 'Lưu thay đổi' : 'Gửi đánh giá'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

