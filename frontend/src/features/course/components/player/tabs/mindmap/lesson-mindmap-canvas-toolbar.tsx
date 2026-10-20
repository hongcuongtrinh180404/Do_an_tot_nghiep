'use client';

import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

interface LessonMindmapCanvasToolbarProps {
  isAllCollapsed: boolean;
  onToggleCollapseAll: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  className?: string;
}

export function LessonMindmapCanvasToolbar({
  isAllCollapsed,
  onToggleCollapseAll,
  isFullscreen,
  onToggleFullscreen,
  className = '',
}: LessonMindmapCanvasToolbarProps): React.JSX.Element {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div
      className={`flex items-center gap-1 bg-card/90 backdrop-blur-md border border-border/80 rounded-xl p-1 shadow-md z-10 ${className}`}
    >
      {/* Zoom In */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => zoomIn({ duration: 250 })}
        title="Phóng to (Zoom In)"
        className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <Icon icon="lucide:zoom-in" className="size-3.5" />
      </Button>

      {/* Zoom Out */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => zoomOut({ duration: 250 })}
        title="Thu nhỏ (Zoom Out)"
        className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <Icon icon="lucide:zoom-out" className="size-3.5" />
      </Button>

      {/* Fit View */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => fitView({ padding: 0.2, duration: 300 })}
        title="Căn giữa toàn cảnh (Fit View)"
        className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <Icon icon="lucide:maximize" className="size-3.5" />
      </Button>

      <div className="w-[1px] h-4 bg-border/80 mx-0.5" />

      {/* Expand / Collapse All */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleCollapseAll}
        title={isAllCollapsed ? 'Mở rộng tất cả nhánh' : 'Thu gọn tất cả nhánh'}
        className="h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground cursor-pointer gap-1"
      >
        <Icon
          icon={isAllCollapsed ? 'lucide:unfold-horizontal' : 'lucide:fold-horizontal'}
          className="size-3.5"
        />
        <span className="text-[11px] font-medium hidden sm:inline">
          {isAllCollapsed ? 'Mở rộng' : 'Thu gọn'}
        </span>
      </Button>

      {/* Fullscreen Toggle */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Thoát toàn màn hình' : 'Xem toàn màn hình'}
        className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <Icon
          icon={isFullscreen ? 'lucide:minimize-2' : 'lucide:maximize-2'}
          className="size-3.5"
        />
      </Button>
    </div>
  );
}
