'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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

function TreeNode({
  node,
  level,
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
  const isNearCurrentTime = Math.abs(currentTime - node.timestamp) < 5;
  const isEditing = editingNodeId === node.id;
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
    'bg-indigo-500/10 border-indigo-500/25 text-indigo-950 dark:text-indigo-200 font-semibold text-xs sm:text-sm',
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
}

export function LessonMindmapTab({
  lessonId,
  isInstructor = false,
  currentTime = 0,
  duration = 0,
  onSeek,
}: LessonMindmapTabProps): React.JSX.Element {
  const { data: mindmapDoc, isLoading } = useLessonMindmapAnalysisQuery(lessonId);
  const { mutate: generateMindmap, isPending: isGenerating } = useGenerateMindmapMutation(lessonId);
  const { mutate: updateMindmap } = useUpdateLessonMindmapMutation(lessonId);

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

  // Local optimistic tree state
  const [localTree, setLocalTree] = useState<ILessonMindmapData | null>(null);

  useEffect(() => {
    if (currentMindmapData && !editingNodeId) {
      setLocalTree(currentMindmapData);
    }
  }, [currentMindmapData, editingNodeId]);

  // Expansion state
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const handleToggleExpand = (id: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

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

  const handleStartEdit = (node: ILessonMindmapNode) => {
    setAddingNodeId(null);
    setEditingNodeId(node.id);
    setEditTitle(node.title);
    setEditTimestamp(node.timestamp ?? 0);
  };

  const handleSaveEdit = (nodeId: string) => {
    if (!localTree || !editTitle.trim()) return;

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
    updateMindmap({ mindmap: updatedData });
  };

  const handleCancelEdit = () => {
    if (addingNodeId && localTree) {
      // Hoàn tác nhánh mới vừa tạo chưa được lưu
      const revertedRoot = deleteNodeFromTree(localTree.root, addingNodeId);
      setLocalTree({ root: revertedRoot });
      setAddingNodeId(null);
    }
    setEditingNodeId(null);
  };

  // Node Adding state (Default timestamp = 0 per Socratic Gate)
  const handleAddChild = (parentId: string) => {
    if (!localTree) return;

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
  };

  // Node Deletion state & Confirmation
  const [deletingNode, setDeletingNode] = useState<{
    id: string;
    title: string;
    childCount: number;
  } | null>(null);

  const handleRequestDelete = (node: ILessonMindmapNode) => {
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
  };

  const executeDelete = (nodeId: string) => {
    if (!localTree) return;

    const newRoot = deleteNodeFromTree(localTree.root, nodeId);
    const updatedData: ILessonMindmapData = { root: newRoot };
    setLocalTree(updatedData);

    if (editingNodeId === nodeId) {
      setEditingNodeId(null);
    }

    // Silent auto-save to server
    updateMindmap({ mindmap: updatedData });
  };

  const handleConfirmDelete = () => {
    if (!deletingNode) return;
    executeDelete(deletingNode.id);
    setDeletingNode(null);
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
          {localTree && (
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

          {isInstructor && (
            <Button
              size="sm"
              onClick={() => generateMindmap({ saveAsDraft: false })}
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
                  {localTree ? 'Sinh lại Mindmap AI' : 'Tạo Mindmap bằng AI'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mindmap Content Display */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Icon icon="lucide:loader-2" className="size-8 text-sky-500 animate-spin" />
          <p className="text-xs text-muted-foreground">Đang tải sơ đồ tư duy...</p>
        </div>
      ) : localTree?.root ? (
        <div className="w-full max-w-3xl mx-auto py-2">
          <TreeNode
            node={localTree.root}
            level={0}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            isExpanded={expandedMap[localTree.root.id] !== false}
            onToggleExpand={handleToggleExpand}
            expandedMap={expandedMap}
            isInstructor={isInstructor}
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
                onClick={() => generateMindmap({ saveAsDraft: false })}
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
        open={Boolean(deletingNode)}
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
}
