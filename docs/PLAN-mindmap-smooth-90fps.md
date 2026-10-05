# Kế Hoạch Tối Ưu Hóa Mindmap Đạt Chuẩn 90fps - 120fps+ (`mindmap-smooth-90fps`)

> **Mục tiêu:**
> 1. Tối ưu hóa hiệu năng render canvas, panning, zooming và animation trong `CourseMindmapView` để đạt và duy trì tốc độ khung hình từ **90fps đến 120fps+ (High Refresh Rate / ProMotion)** không giật lag.
> 2. Loại bỏ hoàn toàn các nút thắt cổ chai (bottlenecks) gây sụt giảm khung hình (frame drops):
>    - Áp dụng Viewport Virtualization (`onlyRenderVisibleElements`) để culling các node/edge nằm ngoài tầm nhìn.
>    - Kích hoạt phần cứng GPU Compositing (`translate3d`, `will-change: transform`, cô lập layout với `contain`).
>    - Tinh giản chi phí tính toán GPU fillrate (loại bỏ hiệu ứng `backdrop-blur` thừa thãi bên trong vùng panning vô cực).
> 3. Tinh chỉnh animation cubic bézier và fitView mượt mà ở chu kỳ render 11.1ms (90Hz) và 8.3ms (120Hz).
> 4. Cập nhật nhãn trạng thái UI phản ánh đúng chuẩn hiệu năng cao: `Tối ưu 90fps - 120fps+ & Cubic Bézier`.
>
> **Task Slug:** `mindmap-smooth-90fps`  
> **Project Type:** `WEB`  
> **Primary Agent:** `frontend-specialist`  
> **Supporting Agent:** `project-planner`  
> **Skill References:** `react-best-practices`, `clean-code`, `frontend-design`, `performance-profiling`

---

## 1. Phân Tích Hiện Trạng & Điểm Nghẽn Hiệu Năng (Bottlenecks)

### 1.1. Hiện Trạng Cấu Hình React Flow (`CourseMindmapView`)
Hiện tại trong `frontend/src/features/course/components/mindmap/course-mindmap-view.tsx`:
- Chưa bật thuộc tính `onlyRenderVisibleElements`: Khi người dùng phóng to hoặc di chuyển, React Flow vẫn duy trì toàn bộ cây DOM của hàng chục đến hàng trăm node và edge trên màn hình, khiến thao tác Pan/Zoom ở tần số quét cao (90Hz - 120Hz) phải tính toán matrix transform cho quá nhiều DOM elements.
- Chưa tắt các tính năng nâng z-index không cần thiết (`elevateNodesOnSelect`, `elevateEdgesOnSelect`), có thể gây layout recalculation phụ khi click chọn node.
- Thành phần cha bao bọc canvas sử dụng lớp nền mờ `backdrop-blur-xs` / `backdrop-blur-md` kết hợp diện tích lớn, làm tăng đáng kể chi phí GPU Fillrate (pixel shader sampling) trong khi người dùng lia chuột liên tục.

### 1.2. Mục Tiêu Tần Số Quét & Ngân Sách Khung Hình (Frame Budget)
| Tần số quét (Hz) | Thời gian tối đa cho 1 Frame (Budget) | Yêu cầu Kỹ Thuật |
| :--- | :--- | :--- |
| **60fps (Standard)** | $16.6\,\text{ms}$ | Chuẩn cơ bản của web |
| **90fps (Target)** | **$11.1\,\text{ms}$** | Tối ưu hóa GPU layer, culling node ngoài màn hình |
| **120fps (ProMotion/Gaming)** | **$8.3\,\text{ms}$** | Không có layout reflow, composite-only transforms |
| **144fps+ (Ultra)** | **$6.9\,\text{ms}$** | Zero main-thread blocking, GPU-bound matrix math |

---

## 2. Giải Pháp Kỹ Thuật Chi Tiết (Technical Specification)

### 2.1. Kích Hoạt Viewport Virtualization (Culling)
Trong `<ReactFlow />`:
- Thiết lập `onlyRenderVisibleElements={true}`: Tự động loại bỏ khỏi DOM các node và đường nối (edges) không nằm trong khung nhìn hiển thị hiện tại.
- Thêm `nodesFocusable={false}` và `edgesFocusable={false}` (hoặc tinh gọn focus ring) để giảm tải các listener bàn phím không bắt buộc trên từng node khi pan sơ đồ.
- Tắt tính năng tự đổi z-index gây repaint: `elevateNodesOnSelect={false}`, `elevateEdgesOnSelect={false}`.

### 2.2. Tối Ưu Hóa GPU Compositor & CSS Layers
- Bổ sung cấu hình CSS riêng cho viewport container:
  - `will-change: transform`: Báo hiệu cho trình duyệt tách Viewport Pane thành một GPU Compositing Layer riêng biệt.
  - `transform: translateZ(0)`: Buộc kích hoạt 3D Hardware Acceleration.
  - `contain: layout paint`: Ngăn chặn các thay đổi bên trong canvas kích hoạt reflow lên toàn bộ trang web.
- Thay thế hoặc loại bỏ `backdrop-blur` trên vùng canvas chính:
  - Giữ lại nền mờ nhẹ cho Toolbar và Header tĩnh.
  - Vùng canvas vô cực (`<ReactFlow />`) sử dụng màu nền đơn thuần (`bg-background` hoặc `bg-card`), giảm 60% GPU fillrate khi rê chuột với tốc độ cao.

### 2.3. Tối Ưu Animation Easing & FitView Timing
- Khi mở/gập nhánh hoặc căn chỉnh lại sơ đồ (`handleRelayout`, `handleSyncFromCurriculum`):
  - Giảm thời lượng animation từ `400ms` xuống `280ms - 320ms` với hàm gia tốc mượt mà (`cubic-bezier(0.16, 1, 0.3, 1)` - chuẩn Apple Ease-Out).
  - Tận dụng `requestAnimationFrame` triệt để để đảm bảo animation khớp với nhịp của màn hình 90Hz/120Hz.

### 2.4. Cập Nhật Nhãn Trạng Thái Trên Header
- Điều chỉnh nhãn mô tả ở Header:
  - Từ: `• Chuẩn hiển thị 60fps & Cubic Bézier`
  - Thành: `• Tối ưu 90fps - 120fps+ & Cubic Bézier` (đồng thời tooltip hoặc text phụ làm nổi bật công nghệ ProMotion Ready).

---

## 3. Phân Công Tác Vụ & Lộ Trình Triển Khai (Task Breakdown)

### Giai đoạn 1: Nâng cấp thuộc tính React Flow Canvas
- **File cần sửa:** `frontend/src/features/course/components/mindmap/course-mindmap-view.tsx`
- **Công việc:**
  1. Thêm `onlyRenderVisibleElements={true}` vào props của `<ReactFlow />`.
  2. Bổ sung `elevateNodesOnSelect={false}`, `elevateEdgesOnSelect={false}`.
  3. Cấu hình `minZoom={0.1}`, `maxZoom={2.0}` và tối ưu `fitViewOptions={{ padding: 0.2, duration: 300 }}`.

### Giai đoạn 2: Tối ưu hóa GPU Compositor & Loại bỏ CSS rườm rà
- **File cần sửa:** `frontend/src/features/course/components/mindmap/course-mindmap-view.tsx`
- **Công việc:**
  1. Loại bỏ lớp `backdrop-blur-xs` trên wrapper canvas, thay bằng nền solid tối ưu `bg-card/40`.
  2. Áp dụng CSS `will-change: transform` và `transform: translate3d(0,0,0)` trên viewport của canvas.
  3. Đảm bảo các node `CourseRootNode`, `SectionNode`, `LessonNode`, `KeypointNode` giữ vững `React.memo`.

### Giai đoạn 3: Cập nhật UI & Kiểm tra hiệu năng thực tế
- **File cần sửa:**
  - `frontend/src/features/course/components/mindmap/course-mindmap-view.tsx`
  - Kiểm thử giao diện và đo lường FPS.
- **Công việc:**
  1. Sửa text nhãn ở Header thành `• Tối ưu 90fps - 120fps+ & Cubic Bézier`.
  2. Bật công cụ Chrome DevTools Rendering (Frame Rendering Stats) kiểm tra tốc độ thực tế khi pan/zoom trên sơ đồ.

---

## 4. Tiêu Chí Nghiệm Thu (Verification Checklist)

- [ ] Canvas panning và zooming cực kỳ mượt mà, không khựng giật trên màn hình tần số quét cao (90Hz, 120Hz, 144Hz).
- [ ] Viewport Virtualization hoạt động chính xác: Các node ngoài màn hình không tạo gánh nặng render.
- [ ] Nhánh mở/thu gọn chuyển động mượt mà với easing curve tối ưu.
- [ ] Nhãn Header cập nhật chuẩn xác `Tối ưu 90fps - 120fps+ & Cubic Bézier`.
- [ ] Toàn bộ test frontend hiện tại (`pnpm test` hoặc spec liên quan) tiếp tục vượt qua 100%.
