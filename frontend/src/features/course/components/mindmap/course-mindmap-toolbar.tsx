'use client';

import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

interface CourseMindmapToolbarProps {
  showMinimap: boolean;
  onToggleMinimap: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onRelayout: () => void;
  onSyncFromCurriculum: () => void;
  onSave: () => void;
  isSaving: boolean;
  isModified?: boolean;
}

export function CourseMindmapToolbar({
  showMinimap,
  onToggleMinimap,
  isFullscreen,
  onToggleFullscreen,
  onRelayout,
  onSyncFromCurriculum,
  onSave,
  isSaving,
  isModified = false,
}: CourseMindmapToolbarProps): React.JSX.Element {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex items-center gap-1.5 bg-card/90 backdrop-blur-md border border-border/80 rounded-2xl p-1.5 shadow-md">
      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-border/60">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => zoomIn({ duration: 300 })}
          title="Phóng to"
          className="size-8 p-0 rounded-xl"
        >
          <Icon icon="lucide:zoom-in" className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => zoomOut({ duration: 300 })}
          title="Thu nhỏ"
          className="size-8 p-0 rounded-xl"
        >
          <Icon icon="lucide:zoom-out" className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fitView({ duration: 400, padding: 0.2 })}
          title="Căn vừa màn hình (Fit View)"
          className="size-8 p-0 rounded-xl"
        >
          <Icon icon="lucide:maximize-2" className="size-4" />
        </Button>
      </div>

      {/* Layout & Sync Controls */}
      <div className="flex items-center gap-1 pr-1 border-r border-border/60">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRelayout}
          title="Tự động căn chỉnh lại sơ đồ"
          className="h-8 px-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
        >
          <Icon icon="lucide:sparkles" className="size-3.5 text-sky-500" />
          <span className="hidden sm:inline">Căn chỉnh</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSyncFromCurriculum}
          title="Đồng bộ lại từ giáo trình hiện có"
          className="h-8 px-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
        >
          <Icon icon="lucide:refresh-cw" className="size-3.5 text-emerald-500" />
          <span className="hidden sm:inline">Làm mới cây</span>
        </Button>
      </div>

      {/* Minimap & Fullscreen Toggles */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-border/60">
        <Button
          type="button"
          variant={showMinimap ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onToggleMinimap}
          title={showMinimap ? 'Ẩn bản đồ thu nhỏ' : 'Hiện bản đồ thu nhỏ'}
          className="size-8 p-0 rounded-xl"
        >
          <Icon icon="lucide:map" className="size-4" />
        </Button>
        <Button
          type="button"
          variant={isFullscreen ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          className="size-8 p-0 rounded-xl"
        >
          <Icon
            icon={isFullscreen ? 'lucide:minimize' : 'lucide:expand'}
            className="size-4"
          />
        </Button>
      </div>

      {/* Save Button */}
      <Button
        type="button"
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="h-8 px-3.5 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 ml-0.5"
      >
        <Icon
          icon={isSaving ? 'lucide:loader-2' : 'lucide:save'}
          className={`size-3.5 ${isSaving ? 'animate-spin' : ''}`}
        />
        <span>{isSaving ? 'Đang lưu...' : 'Lưu sơ đồ'}</span>
        {isModified && (
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
        )}
      </Button>
    </div>
  );
}
