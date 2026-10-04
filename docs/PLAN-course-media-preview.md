# PLAN: Course Media Preview & Empty State UI (Thumbnail & Trailer)

> **Mục tiêu:**
> 1. Thiết kế và triển khai giao diện khối xem trước Media (Ảnh bìa khóa học - Thumbnail & Video giới thiệu - Trailer) trên trang chi tiết khóa học dành cho giảng viên (`/instructor/courses/[id]`).
> 2. Vị trí chính xác: Ngay bên dưới khối "Nội dung mô tả chi tiết" và ngay phía trên hàng thống kê chỉ số ("Tổng số chương / Tổng bài giảng / Thời lượng học").
> 3. Tuyệt đối chỉ thay đổi Giao diện & Trải nghiệm tương tác (Pure UI / Client UX State), không can thiệp API backend, database schema hay quy trình upload lưu trữ server.
> 4. Hỗ trợ 2 trạng thái hoàn chỉnh:
>    - **Empty State (Chưa có media):** Khung viền nét đứt (dashed border) 16:9 với icon minh họa, thông báo, quy chuẩn kích thước/định dạng, nút "Tải lên ảnh bìa" / "Tải lên trailer", cho phép click trực tiếp để chọn file thử nghiệm trên client.
>    - **Populated & Interactive Preview State (Đã có media):** Hiển thị ảnh/video tỉ lệ chuẩn 16:9. Click trực tiếp vào Thumbnail mở Lightbox modal phóng to; Click vào Trailer mở Popup Video Player; Nút hành động tự động chuyển thành "Thay ảnh bìa" / "Thay video trailer".
>
> **Task Slug:** `course-media-preview`  
> **Project Type:** `WEB`  
> **Primary Agent:** `frontend-specialist`  
> **Supporting Agents:** `project-planner`

---

## 1. Phân Tích Kỹ Thuật & Kiến Trúc Giao Diện (UI/UX Analysis)

### 1.1. Vị Trí Tọa Độ Trong Cây Component
- File mục tiêu: [`course-detail-content.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-detail-content.tsx)
- Thứ tự phân cấp giao diện hiện tại:
  1. Breadcrumb & Navigation
  2. Hero Overview Card (Title, Slug, Quick Stats)
  3. Mô tả ngắn gọn (`shortDescription`)
  4. Nội dung mô tả chi tiết (`description`)
  5. **`[VỊ TRÍ MỚI]` Khối Course Media Preview (Thumbnail & Trailer)**
  6. Khối Giáo trình & Thống kê (`CourseSectionsList` bắt đầu với `CourseOverviewMetrics`: Tổng số chương / Tổng bài giảng / Thời lượng học)

### 1.2. Đặc Tả Giao Diện & Quy Cách Trực Quan

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

#### A. Khối Ảnh thu nhỏ khóa học (Course Thumbnail)
- **Tỉ lệ khung hình:** Chuẩn 16:9 (`aspect-video`), bo góc `rounded-xl`, viền tinh tế.
- **Trạng thái Empty State:**
  - Viền: `border-2 border-dashed border-slate-300 dark:border-border`
  - Nền: `bg-slate-50/80 dark:bg-muted/20 hover:bg-slate-100/80 dark:hover:bg-muted/40 transition-colors cursor-pointer`
  - Icon: `lucide:image` kích thước lớn vừa phải (`size-10 text-slate-400 dark:text-muted-foreground/60`)
  - Tiêu đề: “Chưa có ảnh bìa khóa học” (`text-sm font-semibold text-foreground`)
  - Gợi ý định dạng: “Hỗ trợ JPG, PNG, WEBP (Khuyến nghị 1280 x 720 px)” (`text-xs text-muted-foreground`)
- **Trạng thái Đã có ảnh (Populated State):**
  - Hiển thị ảnh `object-cover w-full h-full`, hiệu ứng hover nhẹ có overlay mờ và icon phóng to (`lucide:zoom-in`).
  - **Tương tác click trực tiếp:** Mở Lightbox Modal (`Dialog`) hiển thị ảnh ở kích thước tối đa sắc nét kèm nút đóng.
- **Thanh điều khiển bên dưới:**
  - Trái: Tên tệp hoặc nhãn `[Chưa chọn file]` (`text-xs text-muted-foreground italic truncate max-w-[180px]`).
  - Phải: Nút bấm `Button` biến thiên theo trạng thái:
    - Chưa có ảnh: Nhãn `"Tải lên ảnh bìa"` kèm icon `lucide:upload`.
    - Đã có ảnh: Nhãn `"Thay ảnh bìa"` kèm icon `lucide:refresh-cw`.

#### B. Khối Video giới thiệu (Course Trailer)
- **Tỉ lệ khung hình:** Chuẩn 16:9 (`aspect-video`), bo góc `rounded-xl`.
- **Trạng thái Empty State:**
  - Viền: `border-2 border-dashed border-slate-300 dark:border-border`
  - Nền: `bg-slate-50/80 dark:bg-muted/20 hover:bg-slate-100/80 dark:hover:bg-muted/40 transition-colors cursor-pointer`
  - Icon: `lucide:film` (`size-10 text-slate-400 dark:text-muted-foreground/60`)
  - Tiêu đề: “Chưa có video trailer giới thiệu” (`text-sm font-semibold text-foreground`)
  - Gợi ý định dạng: “Hỗ trợ MP4, WebM (Tối đa 100MB)” (`text-xs text-muted-foreground`)
- **Trạng thái Đã có video (Populated State):**
  - Hiển thị khung phát video (hoặc video poster với nút Play tròn mờ ở trung tâm `size-12 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-xs group-hover:scale-110 transition-transform`).
  - **Tương tác click trực tiếp:** Nhấp vào khung video sẽ mở Modal Video Player sắc nét (hoặc phát trực tiếp với các nút điều khiển play/pause/volume).
- **Thanh điều khiển bên dưới:**
  - Trái: Tên tệp hoặc nhãn `[Chưa chọn file]`.
  - Phải: Nút bấm `Button` biến thiên:
    - Chưa có video: Nhãn `"Tải lên trailer"` kèm icon `lucide:video`.
    - Đã có video: Nhãn `"Thay video trailer"` kèm icon `lucide:refresh-cw`.

### 1.3. Trải Nghiệm Tương Tác Phía Client (Client-Side Preview UX)
1. **Direct Click-to-Upload:**
   - Cả hai cách: Click trực tiếp vào khung nét đứt 16:9 **HOẶC** click nút "Tải lên..." bên dưới đều kích hoạt thẻ `<input type="file" hidden />`.
2. **Instant Preview (No Backend Call):**
   - Khi người dùng chọn file từ máy tính, component sử dụng `URL.createObjectURL(file)` để tạo blob URL tức thì.
   - Giao diện chuyển mượt mà từ khung nét đứt sang hiển thị trực tiếp ảnh/video vừa chọn.
   - Nhãn nút tự động đổi từ `"Tải lên..."` sang `"Thay..."`.
   - Có tùy chọn xoá / hủy bỏ preview quay lại Empty State để phục vụ test nghiệm thu giao diện.

---

## 2. Kế Hoạch Thực Hiện Chi Tiết (Task Breakdown)

| Task ID | Tên Nhiệm Vụ | Phân Công | Kỹ Năng / Tools | Input → Output → Verification |
| :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | Tạo component mới `CourseMediaPreview` với layout 2 cột tỉ lệ 16:9 | `frontend-specialist` | `frontend-design`, `clean-code` | **INPUT:** Yêu cầu UI Thumbnail & Trailer<br>**OUTPUT:** File [`course-media-preview.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-media-preview.tsx) chứa cấu trúc 2 khối Card<br>**VERIFY:** Render đúng khung 16:9, responsive mobile/desktop |
| **TASK-02** | Xây dựng Empty State cho Thumbnail và Trailer theo đúng design spec | `frontend-specialist` | `frontend-design`, `tailwind-patterns` | **INPUT:** Quy cách viền dashed, icon, text thông báo & kích thước<br>**OUTPUT:** Giao diện Empty State trực quan, viền nét đứt, icon chuẩn<br>**VERIFY:** Hiển thị sắc nét cả Light/Dark Mode, không vi phạm Purple Ban |
| **TASK-03** | Triển khai Client UX: Chọn file máy tính, sinh local preview & đổi nhãn nút | `frontend-specialist` | `frontend-design`, `clean-code` | **INPUT:** Sự kiện chọn file từ input/click vùng nét đứt<br>**OUTPUT:** State quản lý `previewUrl`, chuyển đổi mượt mà giữa Empty & Populated<br>**VERIFY:** Chọn file JPG/PNG hiển thị ảnh ngay; chọn MP4 hiển thị video ngay; nhãn nút đổi chính xác |
| **TASK-04** | Xây dựng Modal Lightbox xem ảnh to và Modal Video Player xem thử | `frontend-specialist` | `frontend-design` | **INPUT:** Click vào ảnh Thumbnail hoặc khung Trailer<br>**OUTPUT:** Modal phóng to ảnh và Modal xem trước video sử dụng `@/components/ui/dialog`<br>**VERIFY:** Modal mở mượt mà, đóng bằng ESC / click backdrop / nút X |
| **TASK-05** | Tích hợp `CourseMediaPreview` vào `course-detail-content.tsx` tại đúng tọa độ | `frontend-specialist` | `clean-code` | **INPUT:** Vị trí dưới Card mô tả chi tiết & trên `CourseSectionsList`<br>**OUTPUT:** Nhúng component vào [`course-detail-content.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-detail-content.tsx)<br>**VERIFY:** Tọa độ chính xác trên trang chi tiết `/instructor/courses/[id]` |
| **TASK-06** | Kiểm tra chất lượng, Responsive, Type Safety & Khả năng tương thích | `frontend-specialist` | `clean-code` | **INPUT:** Toàn bộ code vừa thêm<br>**OUTPUT:** Không có lỗi TypeScript, không linter error<br>**VERIFY:** Chạy `pnpm --filter frontend exec npx tsc --noEmit` pass 100% |

---

## 3. Kiến Trúc Tệp (File Structure Changes)

```
frontend/src/features/course/components/
├── course-media-preview.tsx          # [NEW] Khối giao diện Thumbnail & Trailer Preview
├── course-detail-content.tsx          # [MODIFY] Chèn CourseMediaPreview vào giữa description & sections
└── ...
```

---

## 4. Phase X: Kiểm Thử & Nghiệm Thu (Verification Checklist)

- [ ] **Vị trí hiển thị:** Nằm chính xác bên dưới khối "Nội dung mô tả chi tiết" và ngay phía trên thanh chỉ số "Tổng số chương / Tổng bài giảng / Thời lượng học".
- [ ] **Empty State:** Cả 2 khối Thumbnail và Trailer hiển thị khung nét đứt 16:9 đồng đều, icon và chữ hướng dẫn rõ ràng.
- [ ] **Tương tác chọn file:** Click vào khung hoặc nút "Tải lên" đều mở hộp thoại chọn file trên máy tính.
- [ ] **Client Preview:** Chọn file xong lập tức hiển thị nội dung media thực tế, nhãn nút chuyển thành "Thay ảnh bìa" / "Thay video trailer".
- [ ] **Direct Click Lightbox/Modal:**
  - Nhấp vào ảnh Thumbnail mở Modal phóng to chi tiết.
  - Nhấp vào Video Trailer mở Modal phát video xem trước.
- [ ] **Design System & A11y:** Không sử dụng mã màu tím (Purple Ban), tương thích Dark Mode, bố cục responsive không vỡ layout trên mobile.
- [ ] **Type Check:** `pnpm --filter frontend exec npx tsc --noEmit` hoàn thành với mã thoát 0.
