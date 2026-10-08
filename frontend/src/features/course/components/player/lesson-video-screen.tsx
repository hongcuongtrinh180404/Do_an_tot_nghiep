'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/icon';
import { UseVideoPlayerReturn } from './use-video-player';

export interface TimelineMarker {
  time: number;
  label: string;
}

interface LessonVideoScreenProps {
  player: UseVideoPlayerReturn;
  videoUrl?: string;
  lessonTitle: string;
  isDocument?: boolean;
  documentUrl?: string;
  documentFileName?: string;
  timelineMarkers?: TimelineMarker[];
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

export function LessonVideoScreen({
  player,
  videoUrl,
  lessonTitle,
  isDocument = false,
  documentUrl,
  documentFileName,
  timelineMarkers = [],
}: LessonVideoScreenProps): React.JSX.Element {
  const {
    videoRef,
    containerRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isFullscreen,
    bufferedEnd,
    togglePlay,
    seek,
    seekRelative,
    setVolumeLevel,
    toggleMute,
    setRate,
    toggleFullscreen,
    formatTime,
  } = player;

  const [showControls, setShowControls] = useState<boolean>(true);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState<boolean>(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Controls are always visible when paused; auto-hides after 2.5s when playing
  const isControlsVisible = !isPlaying || showControls;

  // Auto-hide controls when playing after 2.5s of inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setIsSpeedMenuOpen(false);
      }, 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcut listener for space, arrows, m, f
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(10);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekRelative, toggleMute, toggleFullscreen]);

  // Handle Seek from timeline slider
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = parseFloat(e.target.value);
    seek(nextTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  // Render Document State
  if (isDocument) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-muted/20">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-5 shadow-lg">
          <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Icon icon="lucide:file-text" className="size-8" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              Tài liệu bài học
            </span>
            <h3 className="text-lg font-bold text-foreground">{lessonTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {documentFileName || 'Bài học này là tài liệu đọc. Bạn có thể mở trực tiếp để xem nội dung.'}
            </p>
          </div>
          {documentUrl ? (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition shadow-md shadow-sky-600/20"
            >
              <Icon icon="lucide:external-link" className="size-4" />
              <span>Mở tài liệu đọc</span>
            </a>
          ) : (
            <div className="text-xs text-muted-foreground">Chưa có liên kết tệp tin</div>
          )}
        </div>
      </div>
    );
  }

  // Render No Video Available State
  if (!videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-muted/20">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="size-16 rounded-2xl bg-muted border border-border text-muted-foreground flex items-center justify-center mx-auto">
            <Icon icon="lucide:video-off" className="size-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-foreground">{lessonTitle}</h3>
            <p className="text-xs text-muted-foreground">
              Bài học chưa có tệp video tải lên hoặc video đang trong quá trình chuyển mã xử lý.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
          setIsSpeedMenuOpen(false);
        }
      }}
      className={`relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* 16:9 Video Canvas Container */}
      <div className="relative w-full aspect-video max-h-full flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Center Big Play Button (when paused) */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Phát video"
            className="absolute size-18 rounded-full bg-sky-500/90 hover:bg-sky-400 text-zinc-950 flex items-center justify-center transition-all duration-200 transform hover:scale-110 shadow-2xl shadow-sky-500/40 z-10 cursor-pointer"
          >
            <Icon icon="lucide:play" className="size-8 translate-x-0.5 fill-current" />
          </button>
        )}

        {/* Top Gradient Vignette */}
        <div
          className={`absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none transition-opacity duration-300 z-10 ${
            isControlsVisible ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Bottom Cinema Controls Overlay */}
        <div
          className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/75 to-transparent transition-opacity duration-300 z-20 space-y-2.5 ${
            isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Slider Bar with Buffer & Timeline Markers */}
          <div className="relative w-full group/slider flex items-center h-4 cursor-pointer">
            {/* Background Track */}
            <div className="absolute inset-x-0 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              {/* Buffer progress */}
              <div
                className="h-full bg-zinc-700/60 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, bufferPercent))}%` }}
              />
            </div>

            {/* Played progress */}
            <div
              className="absolute left-0 h-1.5 bg-sky-500 rounded-full pointer-events-none"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />

            {/* Timeline Tick Markers on the track */}
            {duration > 0 &&
              timelineMarkers.map((marker, idx) => {
                const tickPercent = (marker.time / duration) * 100;
                if (tickPercent > 100) return null;
                return (
                  <div
                    key={idx}
                    title={`${formatTime(marker.time)} - ${marker.label}`}
                    style={{ left: `${tickPercent}%` }}
                    className="absolute top-1/2 -translate-y-1/2 size-2 rounded-full bg-amber-400 border border-zinc-950 ring-1 ring-amber-400/50 hover:scale-150 transition-transform pointer-events-none z-10"
                  />
                );
              })}

            {/* Interactive Range Input */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSliderChange}
              aria-label="Thanh tua video"
              className="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-20"
            />

            {/* Scrubber thumb circle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full bg-sky-400 shadow-md ring-2 ring-sky-500/40 opacity-0 group-hover/slider:opacity-100 transition-opacity pointer-events-none -ml-1.5"
              style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>

          {/* Lower Controls Bar: Left Buttons & Right Tools */}
          <div className="flex items-center justify-between gap-3 text-zinc-200">
            {/* Left Controls: Play, Rewind 10s, Forward 10s, Time */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Play / Pause button */}
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                className="size-8 rounded-lg hover:bg-zinc-800/80 flex items-center justify-center transition text-zinc-100 hover:text-sky-400 cursor-pointer"
              >
                <Icon
                  icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
                  className="size-4.5 fill-current"
                />
              </button>

              {/* Rewind 10s */}
              <button
                type="button"
                onClick={() => seekRelative(-10)}
                title="Tua lùi 10 giây (←)"
                className="size-8 rounded-lg hover:bg-zinc-800/80 flex items-center justify-center transition text-zinc-300 hover:text-zinc-100 cursor-pointer"
              >
                <Icon icon="lucide:rotate-ccw" className="size-4" />
                <span className="sr-only">Tua lùi 10 giây</span>
              </button>

              {/* Forward 10s */}
              <button
                type="button"
                onClick={() => seekRelative(10)}
                title="Tua tới 10 giây (→)"
                className="size-8 rounded-lg hover:bg-zinc-800/80 flex items-center justify-center transition text-zinc-300 hover:text-zinc-100 cursor-pointer"
              >
                <Icon icon="lucide:rotate-cw" className="size-4" />
                <span className="sr-only">Tua tới 10 giây</span>
              </button>

              {/* Volume & Mute control with expand on hover */}
              <div className="flex items-center gap-1.5 group/volume">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                  className="size-8 rounded-lg hover:bg-zinc-800/80 flex items-center justify-center transition text-zinc-300 hover:text-zinc-100 cursor-pointer"
                >
                  <Icon
                    icon={
                      isMuted || volume === 0
                        ? 'lucide:volume-x'
                        : volume < 0.5
                          ? 'lucide:volume-1'
                          : 'lucide:volume-2'
                    }
                    className="size-4.5"
                  />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                  aria-label="Thanh chỉnh âm lượng"
                  className="w-0 group-hover/volume:w-16 transition-all duration-200 accent-sky-400 h-1 bg-zinc-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Time Display */}
              <div className="text-xs font-mono text-zinc-300 pl-1 select-none">
                <span className="text-sky-400 font-medium">{formatTime(currentTime)}</span>
                <span className="text-zinc-500 mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Speed Menu & Fullscreen */}
            <div className="flex items-center gap-2 relative">
              {/* Playback Speed Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSpeedMenuOpen((prev) => !prev)}
                  title="Tốc độ phát"
                  className="px-2.5 py-1 rounded-lg bg-zinc-800/70 hover:bg-zinc-700/80 text-xs font-semibold text-zinc-200 transition cursor-pointer flex items-center gap-1"
                >
                  <span>{playbackRate}x</span>
                  <Icon icon="lucide:chevron-up" className="size-3 text-zinc-400" />
                </button>

                {isSpeedMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-24 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-2xl z-30 space-y-0.5">
                    <div className="text-[10px] uppercase font-bold text-zinc-400 px-2 py-1 tracking-wider">
                      Tốc độ
                    </div>
                    {SPEED_OPTIONS.map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => {
                          setRate(speed);
                          setIsSpeedMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                          playbackRate === speed
                            ? 'bg-sky-500/15 text-sky-400 font-bold'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <span>{speed}x</span>
                        {playbackRate === speed && (
                          <Icon icon="lucide:check" className="size-3 text-sky-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Thu nhỏ (F)' : 'Toàn màn hình (F)'}
                className="size-8 rounded-lg hover:bg-zinc-800/80 flex items-center justify-center transition text-zinc-300 hover:text-zinc-100 cursor-pointer"
              >
                <Icon
                  icon={isFullscreen ? 'lucide:minimize' : 'lucide:maximize'}
                  className="size-4.5"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
