'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { ILessonMindmapNode, ILessonMindmapData } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { TimestampPickerInput } from '@/features/course/components/player/timestamp-picker-input';
import {
  useLessonMindmapAnalysisQuery,
  useGenerateMindmapMutation,
  useUpdateLessonMindmapMutation,
} from '@/features/course/api/transcript-analysis.api';
import {
  updateNodeInTree,
  addChildNodeToTree,
  deleteNodeFromTree,
  countDescendants,
} from '@/features/course/utils/lesson-mindmap-tree.util';
import { cn } from '@/lib/utils';
import { generateLessonMindmapDefaultCollapsedIds } from '@/features/course/utils/lesson-mindmap-flow.util';
import { LessonMindmapCanvasView } from './mindmap/lesson-mindmap-canvas-view';
import { useLessonAnalysisJob } from '@/features/course/hooks/use-analysis-jobs';
import { AnalysisJobStatusBanner } from '../analysis-job-status';

interface LessonMindmapTabProps {
  lessonId: string;
  isInstructor?: boolean;
  isActive?: boolean;
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

function collectAllNodeIds(node: ILessonMindmapNode): string[] {
  let ids = [node.id];
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      ids = ids.concat(collectAllNodeIds(child));
    }
  }
  return ids;
}

interface TreeNodeProps {
  node: ILessonMindmapNode;
  level: number;
  nearNodeIds: ReadonlySet<string>;
  currentTime?: number;
  duration?: number;
  onSeek?: (timestamp: number) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  expandedMap: Record<string, boolean>;
  isInstructor?: boolean;
  editingNodeId: string | null;
  editTitle: string;
  setEditTitle: (val: string) => void;
  editTimestamp: number;
  setEditTimestamp: (val: number) => void;
  onStartEdit: (node: ILessonMindmapNode) => void;
  onSaveEdit: (nodeId: string) => void;
  onCancelEdit: () => void;
  onAddChild: (parentId: string) => void;
  onRequestDelete: (node: ILessonMindmapNode) => void;
}

const TreeNode = React.memo(function MindmapTreeNode({
  node,
  level,
  nearNodeIds,
  currentTime = 0,
  duration = 0,
  onSeek,
  isExpanded,
  onToggleExpand,
  expandedMap,
  isInstructor = false,
  editingNodeId,
  editTitle,
  setEditTitle,
  editTimestamp,
  setEditTimestamp,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onAddChild,
  onRequestDelete,
}: TreeNodeProps): React.JSX.Element {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isNearCurrentTime = nearNodeIds.has(node.id);
  const isEditing = isInstructor && editingNodeId === node.id;
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus title input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditing]);

  // Level styles
  const levelStyles = [
    // Level 0 (Root)
    'bg-sky-500/10 border-sky-500/30 text-sky-950 dark:text-sky-200 font-bold text-sm sm:text-base shadow-2xs',
    // Level 1
    'bg-sky-500/10 border-sky-500/20 text-sky-950 dark:text-sky-200 font-semibold text-xs sm:text-sm',
    // Level 2
    'bg-card border-border/80 text-foreground font-medium text-xs',
    // Level 3 (Leaf tag)
    'bg-muted/50 border-border/60 text-muted-foreground text-[11px] font-normal',
  ];

  const currentStyle = levelStyles[Math.min(level, levelStyles.length - 1)];

  return (
    <div className="flex flex-col space-y-2">
      {isEditing ? (
        /* Edit Mode Card */
        <div className="relative flex flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border-2 border-sky-500 bg-card shadow-sm transition-all">
          <div className="flex flex-1 min-w-[200px] items-center gap-2">
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 shrink-0">
              Cấp {level + 1}:
            </span>
            <input
              ref={titleInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (editTitle.trim()) {
                    onSaveEdit(node.id);
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelEdit();
                }
              }}
              placeholder="Nhập tiêu đề nhánh..."
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-semibold text-foreground border-b border-sky-500/50 focus:border-sky-500 focus:outline-none px-1 py-0.5"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Timestamp input */}
            <div className="shrink-0">
              <TimestampPickerInput
                valueSeconds={editTimestamp}
                onChange={setEditTimestamp}
                maxDuration={duration}
                currentTime={currentTime}
              />
            </div>

            {/* Action buttons */}
            <button
              type="button"
              onClick={() => onSaveEdit(node.id)}
              disabled={!editTitle.trim()}
              title="Lưu thay đổi (Enter)"
              className="size-7 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            >
              <Icon icon="lucide:check" className="size-4" />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              title="Hủy bỏ (Escape)"
              className="size-7 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            >
              <Icon icon="lucide:x" className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Normal View Card */
        <div
          className={`group relative flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all ${currentStyle} ${isNearCurrentTime
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

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Timestamp seek badge */}
            <button
              type="button"
              onClick={() => onSeek?.(node.timestamp)}
              title={`Tua video tới ${formatTime(node.timestamp)}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-background/80 hover:bg-sky-500 hover:text-white border border-border/80 text-muted-foreground transition-all cursor-pointer shadow-2xs group-hover:border-sky-500/40"
            >
              <Icon icon="lucide:play" className="size-2.5" />
              <span>{formatTime(node.timestamp)}</span>
            </button>

            {/* Instructor Quick Actions Toolbar */}
            {isInstructor && (
              <div className="flex items-center gap-0.5 pl-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                {/* Inline Edit Button */}
                <button
                  type="button"
                  onClick={() => onStartEdit(node)}
                  title="Chỉnh sửa nhánh"
                  className="size-6.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-sky-600 hover:bg-sky-500/10 transition-colors cursor-pointer"
                >
                  <Icon icon="lucide:pencil" className="size-3.5" />
                </button>

                {/* Add Child Node Button (Cho phép thêm nhánh con ở mọi cấp theo mong muốn giảng viên) */}
                <button
                  type="button"
                  onClick={() => onAddChild(node.id)}
                  title="Thêm nhánh con"
                  className="size-6.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                >
                  <Icon icon="lucide:plus" className="size-3.5" />
                </button>

                {/* Delete Button (Hidden for Root node / level === 0) */}
                {level > 0 && (
                  <button
                    type="button"
                    onClick={() => onRequestDelete(node)}
                    title="Xóa nhánh"
                    className="size-6.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Icon icon="lucide:trash-2" className="size-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Children branches */}
      {hasChildren && isExpanded && (
        <div className="pl-4 sm:pl-6 ml-2 sm:ml-3 border-l-2 border-dashed border-border/70 space-y-2 py-1">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              nearNodeIds={nearNodeIds}
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
              isExpanded={expandedMap[child.id] !== false}
              onToggleExpand={onToggleExpand}
              expandedMap={expandedMap}
              isInstructor={isInstructor}
              editingNodeId={editingNodeId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editTimestamp={editTimestamp}
              setEditTimestamp={setEditTimestamp}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onAddChild={onAddChild}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export const LessonMindmapTab = React.memo(function LessonMindmapTab({
  lessonId,
  isInstructor = false,
  isActive = true,
  currentTime = 0,
  duration = 0,
  onSeek,
}: LessonMindmapTabProps): React.JSX.Element {
  const { data: mindmapDoc, isLoading } = useLessonMindmapAnalysisQuery(lessonId);
  const { mutate: generateMindmap, isPending: isGenerating } = useGenerateMindmapMutation(lessonId);
  const { mutate: updateMindmap } = useUpdateLessonMindmapMutation(lessonId);
  const {
    job: mindmapJob,
    isProcessing: isMindmapJobProcessing,
    retryJob: handleRetryMindmapJob,
    isRetrying: isMindmapJobRetrying,
  } = useLessonAnalysisJob(lessonId, 'mindmap', isInstructor);

  // Active data from DB
  const currentMindmapData: ILessonMindmapData | null = useMemo(() => {
    if (!mindmapDoc) return null;
    return mindmapDoc.mindmap || mindmapDoc.draftMindmap || null;
  }, [mindmapDoc]);

  // Node Editing state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [addingNodeId, setAddingNodeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editTimestamp, setEditTimestamp] = useState<number>(0);

  // View mode switcher: 'tree' | 'canvas'
  const [viewMode, setViewMode] = useState<'tree' | 'canvas'>('tree');

  // Render query data immediately. Only edits need an override; a new server
  // snapshot supersedes it once editing finishes, without an empty intermediate render.
  const [treeOverride, setTreeOverride] = useState<{
    source: ILessonMindmapData | null;
    value: ILessonMindmapData;
  } | null>(null);
  const localTree = treeOverride && (editingNodeId !== null || treeOverride.source === currentMindmapData)
    ? treeOverride.value
    : currentMindmapData;
  const setLocalTree = useCallback((value: ILessonMindmapData) => {
    setTreeOverride({ source: currentMindmapData, value });
  }, [currentMindmapData]);
  const saveTree = useCallback((value: ILessonMindmapData) => {
    if (isMindmapJobProcessing) return;
    updateMindmap({ mindmap: value }, {
      onError: () => {
        setTreeOverride((previous) => previous?.value === value ? null : previous);
      },
    });
  }, [updateMindmap, isMindmapJobProcessing]);

  // Canvas Collapsed IDs: null = chưa có override, dùng mặc định 2 cấp độ.
  // Lưu kèm structureKey để tự reset khi cấu trúc cây thay đổi (AI sinh lại, thêm/xóa nhánh).
  const [canvasCollapsedOverride, setCanvasCollapsedOverride] = useState<{
    structureKey: string;
    ids: Set<string>;
  } | null>(null);

  // Chỉ reset trạng thái thu gọn khi cấu trúc cây thay đổi (load lần đầu,
  // AI sinh lại, thêm/xóa nhánh). Sửa title không làm reset.
  const mindmapStructureKey = useMemo(() => {
    if (!localTree?.root) return '';
    return collectAllNodeIds(localTree.root).sort().join('|');
  }, [localTree]);

  const canvasCollapsedIds = useMemo(() => {
    if (!localTree?.root) return null;
    if (canvasCollapsedOverride?.structureKey === mindmapStructureKey) {
      return canvasCollapsedOverride.ids;
    }
    return generateLessonMindmapDefaultCollapsedIds(localTree.root, 1);
  }, [localTree, mindmapStructureKey, canvasCollapsedOverride]);

  const handleCanvasCollapsedIdsChange = useCallback(
    (next: Set<string>) => {
      setCanvasCollapsedOverride({ structureKey: mindmapStructureKey, ids: next });
    },
    [mindmapStructureKey],
  );

  // Expansion state
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  }, []);

  const timedNodes = useMemo(() => {
    const nodes: ILessonMindmapNode[] = [];
    const visit = (node: ILessonMindmapNode) => {
      nodes.push(node);
      node.children?.forEach(visit);
    };
    if (localTree?.root) visit(localTree.root);
    return nodes;
  }, [localTree]);
  // Keep the memoized tree unchanged between actual highlight boundaries.
  // Raw playback time is only needed by the timestamp editor while it is open.
  const nearNodeIdsKey = JSON.stringify(isActive && viewMode === 'tree'
    ? timedNodes.filter((node) => Math.abs(currentTime - node.timestamp) < 5).map((node) => node.id)
    : []);
  const nearNodeIds = useMemo<ReadonlySet<string>>(
    () => new Set(JSON.parse(nearNodeIdsKey) as string[]),
    [nearNodeIdsKey],
  );

  const isAllExpanded = useMemo(() => {
    if (!localTree?.root) return true;
    const allIds = collectAllNodeIds(localTree.root);
    return allIds.every((id) => expandedMap[id] !== false);
  }, [localTree, expandedMap]);

  const handleToggleExpandAll = () => {
    if (!localTree?.root) return;
    const allIds = collectAllNodeIds(localTree.root);
    if (isAllExpanded) {
      // Collapse all except root
      const newMap: Record<string, boolean> = {};
      allIds.forEach((id) => {
        if (id !== localTree.root.id) {
          newMap[id] = false;
        }
      });
      setExpandedMap(newMap);
    } else {
      // Expand all
      setExpandedMap({});
    }
  };

  const handleStartEdit = useCallback((node: ILessonMindmapNode) => {
    if (!isInstructor || !localTree) return;
    setLocalTree(localTree);
    setAddingNodeId(null);
    setEditingNodeId(node.id);
    setEditTitle(node.title);
    setEditTimestamp(node.timestamp ?? 0);
  }, [isInstructor, localTree, setLocalTree]);

  const handleSaveEdit = useCallback((nodeId: string) => {
    if (!isInstructor || !localTree || !editTitle.trim()) return;

    // Khống chế timestamp an toàn không bao giờ vượt quá thời lượng video
    const safeTimestamp =
      duration && duration > 0
        ? Math.min(Math.max(0, Math.floor(editTimestamp || 0)), Math.floor(duration))
        : Math.max(0, Math.floor(editTimestamp || 0));

    const newRoot = updateNodeInTree(localTree.root, nodeId, {
      title: editTitle.trim(),
      timestamp: safeTimestamp,
    });

    const updatedData: ILessonMindmapData = { root: newRoot };
    setLocalTree(updatedData);
    setEditingNodeId(null);
    setAddingNodeId(null);

    // Lưu trực tiếp lên server
    saveTree(updatedData);
  }, [isInstructor, localTree, editTitle, editTimestamp, duration, setLocalTree, saveTree]);

  const handleCancelEdit = useCallback(() => {
    if (addingNodeId && localTree) {
      // Hoàn tác nhánh mới vừa tạo chưa được lưu
      const revertedRoot = deleteNodeFromTree(localTree.root, addingNodeId);
      setLocalTree({ root: revertedRoot });
      setAddingNodeId(null);
    }
    setEditingNodeId(null);
  }, [addingNodeId, localTree, setLocalTree]);

  // Node Adding state (Default timestamp = 0 per Socratic Gate)
  const handleAddChild = useCallback((parentId: string) => {
    if (!isInstructor || !localTree || isMindmapJobProcessing) return;

    const newId = `node-${Date.now()}`;
    const newNode: ILessonMindmapNode = {
      id: newId,
      title: 'Nhánh mới',
      timestamp: 0,
    };

    const newRoot = addChildNodeToTree(localTree.root, parentId, newNode);
    const updatedData: ILessonMindmapData = { root: newRoot };
    setLocalTree(updatedData);

    // Auto expand parent node
    setExpandedMap((prev) => ({ ...prev, [parentId]: true }));

    // Switch new node into inline edit mode (chỉ lưu server khi người dùng bấm Lưu/Enter)
    setAddingNodeId(newId);
    setEditingNodeId(newId);
    setEditTitle('Nhánh mới');
    setEditTimestamp(0);
  }, [isInstructor, localTree, setLocalTree]);

  // Node Deletion state & Confirmation
  const [deletingNode, setDeletingNode] = useState<{
    id: string;
    title: string;
    childCount: number;
  } | null>(null);

  const executeDelete = useCallback(deleteBranch, [isInstructor, localTree, editingNodeId, setLocalTree, saveTree]);

  const handleRequestDelete = useCallback((node: ILessonMindmapNode) => {
    if (!isInstructor) return;
    const childCount = countDescendants(node);
    if (childCount > 0) {
      // Node has children -> require confirmation dialog
      setDeletingNode({
        id: node.id,
        title: node.title,
        childCount,
      });
    } else {
      // Leaf node without children -> delete directly
      executeDelete(node.id);
    }
  }, [isInstructor, executeDelete]);

  function deleteBranch(nodeId: string) {
    if (!isInstructor || !localTree || isMindmapJobProcessing) return;

    const newRoot = deleteNodeFromTree(localTree.root, nodeId);
    const updatedData: ILessonMindmapData = { root: newRoot };
    setLocalTree(updatedData);

    if (editingNodeId === nodeId) {
      setEditingNodeId(null);
    }

    // Silent auto-save to server
    saveTree(updatedData);
  }

  const handleConfirmDelete = () => {
    if (!isInstructor || !deletingNode) return;
    executeDelete(deletingNode.id);
    setDeletingNode(null);
  };

  const handleGenerateMindmap = () => {
    if (!isInstructor || isMindmapJobProcessing) return;
    generateMindmap({ saveAsDraft: false });
  };

  return (
    <div className="w-full flex flex-col space-y-4 p-4 sm:p-6">
      {/* Banner hiển thị trạng thái tác vụ AI ngầm */}
      <div className="mx-auto w-full max-w-4xl">
        <AnalysisJobStatusBanner
          job={mindmapJob}
          onRetry={handleRetryMindmapJob}
          isRetrying={isMindmapJobRetrying}
        />
      </div>

      {/* Compact Mindmap Controls Toolbar */}
      {localTree && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Icon icon="lucide:network" className="size-3.5 text-sky-600 dark:text-sky-400" />
              <span>Chế độ hiển thị</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented Control Chuyển đổi Dạng cây / Sơ đồ Canvas */}
            <div className="flex items-center p-0.5 rounded-lg border border-border/80 bg-muted/50 text-muted-foreground shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                  viewMode === 'tree'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'hover:text-foreground',
                )}
              >
                <Icon icon="lucide:list-tree" className="size-3.5" />
                <span>Dạng cây</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('canvas')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                  viewMode === 'canvas'
                    ? 'bg-background text-sky-600 dark:text-sky-400 shadow-2xs font-semibold'
                    : 'hover:text-foreground',
                )}
              >
                <Icon icon="lucide:network" className="size-3.5" />
                <span>Sơ đồ Mindmap</span>
              </button>
            </div>

            {viewMode === 'tree' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleExpandAll}
                className="text-xs h-8 cursor-pointer"
              >
                <Icon
                  icon={isAllExpanded ? 'lucide:minimize-2' : 'lucide:maximize-2'}
                  className="size-3.5 mr-1"
                />
                {isAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Mindmap Content Display */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Icon icon="lucide:loader-2" className="size-8 text-sky-500 animate-spin" />
          <p className="text-xs text-muted-foreground">Đang tải sơ đồ tư duy...</p>
        </div>
      ) : localTree?.root ? (
        viewMode === 'canvas' ? (
          <div className="w-full py-1">
            <LessonMindmapCanvasView
              canEdit={isInstructor && !isMindmapJobProcessing}
              isActive={isActive}
              root={localTree.root}
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
              collapsedIds={canvasCollapsedIds ?? undefined}
              onCollapsedIdsChange={handleCanvasCollapsedIdsChange}
            />
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto py-2">
            <TreeNode
              node={localTree.root}
              level={0}
              nearNodeIds={nearNodeIds}
              currentTime={editingNodeId ? currentTime : 0}
              duration={duration}
              onSeek={onSeek}
              isExpanded={expandedMap[localTree.root.id] !== false}
              onToggleExpand={handleToggleExpand}
              expandedMap={expandedMap}
              isInstructor={isInstructor && !isMindmapJobProcessing}
              editingNodeId={editingNodeId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editTimestamp={editTimestamp}
              setEditTimestamp={setEditTimestamp}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onAddChild={handleAddChild}
              onRequestDelete={handleRequestDelete}
            />
          </div>
        )
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
                onClick={handleGenerateMindmap}
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

      {/* Delete Branch Confirmation Dialog */}
      <Dialog
        open={isInstructor && Boolean(deletingNode)}
        onOpenChange={(open) => {
          if (!open) setDeletingNode(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Icon icon="lucide:alert-triangle" className="size-5" />
              <span>Xác nhận xóa nhánh sơ đồ</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Nhánh <span className="font-semibold text-foreground">&quot;{deletingNode?.title}&quot;</span> đang chứa{' '}
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {deletingNode?.childCount}
              </span>{' '}
              nhánh con bên trong.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Bạn có chắc chắn muốn xóa nhánh này cùng tất cả các nhánh con bên trong không? Sơ đồ tư duy bài học sẽ được cập nhật ngay lập tức.
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingNode(null)}
              className="text-xs h-8 cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDelete}
              className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer shadow-2xs"
            >
              <Icon icon="lucide:trash-2" className="size-3.5 mr-1" />
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
