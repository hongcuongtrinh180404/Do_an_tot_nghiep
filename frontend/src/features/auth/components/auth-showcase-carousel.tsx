'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ShowcaseImage {
  src: string;
  alt: string;
}

const AUTOPLAY_INTERVAL_MS = 5500; // 5.5s autoplay cycle

const SHOWCASE_IMAGES: ShowcaseImage[] = [
  {
    src: '/auth-showcase/panel-1.jpg',
    alt: 'Bức tranh nghệ thuật cộng tác học nhóm và nghiên cứu đồ án trên bàn làm việc',
  },
  {
    src: '/auth-showcase/panel-2.jpg',
    alt: 'Bức tranh nghệ thuật người đọc sách vươn tầm tri thức trên đỉnh tháp sách',
  },
  {
    src: '/auth-showcase/panel-3.jpg',
    alt: 'Bức tranh nghệ thuật góc học tập bình yên bên cửa sổ mùa thu truyền cảm hứng',
  },
  {
    src: '/auth-showcase/panel-4.jpg',
    alt: 'Bức tranh nghệ thuật bước qua cánh cửa sách khai mở tri thức tương lai',
  },
];

export function AuthShowcaseCarousel(): React.JSX.Element {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % SHOWCASE_IMAGES.length);
  }, []);

  // Autoplay crossfade loop through all images
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, AUTOPLAY_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Hình ảnh nghệ thuật học tập toàn phần"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative w-full h-full min-h-screen overflow-hidden select-none bg-slate-950"
    >
      {/* Full-Bleed Crossfade Image Layers (All 4 Images) */}
      {SHOWCASE_IMAGES.map((img, idx) => {
        const isActive = idx === activeIndex;

        return (
          <div
            key={img.src}
            className={cn(
              'absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out',
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none',
            )}
            aria-hidden={!isActive}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt={img.alt}
              className="w-full h-full object-cover object-center"
              loading={idx === 0 ? 'eager' : 'lazy'}
            />

            {/* Subtle cinematic gradient vignette for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/20 pointer-events-none" />
          </div>
        );
      })}

      {/* Ultra-minimal Indicator Line/Dots (All 4 Images) */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 p-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10"
        role="tablist"
        aria-label="Chọn hình ảnh hiển thị"
      >
        {SHOWCASE_IMAGES.map((_, idx) => {
          const isActive = idx === activeIndex;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              role="tab"
              aria-selected={isActive}
              aria-label={`Chuyển sang ảnh ${idx + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                isActive ? 'w-8 bg-white shadow-sm' : 'w-2 bg-white/40 hover:bg-white/70',
              )}
            />
          );
        })}
      </div>
    </section>
  );
}
