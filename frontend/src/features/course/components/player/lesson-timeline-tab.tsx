'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ITranscribedSentence, LessonTranscriptionStatusEnum } from 'share-lib';
import { TimelineMarker } from './lesson-video-screen';
import { LessonTimelineSkeleton } from './lesson-timeline-skeleton';

interface LessonTimelineTabProps {
  sentences?: ITranscribedSentence[];
  fallbackMarkers?: TimelineMarker[];
  currentTime: number;
  duration: number;
  isLoading?: boolean;
  transcriptionStatus?: LessonTranscriptionStatusEnum;
  onSeek: (seconds: number) => void;
  formatTime: (seconds: number) => string;
  onRetryTranscription?: () => void;
  isRetrying?: boolean;
}

export function LessonTimelineTab({
  sentences = [],
  fallbackMarkers = [],
  currentTime,
  isLoading = false,
  transcriptionStatus,
  onSeek,
  formatTime,
  onRetryTranscription,
  isRetrying = false,
}: LessonTimelineTabProps): React.JSX.Element {
  // Search query filter state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auto-scroll management: default true, pause if user scrolls manually
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState<boolean>(false);

  // References for scrolling
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentenceItemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Check if we are currently using database sentences or fallback markers
  const hasSentences = sentences && sentences.length > 0;

  // 1. Calculate Active Index based on currentTime (seconds converted to ms)
  const activeIndex = useMemo(() => {
    if (!hasSentences) {
      if (fallbackMarkers.length === 0) return -1;
      return fallbackMarkers.reduce((bestIndex, marker, index) => {
        if (currentTime >= marker.time) {
          return index;
        }
        return bestIndex;
      }, 0);
    }

    const currentMs = currentTime * 1000;

    // Check exact range [start, end]
    const exactMatchIndex = sentences.findIndex(
      (s) => currentMs >= s.start && currentMs <= s.end,
    );
    if (exactMatchIndex !== -1) {
      return exactMatchIndex;
    }

    // Gap handling: in-between sentences or brief pause, find latest passed sentence
    let latestIndex = -1;
    for (let i = 0; i < sentences.length; i++) {
      if (currentMs >= sentences[i].start) {
        latestIndex = i;
      } else {
        break;
      }
    }
    return latestIndex;
  }, [hasSentences, sentences, fallbackMarkers, currentTime]);

  // 2. Filter sentences based on search input
  const filteredSentencesWithIndex = useMemo(() => {
    if (!hasSentences) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sentences.map((item, originalIndex) => ({
        item,
        originalIndex,
      }));
    }
    return sentences
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => item.text.toLowerCase().includes(query));
  }, [hasSentences, sentences, searchQuery]);

  // 3. Smooth Auto-Scroll Handler
  const scrollToActiveElement = useCallback((index: number, smooth = true) => {
    const el = sentenceItemRefs.current.get(index);
    if (el && containerRef.current) {
      el.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'nearest',
      });
    }
  }, []);

  // Trigger auto-scroll on activeIndex change if not paused by user
  useEffect(() => {
    if (activeIndex >= 0 && !isAutoScrollPaused) {
      scrollToActiveElement(activeIndex, true);
    }
  }, [activeIndex, isAutoScrollPaused, scrollToActiveElement]);

  // Resume auto-scroll when user clicks resume
  const handleResumeAutoScroll = () => {
    setIsAutoScrollPaused(false);
    if (activeIndex >= 0) {
      scrollToActiveElement(activeIndex, true);
    }
  };

  // User manual scroll detection via wheel & touch
  const handleUserManualScroll = () => {
    if (!isAutoScrollPaused) {
      setIsAutoScrollPaused(true);
    }
  };

  // Seek handler: seek video and restore auto-scroll immediately
  const handleSentenceClick = (startMs: number, originalIdx: number) => {
    onSeek(startMs / 1000);
    setIsAutoScrollPaused(false);
    scrollToActiveElement(originalIdx, true);
  };

  // --- STATE 1: LOADING SKELETON ---
  if (isLoading) {
    return <LessonTimelineSkeleton />;
  }

  // --- STATE 2: AI TRANSCRIBING STATE ---
  if (transcriptionStatus === LessonTranscriptionStatusEnum.TRANSCRIBING) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 text-muted-foreground">
        <div className="size-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-2xs">
          <Icon icon="lucide:loader-2" className="size-6 animate-spin" />
        </div>
        <div className="space-y-1.5 max-w-[240px]">
          <h4 className="text-xs font-bold text-foreground">
            Đang trích xuất phụ đề bài học
          </h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Hệ thống AI đang phân tích âm thanh và tạo danh sách các câu nói theo dòng thời gian.
          </p>
        </div>
      </div>
    );
  }

  // --- STATE 3: EMPTY STATE (No Sentences & No Fallback Markers) ---
  if (!hasSentences && fallbackMarkers.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 text-muted-foreground">
        <div className="size-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
          <Icon icon="lucide:file-text" className="size-6" />
        </div>
        <div className="space-y-1 max-w-[220px]">
          <h4 className="text-xs font-bold text-foreground">Chưa có dữ liệu câu nói</h4>
          <p className="text-[11px] text-muted-foreground">
            Bản ghi transcript chưa được lưu trong cơ sở dữ liệu cho bài học này.
          </p>
        </div>
        {onRetryTranscription && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isRetrying}
            onClick={onRetryTranscription}
            className="text-xs h-8 gap-1.5"
          >
            <Icon
              icon={isRetrying ? 'lucide:loader-2' : 'lucide:sparkles'}
              className={`size-3.5 ${isRetrying ? 'animate-spin' : ''}`}
            />
            <span>{isRetrying ? 'Đang gửi...' : 'Trích xuất transcript ngay'}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card min-h-0 overflow-hidden relative">
      {/* 1. Header Toolbar: Summary Counter, Search Input & Auto-Scroll Status */}
      <div className="shrink-0 p-3 pb-2 border-b border-border bg-muted/10 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Icon icon="lucide:captions" className="size-3.5 text-sky-600 dark:text-sky-400" />
            <span>Timeline bài giảng</span>
          </span>
          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded-md border border-border">
            {hasSentences ? `${sentences.length} câu` : `${fallbackMarkers.length} mốc`}
          </span>
        </div>

        {/* Quick Search Input */}
        {hasSentences && sentences.length > 5 && (
          <div className="relative">
            <Icon
              icon="lucide:search"
              className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="text"
              placeholder="Tìm câu trong bài giảng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs bg-background/80 placeholder:text-muted-foreground border-border/80 focus-visible:ring-1 focus-visible:ring-sky-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
              >
                <Icon icon="lucide:x" className="size-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Scrollable Sentences Viewport */}
      <div
        ref={containerRef}
        onWheel={handleUserManualScroll}
        onTouchMove={handleUserManualScroll}
        className="flex-1 min-h-0 overflow-y-auto px-2 py-2.5 space-y-1.5 select-text"
      >
        {/* Render Database Sentences */}
        {hasSentences ? (
          filteredSentencesWithIndex.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
              <Icon icon="lucide:search-x" className="size-5 mx-auto text-muted-foreground mb-1" />
              <p>Không tìm thấy câu nào phù hợp với từ khóa.</p>
            </div>
          ) : (
            filteredSentencesWithIndex.map(({ item, originalIndex }) => {
              const isActive = activeIndex === originalIndex;
              const isPassed = currentTime > item.end / 1000;

              return (
                <button
                  key={originalIndex}
                  ref={(el) => {
                    if (el) {
                      sentenceItemRefs.current.set(originalIndex, el);
                    } else {
                      sentenceItemRefs.current.delete(originalIndex);
                    }
                  }}
                  type="button"
                  onClick={() => handleSentenceClick(item.start, originalIndex)}
                  className={`w-full text-left py-2 px-2.5 rounded-xl border transition-all duration-150 flex items-center gap-2.5 cursor-pointer group ${
                    isActive
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-[#c7d2fe] dark:border-indigo-400 text-foreground shadow-[0_4px_14px_0_rgba(99,102,241,0.25)]'
                      : isPassed
                        ? 'bg-card hover:bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground'
                        : 'bg-card hover:bg-muted/60 border-border/80 text-foreground'
                  }`}
                >
                  {/* Timestamp Pill Badge */}
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold border transition-colors ${
                      isActive
                        ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-bold'
                        : isPassed
                          ? 'bg-muted/50 border-border/70 text-muted-foreground group-hover:text-foreground'
                          : 'bg-muted/80 border-border text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    {formatTime(item.start / 1000)}
                  </span>

                  {/* Sentence Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      title={item.text}
                      className={`text-xs leading-relaxed line-clamp-2 ${
                        isActive
                          ? 'font-medium text-indigo-950 dark:text-indigo-100'
                          : isPassed
                            ? 'font-normal text-muted-foreground group-hover:text-foreground'
                            : 'font-normal text-foreground'
                      }`}
                    >
                      {item.text}
                    </p>
                  </div>
                </button>
              );
            })
          )
        ) : (
          /* Fallback: Render Markers when no sentences available */
          fallbackMarkers.map((marker, index) => {
            const isActive = activeIndex === index;

            return (
              <button
                key={index}
                type="button"
                onClick={() => onSeek(marker.time)}
                className={`w-full text-left py-2 px-2.5 rounded-xl border transition-all duration-150 flex items-center gap-2.5 cursor-pointer group ${
                  isActive
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-[#c7d2fe] dark:border-indigo-400 text-foreground shadow-[0_4px_14px_0_rgba(99,102,241,0.25)]'
                    : 'bg-card hover:bg-muted/50 border-border/80 text-foreground'
                }`}
              >
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold border transition-colors ${
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-bold'
                      : 'bg-muted/80 border-border text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  {formatTime(marker.time)}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs leading-relaxed line-clamp-2 ${
                      isActive ? 'font-medium text-indigo-950 dark:text-indigo-100' : 'font-normal text-foreground'
                    }`}
                  >
                    {marker.label}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 3. Floating "Resume Auto-Scroll" Pill when user has manually scrolled */}
      {isAutoScrollPaused && hasSentences && activeIndex >= 0 && (
        <div className="shrink-0 p-2 border-t border-border bg-background/95 backdrop-blur-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span>Đã dừng cuộn tự động</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleResumeAutoScroll}
            className="h-6 px-2.5 text-[11px] gap-1 font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-800 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800"
          >
            <Icon icon="lucide:arrow-down" className="size-3" />
            <span>Theo video</span>
          </Button>
        </div>
      )}
    </div>
  );
}
