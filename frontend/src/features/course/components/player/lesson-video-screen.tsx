'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UseVideoPlayerReturn } from './use-video-player';
import { TimelinePinMarker } from './lesson-timeline-pin-marker';
import { CreateQuizMarkerModal } from './create-quiz-marker-modal';
import { InVideoQuizPromptOverlay } from './in-video-quiz-prompt-overlay';
import { StudentInVideoQuizModal } from './student-in-video-quiz-modal';
import {
  useLessonQuizzesQuery,
  useMoveMergeLessonQuizClusterMutation,
} from '../../api/lesson-quiz.api';

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

  // Mutation to move or merge quiz clusters
  const moveMergeMutation = useMoveMergeLessonQuizClusterMutation(lessonId);

  // Ref to seekbar track for accurate pointer coordinates
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);

  // Long-press (1s) & Drag & Drop Cluster States
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isHoldingBadge, setIsHoldingBadge] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isDraggingCluster, setIsDraggingCluster] = useState<boolean>(false);
  const [dragSource, setDragSource] = useState<{
    timestamp: number;
    percent: number;
    questions: typeof dbQuizzes;
  } | null>(null);
  const [currentDragTime, setCurrentDragTime] = useState<number>(0);
  const [currentDragPercent, setCurrentDragPercent] = useState<number>(0);
  const [snapTarget, setSnapTarget] = useState<{
    timestamp: number;
    percent: number;
    questions: typeof dbQuizzes;
  } | null>(null);

  // Merge Confirmation Modal State (Option B requested by User)
  const [mergeConfirmData, setMergeConfirmData] = useState<{
    sourceTimestamp: number;
    targetTimestamp: number;
    sourceCount: number;
    targetCount: number;
  } | null>(null);

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
      isQuizModalOpen ||
      isDraggingCluster ||
      mergeConfirmData !== null
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
    isDraggingCluster,
    mergeConfirmData,
    videoRef,
  ]);

  const handleSkipPrompt = () => {
    setActivePromptTimestamp(null);
    if (videoRef.current) {
      videoRef.current.play().catch(() => { });
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
      videoRef.current.play().catch(() => { });
    }
  };

  // Calculate mouse position and timestamp on hover over timeline slider
  const handleSliderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInstructor || !duration || isDraggingCluster) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = offsetX / rect.width;
    const currentPercent = ratio * 100;

    // Khi di chuyển chuột trên thanh tua xa khỏi vòng tròn vàng (> 1.2% bề rộng), hủy focus hiển thị nút "Thêm câu hỏi"
    if (hoveredDotCheckpoint && !isHoldingBadge) {
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
    if (isHoldingBadge || isDraggingCluster) return;
    setHoverSlider(null);
  };

  // Click on Pin Marker or Checkpoint Dot: pause video, get precise clickedTime, and open question modal
  const handlePinClick = (e: React.MouseEvent, time: number) => {
    if (!isInstructor) return;
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
  const handleAddQuestionToExistingCheckpoint = (e: React.MouseEvent | React.PointerEvent, ts: number) => {
    if (!isInstructor) return;
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

  // 1s Hold (Long-press) on "Thêm câu hỏi" Badge
  const handleBadgePointerDown = (e: React.PointerEvent) => {
    if (!isInstructor || e.button !== 0) return; // Only trigger for editors using the primary mouse button
    e.preventDefault();
    e.stopPropagation();

    if (!hoveredDotCheckpoint) return;

    const source = {
      timestamp: hoveredDotCheckpoint.timestamp,
      percent: hoveredDotCheckpoint.percent,
      questions: hoveredDotCheckpoint.questions,
    };

    setIsHoldingBadge(true);
    setHoldProgress(0);

    const HOLD_DURATION = 1000; // 1.0 second
    const startTime = Date.now();

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (holdProgressIntervalRef.current) clearInterval(holdProgressIntervalRef.current);

    holdProgressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / HOLD_DURATION) * 100);
      setHoldProgress(pct);
    }, 30);

    longPressTimerRef.current = setTimeout(() => {
      if (holdProgressIntervalRef.current) {
        clearInterval(holdProgressIntervalRef.current);
        holdProgressIntervalRef.current = null;
      }
      setIsHoldingBadge(false);
      setHoldProgress(100);

      // Pause playback while dragging
      if (videoRef.current) {
        videoRef.current.pause();
      }

      // Enter Drag Mode!
      setIsDraggingCluster(true);
      setDragSource(source);
      setCurrentDragTime(source.timestamp);
      setCurrentDragPercent(source.percent);
      setSnapTarget(null);
      setHoveredDotCheckpoint(null);
    }, HOLD_DURATION);
  };

  const handleBadgePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const wasHolding = isHoldingBadge;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (holdProgressIntervalRef.current) {
      clearInterval(holdProgressIntervalRef.current);
      holdProgressIntervalRef.current = null;
    }
    setIsHoldingBadge(false);
    setHoldProgress(0);

    // If released before 1s and not in drag mode, treat as regular quick click:
    if (wasHolding && !isDraggingCluster && hoveredDotCheckpoint) {
      handleAddQuestionToExistingCheckpoint(e, hoveredDotCheckpoint.timestamp);
    }
  };

  const handleBadgePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (holdProgressIntervalRef.current) {
      clearInterval(holdProgressIntervalRef.current);
      holdProgressIntervalRef.current = null;
    }
    setIsHoldingBadge(false);
    setHoldProgress(0);
  };

  // Global window listeners for Dragging Mode
  useEffect(() => {
    if (!isInstructor || !isDraggingCluster || !dragSource || !duration) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const sliderEl = sliderTrackRef.current;
      if (!sliderEl) return;
      const rect = sliderEl.getBoundingClientRect();
      if (rect.width <= 0) return;

      const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const ratio = offsetX / rect.width;
      const rawTime = ratio * duration;
      const rawPercent = ratio * 100;

      // Find snap target among other checkpoints (excluding the current dragged cluster)
      // Snap threshold: strictly within 5 seconds of an existing checkpoint
      const SNAP_TIME_THRESHOLD = 5;
      let closestTarget: {
        timestamp: number;
        percent: number;
        questions: typeof dbQuizzes;
      } | null = null;
      let closestDistance = Infinity;

      for (const [ts, qs] of quizCheckpoints.entries()) {
        if (Math.abs(ts - dragSource.timestamp) <= 1) {
          continue; // skip the dragged source cluster itself
        }
        const timeDiff = Math.abs(ts - rawTime);
        if (timeDiff <= SNAP_TIME_THRESHOLD) {
          if (timeDiff < closestDistance) {
            closestDistance = timeDiff;
            const targetPercent = (ts / duration) * 100;
            closestTarget = { timestamp: ts, percent: targetPercent, questions: qs };
          }
        }
      }

      if (closestTarget) {
        setSnapTarget(closestTarget);
        setCurrentDragTime(closestTarget.timestamp);
        setCurrentDragPercent(closestTarget.percent);
      } else {
        setSnapTarget(null);
        setCurrentDragTime(rawTime);
        setCurrentDragPercent(rawPercent);
      }
    };

    const handleWindowPointerUp = () => {
      const sourceTs = dragSource.timestamp;
      const sourceCount = dragSource.questions.length;
      const target = snapTarget;
      const droppedTime = Math.round(currentDragTime);

      setIsDraggingCluster(false);
      setDragSource(null);
      setSnapTarget(null);

      // 1. Dropped on another cluster -> Prompt Confirmation Dialog (Option B)
      if (target && Math.abs(target.timestamp - sourceTs) > 1) {
        setMergeConfirmData({
          sourceTimestamp: sourceTs,
          targetTimestamp: target.timestamp,
          sourceCount,
          targetCount: target.questions.length,
        });
      } else if (!target && Math.abs(droppedTime - sourceTs) > 1) {
        // 2. Dropped on empty timeline area -> Reposition cluster (Move)
        moveMergeMutation.mutate(
          { sourceTimestamp: sourceTs, targetTimestamp: droppedTime },
          {
            onSuccess: () => {
              toast.success(
                `Đã di chuyển cụm ${sourceCount} câu hỏi sang mốc ${formatTime(droppedTime)}!`,
              );
            },
          },
        );
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDraggingCluster(false);
        setDragSource(null);
        setSnapTarget(null);
        toast.info('Đã hủy thao tác kéo cụm câu hỏi');
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isInstructor,
    isDraggingCluster,
    dragSource,
    snapTarget,
    currentDragTime,
    duration,
    quizCheckpoints,
    moveMergeMutation,
    formatTime,
  ]);

  // Execute Merge when confirmed in Dialog
  const handleConfirmMerge = async () => {
    if (!isInstructor || !mergeConfirmData) return;
    const { sourceTimestamp, targetTimestamp, sourceCount, targetCount } = mergeConfirmData;
    try {
      await moveMergeMutation.mutateAsync({
        sourceTimestamp,
        targetTimestamp,
      });
      toast.success('Gộp cụm câu hỏi thành công!', {
        description: `Đã gộp ${sourceCount} câu hỏi vào mốc ${formatTime(targetTimestamp)} (Tổng: ${sourceCount + targetCount} câu hỏi).`,
      });
      setMergeConfirmData(null);
    } catch {
      // Error handled by mutation onError
    }
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
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (holdProgressIntervalRef.current) {
        clearInterval(holdProgressIntervalRef.current);
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

      // Don't intercept video controls if quiz prompt, quiz modal, drag mode, or merge confirm is active
      if (
        activePromptTimestamp !== null ||
        isStudentQuizModalOpen ||
        isQuizModalOpen ||
        isDraggingCluster ||
        mergeConfirmData !== null
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
  }, [
    togglePlay,
    seekRelative,
    toggleMute,
    toggleFullscreen,
    activePromptTimestamp,
    isStudentQuizModalOpen,
    isQuizModalOpen,
    isDraggingCluster,
    mergeConfirmData,
  ]);

  // Handle Seek from timeline slider
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDraggingCluster) return;
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
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
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
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#027D88] hover:bg-[#02646d] text-white font-semibold text-sm transition shadow-none"
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
      className={`relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none ${isFullscreen ? 'fixed inset-0 z-50' : ''
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

        {/* Center Big Play Button: Frosted Glassmorphism Luxury (Matching Trailer Idle State) */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Phát video"
            className="absolute size-16 sm:size-18 rounded-full bg-white/20 dark:bg-black/40 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl z-10 cursor-pointer group"
          >
            <Icon icon="lucide:play" className="size-7 sm:size-8 ml-0.5 fill-white text-white transition-transform group-hover:scale-110" />
          </button>
        )}

        {/* Top Vignette Scrim (taste-skill-ignore: neutral scrim over video footage) */}
        <div
          className={`absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none transition-opacity duration-300 z-10 /* taste-skill-ignore */ ${isControlsVisible ? 'opacity-100' : 'opacity-0'
            }`}
        />

        {/* Bottom Cinema Controls Overlay (taste-skill-ignore: neutral scrim over video footage) */}
        <div
          className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/75 to-transparent transition-opacity duration-300 z-20 space-y-2 /* taste-skill-ignore */ ${isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
          {/* Progress Slider Bar with Buffer, Timeline Markers & Pin Marker (Cinema Luxury 2px) */}
          <div
            ref={sliderTrackRef}
            onMouseMove={handleSliderMouseMove}
            onMouseLeave={handleSliderMouseLeave}
            className="relative w-full group/slider flex items-center h-4 cursor-pointer"
          >
            {/* Background Track (Ultra-thin 2px, expands to 3px on hover) */}
            <div className="absolute inset-x-0 h-[2px] group-hover/slider:h-[3px] bg-white/20 rounded-full overflow-hidden transition-all duration-150">
              {/* Buffer progress */}
              <div
                className="h-full bg-white/35 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, bufferPercent))}%` }}
              />
            </div>

            {/* Played progress (Crisp Pure White) */}
            <div
              className="absolute left-0 h-[2px] group-hover/slider:h-[3px] bg-white rounded-full pointer-events-none transition-all duration-150"
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
                    className="absolute top-1/2 -translate-y-1/2 size-1 -ml-[2px] rounded-full bg-white/50 pointer-events-none z-10"
                  />
                );
              })}

            {/* Real Database Quiz Checkpoints on Timeline (Subtle Micro-Gems) */}
            {duration > 0 &&
              Array.from(quizCheckpoints.entries()).map(([ts, questions]) => {
                const quizPercent = (ts / duration) * 100;
                if (quizPercent > 100) return null;
                const sampleQ = questions[0]?.question || 'Câu hỏi tương tác';
                const isSnapTarget = snapTarget?.timestamp === ts;
                const isSourceBeingDragged = isDraggingCluster && dragSource?.timestamp === ts;
                const isMultiple = questions.length >= 2;

                return (
                  <div
                    key={`quiz-db-${ts}`}
                    title={`[${formatTime(ts)}] ${questions.length} câu hỏi: ${sampleQ}`}
                    style={{ left: `${quizPercent}%` }}
                    className={`absolute top-1/2 -translate-y-1/2 -ml-1.5 size-3 flex items-center justify-center z-30 pointer-events-auto cursor-pointer group/checkpoint transition-all ${isSourceBeingDragged ? 'opacity-30 scale-75' : ''
                      }`}
                    onMouseEnter={() => {
                      if (isDraggingCluster) return;
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
                      if (isDraggingCluster || isHoldingBadge) return;
                      if (hoverLeaveTimeoutRef.current) {
                        clearTimeout(hoverLeaveTimeoutRef.current);
                      }
                      hoverLeaveTimeoutRef.current = setTimeout(() => {
                        setHoveredDotCheckpoint(null);
                      }, 350);
                    }}
                    onClick={(e) => {
                      if (isDraggingCluster) return;
                      e.stopPropagation();
                      e.preventDefault();
                      if (isInstructor) {
                        handlePinClick(e, ts);
                      } else {
                        seek(ts);
                      }
                    }}
                  >
                    {/* Micro-gem marker on track (Subtle Amber Notch / Gem) */}
                    <div
                      className={`transition-all duration-150 ${isSnapTarget
                        ? 'size-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/50 scale-125'
                        : isMultiple
                          ? 'w-2.5 h-1.5 rounded-full bg-amber-400 border border-zinc-950 ring-1 ring-amber-300 group-hover/checkpoint:scale-125'
                          : 'size-1.5 rounded-full bg-amber-400 border border-zinc-950 group-hover/checkpoint:scale-125'
                        }`}
                    />
                  </div>
                );
              })}

            {/* Interactive Pin Marker on Hover (Instructor Mode): Chỉ hiện khi hover vào điểm CHƯA có câu hỏi */}
            {isInstructor && !isDraggingCluster && hoverSlider?.isHovering && !hoveredDotCheckpoint && (
              <TimelinePinMarker
                percent={hoverSlider.percent}
                time={hoverSlider.time}
                formatTime={formatTime}
                onClick={(e) => handlePinClick(e, hoverSlider.time)}
                label="Thêm câu hỏi"
              />
            )}

            {/* Nút "Thêm câu hỏi" hiện ra ở dưới thanh timeline CHỈ KHI đưa chuột vào vòng tròn vàng */}
            {isInstructor && !isDraggingCluster && hoveredDotCheckpoint && (
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
                  if (isHoldingBadge) return;
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
                  onPointerDown={handleBadgePointerDown}
                  onPointerUp={handleBadgePointerUp}
                  onPointerLeave={handleBadgePointerCancel}
                  onPointerCancel={handleBadgePointerCancel}
                  title="Nhấn để thêm câu hỏi • Nhấn giữ 1s để kéo và gộp cụm câu hỏi"
                  className={`relative overflow-hidden z-10 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs shadow-xl shadow-amber-500/30 border border-amber-300 dark:border-amber-400 flex items-center gap-1.5 cursor-grab active:cursor-grabbing transform transition-all duration-150 whitespace-nowrap select-none ${isHoldingBadge
                    ? 'scale-105 ring-2 ring-amber-300 ring-offset-1 ring-offset-zinc-950'
                    : 'hover:scale-105 active:scale-95'
                    }`}
                >
                  {/* Thanh nạp tiến trình 1s (Progress fill bar) */}
                  {isHoldingBadge && (
                    <div
                      className="absolute inset-y-0 left-0 bg-amber-700/50 pointer-events-none transition-[width] duration-75"
                      style={{ width: `${holdProgress}%` }}
                    />
                  )}

                  <Icon
                    icon={isHoldingBadge ? 'lucide:grip-horizontal' : 'lucide:plus-circle'}
                    className={`size-3.5 stroke-[2.5] relative z-10 ${isHoldingBadge ? 'animate-pulse' : ''}`}
                  />
                  <span className="relative z-10">
                    {isHoldingBadge ? 'Giữ để kéo...' : 'Thêm câu hỏi'}
                  </span>
                  {!isHoldingBadge && (
                    <span className="relative z-10 text-[10px] font-medium text-slate-800/80 border-l border-slate-950/20 pl-1 hidden sm:inline">
                      Giữ 1s kéo gộp
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Guide line & Floating card when dragging cluster */}
            {isInstructor && isDraggingCluster && (
              <>
                {/* Vertical Guide Line across timeline slider */}
                <div
                  style={{ left: `${currentDragPercent}%` }}
                  className={`absolute top-0 bottom-0 w-0.5 -ml-px pointer-events-none z-40 transition-none ${snapTarget
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                    }`}
                />

                {/* Floating Indicator Card following the cursor/snap point */}
                <div
                  style={{
                    left: `${Math.min(85, Math.max(15, currentDragPercent))}%`,
                  }}
                  className="absolute bottom-full mb-3 -translate-x-1/2 z-50 pointer-events-none select-none transition-none animate-in fade-in-0 zoom-in-95 duration-100"
                >
                  <div
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 border whitespace-nowrap backdrop-blur-md ${snapTarget
                      ? 'bg-emerald-950/95 text-emerald-200 border-emerald-400'
                      : 'bg-zinc-950/95 text-white border-white/40'
                      }`}
                  >
                    <Icon
                      icon={snapTarget ? 'lucide:git-merge' : 'lucide:move-horizontal'}
                      className="size-4 shrink-0 text-current"
                    />
                    <span>
                      {snapTarget
                        ? `Thả để gộp ${dragSource?.questions.length} câu vào mốc ${formatTime(snapTarget.timestamp)} (Tổng: ${(dragSource?.questions.length || 0) + snapTarget.questions.length} câu)`
                        : `Di chuyển ${dragSource?.questions.length} câu hỏi đến ${formatTime(currentDragTime)}`}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-normal border-l border-zinc-700 pl-1.5">
                      Esc để hủy
                    </span>
                  </div>

                  {/* Arrow pointer down to seekbar */}
                  <div
                    className={`size-2 rotate-45 mx-auto -mt-1 shadow-xs ${snapTarget ? 'bg-emerald-400' : 'bg-white'
                      }`}
                  />
                </div>
              </>
            )}

            {/* Interactive Range Input (disabled during drag) */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSliderChange}
              aria-label="Thanh tua video"
              className={`absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-20 ${isDraggingCluster ? 'pointer-events-none' : ''
                }`}
            />

            {/* Scrubber thumb circle: Sleek White Pinhead */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-white shadow-md ring-2 ring-white/30 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-150 pointer-events-none -ml-[5px] ${isDraggingCluster ? 'hidden' : ''
                }`}
              style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>

          {/* Lower Controls Bar: Left Buttons & Right Tools (Cinema Luxury) */}
          <div className="flex items-center justify-between gap-3 text-white/90">
            {/* Left Controls: Play, Rewind 10s, Forward 10s, Time */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Play / Pause button */}
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition text-white/90 hover:text-white cursor-pointer"
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
                className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition text-white/80 hover:text-white cursor-pointer"
              >
                <Icon icon="lucide:rotate-ccw" className="size-4" />
                <span className="sr-only">Tua lùi 10 giây</span>
              </button>

              {/* Forward 10s */}
              <button
                type="button"
                onClick={() => seekRelative(10)}
                title="Tua tới 10 giây (→)"
                className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition text-white/80 hover:text-white cursor-pointer"
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
                  className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition text-white/80 hover:text-white cursor-pointer"
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
                  className="w-0 group-hover/volume:w-16 sm:group-hover/volume:w-20 transition-all duration-200 opacity-0 group-hover/volume:opacity-100 accent-white h-[2.5px] bg-white/30 rounded-full cursor-pointer"
                />
              </div>

              {/* Minimalist Time Counter (Matching Image 2 Style) */}
              <span className="text-xs text-white/90 tabular-nums select-none font-normal pl-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls: Speed Menu & Fullscreen */}
            <div className="flex items-center gap-2 relative">
              {/* Playback Speed Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSpeedMenuOpen((prev) => !prev)}
                  title="Tốc độ phát"
                  className="px-2 py-1 rounded hover:bg-white/10 text-xs font-medium text-white/90 hover:text-white transition cursor-pointer flex items-center gap-1"
                >
                  <span className="tabular-nums">{playbackRate}x</span>
                  <Icon icon="lucide:chevron-up" className="size-3 text-white/70" />
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
                        className={`w-full text-left px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-between ${playbackRate === speed
                          ? 'bg-white/15 text-white font-bold'
                          : 'text-zinc-300 hover:bg-zinc-800'
                          }`}
                      >
                        <span className="tabular-nums">{speed}x</span>
                        {playbackRate === speed && (
                          <Icon icon="lucide:check" className="size-3 text-white" />
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
                className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition text-white/80 hover:text-white cursor-pointer"
              >
                <Icon
                  icon={isFullscreen ? 'lucide:minimize' : 'lucide:maximize'}
                  className="size-4"
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
        {isInstructor && (
          <CreateQuizMarkerModal
            canEdit={isInstructor}
            open={isQuizModalOpen}
            onOpenChange={setIsQuizModalOpen}
            timestamp={selectedQuizTime}
            formatTime={formatTime}
            lessonId={lessonId}
            lessonTitle={lessonTitle}
            existingQuizzes={dbQuizzes}
            initialAddNewQuestion={autoAddNewQuestion}
          />
        )}

        {/* Merge Confirmation Dialog (Option B requested by User) */}
        <Dialog
          open={isInstructor && mergeConfirmData !== null}
          onOpenChange={(open) => {
            if (!open) setMergeConfirmData(null);
          }}
        >
          <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl text-foreground">
            <DialogHeader>
              <div className="flex items-center gap-2 text-foreground font-bold text-base">
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <Icon icon="lucide:git-merge" className="size-4" />
                </div>
                <DialogTitle>Xác nhận gộp câu hỏi tương tác</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground pt-2 leading-relaxed">
                Bạn có chắc chắn muốn gộp{' '}
                <span className="font-bold text-foreground">
                  {mergeConfirmData?.sourceCount} câu hỏi
                </span>{' '}
                ở mốc{' '}
                <span className="font-bold text-foreground">
                  {formatTime(mergeConfirmData?.sourceTimestamp || 0)}
                </span>{' '}
                vào cụm{' '}
                <span className="font-bold text-foreground">
                  {mergeConfirmData?.targetCount} câu hỏi
                </span>{' '}
                ở mốc{' '}
                <span className="font-bold text-foreground">
                  {formatTime(mergeConfirmData?.targetTimestamp || 0)}
                </span>{' '}
                không?
                <br />
                <span className="text-amber-500 dark:text-amber-400 mt-2 block font-medium">
                  Tổng cộng sau khi gộp sẽ là{' '}
                  <span className="font-bold">
                    {(mergeConfirmData?.sourceCount || 0) + (mergeConfirmData?.targetCount || 0)} câu hỏi
                  </span>{' '}
                  tại mốc {formatTime(mergeConfirmData?.targetTimestamp || 0)}.
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMergeConfirmData(null)}
                disabled={moveMergeMutation.isPending}
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmMerge}
                disabled={moveMergeMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-md shadow-emerald-600/30"
              >
                {moveMergeMutation.isPending ? (
                  <>
                    <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                    Đang gộp...
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:check" className="size-3.5 mr-1.5" />
                    Xác nhận gộp
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
