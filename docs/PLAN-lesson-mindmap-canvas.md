# Kế hoạch Triển Khai: Chế Độ Xem Sơ Đồ Tư Duy Dạng Canvas Cho Bài Học (Lesson Mindmap Canvas View)

> **Mục tiêu:**
> 1. Bổ sung chế độ xem sơ đồ tư duy dạng Canvas đồ họa trực quan (Interactive Mindmap Canvas) bên cạnh chế độ xem dạng cây thư mục (Tree View) hiện tại trong tab **Sơ đồ tư duy (Mindmap)** tại trang `[Chi tiết bài học | DATN Portal](http://localhost:3000/instructor/courses/[courseId]/lessons/[lessonId])`.
> 2. Cung cấp bộ nút chuyển đổi giao diện mượt mà (View Switcher: Dạng Cây ↔ Dạng Sơ Đồ Mindmap).
> 3. Tận dụng kiến trúc đồ họa sẵn có của dự án (`@xyflow/react` + `@dagrejs/dagre` tương tự sơ đồ tổng quát khóa học `CourseMindmapView`):
>    - Bố cục tự động từ trái sang phải (LR Tree Layout) không đè chữ.
>    - Đường nối uốn cong mềm mại (`SmoothBezierEdge`).
>    - Các node có thiết kế thẩm mỹ cao, hiển thị tiêu đề và mốc thời gian video dạng badge có thể bấm để tua video (`onSeek`).
>    - Thanh công cụ điều khiển Canvas: Phóng to (Zoom In), Thu nhỏ (Zoom Out), Căn vừa khung nhìn (Fit View), Toàn màn hình (Fullscreen).
> 4. Đồng bộ hai chiều hoàn hảo với dữ liệu bài học (`mindmap`): Mọi thay đổi ở dạng cây hoặc khi sinh lại từ AI đều được hiển thị ngay lập tức trên canvas.
>
> **Task Slug:** `lesson-mindmap-canvas`  
> **Plan File:** `docs/PLAN-lesson-mindmap-canvas.md`  
> **Project Type:** `WEB (Next.js 16 + React 19 + @xyflow/react)`  
> **Primary Agent:** `project-planner`  
> **Assigned Agents:** `frontend-specialist`, `clean-code`  
>
> **Đã thống nhất qua Socratic Gate:**
> 1. **Vị trí và kiểu nút chuyển đổi**: Sử dụng nút chuyển đổi đôi dạng Segmented Control (`[ 🌲 Dạng danh sách cây | 🗺️ Sơ đồ Canvas ]`) đặt nổi bật ngay trên thanh header của Tab Mindmap.
> 2. **Phân tách trách nhiệm (Separation of Concerns)**:
>    - **Dạng danh sách cây (Tree View)**: Dành cho việc đọc chi tiết và thực hiện mọi thao tác biên tập (thêm nhánh, sửa tiêu đề, chỉnh timestamp, xóa nhánh).
>    - **Dạng sơ đồ (Canvas View)**: Dành cho việc trực quan hóa luồng kiến thức, tự do thu phóng (zoom/pan), mở rộng / thu gọn các nhánh con, và click vào mốc thời gian (`timestamp`) để tua video (`onSeek`).
> 3. **Công nghệ & Kiến trúc đồ họa**: Tái sử dụng stack đồ họa `@xyflow/react` + `@dagrejs/dagre` có sẵn từ `CourseMindmapView`, đảm bảo hiệu năng cao, đường nối mềm mại `smoothBezier` và không phát sinh thêm thư viện ngoài.  

---

## 1. Phân Tích Kỹ Thuật & Tái Sử Dụng Thành Phần (Architectural Analysis)

### 1.1. Hiện Trạng Hệ Thống
- Dữ liệu mindmap bài học hiện tại lưu dưới dạng cây lồng nhau chuẩn `ILessonMindmapData`:
  ```typescript
  export interface ILessonMindmapNode {
    id: string;
    title: string;
    timestamp: number;
    children?: ILessonMindmapNode[];
  }
  export interface ILessonMindmapData {
    root: ILessonMindmapNode;
  }
  ```
- Sơ đồ tổng quát của khóa học đã có sẵn trong codebase tại `frontend/src/features/course/components/mindmap/`:
  - `course-mindmap-view.tsx`: Sử dụng `ReactFlow`, `ReactFlowProvider`, `Background`, `MiniMap`.
  - `mindmap-layout.util.ts`: Dùng `@dagrejs/dagre` để tính toán tọa độ X/Y theo kích thước từng loại node.
  - `smooth-bezier-edge.tsx`: Đường nối bezier cong mềm mại với gradient và hiệu ứng đường kẻ tinh tế.
  - `course-mindmap-toolbar.tsx`: Bộ điều khiển zoom, fit view, center.

### 1.2. Giải Pháp Thiết Kế Cho Lesson Mindmap Canvas
Thay vì cài thêm thư viện mới (như Markmap hay GoJS), giải pháp tối ưu nhất là **tái sử dụng trực tiếp stack `@xyflow/react` + `@dagrejs/dagre`** đã tích hợp sẵn:
1. **Converter Utility (`lesson-mindmap-flow.util.ts`)**:
   - Hàm đệ quy chuyển đổi cây `ILessonMindmapNode` thành mảng `Node[]` và `Edge[]` của ReactFlow.
   - Gán `type: 'lessonMindmapNode'` và `data: { id, title, timestamp, level, hasChildren, isExpanded, onSeek }`.
2. **Custom Canvas Node (`lesson-mindmap-canvas-node.tsx`)**:
   - Thiết kế chuẩn Design System, tuân thủ **Purple Ban** (dùng Sky Blue, Indigo, Slate).
   - Thẻ hiển thị tiêu đề node, số thứ tự cấp bậc, badge mốc thời gian dạng click-to-seek (`formatTime(timestamp)`).
   - Nút thu gọn / mở rộng nhánh con dạng pill badge nhỏ gọn.
3. **Canvas View Component (`lesson-mindmap-canvas-view.tsx`)**:
   - Bọc trong `ReactFlowProvider`.
   - Lưới nền dot grid tinh tế (`Background variant="dots"`).
   - Hỗ trợ kéo thả pan, cuộn chuột zoom, kéo thả vị trí node tự do.
   - Thanh công cụ Mini Toolbar (Zoom In/Out, Fit View, Toggle Thu gọn/Mở rộng).
4. **Bộ Chuyển Đổi Giao Diện (View Mode Switcher)**:
   - Tích hợp tại thanh header của `LessonMindmapTab`:
     - Nút toggle đôi: `[ 🌲 Dạng cây phân cấp | 🗺️ Sơ đồ Mindmap ]`.
     - Giữ nguyên trạng thái qua `useState<'tree' | 'canvas'>('tree')` (hoặc lưu `localStorage` để ghi nhớ tùy chọn của người dùng).

---

## 2. Kế Hoạch Triển Khai Chi Tiết (Phased Roadmap)

### Phase 1: Tiện Ích Chuyển Đổi Dữ Liệu Cây Sang ReactFlow Elements
- **File mới:** `frontend/src/features/course/utils/lesson-mindmap-flow.util.ts`
- **Nhiệm vụ:**
  - Viết hàm `convertLessonMindmapToFlowElements(root: ILessonMindmapNode, collapsedIds: Set<string>): { nodes: Node[], edges: Edge[] }`.
  - Thiết lập kích thước bounding box cho node bài học (`width: 240, height: 60`).
  - Sử dụng Dagre layout từ `mindmap-layout.util.ts` với cấu hình ngang `direction: 'LR'`, khoảng cách `rankSep: 70`, `nodeSep: 20`.
  - Tạo các kết nối `Edge` với `type: 'smoothBezier'` và màu sắc đồng bộ (`#0284c7` - Sky 600).

### Phase 2: Thành Phần Node Tùy Chỉnh Cho Canvas Bài Học
- **File mới:** `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-node.tsx`
- **Nhiệm vụ:**
  - Thiết kế node với bo góc `rounded-xl`, viền bóng đổ nhẹ `shadow-xs`.
  - Cấp 0 (Root): Nền `bg-sky-500/15 border-sky-500 text-sky-950 dark:text-sky-100 font-bold`.
  - Cấp 1+: Nền `bg-card border-border/80 hover:border-sky-500/50`.
  - Tích hợp mốc thời gian video: Nút bấm mini với icon play `lucide:play`, click để gọi `onSeek(timestamp)` mà không kích hoạt kéo thả canvas.
  - Tích hợp nút thu gọn/mở rộng nhánh con (`lucide:chevron-right` / `lucide:chevron-down`).

### Phase 3: Thành Phần LessonMindmapCanvasView
- **File mới:** `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-view.tsx`
- **Nhiệm vụ:**
  - Khung Canvas tràn viền có chiều cao linh hoạt (`min-h-[480px] h-[580px] w-full rounded-xl border bg-muted/20 relative overflow-hidden`).
  - Tích hợp `ReactFlow` với controls, background dot grid, smooth edges.
  - Tích hợp `LessonMindmapCanvasToolbar`: Phóng to, Thu nhỏ, Fit View, Mở rộng/Thu gọn tất cả.
  - Kết nối mượt mà với player video thông qua `onSeek`.

### Phase 4: Tích Hợp Toggle Chuyển Đổi Vào LessonMindmapTab
- **File sửa đổi:** `frontend/src/features/course/components/player/tabs/lesson-mindmap-tab.tsx`
- **Nhiệm vụ:**
  - Bổ sung state `viewMode: 'tree' | 'canvas'`, mặc định là `'tree'`.
  - Thêm Segmented Control Toggle trên header:
    - Tab Cây: Icon `lucide:list-tree` nhãn "Dạng danh sách cây".
    - Tab Mindmap: Icon `lucide:network` nhãn "Sơ đồ Canvas".
  - Hiển thị có điều kiện: Nếu `viewMode === 'tree'` render `TreeNode`, nếu `viewMode === 'canvas'` render `LessonMindmapCanvasView`.
  - Đảm bảo dữ liệu `localTree` được đồng bộ tức thì giữa 2 chế độ.

---

## 3. Danh Sách File Dự Kiến Tác Động (Impacted Files)

| File | Hành động | Mục đích |
| :--- | :--- | :--- |
| `frontend/src/features/course/utils/lesson-mindmap-flow.util.ts` | **Tạo mới** | Thuật toán chuyển đổi cây sang ReactFlow nodes/edges + Dagre layout |
| `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-node.tsx` | **Tạo mới** | Custom Node hiển thị tiêu đề, cấp bậc, nút tua video và nút thu gọn nhánh |
| `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-toolbar.tsx` | **Tạo mới** | Toolbar điều khiển Canvas (Zoom, Fit View, Expand/Collapse) |
| `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-view.tsx` | **Tạo mới** | Component trình diễn sơ đồ ReactFlow hoàn chỉnh cho bài học |
| `frontend/src/features/course/components/player/tabs/lesson-mindmap-tab.tsx` | **Cập nhật** | Thêm Toggle Switcher giữa Tree View và Canvas View |
| `a-agentic/features/interactive-video-player/dev-history.md` | **Cập nhật** | Ghi nhận lịch sử triển khai tính năng |

---

## Phase X: Checklist Xác Thực (Verification Checklist)

- [ ] `pnpm --filter frontend exec tsc --noEmit` pass 100% 0 lỗi.
- [ ] Chuyển đổi qua lại giữa Dạng cây và Dạng sơ đồ Mindmap mượt mà, không giật lag hay mất dữ liệu.
- [ ] Click vào mốc thời gian trên bất kỳ node nào của Canvas đều tua đúng video tới giây tương ứng.
- [ ] Tính năng Zoom, Pan, Fit View trên Canvas hoạt động mượt mà.
- [ ] Tính năng Thu gọn / Mở rộng nhánh trên Canvas hoạt động chính xác.
- [ ] Khi giảng viên sửa/thêm/xóa node ở dạng cây hoặc bấm "Sinh lại Mindmap AI", Canvas tự động cập nhật ngay lập tức.
- [ ] Tuân thủ tuyệt đối **Purple Ban** (chỉ dùng Sky Blue, Indigo, Slate, Rose) và không dùng kiểu `any`.
