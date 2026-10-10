'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@/components/ui/icon';
import { UseVideoPlayerReturn } from './use-video-player';
import { TimelinePinMarker } from './lesson-timeline-pin-marker';
import { CreateQuizMarkerModal } from './create-quiz-marker-modal';
import { InVideoQuizPromptOverlay } from './in-video-quiz-prompt-overlay';
import { StudentInVideoQuizModal } from './student-in-video-quiz-modal';
import { useLessonQuizzesQuery } from '../../api/lesson-quiz.api';

export interface TimelineMarker {
  time: number;
  label: string;
}

interface LessonVideoScreenProps {
  player: UseVideoPlayerReturn;
  videoUrl?: string;
  lessonTitle: string;
  lessonId?: string;
  isDocument?: boolean;
  documentUrl?: string;
  documentFileName?: string;
  timelineMarkers?: TimelineMarker[];
  isInstructor?: boolean;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

export function LessonVideoScreen({
  player,
  videoUrl,
  lessonTitle,
  lessonId,
  isDocument = false,
  documentUrl,
  documentFileName,
  timelineMarkers = [],
  isInstructor = false,
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
  const hoverLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Instructor Timeline Marker State
  const [hoverSlider, setHoverSlider] = useState<{
    isHovering: boolean;
    percent: number;
    time: number;
  } | null>(null);
  // Checkpoint dot directly hovered by cursor (chỉ kích hoạt khi đưa chuột trúng vòng tròn vàng)
  const [hoveredDotCheckpoint, setHoveredDotCheckpoint] = useState<{
    timestamp: number;
    percent: number;
    questions: typeof dbQuizzes;
  } | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);
  const [selectedQuizTime, setSelectedQuizTime] = useState<number>(0);
  const [autoAddNewQuestion, setAutoAddNewQuestion] = useState<boolean>(false);

  // Real quizzes query from backend
  const { data: dbQuizzes = [] } = useLessonQuizzesQuery(lessonId);

  // Grouped unique quiz checkpoints: cluster checkpoints within 2 seconds into a single marker!
  const quizCheckpoints = useMemo(() => {
    const map = new Map<number, typeof dbQuizzes>();
    const sorted = [...dbQuizzes].sort((a, b) => a.timestamp - b.timestamp);
    for (const q of sorted) {
      const rounded = Math.round(q.timestamp);
      let clusterKey: number | null = null;
      for (const existingKey of map.keys()) {
        if (Math.abs(existingKey - rounded) <= 2) {
          clusterKey = existingKey;
          break;
        }
      }
      if (clusterKey !== null) {
        map.get(clusterKey)!.push(q);
      } else {
        map.set(rounded, [q]);
      }
    }
    return map;
  }, [dbQuizzes]);

  // Student In-Video Interactive Prompt & Modal States
  const [activePromptTimestamp, setActivePromptTimestamp] = useState<number | null>(null);
  const [studentQuizTimestamp, setStudentQuizTimestamp] = useState<number | null>(null);
  const [isStudentQuizModalOpen, setIsStudentQuizModalOpen] = useState<boolean>(false);
  const handledQuizTimestampsRef = useRef<Set<number>>(new Set());

  // Listen to video currentTime during playback: pause video and prompt student when hitting a quiz checkpoint
  useEffect(() => {
    if (
      !isPlaying ||
      activePromptTimestamp !== null ||
      isStudentQuizModalOpen ||
      isQuizModalOpen
    ) {
      return;
    }

    const currentSec = Math.floor(currentTime);
    for (const timestamp of quizCheckpoints.keys()) {
      if (
        Math.abs(currentSec - timestamp) <= 1 &&
        !handledQuizTimestampsRef.current.has(timestamp)
      ) {
        if (videoRef.current) {
          videoRef.current.pause();
        }
        handledQuizTimestampsRef.current.add(timestamp);
        setActivePromptTimestamp(timestamp);
        break;
      }
    }
  }, [
    currentTime,
    isPlaying,
    quizCheckpoints,
    activePromptTimestamp,
    isStudentQuizModalOpen,
    isQuizModalOpen,
    videoRef,
  ]);

  const handleSkipPrompt = () => {
    setActivePromptTimestamp(null);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTakeQuiz = () => {
    const targetTime = activePromptTimestamp;
    setActivePromptTimestamp(null);
    if (targetTime !== null) {
      setStudentQuizTimestamp(targetTime);
      setIsStudentQuizModalOpen(true);
    }
  };

  const handleCompleteAndResumeVideo = () => {
    setIsStudentQuizModalOpen(false);
    setStudentQuizTimestamp(null);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  // Calculate mouse position and timestamp on hover over timeline slider
  const handleSliderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInstructor || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = offsetX / rect.width;
    const currentPercent = ratio * 100;

    // Khi di chuyển chuột trên thanh tua xa khỏi vòng tròn vàng (> 1.2% bề rộng), hủy focus hiển thị nút "Thêm câu hỏi"
    if (hoveredDotCheckpoint) {
      if (Math.abs(hoveredDotCheckpoint.percent - currentPercent) > 1.2) {
        if (hoverLeaveTimeoutRef.current) {
          clearTimeout(hoverLeaveTimeoutRef.current);
          hoverLeaveTimeoutRef.current = null;
        }
        setHoveredDotCheckpoint(null);
      }
    }

    setHoverSlider({
      isHovering: true,
      percent: currentPercent,
      time: ratio * duration,
    });
  };

  const handleSliderMouseLeave = () => {
    setHoverSlider(null);
  };

  // Click on Pin Marker or Checkpoint Dot: pause video, get precise clickedTime, and open question modal
  const handlePinClick = (e: React.MouseEvent, time: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (hoverLeaveTimeoutRef.current) {
      clearTimeout(hoverLeaveTimeoutRef.current);
      hoverLeaveTimeoutRef.current = null;
    }
    setHoverSlider(null);
    setHoveredDotCheckpoint(null);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    // Snap to existing cluster if within 2 seconds, otherwise round to integer seconds
    const roundedTime = Math.round(time);
    let targetTime = roundedTime;
    for (const existingTs of quizCheckpoints.keys()) {
      if (Math.abs(existingTs - roundedTime) <= 2) {
        targetTime = existingTs;
        break;
      }
    }
    setSelectedQuizTime(targetTime);
    setAutoAddNewQuestion(false);
    setIsQuizModalOpen(true);
  };

  // Click on "Thêm câu hỏi" button when hovering on existing checkpoint: auto append next question
  const handleAddQuestionToExistingCheckpoint = (e: React.MouseEvent, ts: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (hoverLeaveTimeoutRef.current) {
      clearTimeout(hoverLeaveTimeoutRef.current);
      hoverLeaveTimeoutRef.current = null;
    }
    setHoverSlider(null);
    setHoveredDotCheckpoint(null);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setSelectedQuizTime(ts);
    setAutoAddNewQuestion(true);
    setIsQuizModalOpen(true);
  };

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
      if (hoverLeaveTimeoutRef.current) {
        clearTimeout(hoverLeaveTimeoutRef.current);
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

      // Don't intercept video controls if quiz prompt or quiz modal is active
      if (activePromptTimestamp !== null || isStudentQuizModalOpen || isQuizModalOpen) {
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
  }, [
    togglePlay,
    seekRelative,
    toggleMute,
    toggleFullscreen,
    activePromptTimestamp,
    isStudentQuizModalOpen,
    isQuizModalOpen,
  ]);

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
          {/* Progress Slider Bar with Buffer, Timeline Markers & Pin Marker */}
          <div
            onMouseMove={handleSliderMouseMove}
            onMouseLeave={handleSliderMouseLeave}
            className="relative w-full group/slider flex items-center h-4 cursor-pointer"
          >
            {/* Background Track */}
            <div className="absolute inset-x-0 h-[4.5px] group-hover/slider:h-[5.5px] bg-zinc-800 rounded-full overflow-hidden transition-all duration-150">
              {/* Buffer progress */}
              <div
                className="h-full bg-zinc-700/60 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, bufferPercent))}%` }}
              />
            </div>

            {/* Played progress */}
            <div
              className="absolute left-0 h-[4.5px] group-hover/slider:h-[5.5px] bg-sky-500 rounded-full pointer-events-none transition-all duration-150"
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
                    className="absolute top-1/2 -translate-y-1/2 size-1.5 -ml-[3px] rounded-full bg-amber-400 border border-zinc-950 ring-1 ring-amber-400/50 hover:scale-150 transition-all pointer-events-none z-10"
                  />
                );
              })}

            {/* Real Database Quiz Checkpoints on Timeline */}
            {duration > 0 &&
              Array.from(quizCheckpoints.entries()).map(([ts, questions]) => {
                const quizPercent = (ts / duration) * 100;
                if (quizPercent > 100) return null;
                const sampleQ = questions[0]?.question || 'Câu hỏi tương tác';
                return (
                  <div
                    key={`quiz-db-${ts}`}
                    title={`[${formatTime(ts)}] ${questions.length} câu hỏi: ${sampleQ}`}
                    style={{ left: `${quizPercent}%` }}
                    className="absolute top-1/2 -translate-y-1/2 -ml-2 size-4 flex items-center justify-center z-30 pointer-events-auto cursor-pointer group/checkpoint"
                    onMouseEnter={() => {
                      if (hoverLeaveTimeoutRef.current) {
                        clearTimeout(hoverLeaveTimeoutRef.current);
                        hoverLeaveTimeoutRef.current = null;
                      }
                      if (isInstructor) {
                        setHoveredDotCheckpoint({
                          timestamp: ts,
                          percent: quizPercent,
                          questions,
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      if (hoverLeaveTimeoutRef.current) {
                        clearTimeout(hoverLeaveTimeoutRef.current);
                      }
                      hoverLeaveTimeoutRef.current = setTimeout(() => {
                        setHoveredDotCheckpoint(null);
                      }, 350);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (isInstructor) {
                        handlePinClick(e, ts);
                      } else {
                        seek(ts);
                      }
                    }}
                  >
                    {/* Vòng tròn vàng (Yellow Circle) */}
                    <div className="size-2.5 rounded-full bg-amber-400 border border-white dark:border-zinc-950 shadow-sm flex items-center justify-center group-hover/checkpoint:scale-125 transition-transform">
                      <div className="size-1 rounded-full bg-slate-900 pointer-events-none" />
                    </div>
                  </div>
                );
              })}

            {/* Interactive Pin Marker on Hover (Instructor Mode): Chỉ hiện khi hover vào điểm CHƯA có câu hỏi */}
            {isInstructor && hoverSlider?.isHovering && !hoveredDotCheckpoint && (
              <TimelinePinMarker
                percent={hoverSlider.percent}
                time={hoverSlider.time}
                formatTime={formatTime}
                onClick={(e) => handlePinClick(e, hoverSlider.time)}
                label="Thêm câu hỏi"
              />
            )}

            {/* Nút "Thêm câu hỏi" hiện ra ở dưới thanh timeline CHỈ KHI đưa chuột vào vòng tròn vàng */}
            {isInstructor && hoveredDotCheckpoint && (
              <div
                style={{
                  left: `${Math.min(90, Math.max(10, hoveredDotCheckpoint.percent))}%`,
                }}
                onMouseEnter={() => {
                  if (hoverLeaveTimeoutRef.current) {
                    clearTimeout(hoverLeaveTimeoutRef.current);
                    hoverLeaveTimeoutRef.current = null;
                  }
                }}
                onMouseLeave={() => {
                  if (hoverLeaveTimeoutRef.current) {
                    clearTimeout(hoverLeaveTimeoutRef.current);
                  }
                  hoverLeaveTimeoutRef.current = setTimeout(() => {
                    setHoveredDotCheckpoint(null);
                  }, 250);
                }}
                className="absolute top-full pt-1.5 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-auto select-none animate-in fade-in-0 zoom-in-95 duration-150"
              >
                {/* Hitbox bridge so pointer events are seamlessly preserved when cursor travels from timeline track to button */}
                <div className="absolute -top-3 inset-x-0 h-4 bg-transparent pointer-events-auto" />

                {/* Mũi tên nhỏ trỏ lên thanh timeline */}
                <div className="size-2 rotate-45 bg-amber-500 -mb-1 shadow-xs pointer-events-none" />

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddQuestionToExistingCheckpoint(e, hoveredDotCheckpoint.timestamp);
                  }}
                  title={`Thêm câu hỏi tiếp theo vào bộ câu hỏi tại mốc ${formatTime(hoveredDotCheckpoint.timestamp)}`}
                  className="relative z-10 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs shadow-xl shadow-amber-500/30 border border-amber-300 dark:border-amber-400 flex items-center gap-1.5 cursor-pointer transform hover:scale-105 active:scale-95 transition-all duration-150 whitespace-nowrap"
                >
                  <Icon icon="lucide:plus-circle" className="size-3.5 stroke-[2.5]" />
                  <span>Thêm câu hỏi</span>
                </button>
              </div>
            )}

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
              className="absolute top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-sky-400 shadow-md ring-2 ring-sky-500/40 opacity-0 group-hover/slider:opacity-100 transition-all duration-150 pointer-events-none -ml-[5px]"
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

        {/* Student In-Video Prompt Overlay */}
        {activePromptTimestamp !== null && (
          <InVideoQuizPromptOverlay
            timestamp={activePromptTimestamp}
            formatTime={formatTime}
            questionCount={quizCheckpoints.get(activePromptTimestamp)?.length || 1}
            onTakeQuiz={handleTakeQuiz}
            onSkip={handleSkipPrompt}
          />
        )}

        {/* Student In-Video Quiz Modal */}
        {studentQuizTimestamp !== null && (
          <StudentInVideoQuizModal
            open={isStudentQuizModalOpen}
            onOpenChange={setIsStudentQuizModalOpen}
            timestamp={studentQuizTimestamp}
            formatTime={formatTime}
            quizzes={quizCheckpoints.get(studentQuizTimestamp) || []}
            onCompleteAndResume={handleCompleteAndResumeVideo}
          />
        )}

        {/* Dialog for Creating / Editing Quiz at Selected Timestamp (Instructor Mode) */}
        <CreateQuizMarkerModal
          open={isQuizModalOpen}
          onOpenChange={setIsQuizModalOpen}
          timestamp={selectedQuizTime}
          formatTime={formatTime}
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          existingQuizzes={dbQuizzes}
          initialAddNewQuestion={autoAddNewQuestion}
        />
      </div>
    </div>
  );
}
