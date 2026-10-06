# PLAN: Thiết Kế Modal Upload Tài Liệu Cho Bài Học Video (UI Only)

> **Mục tiêu:** Xây dựng hộp thoại Modal (`UploadLessonDocDialog`) tối giản, tinh gọn với 2 trường nhập dữ liệu (Tên tài liệu & Khung kéo thả/chọn tệp) giúp giảng viên dễ dàng đính kèm tài liệu học tập, bài tập, slide bổ trợ cho bài học video.
> **Phạm vi nghiêm ngặt:** Chỉ triển khai tầng giao diện (UI Only) - layout modal chuẩn accessibility, form state validation cơ bản, tương tác kéo thả file (drag & drop), tự động lọc định dạng, hiển thị tệp đã chọn, đóng modal và bắn toast mock `sonner`. **Tuyệt đối không can thiệp logic backend hay gọi API upload lên MinIO/Database ở bước này.**
>
> **Task Slug:** `upload-lesson-doc-modal`
> **Plan File:** `docs/PLAN-upload-lesson-doc-modal.md`
> **Project Type:** `WEB`
> **Assigned Agents:** `project-planner` (lập kế hoạch), `frontend-specialist` (thực thi UI)
> **Assigned Skills:** `frontend-design`, `clean-code`, `tailwind-patterns`

---

## 1. Quyết Định Thiết Kế Sau Socratic Gate

- **Tự động điền tên tài liệu:** Khi người dùng kéo thả hoặc chọn file (ví dụ: `Slide_vong_lap_for.pdf`), nếu ô "Tên tài liệu" đang để trống, hệ thống sẽ tự động điền tên tệp đã loại bỏ phần mở rộng (format thành `Slide_vong_lap_for`) giúp tối ưu thao tác nhập liệu.
- **Dung lượng tối đa gợi ý:** Hiển thị chú thích rõ ràng: *"Hỗ trợ các định dạng .pdf, .docx, .zip, .rar, .pptx, .xlsx, .txt (≤ 100MB)"*.
- **Hành vi nút [ Tải lên ] (Mock UI):** Kiểm tra validation cơ bản (bắt buộc có tên và file). Khi hợp lệ, lập tức đóng modal, hiển thị Toast thông báo thành công từ `sonner` (`toast.success("Đã tải tài liệu lên thành công (Mock UI)")`), và reset form sạch sẽ.

---

## 2. Đặc Tả Giao Diện Chi Tiết (UI Specification)

### 2.1. Cấu Trúc Hộp Thoại (Modal Shell)
- **Component Primitives:** Sử dụng `@/components/ui/dialog.tsx` (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`).
- **Kích thước:** `max-w-md sm:max-w-lg w-full rounded-2xl p-6 bg-card border border-border shadow-2xl`.
- **Header:**
  - Tiêu đề (`DialogTitle`): **"Thêm tài liệu đính kèm"**
  - Mô tả phụ (`DialogDescription`): Hiển thị tên bài học video đang chọn, ví dụ: *"Đính kèm tài liệu học tập cho bài: [Tên bài học]"*.

### 2.2. Nội Dung Form (Body - 2 Trường Dữ Liệu Tối Giản)

#### Trường 1: Tên tài liệu (`title`)
- **Nhãn (`Label`):** "Tên tài liệu" kèm dấu sao đỏ bắt buộc (`*`).
- **Ô nhập (`Input`):**
  - Placeholder: `"Ví dụ: Slide bài giảng vòng lặp for, Source code mẫu..."`
  - Tự động trim khoảng trắng thừa.
  - Hiển thị thông báo lỗi nếu để trống khi submit.

#### Trường 2: Khung tải tệp (`file dropzone`)
- **Nhãn (`Label`):** "Tệp đính kèm" kèm dấu sao đỏ bắt buộc (`*`).
- **Input ẩn (`type="file"`):**
  - Thuộc tính `accept`: `".pdf,.docx,.zip,.rar,.pptx,.xlsx,.txt"`
- **Trạng thái chưa chọn file:**
  - Vùng kéo thả bo góc viền nét đứt: `border border-dashed border-border/70 hover:border-border rounded-xl p-6 text-center cursor-pointer transition-colors`.
  - Hiệu ứng kéo thả (`isDragOver`): Nền sáng nhẹ `bg-sky-500/5 border-sky-500/60`.
  - Icon: `lucide:upload-cloud` hoặc `lucide:paperclip` màu `text-muted-foreground`.
  - Văn bản:
    - *"Kéo thả tệp vào đây hoặc nhấn để chọn từ máy tính"*
    - Chú thích: *"Hỗ trợ .pdf, .docx, .zip, .rar, .pptx, .xlsx, .txt (≤ 100MB)"*
- **Trạng thái đã chọn file:**
  - Thẻ hiển thị tệp gọn gàng (`Card file preview`): Nền `bg-muted/30 border border-border/60 rounded-xl p-3 flex items-center justify-between`.
  - Bên trái: Icon tệp (`lucide:file-text`), Tên tệp (`truncate max-w-[240px] text-xs font-semibold`), Kích thước tệp (ví dụ: `2.4 MB`).
  - Bên phải: Nút gỡ tệp [ `lucide:x` ] dạng icon tròn nhỏ để người dùng có thể chọn lại tệp khác dễ dàng.

### 2.3. Chân Trang (Footer)
- **Nút [ Hủy ]:** `Button variant="outline"` đóng modal và xóa state nhập dở.
- **Nút [ Tải lên ]:** `Button` với nhãn *"Tải lên"*, icon `lucide:upload` (có sẵn prop hoặc state `isUploading` để hiện `lucide:loader-2 animate-spin` khi tích hợp đám mây sau này).

---

## 3. Tiêu Chí Thành Công (Success Criteria)

- [ ] Tạo mới component `UploadLessonDocDialog` tại `frontend/src/features/course/components/upload-lesson-doc-dialog.tsx`.
- [ ] Bấm vào biểu tượng kẹp ghim trên bất kỳ bài học video nào sẽ mở đúng modal với tiêu đề và tên bài học tương ứng.
- [ ] Form chỉ chứa đúng 2 trường: Ô nhập tên tài liệu và khung kéo thả/chọn file.
- [ ] Khung chọn file tự động lọc các định dạng hợp lệ `.pdf, .docx, .zip, .rar, .pptx, .xlsx, .txt`.
- [ ] Khi chọn file, nếu ô tên tài liệu đang trống thì tự động điền tên file (bỏ extension).
- [ ] Cho phép gỡ bỏ file đã chọn để chọn lại file mới mà không gặp lỗi.
- [ ] Nút [ Hủy ] đóng modal bình thường.
- [ ] Bấm [ Tải lên ] kiểm tra hợp lệ: nếu thiếu tên hoặc file sẽ cảnh báo lỗi; nếu hợp lệ sẽ hiển thị toast thành công và đóng modal.
- [ ] Tuân thủ đầy đủ Dark Mode, không vi phạm Purple Ban, không dùng type `any`.
- [ ] Vượt qua kiểm tra lint (`pnpm lint`) và TypeScript (`npx tsc --noEmit`) với 0 lỗi.

---

## 4. Ngăn Xếp Công Nghệ (Tech Stack)

- **Framework:** Next.js 16 (App Router) + React 19
- **Form & Validation:** `react-hook-form` hoặc local controlled React state gọn nhẹ phù hợp với UI Shell 2 trường.
- **UI Primitives:** `@/components/ui/dialog.tsx`, `@/components/ui/button.tsx`, `@/components/ui/input.tsx`, `@/components/ui/label.tsx`.
- **Icon Library:** `@iconify/react` với Lucide icons (`lucide:paperclip`, `lucide:upload-cloud`, `lucide:file-text`, `lucide:x`, `lucide:loader-2`).
- **Toast Notifications:** `sonner` (`toast.success`, `toast.error`).

---

## 5. Danh Sách File Ảnh Hưởng (File Structure)

```plaintext
frontend/
└── src/
    └── features/
        └── course/
            ├── components/
            │   ├── upload-lesson-doc-dialog.tsx  # [MỚI] Modal tải lên tài liệu đính kèm cho bài học video
            │   └── course-sections-list.tsx      # [CẬP NHẬT] Kết nối state uploadDocTargetLesson và mở modal khi click kẹp ghim
            └── index.ts                          # [CẬP NHẬT] Export UploadLessonDocDialog
```

---

## 6. Phân Rã Công Việc (Task Breakdown)

### Task 1: Khởi Tạo Component `UploadLessonDocDialog`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`, `tailwind-patterns`
- **Priority:** `P0`
- **Dependencies:** None
- **INPUT:** Giao diện Modal 2 trường dữ liệu theo đặc tả UI.
- **OUTPUT:** File `upload-lesson-doc-dialog.tsx` nhận các props:
  ```typescript
  interface UploadLessonDocDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lesson: ILesson | null;
    onSuccess?: () => void;
  }
  ```
  Quản lý state kéo thả (`dragOver`), file đã chọn (`selectedFile`), tên tài liệu (`title`), và tự động điền title từ tên file.
- **VERIFY:** Component render độc lập không phát sinh lỗi compile TypeScript.

---

### Task 2: Kết Nối Nút Kẹp Ghim Với Modal Trong `CourseSectionsList`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`
- **Priority:** `P0`
- **Dependencies:** Task 1
- **INPUT:** Callback `onAttachDocument` trên nút kẹp ghim tại `course-sections-list.tsx`.
- **OUTPUT:**
  - Khai báo state `uploadDocTargetLesson: ILesson | null` trong `CourseSectionsListContent`.
  - Khi click nút kẹp ghim: truyền `setUploadDocTargetLesson(lesson)`.
  - Render `<UploadLessonDocDialog open={Boolean(uploadDocTargetLesson)} onOpenChange={...} lesson={uploadDocTargetLesson} />`.
- **VERIFY:** Click nút kẹp ghim của bài học video bất kỳ mở modal đúng ngữ cảnh bài học đó.

---

### Task 3: Export Module & Kiểm Thử Toàn Diện
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`
- **Priority:** `P1`
- **Dependencies:** Task 2
- **INPUT:** Export component qua `frontend/src/features/course/index.ts`.
- **OUTPUT:**
  - Chạy `pnpm lint` và `npx tsc --noEmit` xác nhận 0 errors, 0 warnings.
  - Thử nghiệm các tương tác: Kéo thả file, chọn file, tự động điền tên, gỡ file, hủy modal, bấm tải lên mock toast.
- **VERIFY:** Giao diện hoạt động trơn tru, sắc nét trên cả Light và Dark mode.

---

## 7. Phase X: Kế Hoạch Xác Minh (Verification Checklist)

- [x] **Type-check:** `npx tsc --noEmit` hoàn tất không có lỗi (0 errors).
- [x] **Lint:** `pnpm lint` hoàn tất với 0 errors, 0 warnings.
- [x] **Tương tác mở modal:** Click icon kẹp ghim bài video mở đúng modal với tiêu đề "Thêm tài liệu đính kèm" (không kèm mô tả phụ theo yêu cầu).
- [x] **Khung tải file:** Lọc file đúng accept extensions; kéo thả đổi màu viền; chọn file tự động điền ô title nếu trống; nút [x] gỡ file hoạt động chuẩn.
- [x] **Thao tác hoàn tất:** Bấm [ Tải lên ] kích hoạt toast và đóng modal thành công.

---

## ✅ PHASE X COMPLETE

- Type-check: ✅ Pass (`npx tsc --noEmit` exited with 0)
- Lint: ✅ Pass (`pnpm lint` exited with 0, 0 errors, 0 warnings)
- Build/Runtime: ✅ Ready
- Date: 2026-10-06
