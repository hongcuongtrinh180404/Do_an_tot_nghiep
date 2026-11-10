'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/icon';

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ratingLabels: Record<number, string> = {
  1: 'Rất không hài lòng',
  2: 'Chưa hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng',
};

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  size = 'md',
}: StarRatingInputProps): React.JSX.Element {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    sm: 'size-5',
    md: 'size-7',
    lg: 'size-9',
  };

  const activeRating = hoverRating !== null ? hoverRating : value;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex items-center gap-1.5"
        role="radiogroup"
        aria-label="Chọn số sao đánh giá"
        onMouseLeave={() => setHoverRating(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} sao - ${ratingLabels[star]}`}
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverRating(star)}
              className={`p-1 rounded-lg transition-transform focus-visible:outline-2 focus-visible:outline-[#027D88] ${
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-115 active:scale-95'
              }`}
            >
              <Icon
                icon="lucide:star"
                className={`${starSizes[size]} transition-colors ${
                  isFilled
                    ? 'fill-[#ffd100] text-[#ffd100]'
                    : 'text-neutral-300 hover:text-[#ffd100]/60'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="text-xs font-medium text-[#666666] min-h-[1.25rem]">
        {activeRating > 0 ? (
          <span className="text-[#161616] font-semibold">
            {activeRating} sao: {ratingLabels[activeRating]}
          </span>
        ) : (
          <span className="text-neutral-400">Vui lòng chọn số sao đánh giá</span>
        )}
      </div>
    </div>
  );
}

