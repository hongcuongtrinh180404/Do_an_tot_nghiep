# PLAN: Thêm Nút Xóa Chương Học (Section Header) & Mock Confirm Dialog - Giao Diện (UI Only)

> **Mục tiêu:** Bổ sung nút icon thùng rác (Xóa chương học) vào cụm công cụ quản lý chương trên thanh tiêu đề chương (`Section Header`) ở trang Chi tiết khóa học giảng viên (`/instructor/courses/:id`), kèm theo Dialog xác nhận xóa (Mock UI) chuẩn bị sẵn sàng cho việc đấu nối API sau này.
> **Phạm vi nghiêm ngặt:** Chỉ dừng lại ở tầng hiển thị giao diện người dùng (UI/UX Styling, Micro-interactions & Dialog Shell), **tuyệt đối không can thiệp logic backend hay gọi API xóa thật**.
>
> **Task Slug:** `delete-section-ui`
> **Plan File:** `docs/PLAN-delete-section-ui.md`
> **Project Type:** `WEB`
> **Assigned Agents:** `project-planner` (lập kế hoạch), `frontend-specialist` (thực thi UI)
> **Assigned Skills:** `frontend-design`, `clean-code`

---

## 1. Tổng Quan & Yêu Cầu Giao Diện (UI Specification)

### 1.1. Vị Trí Hiển Thị (Placement)
- Nằm trong cụm công cụ hành động (`Action Buttons`) ở góc phải thanh tiêu đề mỗi thẻ chương học.
- Thứ tự hiển thị nối tiếp nhất quán:
  ```plaintext
  [ + Thêm bài ]   [ ✏️ Icon Sửa (Pencil) ]   [ 🗑️ Icon Xóa (Trash) ]
  ```
- Nút xóa được đặt ngay sau icon cây bút chì `lucide:pencil`.

### 1.2. Đặc Tả Kiểu Dáng & Tương Tác (Styling & Interaction)

| Trạng thái | Yêu cầu thiết kế | CSS Classes dự kiến |
| :--- | :--- | :--- |
| **Bình thường (Default)** | Icon button không viền, hình vuông bo góc nhẹ `8x8` (`32x32px`), màu xám nhạt hòa lẫn nền thẻ chương, không kích thích click nhầm. | `w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-colors duration-150` |
| **Icon** | Thùng rác thanh mảnh chuẩn thiết kế hiện đại | `Icon icon="lucide:trash-2" className="size-3.5"` |
| **Rê chuột (Hover)** | Nền đổi sang đỏ hồng nhạt, icon đổi sang đỏ cảnh báo nổi bật. Hỗ trợ dark mode đồng bộ. | `hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400` |
| **Tooltip** | Chú thích hành động khi hover | `title="Xóa chương học"` (hoặc Radix Tooltip) |
| **Vô hiệu hóa (Disabled/Loading)** | Khi đang xử lý (loading): mờ dần hoặc hiện spinner quay, không cho tương tác. | `disabled:opacity-50 disabled:cursor-not-allowed` + `Icon icon="lucide:loader-2" className="size-3.5 animate-spin"` |
| **Sự kiện Click** | Ngăn chặn hiện tượng lan truyền click lên thẻ cha (Accordion toggle / Select chapter), kích hoạt mở Modal xác nhận xóa mock. | `e.stopPropagation()` |

### 1.3. Mock Confirmation Dialog (`DeleteSectionDialog`)
- Hiển thị khi click vào icon thùng rác.
- Tiêu đề: **"Xóa chương học"** kèm cảnh báo: *"Hành động này sẽ xóa chương học cùng tất cả các bài học bên trong. Thao tác này không thể hoàn tác."*
- Nút:
  - **Hủy**: Đóng dialog.
  - **Xác nhận xóa**: Nút đỏ `variant="destructive"`. Khi click ở giai đoạn này: đóng modal và hiện toast thông báo UI (chưa gọi API backend).

---

## 2. Tiêu Chí Thành Công (Success Criteria)

- [ ] Nút thùng rác xuất hiện ngay bên phải icon bút chì trên tất cả các thẻ chương học trong danh sách giáo trình.
- [ ] Kích thước chuẩn `w-8 h-8 rounded-lg`, icon `lucide:trash-2` cỡ `size-3.5` cân đối với icon bút chì (`size-3.5`).
- [ ] Màu mặc định nhạt (`text-slate-400`), khi hover chuyển màu đỏ cảnh báo (`hover:bg-rose-50 hover:text-rose-600` và dark mode `dark:hover:bg-rose-950/40 dark:hover:text-rose-400`).
- [ ] Hover hiển thị tooltip `"Xóa chương học"`.
- [ ] Click vào nút xóa không làm đóng/mở Accordion của chương học (`e.stopPropagation()` hoạt động chính xác).
- [ ] Click nút xóa mở Modal xác nhận xóa `DeleteSectionDialog` với thông tin tên chương cần xóa.
- [ ] Khi gán cờ `isDeleting = true`, nút chuyển sang trạng thái disabled và hiển thị icon loading xoay `lucide:loader-2`.
- [ ] Tuyệt đối không có side-effect gọi API xóa hoặc làm hỏng logic hiện tại của các nút bên cạnh (`+ Thêm bài`, `✏️ Sửa`).

---

## 3. Ngăn Xếp Công Nghệ (Tech Stack)

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4, tuân thủ bảng màu có sẵn (Rose/Slate) và Dark Mode.
- **Icon System:** `@iconify/react` với bộ icon `lucide:trash-2` và `lucide:loader-2`.
- **UI Primitives:** `@/components/ui/dialog.tsx` và `@/components/ui/button.tsx`.

---

## 4. Danh Sách File Ảnh Hưởng (File Structure)

```plaintext
frontend/
└── src/
    └── features/
        └── course/
            └── components/
                ├── delete-section-dialog.tsx   # [MỚI] Modal xác nhận xóa chương (Mock UI Shell)
                └── course-sections-list.tsx   # [CẬP NHẬT] Thêm nút xóa vào ChapterTreeItem và state mở DeleteSectionDialog
```

---

## 5. Phân Rã Công Việc (Task Breakdown)

### Task 1: Tạo Component Mock `DeleteSectionDialog`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`
- **Priority:** `P0`
- **Dependencies:** None
- **INPUT:** Cấu trúc `Dialog` từ `@/components/ui/dialog.tsx` (tương tự như `EditSectionDialog`).
- **OUTPUT:** File `delete-section-dialog.tsx` nhận props `{ section: ISection | null, open: boolean, onOpenChange: (open: boolean) => void }`. Khi bấm "Xác nhận xóa", đóng dialog và hiển thị mock feedback (console.log / toast).
- **VERIFY:** Component render sạch sẽ, không lỗi type, layout dialog nhất quán.

---

### Task 2: Cập Nhật Interface `ChapterTreeItemProps` & Nút Xóa Trên Header
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`
- **Priority:** `P0`
- **Dependencies:** Task 1
- **INPUT:** Cụm `Action Buttons` hiện tại (dòng 161-184 trong `course-sections-list.tsx`).
- **OUTPUT:** Thêm prop `onDeleteChapter?: () => void` và chèn nút thùng rác ngay sau nút bút chì:
  ```tsx
  {/* Nút Xóa chương học (UI Only) */}
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onDeleteChapter?.();
    }}
    disabled={isDeletingChapter}
    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
    title="Xóa chương học"
    aria-label="Xóa chương học"
  >
    {isDeletingChapter ? (
      <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
    ) : (
      <Icon icon="lucide:trash-2" className="size-3.5" />
    )}
  </button>
  ```
- **VERIFY:** Nút xuất hiện đúng vị trí `[ + Thêm bài ] [ ✏️ ] [ 🗑️ ]`, hover mượt mà với Dark Mode.

---

### Task 3: Kết Nối State Mở Modal Tại `CourseSectionsList`
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`
- **Priority:** `P1`
- **Dependencies:** Task 1, Task 2
- **INPUT:** State quản lý trong `CourseSectionsList`.
- **OUTPUT:** Thêm `deleteSectionTarget: ISection | null`, truyền `onDeleteChapter={() => setDeleteSectionTarget(section)}` và đặt `<DeleteSectionDialog />` ở cuối component.
- **VERIFY:** Click icon thùng rác mở đúng modal hiển thị tên chương đó; nhấn Hủy đóng modal; Accordion của chương học không bị kích hoạt đóng/mở.

---

## 6. Giai Đoạn Kiểm Thử & Nghiệm Thu (Phase X: Final Verification)

- [x] **Kiểm tra trực quan (Visual Inspection):** Nút thùng rác xuất hiện ngay sau icon bút chì trên thẻ chương.
- [x] **Kiểm tra Hover State:** Di chuột vào icon thùng rác → background chuyển sang `rose-50`, icon chuyển `rose-600`.
- [x] **Kiểm tra Tooltip:** Giữ chuột 1 giây → hiển thị tooltip `"Xóa chương học"`.
- [x] **Kiểm tra Click Isolation:** Nhấp vào nút xóa → mở Dialog xóa `DeleteSectionDialog`, thẻ chương không bị đóng/mở (stopPropagation hoạt động).
- [x] **Dark Mode Check:** Đồng bộ màu hover nền tối (`dark:hover:bg-rose-950/40 dark:hover:text-rose-400`).
- [x] **Type Check:** Chạy `pnpm --filter frontend exec tsc --noEmit` thành công 100% không có lỗi.

## ✅ PHASE X COMPLETE

- TypeScript: ✅ Pass (`tsc --noEmit` exit 0)
- UI/UX Styling: ✅ Pass (Tailwind v4 tokens + Lucide icons + Dark Mode)
- Modal Integration: ✅ Pass (Mock `DeleteSectionDialog` shell sẵn sàng đấu nối API sau này)
- Scope Rule: ✅ Pass (Chỉ làm giao diện UI, không can thiệp logic backend)

