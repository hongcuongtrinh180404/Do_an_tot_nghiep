# PLAN: Thêm Nút Thùng Rác (Xóa Bài Học / Tài Liệu) Trên Mỗi Dòng Giáo Trình (UI Only)

> **Mục tiêu:** Bổ sung nút bấm thùng rác tinh giản (`trash-2`) vào mép ngoài cùng bên phải của mỗi dòng bài học (video hoặc tài liệu) trong danh sách cây giáo trình (`CourseSectionsList` -> `ChapterTreeItem`), tạo vị trí thao tác xóa trực quan, đồng bộ trải nghiệm người dùng với nút ghim kẹp tài liệu và nút xóa chương.
> **Phạm vi nghiêm ngặt:** Chỉ dừng lại ở tầng giao diện (UI Only) - thiết lập layout, styling, hiệu ứng micro-interaction hover, tooltip phân biệt theo loại nội dung (video / document), và chặn click lan truyền (`e.stopPropagation()`). **Tuyệt đối chưa gọi API hay xử lý logic xóa ở giai đoạn này.**
>
> **Task Slug:** `lesson-trash-ui`
> **Plan File:** `docs/PLAN-lesson-trash-ui.md`
> **Project Type:** `WEB`
> **Assigned Agents:** `project-planner` (lập kế hoạch), `frontend-specialist` (thực thi giao diện)
> **Assigned Skills:** `frontend-design`, `clean-code`, `tailwind-patterns`

---

## 1. Quyết Định Thiết Kế & Phân Tích Hiện Trạng

### 1.1. Hiện trạng cây phân cấp bài học
Trong file [`course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx), danh sách bài học (`lessonList.map`) hiển thị:
1. **Bài học Video (`isVideo === true`)**:
   - Icon video (`lucide:video`), tiêu đề bài học, badge "Học thử" (nếu có), nhãn thời lượng (`0p`).
   - Đang có nút đính kèm tài liệu Paperclip (`lucide:paperclip`) nằm ở mép phải (`ml-2.5`).
2. **Bài học Tài liệu (`isVideo === false`, dạng Document)**:
   - Icon tài liệu (`lucide:file-text`), tiêu đề tài liệu, badge "Học thử", nhãn thời lượng/dung lượng (`0p`).
   - Chưa có nút hành động phụ nào ở phía bên phải.

### 1.2. Vị trí hiển thị nút Thùng rác
- **Đối với dòng Bài học (Video):**
  - Nằm ở mép ngoài cùng bên phải, ngay sau nút ghim kẹp tài liệu (`Paperclip`):
  ```plaintext
  [ 🎥 Tên bài học ]  [ Badge Học thử ]  ...  [ 0p ]  [ 📎 Ghim ]  [ 🗑️ Thùng rác ]
  ```
- **Đối với dòng Tài liệu (Document):**
  - Nằm ở vị trí mép ngoài cùng bên phải tương ứng (sau badge và thời lượng `0p`):
  ```plaintext
  [ 📄 Tên tài liệu ]  [ Badge Học thử ]  ...  [ 0p ]               [ 🗑️ Thùng rác ]
  ```

### 1.3. Bảng Đặc Tả Styling & Tương Tác (Tối Giản, Tránh Rối Mắt)

| Thuộc tính | Yêu cầu thiết kế | Lựa chọn triển khai (Tailwind CSS) |
| :--- | :--- | :--- |
| **Bố cục nhóm nút (Action Group)** | Căn phải, hàng ngang, khoảng cách đều giữa các nút | `flex items-center gap-1 ml-2.5 shrink-0` |
| **Kích thước nút** | Vuông gọn gàng (`28x28px`), căn giữa icon, cursor pointer | `w-7 h-7 flex items-center justify-center shrink-0 cursor-pointer` |
| **Đường viền & Nền** | Trong suốt, không viền, không outline, không shadow | `bg-transparent border-0 outline-none` |
| **Màu Icon & Trạng thái** | Xám nhạt trung tính ở trạng thái thường, chuyển đỏ nhạt/hồng khi hover | `text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400` |
| **Hiệu ứng Micro-interaction** | Đổi màu chữ/icon mượt mà khi hover (không zoom) | `transition-colors duration-150` |
| **Kích thước Icon** | Nhỏ gọn thanh lịch | `<Icon icon="lucide:trash-2" className="size-3.5 sm:size-4" />` |
| **Tooltip (`title` & `aria-label`)** | Phân biệt rõ ngữ cảnh: Video -> "Xóa bài học", Document -> "Xóa tài liệu" | `isVideo ? 'Xóa bài học' : 'Xóa tài liệu'` |
| **Quy tắc an toàn UX** | Ngăn sự kiện nổi bọt để không kích hoạt mở Inspector Panel bên phải | `onClick={(e) => { e.stopPropagation(); onDeleteLesson?.(lesson); }}` |

---

## 2. Tiêu Chí Thành Công (Success Criteria)

- [ ] **Hiển thị đúng vị trí:**
  - Trên dòng bài học Video: Nút thùng rác nằm ngay sau nút Paperclip.
  - Trên dòng bài học Tài liệu: Nút thùng rác nằm ở mép ngoài cùng bên phải, dóng hàng thẳng cột với dòng video.
- [ ] **Chuẩn styling & micro-animation:**
  - Nút phẳng hoàn toàn, trong suốt không viền (`bg-transparent border-0 outline-none`).
  - Màu icon chuyển từ `text-slate-400` sang `text-rose-600` (hoặc `dark:hover:text-rose-400`) khi hover với hiệu ứng chuyển màu mượt mà (không zoom to).
- [ ] **Tooltip chính xác:**
  - Rê chuột vào bài học Video hiển thị: `"Xóa bài học"`.
  - Rê chuột vào bài học Tài liệu hiển thị: `"Xóa tài liệu"`.
- [ ] **Bảo vệ UX (Chặn lan truyền sự kiện):**
  - Click vào nút thùng rác **tuyệt đối không** kích hoạt sự kiện `onSelectLesson(lesson)` (không đổi selection trên Inspector Panel bên phải).
- [ ] **An toàn giao diện (Responsive & Clean):**
  - Tiêu đề bài học dài được cắt gọn (`truncate`) mượt mà, không đẩy cụm nút hành động vỡ dòng.
  - Không có lỗi biên dịch TypeScript, không lỗi Lint.

---

## 3. Ngăn Xếp Công Nghệ & Thành Phần (Tech Stack)

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4, Slate palette, Rose accent (cho thao tác nguy hiểm/xóa), Dark mode support
- **Icons:** `@iconify/react` với icon Lucide (`lucide:trash-2`, `lucide:paperclip`)
- **Target Component:** [`course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx) (cụ thể là component con `ChapterTreeItem`)

---

## 4. Cấu Trúc File & Vùng Ảnh Hưởng (File Structure)

```plaintext
frontend/
└── src/
    └── features/
        └── course/
            └── components/
                └── course-sections-list.tsx   # [CHỈNH SỬA DUY NHẤT] Cập nhật ChapterTreeItemProps và render nút thùng rác
```

---

## 5. Phân Rã Công Việc (Task Breakdown)

### Task 1: Mở rộng Interface Props cho `ChapterTreeItem`
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`
- **Priority:** `P0`
- **Dependencies:** None
- **INPUT:** Interface `ChapterTreeItemProps` trong [`course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx#L45-L67).
- **OUTPUT:** Thêm optional callback:
  ```ts
  onDeleteLesson?: (lesson: ILesson) => void;
  ```
- **VERIFY:** TypeScript type-check thông qua, không làm ảnh hưởng các component cha đang gọi `ChapterTreeItem`.

---

### Task 2: Tái cấu trúc cụm nút hành động bên phải mỗi dòng bài học
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `tailwind-patterns`
- **Priority:** `P0`
- **Dependencies:** Task 1
- **INPUT:** Vòng lặp render bài học `lessonList.map` tại dòng 230-295 trong [`course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx).
- **OUTPUT:**
  - Nhóm nút thao tác bên phải vào thẻ `div` bọc chung có class `flex items-center gap-1 ml-2.5 shrink-0`.
  - Giữ nút đính kèm tài liệu `lucide:paperclip` cho bài học video.
  - Bổ sung nút bấm thùng rác `lucide:trash-2` cho cả bài học video lẫn bài học tài liệu.
  - Áp dụng class styling:
    ```tsx
    className="w-7 h-7 bg-transparent border-0 outline-none text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 flex items-center justify-center cursor-pointer transition-colors duration-150 shrink-0"
    ```
  - Cấu hình tooltip linh hoạt:
    ```tsx
    title={isVideo ? 'Xóa bài học' : 'Xóa tài liệu'}
    aria-label={isVideo ? 'Xóa bài học' : 'Xóa tài liệu'}
    ```
  - Xử lý click:
    ```tsx
    onClick={(e) => {
      e.stopPropagation();
      onDeleteLesson?.(lesson);
    }}
    ```
- **VERIFY:** Nút thùng rác xuất hiện đều ở mép phải của cả 2 định dạng bài học (Video và Document). Dòng Video có 2 nút [📎] [🗑️], dòng Document có 1 nút [🗑️].

---

### Task 3: Kiểm thử tương tác giao diện & Ngăn chặn nổi bọt (Stop Propagation)
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`, `webapp-testing`
- **Priority:** `P1`
- **Dependencies:** Task 2
- **INPUT:** Trình duyệt tại trang `http://localhost:3000/instructor/courses/6abf0202885b2bce17b4482e`.
- **OUTPUT:**
  - Thử click trực tiếp vào nút thùng rác: Kiểm tra panel bên phải giữ nguyên không bị chọn sang bài học khác (`e.stopPropagation()` hoạt động hoàn hảo).
  - Hover chuột vào nút: Icon phóng to nhẹ và đổi sang màu đỏ `rose-600`.
  - Kiểm tra trên cả Light Mode và Dark Mode.
- **VERIFY:** Không phát sinh bất kỳ lỗi console hoặc vỡ layout nào.

---

## 6. Phase X: Kế Hoạch Xác Minh (Verification Checklist)

- [x] **Kiểm tra vị trí dòng Video:** Icon Paperclip [📎] nằm trước Icon Thùng rác [🗑️].
- [x] **Kiểm tra vị trí dòng Document:** Chỉ có Icon Thùng rác [🗑️] tại mép ngoài cùng bên phải, thẳng hàng với cột nút của video.
- [x] **Kiểm tra Tooltip:**
  - Dòng video hiển thị tooltip: `"Xóa bài học"`.
  - Dòng tài liệu hiển thị tooltip: `"Xóa tài liệu"`.
- [x] **Kiểm tra Styling & Hover:**
  - Trạng thái bình thường: Trong suốt không viền, icon màu `slate-400`.
  - Trạng thái hover: Chuyển màu `rose-600`, scale 115%.
- [x] **Kiểm tra `e.stopPropagation()`:** Click vào nút không kích hoạt `onSelectLesson`.
- [x] **Type-check & Lint:** `npx tsc --noEmit` và `pnpm --filter frontend lint` đạt 100% pass không có lỗi.
- [x] **Phạm vi code:** Tuyệt đối không can thiệp API backend hay logic xóa dữ liệu ở bước này.

---

## ✅ PHASE X COMPLETE

- Type-check: ✅ Pass (`npx tsc --noEmit` exit code 0)
- Lint: ✅ Pass (`pnpm --filter frontend lint` exit code 0)
- UI Implementation: ✅ Hoàn thành đúng theo yêu cầu thiết kế và ảnh mẫu
- Date: 2026-10-06
