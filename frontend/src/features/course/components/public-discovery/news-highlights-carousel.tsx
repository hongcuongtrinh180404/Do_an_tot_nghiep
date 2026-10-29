'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/ui/icon';
import {
  MOCK_HIGHLIGHT_COURSES,
  type IHighlightCourseCard,
} from './mock-discovery-data';

interface NewsHighlightsCarouselProps {
  items?: IHighlightCourseCard[];
}

export function NewsHighlightsCarousel({
  items = MOCK_HIGHLIGHT_COURSES,
}: NewsHighlightsCarouselProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check scroll boundary to toggle arrows availability
  const checkScroll = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const handleScroll = (direction: 'left' | 'right'): void => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by width of ~3 cards at a time
    const scrollAmount = Math.max(el.clientWidth * 0.75, 300);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const formatPrice = (price: number): string => {
    return `₫${price.toLocaleString('en-US')}.00`;
  };

  return (
    <section
      aria-label="Tin tức và khóa học nổi bật"
      className="w-full bg-[#141414] py-8 sm:py-10 text-white relative select-none"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="mb-4 sm:mb-5">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            News and highlights
          </h2>
        </div>

        {/* Carousel Slider Wrapper */}
        <div className="relative group/carousel">
          {/* Left Navigation Arrow: Overlaps the left edge of the 2nd card from left */}
          {canScrollLeft && (
            <button
              type="button"
              aria-label="Cuộn sang trái"
              onClick={() => handleScroll('left')}
              className="absolute sm:left-[216px] md:left-[234px] -translate-x-1/2 top-1/2 -translate-y-1/2 z-30 size-10 rounded-full bg-white text-zinc-900 shadow-2xl items-center justify-center transition-all duration-200 hover:bg-zinc-100 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/80 hidden md:flex opacity-0 pointer-events-none group-hover/carousel:opacity-100 group-hover/carousel:pointer-events-auto"
            >
              <Icon icon="lucide:chevron-left" className="size-5 text-zinc-900" />
            </button>
          )}

          {/* Right Navigation Arrow: Overlaps the right edge of the 2nd card from right */}
          {canScrollRight && (
            <button
              type="button"
              aria-label="Cuộn sang phải"
              onClick={() => handleScroll('right')}
              className="absolute sm:right-[216px] md:right-[234px] translate-x-1/2 top-1/2 -translate-y-1/2 z-30 size-10 rounded-full bg-white text-zinc-900 shadow-2xl items-center justify-center transition-all duration-200 hover:bg-zinc-100 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/80 hidden md:flex opacity-0 pointer-events-none group-hover/carousel:opacity-100 group-hover/carousel:pointer-events-auto"
            >
              <Icon icon="lucide:chevron-right" className="size-5 text-zinc-900" />
            </button>
          )}

          {/* Scrollable Track */}
          <div
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/courses/${item.slug}`}
                className="group relative flex-none w-[170px] sm:w-[200px] md:w-[218px] aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden snap-start focus:outline-none focus:ring-2 focus:ring-white/70 bg-zinc-900 shadow-md"
              >
                {/* Background Image with Zoom on Hover */}
                <Image
                  src={item.thumbnailUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 170px, (max-width: 768px) 200px, 218px"
                  className="object-cover w-full h-full transition-transform duration-300 ease-out group-hover:scale-105"
                />

                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

                {/* Card Footer Content */}
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 flex flex-col justify-end text-left z-10">
                  {/* Course Title */}
                  <h3
                    title={item.title}
                    className="text-white text-xs sm:text-sm font-semibold leading-snug line-clamp-2 drop-shadow-sm group-hover:text-white"
                  >
                    {item.title}
                  </h3>

                  {/* Instructor / Organization Name */}
                  <p className="text-zinc-300 text-xs mt-1 font-normal line-clamp-1 drop-shadow-sm">
                    {item.author}
                  </p>

                  {/* Price Block: hidden by default, slides up smoothly on hover */}
                  <div className="overflow-hidden transition-all duration-300 ease-out max-h-0 opacity-0 group-hover:max-h-12 group-hover:opacity-100 group-hover:mt-2">
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="text-xs sm:text-sm font-bold text-white tracking-tight drop-shadow-sm">
                        {formatPrice(item.price)}
                      </span>
                      {item.originalPrice && (
                        <span className="text-[11px] text-zinc-400 line-through">
                          {formatPrice(item.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

