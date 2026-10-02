# PLAN: Tái Cấu Trúc Tỉ Lệ Bố Cục Đề Cương Khóa Học 70/30 (`curriculum-layout-ratio`)

> **Mục tiêu:**
> Điều chỉnh bố cục Split View tại giao diện chi tiết khóa học của giảng viên (`/instructor/courses/[id]`):
> 1. **Cột bên trái (Cấu trúc giáo trình / Chương & Bài học):** Chiếm **70%** chiều rộng (tăng từ ~58% hiện tại). Tạo không gian rộng rãi cho việc hiển thị cấu trúc bài học, kéo thả sắp xếp (Drag & Drop) và thao tác sửa/thêm bài.
> 2. **Cột bên phải (Bảng thông tin ngữ cảnh / Tổng quan khi click vào):** Chiếm **30%** chiều rộng (giảm từ ~42% hiện tại). Đóng vai trò là Inspector Panel tinh gọn (`sticky top-20`).
> 3. **Quyết định cấu trúc Container (Đã xác nhận):**
>    - **Giữ nguyên container hiện tại `max-w-5xl` (1024px)**: Cột trái đạt ~670px, cột phải đạt ~290px (trừ gap).
>    - Tinh chỉnh nội dung cột phải (`ContextualInspectorPanel`) để vừa vặn hoàn hảo trong bề rộng ~290px mà không bị xuống dòng vụn hoặc tràn viền.
> 4. **Responsive Mobile/Tablet:**
>    - Màn hình Desktop lớn (`>= lg`): Phân chia chính xác tỉ lệ 70% / 30% với `gap-6`.
>    - Màn hình Tablet & Mobile (`< lg`): Tự động chuyển về dạng 1 cột dọc (100% chiều rộng mỗi khối).
>
> **Task Slug:** `curriculum-layout-ratio`  
> **Plan File:** `docs/PLAN-curriculum-layout-ratio.md`  
> **Primary Agent:** `project-planner` & `frontend-specialist`  
> **Executing Agent:** `frontend-specialist`  
> **Skills:** `clean-code`, `frontend-design`, `react-best-practices`, `plan-writing`

---

## 1. Phân Tích Kỹ Thuật & Kiến Trúc Bố Cục

### 1.1. Hiện Trạng (Current State)

- File giao diện: [`course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx).
- Hệ thống Grid hiện tại sử dụng 12 cột:
  ```tsx
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    {/* CỘT TRÁI: lg:col-span-7 (~58.33%) */}
    <div className="lg:col-span-7 space-y-4">...</div>

    {/* CỘT PHẢI: lg:col-span-5 (~41.67%) */}
    <div className="lg:col-span-5 sticky top-20">...</div>
  </div>
  ```

---

### 1.2. Giải Pháp Kỹ Thuật (Architecture & Implementation)

#### Hệ Thống Grid 10 Cột Chuẩn Tailwind (70% - 30%)
- **Grid Container:**
  ```tsx
  <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
  ```
- **Cột Trái (Cấu trúc giáo trình - 70%):**
  ```tsx
  <div className="lg:col-span-7 min-w-0 space-y-4">
  ```
- **Cột Phải (Bảng tổng quan thông tin - 30%):**
  ```tsx
  <div className="lg:col-span-3 min-w-0 sticky top-20">
  ```
- Thêm `min-w-0` ở cả hai cột để ngăn ngừa hiện tượng grid blowout khi có tiêu đề dài hoặc văn bản không ngắt dòng.

#### Tối Ưu Inspector Panel Cho Chiều Rộng ~290px:
Trong [`contextual-inspector-panel.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/contextual-inspector-panel.tsx):
1. **Quick Stat Cards:**
   - Điều chỉnh padding nhẹ `p-2.5` và cỡ nhãn `text-[10px]` để các nhãn như "Số bài giảng thực tế", "Tổng thời lượng" không bị ngắt dòng chật chội.
2. **Nút Thao Tác (Action Buttons):**
   - Đảm bảo các nút "Thêm bài học" và "Sửa chương" có cỡ chữ `text-[11px]` hoặc flex layout phù hợp để icon và chữ hiển thị cân đối.
3. **Danh Sách Tài Liệu (Document Items):**
   - Tối ưu độ dài `max-w-[100px]` hoặc `truncate` hợp lý cho `displayLessonTitle` để không đè lên nhãn badge trạng thái `Học thử` / `Đã khóa`.
4. **Media Banner Bài Học:**
   - Căn chỉnh text và icon trong banner phát thử video/tài liệu bài giảng rõ ràng, sắc nét.

---

## 2. Kế Hoạch Triển Khai Chi Tiết (Task Breakdown)

### Task 1: Cập nhật tỉ lệ 70/30 trong `course-sections-list.tsx`
- **File:** [`frontend/src/features/course/components/course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx)
- **Hành động:**
  - Đổi container `grid-cols-1 lg:grid-cols-12` thành `grid-cols-1 lg:grid-cols-10`.
  - Cột trái: Giữ `lg:col-span-7` (trong grid 10 cột = 70%), thêm `min-w-0`.
  - Cột phải: Đổi `lg:col-span-5` thành `lg:col-span-3` (trong grid 10 cột = 30%), thêm `min-w-0`.
- **Verify:** Kiểm tra layout DevTools hiển thị đúng tỉ lệ 7:3.

---

### Task 2: Tối ưu hiển thị tinh gọn cho `contextual-inspector-panel.tsx`
- **File:** [`frontend/src/features/course/components/contextual-inspector-panel.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/contextual-inspector-panel.tsx)
- **Hành động:**
  - Tinh chỉnh padding thẻ Card từ `p-5` thành `p-4` để tiết kiệm diện tích cho bề ngang 30%.
  - Tinh chỉnh 2 thẻ Quick Stats: padding `p-2.5`, chữ tiêu đề `text-[10px]`, số liệu `text-sm font-bold`.
  - Tinh chỉnh hàng hiển thị tài liệu `DocumentItemWithStatus`: cấu trúc flex gọn gàng, giới hạn độ rộng nhãn bài học để không che nút "Mở tệp" / badge truy cập.
  - Tinh chỉnh nút "Thêm bài học" & "Sửa chương": font `text-xs`, padding `px-2 py-1.5` chuẩn xác.
- **Verify:** Click chọn từng Chương và Bài học; kiểm tra toàn bộ dữ liệu hiển thị vừa vặn, không có lỗi tràn viền hay thanh cuộn ngang ngoài ý muốn.

---

## 3. Ma Trận Kiểm Thử & Tiêu Chí Nghiệm Thu (Acceptance Criteria)

| Tiêu chí | Trạng thái mong muốn | Cách kiểm tra |
| :--- | :--- | :--- |
| **Tỉ lệ 70% cột trái** | Cột Cấu trúc giáo trình chiếm đúng 70% bề ngang trên `lg` viewport | Kiểm tra class `lg:col-span-7` trong `grid-cols-10` |
| **Tỉ lệ 30% cột phải** | Cột Bảng tổng quan thông tin chiếm đúng 30% bề ngang trên `lg` viewport | Kiểm tra class `lg:col-span-3` trong `grid-cols-10` |
| **Độ vừa vặn ở ~290px** | Toàn bộ thông tin chương/bài học hiển thị gọn gàng, không tràn mép | Click lần lượt vào các chương và bài học khác nhau |
| **Sticky Navigation** | Bảng 30% cố định khi cuộn trang xem danh sách chương dài | Cuộn chuột và kiểm tra `sticky top-20` |
| **Responsive Mobile** | Khi màn hình < 1024px, 2 cột chuyển thành xếp dọc 100% | Kiểm tra trên giao diện Mobile và Tablet |

---

## 4. Phân Công Agent & Quy Trình

- **Planner Agent:** `project-planner` (Đã hoàn thiện tài liệu kế hoạch).
- **Execution Agent:** `frontend-specialist` (Sẵn sàng thực thi chỉnh sửa khi người dùng duyệt).
