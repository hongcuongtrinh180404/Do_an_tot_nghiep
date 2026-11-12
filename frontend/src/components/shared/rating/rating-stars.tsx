'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  starClassName?: string;
  fillClassName?: string;
  emptyClassName?: string;
}

const sizeMap = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
  xl: 'size-6',
};

export function RatingStars({
  rating,
  maxStars = 5,
  size = 'sm',
  className,
  starClassName,
  fillClassName = 'fill-[#ffd100] text-[#ffd100]',
  emptyClassName = 'text-neutral-300',
}: RatingStarsProps): React.JSX.Element {
  const roundedRating = Math.round(rating);

  return (
    <div className={cn('flex items-center gap-1', className)} role="img" aria-label={`${rating} trên ${maxStars} sao`}>
      {Array.from({ length: maxStars }, (_, index) => {
        const starNumber = index + 1;
        const isFilled = starNumber <= roundedRating;

        return (
          <Icon
            key={starNumber}
            icon="lucide:star"
            className={cn(
              sizeMap[size],
              isFilled ? fillClassName : emptyClassName,
              starClassName,
            )}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

