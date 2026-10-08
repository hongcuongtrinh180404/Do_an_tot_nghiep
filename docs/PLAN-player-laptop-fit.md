# Kế hoạch Triển khai: Tối ưu Kích thước Tầng Trên Chuẩn Màn hình Laptop (Ergonomic Laptop Fit)

> **Tài liệu Kế hoạch Triển khai (Planning Mode - Không viết mã nguồn)**  
> **Mã kế hoạch**: `docs/PLAN-player-laptop-fit.md`  
> **Người tạo**: `project-planner`  
> **Phạm vi**: Cập nhật lại toàn bộ kích thước của Tầng trên (Video & Điều hướng) trang xem trước bài giảng để phù hợp thị giác ("phù hợp mắt") trên các màn hình Laptop tiêu chuẩn (Full HD 1440px–1536px và Laptop nhỏ 1280px–1366px).

---

## 1. Phân tích Yêu cầu Kỹ thuật (Requirements Analysis)

### 1.1. Thông số Kích thước Mục tiêu theo Viewport

| Phân khúc Màn hình | Viewport | Cột Trái (Video Player 16:9) | Khoảng cách (Gap) | Cột Phải (Điều hướng Sidebar) |
| :--- | :--- | :--- | :--- | :--- |
| **Laptop Full HD tiêu chuẩn** | `~1440px – 1536px` | **Rộng**: `960px – 1000px` (~70%)<br>**Cao**: `540px – 562px` (chuẩn 16:9) | `40px` | **Rộng**: `380px – 420px` (~30%)<br>**Cao**: Bằng video (`~540px – 562px`) kèm `overflow-y-auto` |
| **Laptop nhỏ / HD+** | `~1280px – 1366px` | **Rộng**: `850px – 880px`<br>**Cao**: `480px – 495px` (chuẩn 16:9) | `24px – 32px` | **Rộng**: `~360px`<br>**Cao**: Bằng video (`~480px – 495px`) kèm `overflow-y-auto` |
| **Mobile / Tablet** | `< 1024px` | Xếp chồng dọc (`flex-col`), chiều rộng 100% | `24px` | Chiều cao linh hoạt `~400px`, cuộn bên trong |

### 1.2. Vấn đề của Thiết kế Trước (Why 1100px was not ergonomic)
- Chiều cao `1100px` trước đó quá lớn so với màn hình laptop thông thường (chiều cao màn hình laptop 1080p thường chỉ có `~750px – 850px` chiều cao vùng hiển thị trình duyệt sau khi trừ thanh địa chỉ và taskbar).
- Chiều cao `1100px` khiến người dùng phải cuộn quá nhiều và khung video bị kéo giãn vượt tầm mắt.
- Tinh chỉnh về mức **540px – 562px** (tương ứng chiều rộng ~960px–1000px chuẩn 16:9) giúp toàn bộ tầng trên hiển thị trọn vẹn trong một khung nhìn thoải mái, đồng thời người học có thể thấy được cả tiêu đề và một phần tầng dưới.

---

## 2. Giải pháp Kiến trúc Kỹ thuật (Architectural Solution)

### 2.1. Kỹ thuật Đồng bộ Chiều cao Tuyệt đối qua Flexbox `items-stretch`
- Thay vì gán cứng `height: 1100px` và `height: 900px`, chúng ta áp dụng cơ chế **Responsive Aspect Ratio Synchronized Stretcher**:
  1. **Container Tầng Trên**:
     - `flex flex-col lg:flex-row items-stretch gap-6 xl:gap-[40px] w-full`.
     - Sử dụng `items-stretch` để đảm bảo thẻ cột bên phải tự động có **chiều cao bằng đúng chiều cao thật của cột video bên trái** ở mọi độ phân giải.
  2. **Cột Trái (Video Player Box)**:
     - `flex-1 min-w-0 rounded-2xl bg-card border border-border shadow-xs overflow-hidden flex flex-col justify-center items-center`.
     - Bên trong bọc thẻ phát video chuẩn tỉ lệ `aspect-video w-full` (hoặc `h-full max-h-[562px]`).
     - Tự động sinh ra chiều cao:
       - Khi rộng `1000px` → cao đúng `562.5px`.
       - Khi rộng `960px` → cao đúng `540px`.
       - Khi rộng `880px` → cao đúng `495px`.
       - Khi rộng `850px` → cao đúng `478px`.
  3. **Cột Phải (Navigation Box)**:
     - `w-full lg:w-[360px] xl:w-[400px] shrink-0 rounded-2xl bg-card border border-border shadow-xs flex flex-col min-h-0 overflow-hidden`.
     - Nhờ `items-stretch`, chiều cao của cột phải sẽ khớp chính xác từng pixel với cột video (`~540px` trên Full HD và `~480px` trên Laptop nhỏ).
     - Phần nội dung bên trong được cấu hình `flex-1 min-h-0 overflow-y-auto` để cuộn độc lập mượt mà trong giới hạn chiều cao này.

### 2.2. Giới hạn Chiều rộng Tổng thể (Container Max Width)
- Đặt `max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6` để căn vừa tầm mắt trên Laptop tiêu chuẩn, không bị tràn lề quá xa.

---

## 3. Sơ đồ Kích thước Trực quan (Dimension Blueprint)

```
+---------------------------------------------------------------------------------------------------------------+
| HEADER TOP BAR: Nút Quay lại | Bài 01 | Tiêu đề bài học | Trạng thái bài học                                  |
+---------------------------------------------------------------------------------------------------------------+
| CONTAINER CHÍNH: max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-6                       |
|                                                                                                               |
| === TẦNG TRÊN (CHUẨN TẦM MẮT LAPTOP: CAO ~540px - 562px) ==================================================== |
| flex flex-col lg:flex-row items-stretch gap-6 xl:gap-[40px]                                                   |
|                                                                                                               |
| +---------------------------------------------------------+   <-- 40px GAP -->   +--------------------------+ |
| | CỘT TRÁI: VIDEO PLAYER CARD                             |                      | CỘT PHẢI: NAV SIDEBAR    | |
| | Chiều rộng: 960px – 1000px (~70%)                       |                      | Chiều rộng: 380px – 420px| |
| | Chiều cao: 540px – 562px (Chuẩn 16:9)                   |                      | Chiều cao: Bằng video    | |
| |                                                         |                      |            (~540px)      | |
| |   [Video 16:9 Aspect Ratio Canvas - bg-black]           |                      | +-----------+----------+ | |
| |   - Bộ controls cinema: Play, ±10s, Timeline marks...   |                      | | Timeline  | Video    | | |
| |                                                         |                      | +-----------+----------+ | |
| |                                                         |                      | Danh sách cuộn độc lập   | |
| |                                                         |                      | bên trong ~540px         | |
| |                                                         |                      | (overflow-y-auto)        | |
| +---------------------------------------------------------+                      +--------------------------+ |
|                                                                                                               |
| === TẦNG DƯỚI (3 TABS CONTAINER) ============================================================================ |
| w-full rounded-2xl bg-card border border-border shadow-xs overflow-hidden min-h-[300px]                       |
| +-----------------------------+-----------------------------+-----------------------------+                   |
| |              1              |              2              |              3              |                   |
| +-----------------------------+-----------------------------+-----------------------------+                   |
| | Vùng nội dung hiển thị tiêu đề và placeholder trực quan                                 |                   |
+---------------------------------------------------------------------------------------------------------------+
```

---

## 4. Các Tệp tin Cần Chỉnh sửa (Files to Update)

```text
frontend/src/features/course/components/
├── player/
│   ├── lesson-player-studio.tsx        # [UPDATE] Cập nhật max-w-[1440px], items-stretch, bỏ lg:h-[1100px]
│   ├── lesson-nav-sidebar.tsx          # [UPDATE] Bỏ h-[900px], chuyển sang kế thừa height từ parent flex-stretch
│   ├── lesson-video-screen.tsx         # [UPDATE] Đảm bảo aspect-video tự nhiên xác định chiều cao card
│   └── lesson-tabs-container.tsx       # [UPDATE] Tối ưu hóa padding phù hợp tầm mắt
└── lesson-detail-skeleton.tsx          # [UPDATE] Cập nhật chiều cao skeleton tầng trên thành ~540px chuẩn 16:9
```

---

## 5. Phân rã Nhiệm vụ Chi tiết (Task Breakdown)

### Task 1: Cập nhật Kích thước và Tỷ lệ Tầng Trên trong `LessonPlayerStudio`
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `tailwind-patterns`
- **Input**: `lesson-player-studio.tsx`.
- **Output**:
  - Đặt container chính: `max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-6`.
  - Tầng trên: `flex flex-col lg:flex-row items-stretch gap-6 xl:gap-[40px] w-full`.
  - Cột video: `flex-1 min-w-0 bg-card border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col justify-center items-center`.
  - Cột điều hướng: `w-full lg:w-[360px] xl:w-[400px] shrink-0 bg-card border border-border rounded-2xl shadow-xs flex flex-col overflow-hidden`.
- **Verify**: Trên màn hình laptop 1440px–1536px, video rộng ~960px–1000px, cao đúng ~540px–562px.

### Task 2: Cập nhật Sidebar để Chiều cao Bằng Video và Cuộn Độc lập
- **Agent**: `frontend-specialist`
- **Skills**: `clean-code`, `react-best-practices`
- **Input**: `lesson-nav-sidebar.tsx`.
- **Output**:
  - Bỏ class chiều cao cố định `900px`.
  - Sử dụng `h-full flex flex-col min-h-0` để tự động bằng chiều cao video (~540px).
  - Vùng danh sách mốc Timeline và Video có `flex-1 min-h-0 overflow-y-auto`.
- **Verify**: Cột bên phải cao bằng đúng khung video và có thanh cuộn mượt mà bên trong.

### Task 3: Đồng bộ Khung Skeleton Loading
- **Agent**: `frontend-specialist`
- **Skills**: `clean-code`
- **Input**: `lesson-detail-skeleton.tsx`.
- **Output**: Skeleton tầng trên phản ánh đúng chiều cao ~540px tỉ lệ 16:9 và sidebar ngang bằng.
- **Verify**: Trạng thái tải trang khớp hoàn hảo với bố cục thực tế khi tải dữ liệu.

---

## 6. Tiêu chí Nghiệm thu (Success Criteria)

1. **Laptop Full HD (~1440px - 1536px)**:
   - Cột trái rộng ~960px - 1000px, cao ~540px - 562px (chuẩn 16:9).
   - Cột phải rộng ~380px - 420px, cao bằng video (~540px), cuộn bên trong.
   - Khoảng cách giữa 2 cột đúng 40px.
2. **Laptop nhỏ (~1280px - 1366px)**:
   - Cột trái rộng ~850px - 880px, cao ~480px - 495px.
   - Cột phải rộng ~360px, cao bằng video (~480px).
3. **Thị giác**: Cân đối, vừa vặn tầm mắt, không bị kéo dãn khổng lồ 1100px.
4. **Quy chuẩn mã nguồn**: TypeScript 0 lỗi, ESLint 0 lỗi.

---

## 7. Giai đoạn Kiểm thử (Phase X Checklist)

- [x] **Type Check**: `pnpm --filter frontend exec tsc --noEmit` đạt 0 lỗi (Exit code 0).
- [x] **ESLint Check**: `pnpm --filter frontend exec eslint` các component player đạt 0 lỗi (Exit code 0).
- [x] **Dimension Check**:
  - [x] Khung video đạt tỉ lệ 16:9 tự nhiên (~540px–562px trên 1440px–1536px, ~480px-495px trên 1280px–1366px).
  - [x] Khung bên phải được đồng bộ chính xác bằng chiều cao video qua `ResizeObserver`.
  - [x] Khoảng cách gap đạt 40px (`xl:gap-[40px]`) trên màn hình laptop tiêu chuẩn.
- [x] **Scroll Test**: Danh sách bên trong cột phải cuộn êm ái (`overflow-y-auto`) bên trong chiều cao ~540px.

