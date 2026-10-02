'use client';

import { useState, useCallback } from 'react';
import type { ISection } from 'share-lib';

interface UseChapterDndProps {
  sections: ISection[];
  onReorder: (newOrderIds: string[]) => void;
}

export function useChapterDnd({ sections, onReorder }: UseChapterDndProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (targetIndex: number, e: React.DragEvent) => {
      e.preventDefault();
      const sourceIndex = draggedIndex;
      setDraggedIndex(null);
      setDragOverIndex(null);

      if (sourceIndex === null || sourceIndex === targetIndex) {
        return;
      }

      const newItems = [...sections];
      const [movedItem] = newItems.splice(sourceIndex, 1);
      if (!movedItem) return;

      newItems.splice(targetIndex, 0, movedItem);

      const newOrderIds = newItems.map((item) => item.id);
      onReorder(newOrderIds);
    },
    [draggedIndex, sections, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  return {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}
