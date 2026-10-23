export interface LayoutMargin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface LayoutBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Phần nhô ra ngoài thân node (badge, handle, nút mở rộng...) */
  margin?: LayoutMargin;
}

export interface LayoutOverlapPair {
  a: string;
  b: string;
}

function getInflatedBounds(box: LayoutBox): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const margin = box.margin ?? {};

  return {
    left: box.x - (margin.left ?? 0),
    right: box.x + box.width + (margin.right ?? 0),
    top: box.y - (margin.top ?? 0),
    bottom: box.y + box.height + (margin.bottom ?? 0),
  };
}

export function boxesOverlap(a: LayoutBox, b: LayoutBox): boolean {
  const aBounds = getInflatedBounds(a);
  const bBounds = getInflatedBounds(b);

  return (
    aBounds.left < bBounds.right &&
    aBounds.right > bBounds.left &&
    aBounds.top < bBounds.bottom &&
    aBounds.bottom > bBounds.top
  );
}

/**
 * Kiểm tra toàn bộ node có chồng lên nhau không (đã tính cả badge/nút nhô ra).
 * Dùng làm "lưới an toàn" sau khi Dagre layout: nếu CSS thay đổi làm kích thước
 * thực tế lệch khỏi constants thì layout util sẽ tự tăng gap và chạy lại.
 */
export function findOverlappingBoxes(boxes: LayoutBox[]): LayoutOverlapPair[] {
  const overlaps: LayoutOverlapPair[] = [];

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (boxesOverlap(boxes[i], boxes[j])) {
        overlaps.push({ a: boxes[i].id, b: boxes[j].id });
      }
    }
  }

  return overlaps;
}
