'use client';

import React, { useState, useMemo } from 'react';
import type { ILessonMindmapNode, ILessonMindmapData } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  useLessonMindmapAnalysisQuery,
  useGenerateMindmapMutation,
  useApplyMindmapDraftMutation,
} from '@/features/course/api/transcript-analysis.api';

interface LessonMindmapTabProps {
  lessonId: string;
  isInstructor?: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (timestamp: number) => void;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface TreeNodeProps {
  node: ILessonMindmapNode;
  level: number;
  currentTime?: number;
  onSeek?: (timestamp: number) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  expandedMap: Record<string, boolean>;
}

function TreeNode({
  node,
  level,
  currentTime = 0,
  onSeek,
  isExpanded,
  onToggleExpand,
  expandedMap,
}: TreeNodeProps): React.JSX.Element {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isNearCurrentTime = Math.abs(currentTime - node.timestamp) < 5;

  // Level styles
  const levelStyles = [
    // Level 0 (Root)
    'bg-sky-500/10 border-sky-500/30 text-sky-950 dark:text-sky-200 font-bold text-sm sm:text-base shadow-2xs',
    // Level 1
    'bg-indigo-500/10 border-indigo-500/25 text-indigo-950 dark:text-indigo-200 font-semibold text-xs sm:text-sm',
    // Level 2
    'bg-card border-border/80 text-foreground font-medium text-xs',
    // Level 3 (Leaf tag)
    'bg-muted/50 border-border/60 text-muted-foreground text-[11px] font-normal',
  ];

  const currentStyle = levelStyles[Math.min(level, levelStyles.length - 1)];

  return (
    <div className="flex flex-col space-y-2">
      <div
        className={`group relative flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all ${currentStyle} ${
          isNearCurrentTime
            ? 'ring-2 ring-sky-500 ring-offset-1 ring-offset-background'
            : 'hover:border-sky-500/40'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleExpand(node.id)}
              aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
              className="size-5 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-colors cursor-pointer"
            >
              <Icon
                icon={isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                className="size-3.5"
              />
            </button>
          ) : (
            <span className="size-5 flex items-center justify-center shrink-0 text-muted-foreground/50">
              <span className="size-1.5 rounded-full bg-current" />
            </span>
          )}

          <span className="truncate leading-snug">{node.title}</span>
        </div>

        {/* Timestamp seek badge */}
        <button
          type="button"
          onClick={() => onSeek?.(node.timestamp)}
          title={`Tua video tới ${formatTime(node.timestamp)}`}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-background/80 hover:bg-sky-500 hover:text-white border border-border/80 text-muted-foreground transition-all cursor-pointer shadow-2xs group-hover:border-sky-500/40"
        >
          <Icon icon="lucide:play" className="size-2.5" />
          <span>{formatTime(node.timestamp)}</span>
        </button>
      </div>

      {/* Children branches */}
      {hasChildren && isExpanded && (
        <div className="pl-4 sm:pl-6 ml-2 sm:ml-3 border-l-2 border-dashed border-border/70 space-y-2 py-1">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              currentTime={currentTime}
              onSeek={onSeek}
              isExpanded={expandedMap[child.id] !== false}
              onToggleExpand={onToggleExpand}
              expandedMap={expandedMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LessonMindmapTab({
  lessonId,
  isInstructor = false,
  currentTime,
  onSeek,
}: LessonMindmapTabProps): React.JSX.Element {
  const { data: mindmapDoc, isLoading } = useLessonMindmapAnalysisQuery(lessonId);
  const { mutate: generateMindmap, isPending: isGenerating } = useGenerateMindmapMutation(lessonId);
  const { mutate: applyDraft, isPending: isApplying } = useApplyMindmapDraftMutation(lessonId);

  // View state: ưu tiên hiển thị draft nếu có, cho phép chuyển đổi
  const hasDraft = Boolean(mindmapDoc?.draftMindmap);
  const [viewMode, setViewMode] = useState<'draft' | 'official'>('draft');

  const currentMindmapData: ILessonMindmapData | null = useMemo(() => {
    if (!mindmapDoc) return null;
    if (viewMode === 'draft' && mindmapDoc.draftMindmap) {
      return mindmapDoc.draftMindmap;
    }
    return mindmapDoc.mindmap || mindmapDoc.draftMindmap || null;
  }, [mindmapDoc, viewMode]);

  // Expansion state
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const handleToggleExpand = (id: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const handleExpandAll = () => {
    setExpandedMap({});
  };

  return (
    <div className="w-full flex flex-col space-y-4 p-4 sm:p-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Icon icon="lucide:network" className="size-5 text-sky-500" />
            <span>Sơ đồ tư duy bài học (Mindmap)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cấu trúc phân cấp kiến thức bài học. Nhấp vào mốc thời gian để tua video.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentMindmapData && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExpandAll}
              className="text-xs h-8 cursor-pointer"
            >
              <Icon icon="lucide:maximize-2" className="size-3.5 mr-1" />
              Mở rộng tất cả
            </Button>
          )}

          {isInstructor && (
            <Button
              size="sm"
              onClick={() => generateMindmap({ saveAsDraft: true })}
              disabled={isGenerating}
              className="h-8 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
            >
              {isGenerating ? (
                <>
                  <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                  Đang phân tích AI...
                </>
              ) : (
                <>
                  <Icon icon="lucide:sparkles" className="size-3.5 mr-1.5" />
                  {currentMindmapData ? 'Sinh lại Mindmap AI' : 'Tạo Mindmap bằng AI'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Instructor Draft Banner */}
      {isInstructor && hasDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Icon icon="lucide:sparkles" className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">
                Bản nháp thử nghiệm AI mới đang chờ áp dụng
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {viewMode === 'draft'
                  ? 'Đang xem trước bản nháp từ Gemini.'
                  : 'Đang xem bản chính thức hiện hành.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode((prev) => (prev === 'draft' ? 'official' : 'draft'))}
              className="text-xs h-7.5 px-2.5 cursor-pointer text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
            >
              {viewMode === 'draft' ? 'Xem bản chính thức' : 'Xem bản nháp'}
            </Button>
            <Button
              size="sm"
              onClick={() => applyDraft()}
              disabled={isApplying}
              className="text-xs h-7.5 px-3 font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-2xs"
            >
              {isApplying ? (
                <>
                  <Icon icon="lucide:loader-2" className="size-3 mr-1 animate-spin" />
                  Đang áp dụng...
                </>
              ) : (
                <>
                  <Icon icon="lucide:check" className="size-3 mr-1" />
                  Áp dụng vào bài học
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Mindmap Content Display */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Icon icon="lucide:loader-2" className="size-8 text-sky-500 animate-spin" />
          <p className="text-xs text-muted-foreground">Đang tải sơ đồ tư duy...</p>
        </div>
      ) : currentMindmapData?.root ? (
        <div className="w-full max-w-3xl mx-auto py-2">
          <TreeNode
            node={currentMindmapData.root}
            level={0}
            currentTime={currentTime}
            onSeek={onSeek}
            isExpanded={expandedMap[currentMindmapData.root.id] !== false}
            onToggleExpand={handleToggleExpand}
            expandedMap={expandedMap}
          />
        </div>
      ) : (
        <div className="py-16 text-center space-y-3 max-w-md mx-auto">
          <div className="size-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground">
            <Icon icon="lucide:network" className="size-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Chưa có sơ đồ tư duy cho bài học</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isInstructor
                ? 'Nhấn nút "Tạo Mindmap bằng AI" ở góc trên để phân tích transcript video và sinh sơ đồ phân nhánh tự động.'
                : 'Giảng viên chưa cập nhật sơ đồ tư duy cho bài học này.'}
            </p>
          </div>
          {isInstructor && (
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => generateMindmap({ saveAsDraft: true })}
                disabled={isGenerating}
                className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
              >
                <Icon icon="lucide:sparkles" className="size-3.5 mr-1.5" />
                Phân tích Mindmap ngay
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
