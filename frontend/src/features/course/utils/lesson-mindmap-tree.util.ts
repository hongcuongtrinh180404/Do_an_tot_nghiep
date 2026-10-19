import type { ILessonMindmapNode } from 'share-lib';

/**
 * Tìm node trong cây theo ID
 */
export function findNodeInTree(
  root: ILessonMindmapNode,
  targetId: string,
): ILessonMindmapNode | null {
  if (root.id === targetId) return root;
  if (!root.children || root.children.length === 0) return null;

  for (const child of root.children) {
    const found = findNodeInTree(child, targetId);
    if (found) return found;
  }

  return null;
}

/**
 * Tính độ sâu của node trong cây (Root = level 0, con trực tiếp của Root = level 1, ...)
 */
export function getNodeDepth(
  root: ILessonMindmapNode,
  targetId: string,
  currentDepth = 0,
): number {
  if (root.id === targetId) return currentDepth;
  if (!root.children || root.children.length === 0) return -1;

  for (const child of root.children) {
    const depth = getNodeDepth(child, targetId, currentDepth + 1);
    if (depth !== -1) return depth;
  }

  return -1;
}

/**
 * Đếm tổng số lượng node con cháu (descendants) bên dưới một node
 */
export function countDescendants(node: ILessonMindmapNode): number {
  if (!node.children || node.children.length === 0) return 0;

  return node.children.reduce((total, child) => {
    return total + 1 + countDescendants(child);
  }, 0);
}

/**
 * Cập nhật thông tin của một node trong cây (bất biến - Immutable)
 */
export function updateNodeInTree(
  root: ILessonMindmapNode,
  nodeId: string,
  updates: Partial<Pick<ILessonMindmapNode, 'title' | 'timestamp'>>,
): ILessonMindmapNode {
  if (root.id === nodeId) {
    const rawTimestamp =
      updates.timestamp !== undefined && !isNaN(updates.timestamp)
        ? Math.max(0, Math.floor(updates.timestamp))
        : root.timestamp;

    return {
      ...root,
      ...updates,
      title: updates.title !== undefined ? updates.title.trim() : root.title,
      timestamp: isNaN(rawTimestamp) ? 0 : rawTimestamp,
    };
  }

  if (!root.children || root.children.length === 0) {
    return root;
  }

  const newChildren = root.children.map((child) =>
    updateNodeInTree(child, nodeId, updates),
  );

  return {
    ...root,
    children: newChildren,
  };
}

/**
 * Thêm một node con mới vào node cha theo parentId (bất biến - Immutable)
 */
export function addChildNodeToTree(
  root: ILessonMindmapNode,
  parentId: string,
  newNode: ILessonMindmapNode,
): ILessonMindmapNode {
  if (root.id === parentId) {
    const existingChildren = Array.isArray(root.children) ? root.children : [];
    return {
      ...root,
      children: [...existingChildren, newNode],
    };
  }

  if (!root.children || root.children.length === 0) {
    return root;
  }

  const newChildren = root.children.map((child) =>
    addChildNodeToTree(child, parentId, newNode),
  );

  return {
    ...root,
    children: newChildren,
  };
}

/**
 * Xóa một node khỏi cây theo targetId (bất biến - Immutable)
 * Không cho phép xóa Root Node (nếu targetId trùng với root.id thì trả về nguyên vẹn root)
 */
export function deleteNodeFromTree(
  root: ILessonMindmapNode,
  targetId: string,
): ILessonMindmapNode {
  if (root.id === targetId) {
    // Không thể xóa root
    return root;
  }

  if (!root.children || root.children.length === 0) {
    return root;
  }

  // Lọc bỏ node cần xóa ở cấp con trực tiếp
  const filtered = root.children.filter((child) => child.id !== targetId);

  // Đệ quy xóa tiếp ở các cấp cháu nếu chưa được lọc
  const newChildren = filtered.map((child) =>
    deleteNodeFromTree(child, targetId),
  );

  return {
    ...root,
    children: newChildren,
  };
}
