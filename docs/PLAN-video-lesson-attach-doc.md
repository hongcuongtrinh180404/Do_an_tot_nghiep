# PLAN: Thêm Biểu Tượng Đính Kèm Tài Liệu Cho Bài Học Video (UI Only)

> **Mục tiêu:** Bổ sung nút bấm icon nhỏ gọn ("Đính kèm tài liệu") vào mép ngoài cùng bên phải của mỗi bài học thuộc định dạng Video trong danh sách chương học (`CourseSectionsList` -> `ChapterTreeItem`), giúp giảng viên chuẩn bị thao tác đính kèm tài liệu bổ trợ/bài đọc cho bài học video.
> **Phạm vi nghiêm ngặt:** Chỉ triển khai ở tầng giao diện (UI Only) - căn chỉnh bố cục, micro-interactions, tooltip, dark mode và ngăn chặn event bubbling (`e.stopPropagation()`). **Tuyệt đối không can thiệp logic backend hay gọi API ở bước này.**
>
> **Task Slug:** `video-lesson-attach-doc`
> **Plan File:** `docs/PLAN-video-lesson-attach-doc.md`
> **Project Type:** `WEB`
> **Assigned Agents:** `project-planner` (lập kế hoạch), `frontend-specialist` (thực thi UI)
> **Assigned Skills:** `frontend-design`, `clean-code`, `tailwind-patterns`

---

## 1. Quyết Định Thiết Kế (Design Decisions sau Socratic Gate)

- **Lựa chọn Icon:** Dùng icon kẹp giấy [`lucide:paperclip`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx) - biểu tượng trực quan nhất cho tài liệu đính kèm.
- **Cơ chế hiển thị:** Luôn luôn hiển thị ở mép phải của bài học video (không ẩn khi không hover) để giảng viên dễ dàng nhận biết.
- **Tông màu Hover:** Sử dụng `hover:text-sky-600` và `dark:hover:text-sky-400` đồng bộ chuẩn với màu nhận diện video của hệ thống (`sky-600`), tránh vi phạm Purple Ban.

---

## 2. Tổng Quan & Yêu Cầu Giao Diện (UI Specification)

### 2.1. Vị Trí Hiển Thị (Placement)
- **Vị trí:** Mép ngoài cùng bên phải của bài học video trong component `ChapterTreeItem` ([`course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx)).
- **Căn hàng:** Ngang hàng với badge "Học thử" (nếu có) và nhãn thời lượng bài học (`lessonDuration` font-mono).
- **Điều kiện hiển thị:** Chỉ hiển thị khi `isVideo === true` (tức `lesson.content?.type === 'video'`). Các bài học dạng văn bản (`document`) hoặc khác không hiển thị nút này.
- **Bố cục hàng bài học (`Lesson Row`):**
  ```plaintext
  [ 🎥 Icon Video ] [ Tiêu đề bài học ] [ Badge "Học thử" ]  ...  [ Thời lượng 10:25 ]  [ 📎 Nút Đính Kèm ]
  ```

### 2.2. Đặc Tả Kiểu Dáng & Tương Tác (Styling & Interaction)

| Thuộc tính | Yêu cầu thiết kế | CSS Classes dự kiến |
| :--- | :--- | :--- |
| **Kích thước & Hình dáng** | Nút bấm nhỏ gọn (`28x28px`), căn giữa, con trỏ dạng pointer | `w-7 h-7 flex items-center justify-center cursor-pointer shrink-0` |
| **Đường viền & Đổ bóng** | Không viền, không đổ bóng, nền trong suốt | `bg-transparent` (không dùng border, outline, shadow) |
| **Hiệu ứng Hover Phóng to** | Phóng to nhẹ khi hover mượt mà | `transition duration-200 hover:scale-115` |
| **Màu Icon & Chữ** | Trung tính (`text-muted-foreground`), đậm dần khi hover (`hover:text-foreground`) | `text-muted-foreground hover:text-foreground` |
| **Icon** | Kẹp tài liệu thanh mảnh (`lucide:paperclip`) | `<Icon icon="lucide:paperclip" className="size-3.5" />` |
| **Tooltip / Title** | Gợi ý thao tác khi rê chuột | `title="Đính kèm tài liệu cho video này"` / `aria-label="Đính kèm tài liệu cho video này"` |
| **Xử lý Sự kiện Click** | Ngăn sự kiện nổi bọt (`e.stopPropagation()`) để không kích hoạt chọn bài học (`onSelectLesson`) | `onClick={(e) => { e.stopPropagation(); onAttachDocument?.(lesson); }}` |

---

## 3. Tiêu Chí Thành Công (Success Criteria)

- [ ] Biểu tượng đính kèm tài liệu hiển thị rõ ràng tại mép ngoài cùng bên phải của mọi bài học có `content.type === 'video'`.
- [ ] Không hiển thị biểu tượng này đối với các bài học không phải là video (ví dụ bài học dạng tài liệu/văn bản).
- [ ] Kích thước và styling đúng đặc tả: `w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-sky-600 flex items-center justify-center transition shadow-2xs`.
- [ ] Hỗ trợ đầy đủ Dark Mode (`dark:border-slate-800 dark:hover:bg-slate-800/80 dark:text-slate-400 dark:hover:text-sky-400`).
- [ ] Tooltip và thuộc tính `aria-label` hiển thị chính xác nội dung: `"Đính kèm tài liệu cho video này"`.
- [ ] Khi click vào nút đính kèm tài liệu:
  - Ngăn chặn nổi bọt (`e.stopPropagation()`), không làm kích hoạt chọn bài học vào Inspector panel (`onSelectLesson`).
  - Gọi callback `onAttachDocument?.(lesson)` (nếu truyền vào) an toàn.
- [ ] Bố cục dòng bài học không bị vỡ trên các kích thước màn hình (co giãn mượt mà nhờ `truncate` và `shrink-0`).
- [ ] Không có lỗi TypeScript, lint hoặc runtime error trong frontend.

---

## 4. Ngăn Xếp Công Nghệ (Tech Stack)

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4, Slate palette, Sky brand accent, Dark Mode tokens.
- **Icon Library:** `@iconify/react` với icon Lucide (`lucide:paperclip`).
- **Component:** `CourseSectionsList` ([`course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx)).

---

## 5. Danh Sách File Ảnh Hưởng (File Structure)

```plaintext
frontend/
└── src/
    └── features/
        └── course/
            └── components/
                └── course-sections-list.tsx   # [CẬP NHẬT] Thêm nút đính kèm tài liệu vào danh sách bài học video trong ChapterTreeItem
```

---

## 6. Phân Rã Công Việc (Task Breakdown)

### Task 1: Cập Nhật Props Cho `ChapterTreeItem` Trong `course-sections-list.tsx`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`
- **Priority:** `P0`
- **Dependencies:** None
- **INPUT:** Interface `ChapterTreeItemProps` tại dòng 40-54 của [`course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx).
- **OUTPUT:** Bổ sung optional callback prop `onAttachDocument?: (lesson: ILesson) => void`.
- **VERIFY:** TypeScript compile không báo lỗi missing props tại nơi gọi `ChapterTreeItem`.

---

### Task 2: Bố Trí Nút Icon Đính Kèm Tài Liệu Trong Hàng Bài Học
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`, `tailwind-patterns`
- **Priority:** `P0`
- **Dependencies:** Task 1
- **INPUT:** Vòng lặp render bài học `lessonList.map` tại dòng 225-274 của [`course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx).
- **OUTPUT:**
  - Tách hàng bài học thành 2 phần: khối thông tin bên trái (`flex items-center space-x-3 min-w-0 flex-1`) và cụm nút thao tác bên phải (`flex items-center shrink-0`).
  - Render nút bấm với icon `lucide:paperclip` khi `isVideo === true`.
  - Thiết lập `e.stopPropagation()` khi click để tránh kích hoạt `onSelectLesson`.
  - Thiết lập tooltip `title="Đính kèm tài liệu cho video này"` và `aria-label`.
- **VERIFY:** Giao diện hiển thị nút tại mép phải của bài học video, icon hiển thị sắc nét, hover đổi màu sky mượt mà.

---

### Task 3: Kiểm Thử Tương Tác & Dark Mode
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`
- **Priority:** `P1`
- **Dependencies:** Task 2
- **INPUT:** Giao diện quản lý khóa học trên cả giao diện sáng (Light) và tối (Dark).
- **OUTPUT:**
  - Click vào nút không làm đổi selection ở Inspector Panel.
  - Nút hiển thị hài hòa, không tràn khung khi tiêu đề bài học dài.
- **VERIFY:** Chạy lint / build kiểm tra không phát sinh cảnh báo.

---

## 7. Phase X: Kế Hoạch Xác Minh (Verification Checklist)

- [x] **Lint & Type Check:** Chạy `pnpm --filter frontend lint` hoặc `npx tsc --noEmit` không có lỗi.
- [x] **Giao diện Light Mode:** Nút viền `border-slate-200`, icon `text-slate-500`, hover `hover:bg-slate-100 text-sky-600`.
- [x] **Giao diện Dark Mode:** Nút viền `dark:border-slate-800`, hover `dark:hover:bg-slate-800/80 dark:text-slate-400 dark:hover:text-sky-400`.
- [x] **Sự kiện click:** Click nút không làm trigger `onSelectLesson` (được bảo vệ bởi `e.stopPropagation()`).
- [x] **Phân biệt loại bài:** Chỉ bài học video (`isVideo === true`) mới xuất hiện nút, bài học văn bản không xuất hiện.

---

## ✅ PHASE X COMPLETE

- Type-check: ✅ Pass (`npx tsc --noEmit` exited with 0)
- Lint: ✅ Pass (`pnpm lint` exited with 0, 0 errors, 0 warnings)
- Build/Runtime: ✅ Ready
- Date: 2026-10-06
