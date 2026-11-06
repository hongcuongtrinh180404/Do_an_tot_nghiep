'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Icon } from '@/components/ui/icon';

interface CourseIntroMediaProps {
  thumbnailUrl?: string | null;
  trailerUrl?: string | null;
  title: string;
}

const DEFAULT_SAMPLE_TRAILER = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export function CourseIntroMedia({
  thumbnailUrl,
  trailerUrl,
  title,
}: CourseIntroMediaProps): React.JSX.Element {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const activeVideoUrl = trailerUrl || DEFAULT_SAMPLE_TRAILER;

  const handleStartPlay = (): void => {
    setIsPlaying(true);
  };

  const handleStopPlay = (): void => {
    setIsPlaying(false);
  };

  return (
    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-900 border border-[#e5e7eb] shadow-sm group">
      {isPlaying ? (
        <div className="relative size-full bg-black">
          <video
            src={activeVideoUrl}
            controls
            autoPlay
            className="size-full object-contain"
          >
            <track kind="captions" />
            Trình duyệt của bạn không hỗ trợ phát video HTML5.
          </video>

          {/* Close/Stop video button */}
          <button
            type="button"
            onClick={handleStopPlay}
            aria-label="Đóng video và xem lại ảnh đại diện"
            className="absolute top-3 right-3 z-20 size-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
          >
            <Icon icon="lucide:x" className="size-4" />
          </button>
        </div>
      ) : (
        <div className="relative size-full">
          {/* Cover Thumbnail */}
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 880px"
              className="object-cover transition-transform duration-500 group-hover:scale-102"
            />
          ) : (
            <div className="size-full flex flex-col items-center justify-center bg-neutral-900 text-neutral-400">
              <Icon icon="lucide:film" className="size-16 stroke-1 text-neutral-500" />
              <span className="text-xs text-neutral-400 mt-2">Video giới thiệu khóa học</span>
            </div>
          )}

          {/* Dark Overlay scrim */}
          <div className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/45" />

          {/* Center Play Button Action */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <button
              type="button"
              onClick={handleStartPlay}
              aria-label="Phát video giới thiệu khóa học"
              className="size-16 sm:size-20 rounded-full bg-white/95 text-[#161616] hover:bg-white hover:scale-110 active:scale-95 transition-all shadow-xl flex items-center justify-center cursor-pointer group/btn"
            >
              <Icon
                icon="lucide:play"
                className="size-7 sm:size-8 fill-current text-[#027D88] translate-x-0.5"
              />
            </button>
            <span className="text-xs sm:text-sm font-semibold text-white drop-shadow-md bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
              Xem video giới thiệu khóa học
            </span>
          </div>

          {/* Duration / Watermark at corner */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-black/70 text-white px-2.5 py-1 rounded-md text-xs font-medium backdrop-blur-xs">
            <Icon icon="lucide:play-circle" className="size-3.5 text-[#027D88]" />
            <span>Trailer giới thiệu</span>
          </div>
        </div>
      )}
    </div>
  );
}

