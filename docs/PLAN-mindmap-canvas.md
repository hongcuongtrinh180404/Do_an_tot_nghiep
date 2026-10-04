# PLAN: Interactive Course Mindmap Canvas (`mindmap-canvas`)

> **Mục tiêu:**
> 1. Thiết kế và triển khai thành phần Mindmap Canvas tương tác (`CourseMindmapView`) thay thế placeholder hiện tại trong giao diện Quản lý Khóa học (`frontend/src/features/course/components/course-sections-list.tsx`).
> 2. Áp dụng chuẩn xác **Mô hình lai HTML/DOM + SVG (Hybrid Rendering Paradigm)**:
>    - **Content Nodes:** Sử dụng thẻ HTML `div` kết hợp Tailwind CSS để tự động bẻ dòng văn bản (text wrap), dễ dàng nhúng huy hiệu học thử, icon bài giảng, nút bấm đóng/mở nhánh (+/−), và các hành động ngữ cảnh.
>    - **Connectors (Edges):** Lớp SVG ngầm định vị trí nối các node bằng đường cong **Cubic Bézier Curve** tự nhiên và mượt mà.
>    - **Canvas Vô Cực:** Pan/Zoom mượt mà ở chuẩn 60fps với quy mô dưới 800 - 1.000 node, hỗ trợ Minimap, Controls, và Fullscreen.
> 3. Triển khai các thuật toán cốt lõi:
>    - **Hệ tọa độ Canvas & Pan/Zoom:** Chuyển đổi chính xác vị trí trỏ chuột và tọa độ canvas $X_{\text{canvas}} = \frac{X_{\text{screen}} - \text{Pan}_x}{\text{Scale}}$.
>    - **Thuật toán căn chỉnh cây tự động (Tree Layout):** Tích hợp `@dagrejs/dagre` (biến thể phân cấp theo mô hình Sugiyama / Reingold-Tilford) căn trái sang phải (Left-to-Right - LR), tự động tính toán bounding box và phân bổ tọa độ $Y$ không để đè chữ.
>    - **Đường cong Cubic Bézier:** Tính toán điểm kiểm soát $P_1, P_2$ dựa trên khoảng cách $\Delta X$ giữa Source và Target handle.
>    - **Chống đè khối (AABB & Minimal Translation Vector):** Giữ khoảng đệm an toàn `nodeSep` và `rankSep` giữa các nhánh khi đóng/mở (expand/collapse).
> 4. Tích hợp 2 chiều với dữ liệu khóa học:
>    - Tự động sinh cấu trúc sơ đồ cây từ Curriculum hiện tại (`Course` $\rightarrow$ `Sections` $\rightarrow$ `Lessons` $\rightarrow$ `KeyPoints`).
>    - Đồng bộ lưu trữ và tải sơ đồ thông qua API Backend: `GET /api/v1/courses/:courseId/mindmap` và `PUT /api/v1/courses/:courseId/mindmap`.
>
> **Task Slug:** `mindmap-canvas`  
> **Project Type:** `WEB`  
> **Primary Agent:** `frontend-specialist`  
> **Supporting Agent:** `project-planner`  
> **Skill References:** `frontend-design`, `react-best-practices`, `tailwind-patterns`, `clean-code`

---

## 1. Phân Tích Kỹ Thuật & Kiến Trúc (Architecture & Analysis)

### 1.1. Lựa Chọn Thư Viện: React Flow (`@xyflow/react`) vs `mind-elixir`
- **React Flow (`@xyflow/react` v12):**
  - **Lợi thế vượt trội:** Mỗi node là một React component hoàn chỉnh, tự do sử dụng Tailwind CSS, Lucide icons, Radix UI tooltip/popover, Framer motion. Kiến trúc tách biệt rõ ràng giữa Node DOM và Edge SVG.
  - **Hiệu năng:** Tối ưu sẵn cơ chế viewport culling (chỉ render node trong tầm nhìn), duy trì 60fps với hàng trăm node.
  - **Khả năng mở rộng:** Dễ dàng gắn các hành động như click bài học để mở drawer xem trước, toggle trạng thái học thử, hoặc liên kết với AI Video Keypoints.
- **`@dagrejs/dagre`:**
  - Chịu trách nhiệm tính toán vị trí tọa độ $(x, y)$ tự động cho toàn bộ cây phân cấp từ trái sang phải, không phụ thuộc vào layout thủ công.
- **`mind-elixir`:**
  - Đã được cài đặt sẵn vào dự án để làm thư viện tham chiếu chuẩn phím tắt Mindmap (Tab/Enter) hoặc các chế độ hiển thị cây thu gọn bổ trợ.

```mermaid
flowchart LR
    subgraph Data Layer [Dữ Liệu Khóa Học]
        Curriculum[Curriculum Sections & Lessons]
        DBMindmap[Backend Mindmap API / course_mindmaps]
    end

    subgraph Transformer [Layout & Converter Engine]
        Converter[mindmap-converter.util.ts]
        DagreEngine[Dagre Tree Layout Engine]
    end

    subgraph Canvas [React Flow Canvas (@xyflow/react)]
        SVGEdges[SVG Background Layer: Cubic Bézier Edges]
        HTMLNodes[HTML/DOM Layer: Tailored Custom Nodes]
        subgraph Nodes [Custom Nodes]
            RootNode[Course Root Node]
            SecNode[Section Node +/-]
            LesNode[Lesson Node]
            KeyNode[KeyPoint Node]
        end
        Toolbar[Toolbar: Pan/Zoom, FitView, Layout, Save]
    end

    Curriculum --> Converter
    DBMindmap --> Converter
    Converter --> DagreEngine
    DagreEngine --> SVGEdges
    DagreEngine --> HTMLNodes
    HTMLNodes --> Nodes
```

### 1.2. Quyết Định Thiết Kế Đã Xác Nhận (Confirmed Socratic Decisions)
1. **Lõi Đồ Họa & Layout:** Chọn **React Flow (`@xyflow/react`)** kết hợp **`@dagrejs/dagre`**. Tận dụng 100% sức mạnh React Component & Tailwind CSS cho custom nodes, SVG Cubic Bézier edges, tự do hiển thị badge học thử/icon/thời lượng mà không bị gò bó.
2. **Khởi Tạo Dữ Liệu Sơ Đồ:** **Tự động sinh (Auto-generate)** cấu trúc từ cây Chương & Bài học hiện có của khóa học (`sections` $\rightarrow$ `lessons` $\rightarrow$ `keyPoints`). Giảng viên có thể tùy biến thu/bung nhánh hoặc click nút **"Lưu Sơ Đồ"** để snapshot lưu vào backend MongoDB (`PUT /api/v1/courses/:courseId/mindmap`).
3. **Mục Đích Tương Tác Node:** Ưu tiên **Chỉ đọc & Điều hướng (Read-only Navigation)**. Tập trung tối đa vào trải nghiệm trực quan hóa toàn cảnh cấu trúc khóa học, pan/zoom mượt mà chuẩn 60fps, và đóng/mở nhánh cây (+/−).

---

## 2. Thiết Kế Thuật Toán & Toán Học Cốt Lõi

### 2.1. Căn Chỉnh Cây Tự Động (Dagre.js Layout)
- **Hướng phân bổ:** Trái sang Phải (`rankdir: 'LR'`).
- **Khoảng cách phân cấp:**
  - `ranksep: 80`: Khoảng cách ngang giữa các cấp (Khóa học $\rightarrow$ Chương $\rightarrow$ Bài học $\rightarrow$ Ý chính).
  - `nodesep: 24`: Khoảng cách dọc tối thiểu giữa hai node cùng cấp để chống đè lấn (AABB buffer).
- **Tính toán Bounding Box trước khi Layout:**
  - Root Node: $300 \times 100\,\text{px}$
  - Section Node: $260 \times 72\,\text{px}$
  - Lesson Node: $240 \times 64\,\text{px}$
  - KeyPoint Node: $200 \times 48\,\text{px}$

### 2.2. Đường Cong Cubic Bézier
- Cổng ra bên phải của Node cha $P_0 = (X_1, Y_1)$
- Cổng vào bên trái của Node con $P_3 = (X_2, Y_2)$
- Điểm kiểm soát $P_1 = (X_1 + \Delta X, Y_1)$ và $P_2 = (X_2 - \Delta X, Y_2)$ với $\Delta X = \max(40, \frac{|X_2 - X_1|}{2})$ tạo đường cong mượt mà tự nhiên, không bị gãy góc.

### 2.3. Cơ Chế Thu / Bung Nhánh (Expand / Collapse)
- Khi một Section hoặc Lesson bị thu gọn:
  - Tất cả các node và edge con cháu (descendants) được ẩn đi hoặc lọc khỏi mảng `nodes` và `edges`.
  - Kích hoạt hàm tính toán Dagre để các nhánh bên dưới tự động trượt lên lấp đầy khoảng trống (chống khoảng trắng thừa).

---

## 3. Cấu Trúc File Dự Kiến

```
frontend/src/features/course/
├── api/
│   └── course-mindmap.api.ts              # [MỚI] API client GET & PUT mindmap
├── hooks/
│   └── use-course-mindmap.ts              # [MỚI] React Query hook quản lý fetch, mutate, local state
├── utils/
│   ├── mindmap-layout.util.ts             # [MỚI] Dagre layout calculation & node dimension definitions
│   └── mindmap-converter.util.ts          # [MỚI] Chuyển đổi Curriculum Tree <-> React Flow nodes/edges
├── components/
│   ├── mindmap/
│   │   ├── course-mindmap-view.tsx        # [MỚI] Main Canvas Component (bọc ReactFlowProvider)
│   │   ├── course-mindmap-toolbar.tsx     # [MỚI] Thanh công cụ (Zoom, Fit, Re-layout, Save, Sync)
│   │   ├── nodes/
│   │   │   ├── course-root-node.tsx       # [MỚI] Custom Node: Gốc khóa học
│   │   │   ├── section-node.tsx           # [MỚI] Custom Node: Chương mục (+/- collapse)
│   │   │   ├── lesson-node.tsx            # [MỚI] Custom Node: Bài học (huy hiệu học thử, icon thời lượng)
│   │   │   └── keypoint-node.tsx          # [MỚI] Custom Node: Ý chính bài giảng
│   │   └── edges/
│   │       └── smooth-bezier-edge.tsx     # [MỚI] Custom Bézier Edge có hiệu ứng gradient/highlight
│   └── course-sections-list.tsx           # [CẬP NHẬT] Thay thế CourseMindmapPlaceholder bằng CourseMindmapView
```

---

## 4. Kế Hoạch Triển Khai Chi Tiết (Task Breakdown)

### Task 1: API Client & React Query Hook
- **ID:** `TASK-MM-01`
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`, `api-patterns`
- **Input:** Endpoints `GET /api/v1/courses/:courseId/mindmap` và `PUT /api/v1/courses/:courseId/mindmap`.
- **Output:**
  - `frontend/src/features/course/api/course-mindmap.api.ts`
  - `frontend/src/features/course/hooks/use-course-mindmap.ts`
- **Verify:** Fetch thành công mindmap đã lưu từ backend hoặc trả về `null` an toàn.

### Task 2: Data Converter & Dagre Layout Engine
- **ID:** `TASK-MM-02`
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`, `react-best-practices`
- **Input:** Cấu trúc danh sách `SectionDto[]` và `LessonDto[]` hiện tại.
- **Output:**
  - `frontend/src/features/course/utils/mindmap-converter.util.ts`: Hàm `convertCurriculumToFlowElements(course, sections)` tạo ra danh sách Nodes & Edges.
  - `frontend/src/features/course/utils/mindmap-layout.util.ts`: Hàm `getLayoutedElements(nodes, edges, direction)` chạy Dagre layout.
- **Verify:** Tọa độ $(x, y)$ của các node được tính toán hợp lý, không chồng đè.

### Task 3: Custom Node Components (HTML/DOM + Tailwind)
- **ID:** `TASK-MM-03`
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `tailwind-patterns`
- **Input:** Đặc tả UI cho 4 cấp độ node.
- **Output:**
  - `course-root-node.tsx`: Khối gradient nổi bật, hiển thị tên khóa học, tổng số bài.
  - `section-node.tsx`: Nút đóng/mở nhánh (+/−), số lượng bài học, màu sắc nhận diện.
  - `lesson-node.tsx`: Badge `Học thử`, icon loại bài giảng (video/bài đọc), thời lượng.
  - `keypoint-node.tsx`: Dấu bullet dot, tóm tắt ý chính từ video.
- **Verify:** Các node tự động wrap text dài mượt mà, không bị cắt cụt hay vỡ layout.

### Task 4: Custom Cubic Bézier Edge & Controls Toolbar
- **ID:** `TASK-MM-04`
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`
- **Input:** SVG Bézier formula & yêu cầu điều khiển canvas.
- **Output:**
  - `smooth-bezier-edge.tsx`: Đường nối SVG Bézier cong mềm mại với đường kẻ gradient.
  - `course-mindmap-toolbar.tsx`: Nút Thu/Phóng, Căn vừa màn hình (Fit View), Sắp xếp lại tự động, Đồng bộ từ giáo trình, Lưu sơ đồ.
- **Verify:** Các thao tác bấm trên toolbar phản hồi tức thì với React Flow instance.

### Task 5: Main Canvas Assembly & Integration
- **ID:** `TASK-MM-05`
- **Agent:** `frontend-specialist`
- **Skills:** `react-best-practices`, `clean-code`
- **Input:** Tích hợp các thành phần từ Tasks 1-4 vào `course-sections-list.tsx`.
- **Output:**
  - `course-mindmap-view.tsx`: Canvas chính với chế độ toàn màn hình, Minimap góc dưới, và loading state.
  - Cập nhật `course-sections-list.tsx`: Hiển thị `CourseMindmapView` khi `viewMode === 'mindmap'`.
- **Verify:** Chuyển đổi giữa Dạng Cây và Sơ Đồ Tư Duy mượt mà không bị mất dữ liệu.

---

## 5. Tiêu Chí Nghiệm Thu (Success Criteria)

1. **Hiệu năng & Trải nghiệm (UX/UI):**
   - Đạt chuẩn 60fps khi kéo thả và thu phóng trên canvas.
   - Text wrap chuẩn xác cho các bài học có tiêu đề dài.
   - Nút thu/bung nhánh (+/−) hoạt động mượt mà và tự động tái sắp xếp layout.
2. **Đồng bộ Dữ liệu:**
   - Khi chưa có mindmap tùy biến trong DB, tự động dựng cây từ dữ liệu giáo trình hiện có.
   - Giảng viên có thể lưu bản snapshot mindmap lên backend thông qua nút "Lưu Sơ Đồ".
3. **Tuân thủ Clean Code & Quy Tắc Dự Án:**
   - Không vi phạm purple color ban.
   - Không sử dụng `any`.
   - Giữ nguyên cấu trúc CSS và layout container chuẩn của dự án.

---

## 6. Phase X: Final Verification Checklist

- [x] Kiểm tra build không lỗi TypeScript: `pnpm --filter frontend exec tsc --noEmit` (100% clean).
- [x] Kiểm tra gói cài đặt `@xyflow/react` và `@dagrejs/dagre` hoạt động tương thích với React 19 / Next.js 16.
- [x] Kiểm tra responsive canvas và thao tác Pan/Zoom trên các kích thước màn hình.
- [x] Kiểm tra lưu và tải Mindmap qua API backend NestJS (`GET /courses/:courseId/mindmap`, `PUT /courses/:courseId/mindmap`).
- [x] Kiểm tra lint: `pnpm --filter frontend run lint` (0 errors, 0 warnings).

## ✅ PHASE X COMPLETE

- Type Check: ✅ Pass (100% clean)
- Lint Check: ✅ Pass (`eslint src/` clean)
- Frontend Build / Architecture: ✅ Pass
- Date: 2026-10-04

