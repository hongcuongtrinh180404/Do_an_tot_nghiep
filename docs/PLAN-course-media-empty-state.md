# PLAN: Course Media Empty State UI (Thumbnail & Trailer Initial State)

> **Mục tiêu:**
> 1. Tái thiết kế giao diện tĩnh của khối Media (`CourseMediaPreview`) trên trang chi tiết khóa học (`/instructor/courses/[id]`) sang trạng thái **Khởi tạo ban đầu (Empty State)** khi mới tạo dự án hoặc khi chưa có ảnh bìa & video trailer.
> 2. Giữ nguyên vị trí chính xác: Ngay dưới card *"Nội dung mô tả chi tiết"* và ngay trên hàng 3 thẻ thống kê *"Tổng số chương / Tổng bài giảng / Thời lượng học"*.
> 3. Cả 2 khối nằm song song trên 1 hàng (chia 2 cột 1:1, chuẩn tỉ lệ 16:9), sử dụng khung viền nét đứt (`border-dashed border-2 border-slate-300`), icon mờ trực quan, thông báo hướng dẫn, nhãn trạng thái `[Chưa chọn file]` và nút *"Tải lên ảnh bìa"*, *"Tải lên trailer"*.
> 4. Tuyệt đối chỉ hiển thị giao diện tĩnh (Static Mockup UI), không gọi backend API hay xử lý state phức tạp.
>
> **Task Slug:** `course-media-empty-state`  
> **Project Type:** `WEB`  
> **Primary Agent:** `frontend-specialist`  
> **Supporting Agents:** `project-planner`

---

## 1. Phân Tích Kỹ Thuật & Đặc Tả Thiết Kế (UI/UX Specification)

### 1.1. Sơ Đồ Bố Cục Mockup Trực Quan

```
┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│ 🖼️ Ảnh thu nhỏ khóa học (Thumbnail)          │ │ 🎬 Video giới thiệu (Trailer)                │
│                                              │ │                                              │
│ ┌ - - - - - - - - - - - - - - - - - - - - -┐ │ │ ┌ - - - - - - - - - - - - - - - - - - - - -┐ │
│                 [ 🖼️ Icon ]                  │ │                 [ 🎬 Icon ]                  │
│          Chưa có ảnh bìa khóa học            │ │       Chưa có video trailer giới thiệu       │
│           (Khuyến nghị 16:9)                 │ │          (Định dạng MP4, WebM)               │
│ └ - - - - - - - - - - - - - - - - - - - - -┘ │ │ └ - - - - - - - - - - - - - - - - - - - - -┘ │
│                                              │ │                                              │
│  [Chưa chọn file]      [⬆️ Tải lên ảnh bìa]   │ │  [Chưa chọn file]      [🎥 Tải lên trailer]  │
└──────────────────────────────────────────────┘ └──────────────────────────────────────────────┘
```

### 1.2. Chi Tiết Khối 1: Ảnh thu nhỏ (Thumbnail) - Empty State
- **Card Wrapper:** `Card` với `border-border/50 bg-card/60 shadow-xs`.
- **CardHeader:**
  - Tiêu đề: `Ảnh thu nhỏ (Thumbnail)` kèm icon `lucide:image`.
- **Khung hiển thị tỉ lệ 16:9 (`aspect-video`):**
  - Viền nét đứt: `border-2 border-dashed border-slate-300 dark:border-border`
  - Nền: `bg-slate-50/90 dark:bg-muted/20 hover:bg-slate-100/70 dark:hover:bg-muted/40 transition-colors`
  - Bo góc: `rounded-xl`
  - Nội dung căn giữa (`flex flex-col items-center justify-center p-6 text-center`):
    - Icon mờ: `lucide:image` kích thước vừa phải (`size-10 text-slate-400 dark:text-muted-foreground/50 mb-2`)
    - Dòng chữ thông báo: *"Chưa có ảnh bìa khóa học"* (`text-sm font-semibold text-foreground`)
    - Ghi chú kích thước: *"Hỗ trợ JPG, PNG, WEBP (Khuyến nghị 1280 x 720 px)"* (`text-xs text-muted-foreground mt-1`)
- **Thanh chân thẻ (Footer / Actions):**
  - Bên trái: `Chưa chọn file` (`text-xs text-muted-foreground italic font-normal`)
  - Bên phải: Nút bấm tĩnh `Button` với nhãn `Tải lên ảnh bìa` kèm icon `lucide:upload` (`border-border/60 shadow-xs hover:bg-muted/60`).

### 1.3. Chi Tiết Khối 2: Video giới thiệu (Trailer) - Empty State
- **Card Wrapper:** `Card` với `border-border/50 bg-card/60 shadow-xs`.
- **CardHeader:**
  - Tiêu đề: `Video giới thiệu (Trailer)` kèm icon `lucide:film`.
- **Khung hiển thị tỉ lệ 16:9 (`aspect-video`):**
  - Viền nét đứt: `border-2 border-dashed border-slate-300 dark:border-border`
  - Nền: `bg-slate-50/90 dark:bg-muted/20 hover:bg-slate-100/70 dark:hover:bg-muted/40 transition-colors`
  - Bo góc: `rounded-xl`
  - Nội dung căn giữa (`flex flex-col items-center justify-center p-6 text-center`):
    - Icon mờ: `lucide:film` kích thước vừa phải (`size-10 text-slate-400 dark:text-muted-foreground/50 mb-2`)
    - Dòng chữ thông báo: *"Chưa có video trailer giới thiệu"* (`text-sm font-semibold text-foreground`)
    - Ghi chú định dạng: *"Hỗ trợ MP4, WebM (Tối đa 100MB)"* (`text-xs text-muted-foreground mt-1`)
- **Thanh chân thẻ (Footer / Actions):**
  - Bên trái: `Chưa chọn file` (`text-xs text-muted-foreground italic font-normal`)
  - Bên phải: Nút bấm tĩnh `Button` với nhãn `Tải lên trailer` kèm icon `lucide:video` (`border-border/60 shadow-xs hover:bg-muted/60`).

---

## 2. Kế Hoạch Thực Hiện Chi Tiết (Task Breakdown)

| Task ID | Tên Nhiệm Vụ | Phân Công | Kỹ Năng / Tools | Input → Output → Verification |
| :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | Cập nhật cấu trúc `CourseMediaPreview` sang giao diện Empty State | `frontend-specialist` | `frontend-design`, `clean-code` | **INPUT:** Yêu cầu viền dashed, icon mờ, text thông báo & nút Tải lên<br>**OUTPUT:** File [`course-media-preview.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-media-preview.tsx) được cập nhật hoàn toàn sang Empty State<br>**VERIFY:** Khung 16:9 hiển thị viền nét đứt `border-dashed border-2 border-slate-300`, nền `bg-slate-50` |
| **TASK-02** | Đồng bộ nhãn trạng thái và nút hành động bên dưới | `frontend-specialist` | `frontend-design` | **INPUT:** Nhãn `[Chưa chọn file]` bên trái, `Tải lên ảnh bìa` & `Tải lên trailer` bên phải<br>**OUTPUT:** Thanh footer bên dưới mỗi card hiển thị đúng 2 thành phần đối xứng<br>**VERIFY:** Nhãn text chính xác, icon `lucide:upload` và `lucide:video` hiển thị sắc nét |
| **TASK-03** | Kiểm tra hiển thị responsive và Dark Mode | `frontend-specialist` | `tailwind-patterns` | **INPUT:** Component vừa cập nhật<br>**OUTPUT:** Hiển thị hài hòa trên cả giao diện sáng & tối, không vi phạm Purple Ban<br>**VERIFY:** Kiểm tra contrast WCAG AA, viền và text tương phản rõ ràng |
| **TASK-04** | Kiểm tra TypeScript compilation | `frontend-specialist` | `clean-code` | **INPUT:** Mã nguồn sửa đổi<br>**OUTPUT:** Không có lỗi cú pháp hoặc kiểu dữ liệu<br>**VERIFY:** Chạy `pnpm --filter frontend exec npx tsc --noEmit` pass 100% |

---

## 3. Danh Sách Tệp Tác Động (File Impact)

- **Chỉnh sửa:** [`frontend/src/features/course/components/course-media-preview.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-media-preview.tsx)
- **Giữ nguyên:** [`frontend/src/features/course/components/course-detail-content.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-detail-content.tsx) (đã liên kết sẵn tại đúng vị trí).

---

## 4. Phase X: Kiểm Thử & Nghiệm Thu (Verification Checklist)

- [x] **Khung hiển thị Thumbnail:** Viền nét đứt `border-dashed border-2 border-slate-300`, nền `bg-slate-50`, icon `lucide:image` mờ, thông báo *"Chưa có ảnh bìa khóa học"*, ghi chú kích thước khuyến nghị.
- [x] **Khung hiển thị Trailer:** Viền nét đứt `border-dashed border-2 border-slate-300`, nền `bg-slate-50`, icon `lucide:film` mờ, thông báo *"Chưa có video trailer giới thiệu"*, ghi chú định dạng MP4/WebM.
- [x] **Thanh footer mỗi khối:** Hiển thị `[Chưa chọn file]` bên trái, nút `"Tải lên ảnh bìa"` và `"Tải lên trailer"` bên phải.
- [x] **Tỉ lệ khung hình:** Giữ vững tỉ lệ 16:9 (`aspect-video`) đồng bộ giữa 2 khối.
- [x] **Vị trí hiển thị:** Nằm dưới Card mô tả chi tiết và trên hàng 3 thẻ thống kê.
- [x] **TypeScript Check:** `pnpm --filter frontend exec npx tsc --noEmit` thoát mã 0.
