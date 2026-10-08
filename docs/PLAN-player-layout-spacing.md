# Kế hoạch Triển khai: Tinh chỉnh Kích thước & Khoảng cách Layout Video Player Studio

> **Tài liệu Kế hoạch Triển khai (Planning Mode - Không viết mã nguồn)**  
> **Mã kế hoạch**: `docs/PLAN-player-layout-spacing.md`  
> **Người tạo**: `project-planner`  
> **Phạm vi**: Cập nhật cấu trúc chiều cao và khoảng cách phân tầng của trang xem trước bài giảng theo sơ đồ phác thảo của người dùng:
> - Tầng trên cao `1100px`
> - Khoảng cách (gap) giữa Video và cột bên phải là `40px`
> - Chiều cao khối cột bên phải là `900px`
> - Tầng dưới là Full-width card với 3 Tab (1, 2, 3)

---

## 1. Tổng quan & Ranh giới (Scope & Boundaries)

### 1.1. Mục tiêu (Overview)
Theo bản vẽ phác thảo và yêu cầu mới từ người dùng:
1. **Tầng trên (Top Tier)**:
   - Chiều cao cố định trên màn hình Desktop: `1100px`.
   - Khoảng cách ngang giữa khung Video chính (trái) và cột điều hướng bài học (phải): đúng `40px` (`gap-[40px]`).
   - Cột điều hướng bên phải có chiều cao độc lập: `900px` (ngắn hơn khung bên trái 200px, tạo phân cấp thị giác rõ ràng).
2. **Khung Video chính (Left Block)**:
   - Nằm trong một card độc lập, bo góc mềm mại, hiển thị video trung tâm với chiều cao `1100px`.
3. **Cột điều hướng (Right Block)**:
   - Chiều cao cố định `900px`, bo góc card độc lập, 2 tab con `Timeline` và `Video`, danh sách cuộn mượt mà bên trong `900px`.
4. **Tầng dưới (Bottom Tier)**:
   - Khối Full-width card độc lập đặt bên dưới tầng trên, cách tầng trên khoảng trống thông thoáng (`mt-8` / `mt-10`).
   - Thanh Tab ngang chia 3 tab (`1`, `2`, `3`) theo đúng bản vẽ, cuộn nội dung độc lập.
5. **Cơ chế cuộn tổng thể (Viewport Scrolling)**:
   - Vì tầng trên cao `1100px` kết hợp tầng dưới `~350px-450px` (tổng chiều cao trang `~1600px`), vượt quá kích thước 1 màn hình đơn (1080p / 1440p).
   - Hệ thống chuyển từ fixed `h-screen overflow-hidden` sang chế độ cuộn trang mượt mà tự nhiên (`min-h-screen w-full overflow-y-auto bg-background`) có container giới hạn độ rộng cân đối (`max-w-[1800px] mx-auto px-6 py-6`).

### 1.2. Ranh giới (In-Scope vs Out-of-Scope)

| Tiêu chí | Trong phạm vi (IN SCOPE) | Ngoài phạm vi (OUT OF SCOPE) |
| :--- | :--- | :--- |
| **Kích thước tầng trên** | Đặt chiều cao tầng trên thành `1100px` trên màn hình lớn (Desktop/Laptop) | Thay đổi logic video player core |
| **Khoảng cách 2 cột** | Thiết lập khoảng cách chính xác `40px` (`gap-[40px]`) giữa cột Video và cột Sidebar | Can thiệp backend / API |
| **Kích thước cột phải** | Cột điều hướng có chiều cao chuẩn `900px`, cuộn nội dung danh sách bên trong card | Gắn API bình luận realtime |
| **Cơ chế cuộn trang** | Thay đổi từ locked `h-screen` sang `min-h-screen overflow-y-auto` kèm container padding | Viết code tính năng mới ngoài UI |
| **Tầng dưới 3 Tab** | Card độc lập toàn chiều rộng với 3 Tab (1, 2, 3) theo bản phác thảo | Thay đổi nội dung chi tiết của các tab |

---

## 2. Kiến trúc Layout & Sơ đồ Kích thước (Visual Architecture)

```
+----------------------------------------------------------------------------------------------------------+
| HEADER TOP BAR: Nút Quay lại | Bài 01 | Tiêu đề bài học | Trạng thái bài học                             |
+----------------------------------------------------------------------------------------------------------+
| CONTAINER NỘI DUNG: max-w-[1800px] mx-auto p-6 space-y-8                                                  |
|                                                                                                          |
| === TẦNG TRÊN (CHIỀU CAO: 1100px) ===================================================================== |
| flex flex-col lg:flex-row items-start gap-[40px]                                                         |
|                                                                                                          |
| +---------------------------------------------------------+   <-- 40px GAP -->   +---------------------+ |
| | CỘT TRÁI: VIDEO PLAYER CARD                             |                      | CỘT PHẢI: NAV CARD  | |
| | (Chiếm phần lớn chiều rộng - flex-1)                    |                      | (Chiều rộng: ~380px)| |
| | Chiều cao: 1100px                                       |                      | Chiều cao: 900px    | |
| | Rounded-2xl Card border shadow-sm                       |                      | +---------+-------+ | |
| |                                                         |                      | |Timeline | Video | | |
| |   [16:9 Cinema Player Screen]                           |                      | +---------+-------+ | |
| |   - Canvas trung tâm                                    |                      |                     | |
| |   - Bộ controls overlay: Play, ±10s, Time, Vol, Full... |                      | Danh sách Timeline  | |
| |                                                         |                      | hoặc Mục lục bài    | |
| |                                                         |                      | (Cuộn bên trong     | |
| |                                                         |                      |  thẻ cao 900px)     | |
| |                                                         |                      |                     | |
| +---------------------------------------------------------+                      +---------------------+ |
|                                                                                                          |
| === TẦNG DƯỚI (FULL-WIDTH 3 TABS CONTAINER) ============================================================ |
| mt-8 w-full rounded-2xl bg-card border border-border shadow-sm overflow-hidden                            |
| +-------------------------+-------------------------+-------------------------+                          |
| |            1            |            2            |            3            |                          |
| +-------------------------+-------------------------+-------------------------+                          |
| | Vùng nội dung hiển thị tiêu đề và placeholder trực quan                              |                  |
| +-------------------------------------------------------------------------------------+                  |
+----------------------------------------------------------------------------------------------------------+
```

---

## 3. Chi tiết Phân rã Kỹ thuật (Technical Specifications)

### 3.1. Cấu hình Container Tổng thể (`LessonPlayerStudio`)
- **Outer Shell**: `min-h-screen w-full bg-background text-foreground flex flex-col`.
- **Top Header Bar**: `h-14 shrink-0 sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border shadow-2xs`.
- **Main Content Body**: `flex-1 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8`.

### 3.2. Cấu hình Tầng trên (`Top Deck`)
- **Wrapper**: `w-full flex flex-col lg:flex-row items-start gap-[40px] lg:h-[1100px]`.
  - Trên màn hình nhỏ (`< lg`): Tự động xếp chồng dọc (`flex-col`), chiều cao tự động co giãn theo tỉ lệ video.
  - Trên màn hình lớn (`>= lg`): Nằm ngang 2 cột, chiều cao khung bao ngoài `1100px`, khoảng cách ngang chính xác `40px` (`gap-[40px]`).
- **Khung Video (Left Column)**:
  - Class: `flex-1 min-w-0 w-full lg:h-[1100px] bg-card border border-border rounded-2xl shadow-sm p-3 sm:p-6 flex flex-col justify-center items-center overflow-hidden relative`.
  - Bên trong bọc thẻ phát video tỉ lệ 16:9 với kích thước mở rộng tối đa, tạo cảm giác rạp chiếu màn hình lớn chuyên nghiệp.
- **Khung Điều hướng (Right Column)**:
  - Class: `w-full lg:w-[380px] xl:w-[420px] shrink-0 lg:h-[900px] bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden`.
  - Chiều cao cố định đúng `900px`, ngắn hơn khung video 200px như yêu cầu.
  - Header chứa 2 Tab: `Timeline` và `Video`.
  - Danh sách bài học/mốc thời gian cuộn mượt mà độc lập bên trong chiều cao 900px (`flex-1 min-h-0 overflow-y-auto`).

### 3.3. Cấu hình Tầng dưới (`Bottom Deck`)
- **Wrapper**: `w-full bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[380px]`.
- **Tab Bar**: Nằm ngang phía trên, chia làm 3 Tab đánh số hoặc đặt tên `1`, `2`, `3` (hoặc `Tab 1`, `Tab 2`, `Tab 3`) theo bản phác thảo.
- **Tab Content**: `p-6 sm:p-8 flex-1 min-h-0 flex flex-col justify-center items-center`.

---

## 4. Danh sách Tệp tin Cần Chỉnh sửa (Files to Modify)

```text
frontend/src/
├── app/
│   ├── instructor/courses/[id]/lessons/[lessonId]/
│   │   └── page.tsx                       # [UPDATE] Bỏ h-screen overflow-hidden, đổi thành min-h-screen overflow-y-auto
│   └── courses/[courseId]/lessons/[lessonId]/
│       └── page.tsx                       # [UPDATE] Đồng bộ min-h-screen overflow-y-auto
└── features/course/components/
    ├── player/
    │   ├── lesson-player-studio.tsx       # [UPDATE] Cập nhật chiều cao 1100px tầng trên, gap 40px, bố cục container
    │   ├── lesson-video-screen.tsx        # [UPDATE] Tối ưu hóa kích thước khung hình video bên trong card 1100px
    │   ├── lesson-nav-sidebar.tsx         # [UPDATE] Đặt chiều cao lg:h-[900px] và bo góc card độc lập
    │   └── lesson-tabs-container.tsx      # [UPDATE] Cập nhật bo góc card độc lập và nhãn Tab 1, 2, 3
    └── lesson-detail-skeleton.tsx         # [UPDATE] Cập nhật khung skeleton đồng bộ kích thước 1100px / 900px / gap 40px
```

---

## 5. Phân rã Nhiệm vụ Chi tiết (Task Breakdown)

### Task 1: Cập nhật Vỏ Trang (Page Shell & Viewport Scrolling)
- **Agent**: `frontend-specialist`
- **Skills**: `clean-code`, `tailwind-patterns`
- **Input**: `page.tsx` của cả 2 route giảng viên và học viên.
- **Output**:
  - Chuyển `main` từ `h-screen overflow-hidden` sang `min-h-screen w-full bg-background overflow-y-auto`.
  - Cho phép cuộn trang tổng thể khi tổng chiều cao vượt quá màn hình.
- **Verify**: Trang có thể cuộn tự nhiên từ trên xuống dưới mà không bị cắt cụt nội dung.

### Task 2: Điều chỉnh Tầng Trên (1100px Height, 40px Gap, Card Islands)
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `tailwind-patterns`
- **Input**: `lesson-player-studio.tsx`.
- **Output**:
  - Container trung tâm: `max-w-[1800px] mx-auto p-4 sm:p-6 lg:p-8`.
  - Top Deck: `flex flex-col lg:flex-row items-start gap-[40px] lg:h-[1100px]`.
  - Khung Video bên trái: `flex-1 min-w-0 lg:h-[1100px] bg-card border border-border rounded-2xl`.
- **Verify**: Khoảng cách giữa 2 cột đúng `40px`, khung video cao `1100px` trên desktop.

### Task 3: Cấu hình Khối Điều hướng Bên phải (900px Height)
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `clean-code`
- **Input**: `lesson-nav-sidebar.tsx`.
- **Output**:
  - Đặt chiều cao `lg:h-[900px]`, bo góc `rounded-2xl border border-border bg-card`.
  - Đảm bảo danh sách mốc Timeline và danh sách Video cuộn mượt mà bên trong card `900px`.
- **Verify**: Thẻ điều hướng cao đúng `900px`, ngắn hơn khung video 200px, cuộn danh sách không bị tràn.

### Task 4: Cập nhật Tầng Dưới (Full-width 3 Tabs Card)
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`
- **Input**: `lesson-tabs-container.tsx`.
- **Output**:
  - Tạo thẻ card độc lập toàn chiều rộng: `w-full rounded-2xl bg-card border border-border`.
  - Thanh Tab bar với 3 tab: Tab 1, Tab 2, Tab 3 (hoặc 1, 2, 3 tương ứng bản vẽ).
- **Verify**: Hiển thị 3 tab nằm ngang, giao diện sáng đồng bộ.

### Task 5: Đồng bộ Khung Skeleton Loading
- **Agent**: `frontend-specialist`
- **Skills**: `clean-code`
- **Input**: `lesson-detail-skeleton.tsx`.
- **Output**: Khung xương tải giả lập đúng kích thước `1100px` bên trái, `40px gap`, và `900px` bên phải.
- **Verify**: Trạng thái tải trang khớp hoàn toàn với bố cục thực tế.

---

## 6. Tiêu chí Nghiệm thu (Success Criteria)

1. **Chiều cao tầng trên**: Đạt chính xác `1100px` trên màn hình Desktop lớn.
2. **Khoảng cách 2 cột**: Đạt chính xác `40px` (`gap-[40px]`) giữa khung video và cột điều hướng.
3. **Chiều cao cột phải**: Đạt chính xác `900px`, độc lập và tự cuộn nội dung bên trong.
4. **Tầng dưới**: Là một card toàn chiều rộng với 3 tab, cách tầng trên khoảng cách cân đối.
5. **Cuộn trang tự nhiên**: Trang cuộn mượt mà từ trên xuống dưới, không bị gò bó trong `h-screen`.
6. **Màu sắc & Quy chuẩn**:
   - Giao diện Sáng (Light Theme) đồng nhất hệ thống.
   - Không chứa màu tím (Purple Ban).
   - Không chứa kiểu `any`.

---

## 7. Giai đoạn Kiểm thử & Đảm bảo Chất lượng (Phase X Checklist)

- [x] **Type Check**: `pnpm --filter frontend exec tsc --noEmit` đạt 0 lỗi (Exit status 0).
- [x] **ESLint Check**: `pnpm --filter frontend exec eslint` các component player đạt 0 lỗi (Exit status 0).
- [x] **Dimension Check**:
  - [x] Khung video đạt `1100px` trên màn hình `lg+` (`lg:h-[1100px]`).
  - [x] Khoảng cách gap đạt đúng `40px` (`gap-[40px]`).
  - [x] Khung bên phải đạt đúng `900px` (`lg:h-[900px]`).
- [x] **Scrolling Test**: Cuộn trang xem mượt mà toàn bộ các tầng nội dung (`min-h-screen overflow-y-auto`).
- [x] **Light Theme Test**: Màu nền sáng `bg-background`, thẻ `bg-card`, viền `border-border` và chữ tương phản rõ nét.

## ✅ PHASE X COMPLETE

- Typecheck: ✅ Pass
- ESLint: ✅ Pass
- Layout: ✅ 1100px Top Tier + 40px Gap + 900px Sidebar + Full-width 3 Tabs
- Date: 2026-10-08
