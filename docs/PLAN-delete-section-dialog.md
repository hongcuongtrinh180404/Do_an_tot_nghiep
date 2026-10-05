# PLAN: Tái Thiết Kế Hộp Thoại Xác Nhận Xóa Chương Học (Delete Confirmation AlertDialog)

> **Mục tiêu:** Nâng cấp hộp thoại xác nhận xóa chương học (`DeleteSectionDialog`) từ dạng modal thông thường thành chuẩn **AlertDialog (Hộp thoại xác nhận nguy hiểm)** với giao diện cảnh báo nổi bật, lớp phủ nền tối mờ (`backdrop-blur-xs`), icon tam giác cảnh báo trong vòng tròn đỏ, và cơ chế phát hiện số lượng bài học con để bôi đỏ cảnh báo nổi bật nếu chương đang có bài học (`lessons.length > 0`).
> **Phạm vi nghiêm ngặt:** Chỉ tập trung tái cấu trúc và hoàn thiện giao diện (UI/UX Styling & Micro-interactions), **tuyệt đối không can thiệp logic backend hay gọi API xóa thật**.
>
> **Task Slug:** `delete-section-dialog`
> **Plan File:** `docs/PLAN-delete-section-dialog.md`
> **Project Type:** `WEB`
> **Assigned Agents:** `project-planner` (lập kế hoạch), `frontend-specialist` (thực thi UI)
> **Assigned Skills:** `frontend-design`, `clean-code`

---

## 1. Tổng Quan & Đặc Tả Thiết Kế (AlertDialog UI Specification)

### 1.1. Lớp Phủ Nền (Backdrop Overlay)
- Nền đen mờ nhẹ tạo độ sâu, làm nổi bật hộp thoại cảnh báo ở trung tâm màn hình.
- Styling: `bg-slate-900/60 backdrop-blur-xs transition-opacity`.

### 1.2. Thân Hộp Thoại (Dialog Container)
- Kích thước nhỏ gọn, góc bo mềm mại hiện đại: `max-w-md w-full rounded-2xl bg-white dark:bg-card p-6 shadow-2xl border border-border/40`.
- Ẩn nút đóng góc trên bên phải (`showCloseButton = false`) để người dùng tập trung tuyệt đối vào 2 lựa chọn hành động bên dưới (Hủy bỏ hoặc Xác nhận).

### 1.3. Cấu Trúc Header & Icon Cảnh Báo
- **Icon Container:** Đặt ở trên cùng hoặc góc trái với hình tròn nền đỏ nhạt:
  - `w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mb-3`
  - Icon: Tam giác chấm than `lucide:alert-triangle` cỡ `size-6`.
- **Tiêu đề (Dialog Title):** In đậm, dứt khoát:
  - `"Xác nhận xóa chương học?"` (`text-lg font-bold text-foreground`).

### 1.4. Nội Dung Cảnh Báo (Dialog Body)
- **Tên chương học:** Làm nổi bật tên chương sắp bị xóa:
  - *"Bạn có chắc chắn muốn xóa chương **"{Tên_Chương}"**?"*
- **Cảnh báo dữ liệu con theo trạng thái (Conditional Data Warning):**
  - **Trường hợp A: Chương chưa có bài học nào (`lessons.length === 0`):**
    - Thông báo nhẹ nhàng: *"Chương này hiện chưa có bài học nào. Thao tác này sẽ xóa vĩnh viễn chương học khỏi đề cương."*
  - **Trường hợp B: Chương đang có bài học (`lessons.length > 0`, ví dụ 6 bài):**
    - Cảnh báo mạnh mẽ với số lượng bài học được **bôi đỏ nổi bật**:
    - *"Thao tác này sẽ xóa vĩnh viễn toàn bộ <strong class="text-rose-600 dark:text-rose-400 font-bold">{X} bài học</strong> và tài liệu đính kèm thuộc chương này. Hành động này không thể hoàn tác!"*

### 1.5. Cụm Nút Hành Động (Footer Action Buttons)
- Bố cục 2 nút rõ ràng ở cuối hộp thoại (`flex items-center justify-end gap-3 mt-6`):
  1. **Nút phụ (Bên trái):** `[ Hủy bỏ ]`
     - Nền trắng/trong suốt, viền xám nhẹ: `border border-slate-200 dark:border-border hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-slate-300 font-medium px-4 py-2 rounded-xl text-xs transition`.
     - Hành động: Đóng dialog ngay lập tức.
  2. **Nút chính (Bên phải):** `[ Xóa vĩnh viễn ]`
     - Nền đỏ rượu cảnh báo cao: `bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-xs transition`.
     - Hành động: Đóng dialog, hiển thị toast thông báo mock UI ("Chức năng xóa chương đang hoàn thiện giao diện"), **không gọi API xóa backend**.

---

## 2. Tiêu Chí Thành Công (Success Criteria)

- [ ] Lớp phủ nền hiển thị mờ đen tinh tế (`bg-slate-900/60 backdrop-blur-xs`).
- [ ] Khối hộp thoại `max-w-md w-full rounded-2xl bg-white dark:bg-card p-6 shadow-2xl` hiển thị nổi bật ở giữa màn hình.
- [ ] Icon tam giác cảnh báo `lucide:alert-triangle` đặt trong vòng tròn đỏ nhạt `w-12 h-12 rounded-full bg-rose-100 text-rose-600`.
- [ ] Tiêu đề chuẩn xác: *"Xác nhận xóa chương học?"*.
- [ ] Số lượng bài học được trích xuất chính xác từ cache React Query (`useSectionLessonsQuery`).
- [ ] Nếu chương có bài học (`lessons.length > 0`), cụm từ `"{X} bài học"` được bôi đỏ đậm (`text-rose-600 dark:text-rose-400 font-bold`).
- [ ] Nếu chương có 0 bài học, hiển thị thông điệp nhẹ nhàng tương ứng.
- [ ] 2 nút hành động `[ Hủy bỏ ]` và `[ Xóa vĩnh viễn ]` tuân thủ đúng chuẩn màu sắc và hiệu ứng hover.
- [ ] Không có nút đóng `X` ở góc trên để chuẩn hóa theo mô hình AlertDialog.
- [ ] Tuyệt đối không can thiệp backend hoặc xóa dữ liệu thật trong cơ sở dữ liệu.

---

## 3. Ngăn Xếp Công Nghệ (Tech Stack)

- **Framework:** Next.js 16 (App Router) + React 19
- **Dialog Primitives:** `@/components/ui/dialog.tsx` (hỗ trợ `overlayClassName` và `showCloseButton`)
- **Query Cache:** TanStack React Query (`useSectionLessonsQuery(section.id)`) để lấy ngay `lessons.length` từ bộ nhớ đệm
- **Icons:** `@iconify/react` với `lucide:alert-triangle`, `lucide:trash-2`
- **Styling:** Tailwind CSS v4, hỗ trợ đầy đủ Dark Mode

---

## 4. Danh Sách File Ảnh Hưởng (File Structure)

```plaintext
frontend/
├── src/
│   ├── components/
│   │   └── ui/
│   │       └── dialog.tsx                     # [CẬP NHẬT] Bổ sung prop overlayClassName vào DialogContent
│   └── features/
│       └── course/
│           └── components/
│               └── delete-section-dialog.tsx   # [CẬP NHẬT] Tái thiết kế toàn bộ theo chuẩn AlertDialog nguy hiểm
```

---

## 5. Phân Rã Công Việc (Task Breakdown)

### Task 1: Bổ sung prop `overlayClassName` cho `DialogContent`
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`
- **Priority:** `P0`
- **Dependencies:** None
- **INPUT:** `DialogContent` hiện tại trong `frontend/src/components/ui/dialog.tsx`.
- **OUTPUT:** Cho phép truyền `overlayClassName?: string` vào `<DialogOverlay className={overlayClassName} />`.
- **VERIFY:** Các dialog hiện tại không bị ảnh hưởng, `overlayClassName` tùy biến backdrop hoạt động chính xác.

---

### Task 2: Tái thiết kế component `DeleteSectionDialog` chuẩn AlertDialog
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`
- **Priority:** `P0`
- **Dependencies:** Task 1
- **INPUT:** `section: ISection | null`, `open: boolean`, `onOpenChange: (open: boolean) => void`.
- **OUTPUT:**
  - Gọi `useSectionLessonsQuery(section?.id ?? '')` để lấy `lessonList`.
  - Thiết lập `showCloseButton={false}` và `overlayClassName="bg-slate-900/60 backdrop-blur-xs"`.
  - Render icon `lucide:alert-triangle` trong container tròn `w-12 h-12 rounded-full bg-rose-100 text-rose-600`.
  - Tiêu đề: "Xác nhận xóa chương học?".
  - Phân nhánh hiển thị nội dung:
    - Nếu `lessonCount > 0`: hiển thị `<strong className="text-rose-600 dark:text-rose-400 font-bold">{lessonCount} bài học</strong>`.
    - Nếu `lessonCount === 0`: hiển thị thông báo chưa có bài học.
  - Render 2 nút: `[ Hủy bỏ ]` (outline nhẹ) và `[ Xóa vĩnh viễn ]` (`bg-rose-600 hover:bg-rose-700`).
- **VERIFY:** Hộp thoại hiển thị đúng mô tả người dùng, không lỗi type, dark mode mượt mà.

---

## 6. Giai Đoạn Kiểm Thử & Nghiệm Thu (Phase X: Final Verification)

- [x] **Kiểm tra hiển thị Backdrop:** Lớp phủ nền `bg-slate-900/60` kết hợp `backdrop-blur-xs` làm mờ nền phía sau.
- [x] **Kiểm tra Icon cảnh báo:** Icon tam giác chấm than nằm gọn trong vòng tròn `bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400`.
- [x] **Kiểm tra Chương 0 bài (Chương 2, 4):** Mở dialog tại Chương 2 $\rightarrow$ Nội dung thông báo chưa có bài học, 1 click xác nhận là xong.
- [x] **Kiểm tra Chương có bài (Chương 1 có 6 bài):** Mở dialog tại Chương 1 $\rightarrow$ Số lượng "6 bài học" được bôi đỏ đậm nổi bật rõ ràng (`<strong className="text-rose-600 ...">`).
- [x] **Kiểm tra nút [ Hủy bỏ ]:** Nhấp Hủy bỏ $\rightarrow$ Đóng dialog ngay, không phát sinh bất kỳ side effect nào.
- [x] **Kiểm tra nút [ Xóa vĩnh viễn ]:** Nhấp Xóa $\rightarrow$ Đóng dialog và hiển thị toast mock UI thông báo, không gọi API xóa backend.
- [x] **Build & Typecheck:** Chạy `pnpm --filter frontend exec tsc --noEmit` pass 100% (0 errors).
- [x] **Linting:** Chạy `pnpm --filter frontend exec eslint` pass 100% (0 errors, 0 warnings).

## ✅ PHASE X COMPLETE

- TypeScript: ✅ Pass (`tsc --noEmit` exit 0)
- ESLint: ✅ Pass (0 errors, 0 warnings)
- UI/UX Styling: ✅ Pass (Backdrop blur, Rose alert circle, dynamic count highlight, dual action footer)
- Scope Rule: ✅ Pass (Chỉ làm giao diện UI, không can thiệp logic backend)

