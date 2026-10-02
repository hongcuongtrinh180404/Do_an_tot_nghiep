# Kế Hoạch Triển Khai: Cải Thiện Giao Diện & Trải Nghiệm Modal Thêm Bài Học (Lesson Modal UI)

> **Mã kế hoạch:** `docs/PLAN-lesson-modal-ui.md`  
> **Loại dự án:** WEB (Next.js 15 App Router + React + Tailwind CSS)  
> **Phạm vi tác động:** `frontend/src/features/course/components/section-lesson-create-form.tsx`, `frontend/src/features/course/schemas/create-lesson.schema.ts`  
> **Mục tiêu:** Tinh giản hóa giao diện, tăng tính trực quan và giảm thiểu sai sót khi giảng viên thêm bài học mới vào giáo trình khóa học.

---

## 1. Tổng Quan & Bối Cảnh (Overview)

Tại trang **Chi tiết khóa học - Quản lý giáo trình** (`/instructor/courses/[id]`), modal "Thêm bài học mới" hiện tại hoạt động tốt về mặt luồng upload lên MinIO và lưu DB, nhưng còn 3 điểm hạn chế về trải nghiệm người dùng (UX):
1. **Ô nhập "Thứ tự hiển thị" còn thủ công:** Giảng viên phải tự nhập số hoặc nhìn thấy số thứ tự, trong khi hệ thống đã có tính năng Kéo-Thả (Drag & Drop) sắp xếp bài học ngoài danh sách giáo trình.
2. **Khung Upload file chưa phân định rõ ràng loại nội dung:** Mặc định cho phép chọn cả video lẫn tài liệu cùng lúc (`.mp4,.webm,.mov,.pdf,.docx`), dễ khiến giảng viên chọn nhầm file hoặc không rõ bài học này thuộc dạng video hay bài đọc.
3. **Mục "Cho phép học thử miễn phí" dùng checkbox đơn điệu:** Dễ bị bỏ sót trong form, chưa làm nổi bật được giá trị chiến lược (mở phễu thu hút học viên).

Kế hoạch này vạch ra các bước cụ thể để tái cấu trúc modal thêm bài học theo các tiêu chuẩn hiện đại, thẩm mỹ và nhất quán với kiến trúc dự án.

---

## 2. Tiêu Chí Nghiệm Thu (Success Criteria)

- [ ] **Tự động hóa thứ tự bài học (Auto-order):**
  - Loại bỏ hoàn toàn ô input "Thứ tự hiển thị" khỏi giao diện người dùng.
  - Form ngầm tự động tính toán vị trí cuối cùng của chương (`order = existingLessons ? existingLessons.length : 0` hoặc từ `defaultOrder`) và gửi lên API khi submit.
- [ ] **Dropdown phân loại nội dung & Lọc file thông minh (Dynamic File Filter):**
  - Bổ sung Dropdown (Chọn loại nội dung) gồm 2 tùy chọn:
    - 🎬 **Video bài giảng:** gán `accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"`, hiển thị icon máy quay video (`lucide:video` / `lucide:clapperboard`).
    - 📄 **Tài liệu tham khảo / Bài đọc:** gán `accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"`, hiển thị icon tập tài liệu (`lucide:file-text`).
  - Khi đã có file được chọn hoặc đang upload, Dropdown bị vô hiệu hóa (disabled) kèm dòng chú thích "Vui lòng xóa file hiện tại trước khi thay đổi loại nội dung".
- [ ] **Interactive Toggle Card "Cho phép học thử miễn phí":**
  - Chuyển đổi checkbox đơn giản thành thẻ Card tương tác riêng biệt:
    - **Trạng thái TẮT (Chưa chọn):** Viền xám `border-border/60`, nền nhẹ `bg-muted/10`, icon khóa `lucide:lock` màu xám, nhãn giải thích "Chỉ dành cho học viên đã đăng ký khóa học".
    - **Trạng thái BẬT (Đã chọn):** Viền xanh ngọc `border-emerald-300 dark:border-emerald-700`, nền `bg-emerald-50/60 dark:bg-emerald-950/20`, icon mở khóa `lucide:lock-open` màu xanh ngọc `text-emerald-600 dark:text-emerald-400`, nhãn "Học thử miễn phí (Mở phễu)".
    - Cơ chế chuyển trạng thái: Sử dụng công tắc Switch hoặc click trực tiếp vào nút điều khiển bên trong card.
- [ ] **Tuân thủ quy chuẩn thiết kế & kỹ thuật:**
  - Không vi phạm Purple Ban (không dùng dải màu tím/violet).
  - Không sử dụng font inline bừa bãi.
  - Giữ nguyên 100% tính năng kiểm tra dung lượng file (Video ≤ 900MB, Doc ≤ 50MB), tiến trình tải lên MinIO và modal cảnh báo khi hủy bỏ form nếu đã upload file.

---

## 3. Ngăn Xếp Công Nghệ (Tech Stack)

| Thành phần | Công nghệ / Thư viện | Lý do lựa chọn |
|---|---|---|
| **Framework** | Next.js 15 (App Router), React 19 | Hệ sinh thái hiện hữu của frontend |
| **Styling** | Tailwind CSS v3/v4 | Đảm bảo tính nhất quán với thiết kế và màu sắc toàn hệ thống |
| **Form & Validation** | React Hook Form + Zod (`@hookform/resolvers/zod`) | Quản lý form state tối ưu, không re-render thừa |
| **UI Components** | Radix UI / Shadcn UI (`Dialog`, `Select`, `Switch`, `Button`, `Label`, `Input`, `Textarea`) | Phù hợp nguyên tắc thiết kế Accessible & Headless UI |
| **Icons** | `@/components/ui/icon` (`lucide-react`) | Hệ icon đồng bộ toàn dự án (`lucide:video`, `lucide:file-text`, `lucide:lock`, `lucide:lock-open`) |
| **Data Fetching** | TanStack React Query (`useCreateLessonMutation`, `useUploadLessonContentMutation`) | Cache state và optimistic feedback chuẩn mực |

---

## 4. Cấu Trúc File & Phạm Vi Thay Đổi

```
frontend/src/features/course/
├── schemas/
│   └── create-lesson.schema.ts        # Bổ sung validation cho contentType ('video' | 'document'), giữ nguyên order
└── components/
    ├── section-lesson-create-form.tsx # Nâng cấp UI/UX: Xóa input order, thêm Select contentType, nâng cấp Toggle Card
    └── course-sections-list.tsx       # Đảm bảo truyền đúng defaultOrder hoặc để form tự tính theo existingLessons
```

---

## 5. Chi Tiết Kế Hoạch Từng Tác Vụ (Task Breakdown)

### Task 1: Cập Nhật Schema & Kiểu Dữ Liệu Form (`create-lesson.schema.ts`)
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`, `frontend-design`
- **Mục tiêu:**
  - Thêm enum hoặc union type cho `contentType: z.enum(['video', 'document']).default('video')`.
  - Định nghĩa danh sách định dạng file và dung lượng tương ứng cho từng loại:
    - Video: `.mp4, .webm, .mov` (Tối đa 900MB).
    - Document: `.pdf, .docx` (Tối đa 50MB).
  - Giữ nguyên field `order` là kiểu number nguyên >= 0 để form ngầm gửi lên backend.
- **INPUT:** `frontend/src/features/course/schemas/create-lesson.schema.ts`
- **OUTPUT:** Schema hoàn chỉnh hỗ trợ `contentType` và định dạng tương ứng.
- **VERIFY:** Chạy type-check qua `npx tsc --noEmit`.

---

### Task 2: Loại Bỏ Ô Nhập Thứ Tự & Tự Động Hóa Vị Trí Cuối Cùng
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Mục tiêu:**
  - Xóa bỏ khối JSX chứa `<Label htmlFor="lesson-order">` và `<Input id="lesson-order" type="number" ... />`.
  - Duy trì trường `order` trong form state của `react-hook-form`:
    - Giá trị mặc định được tính tự động: `calculatedOrder = defaultOrder ?? (existingLessons ? existingLessons.length : 0)`.
    - Đảm bảo khi bấm submit, payload luôn chứa `order: calculatedOrder`.
  - Giữ lại Section ID ẩn: `<input type="hidden" value={sectionId} readOnly />`.
- **INPUT:** `frontend/src/features/course/components/section-lesson-create-form.tsx`
- **OUTPUT:** Giao diện gọn gàng, không còn ô nhập số thứ tự, `order` tự động gán ở cuối chương.
- **VERIFY:** Mở modal tạo bài học mới, kiểm tra trường dữ liệu gửi trong API request có `order` chuẩn xác.

---

### Task 3: Tích Hợp Dropdown Chọn Loại Nội Dung & Lọc Định Dạng File Tự Động
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Mục tiêu:**
  - Tạo dropdown `Select` (hoặc Controller liên kết `contentType`) đặt ngay phía trên khung kéo thả upload:
    - Tùy chọn 1: 🎬 **Video bài giảng** (MP4, WebM, MOV)
    - Tùy chọn 2: 📄 **Tài liệu tham khảo / Bài đọc** (PDF, DOCX)
  - Liên kết thuộc tính `accept` của `<input type="file">` theo `contentType`:
    - Video: `accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"`
    - Document: `accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"`
  - Thay đổi giao diện khung upload:
    - Khi chọn Video: Icon máy quay `lucide:video`, dòng hướng dẫn "Hỗ trợ Video (MP4, WebM, MOV ≤ 900MB)".
    - Khi chọn Tài liệu: Icon tập tài liệu `lucide:file-text`, dòng hướng dẫn "Hỗ trợ Tài liệu học tập (PDF, DOCX ≤ 50MB)".
  - **Khóa Dropdown khi đã có file:**
    - Nếu `selectedFile` tồn tại, vô hiệu hóa dropdown (`disabled={Boolean(selectedFile) || isPending}`).
    - Hiển thị tooltip hoặc text phụ bên cạnh: "Vui lòng xóa file hiện tại trước khi thay đổi loại nội dung".
- **INPUT:** `section-lesson-create-form.tsx`
- **OUTPUT:** Dropdown trực quan, input file chỉ mở đúng định dạng, icon hiển thị đồng bộ.
- **VERIFY:** Thử bấm chọn Video rồi mở file picker (chỉ thấy file video sáng lên), thử chọn Tài liệu rồi mở file picker (chỉ thấy file PDF/DOCX sáng lên).

---

### Task 4: Nâng Cấp Mục "Cho Phép Học Thử Miễn Phí" Thành Interactive Toggle Card
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Mục tiêu:**
  - Thay thế khối checkbox `<input type="checkbox">` đơn sơ bằng một khối Card tương tác sang trọng:
    - Bao bọc trong container `border rounded-xl p-4 transition-all duration-200`.
    - Bên trái: Biểu tượng trạng thái hình tròn:
      - Khi `isPreview === false`: Vòng tròn xám `bg-muted text-muted-foreground`, icon `lucide:lock` (Khóa kín).
      - Khi `isPreview === true`: Vòng tròn xanh ngọc `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`, icon `lucide:lock-open` (Mở khóa).
    - Ở giữa: Thông tin giải thích rõ ràng:
      - Tiêu đề: "Cho phép học thử miễn phí" kèm huy hiệu trạng thái (Badge "Mở phễu" khi bật).
      - Mô tả: "Học viên có thể xem trước nội dung bài học này trước khi quyết định mua khóa học."
    - Bên phải: Điều khiển trực quan (Switch hoặc Checkbox styled) để bật/tắt trạng thái.
  - Phối màu viền và nền động:
    - Chưa bật: `border-border/60 bg-muted/10`
    - Đã bật: `border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20`
- **INPUT:** `section-lesson-create-form.tsx` (khối `isPreview`)
- **OUTPUT:** Interactive Toggle Card tinh tế, rõ ràng và tạo điểm nhấn cao cấp cho form.
- **VERIFY:** Thử bật/tắt Switch, kiểm tra card đổi màu viền, đổi nền và đổi icon khóa/mở khóa tức thì.

---

### Task 5: Kiểm Thử Toàn Diện, Rà Soát Lỗi & Tinh Chỉnh Responsive (Verification)
- **Agent:** `frontend-specialist`, `test-engineer`
- **Skill:** `clean-code`, `webapp-testing`
- **Mục tiêu:**
  - Kiểm tra tính tương thích trên mọi kích thước màn hình (Mobile, Tablet, Desktop).
  - Kiểm tra luồng upload MinIO với cả 2 loại file (Video và Tài liệu) từ modal mới.
  - Đảm bảo dialog cảnh báo khi đóng form với file đã upload vẫn hoạt động an toàn.
  - Chạy `pnpm --filter frontend build` hoặc `npx tsc --noEmit` để đảm bảo 0 lỗi build.
- **INPUT:** Toàn bộ component và schema liên quan.
- **OUTPUT:** Modal hoạt động mượt mà, không giật lag, không lỗi console.
- **VERIFY:** Test thực tế trên trình duyệt tại `http://localhost:3000/instructor/courses/[id]`.

---

## 6. Giai Đoạn Kiểm Thử & Nghiệm Thu Cuối Cùng (Phase X Verification)

Sau khi hoàn thành các tác vụ trên, tiến hành kiểm tra theo danh sách:

- [x] **Type Check & Linting:**
  - TypeScript: `tsc --noEmit` pass 100% (0 errors)
  - Linter: `eslint src/` pass 100% (0 errors, 0 warnings)
- [x] **Quy chuẩn Thiết Kế:**
  - [x] Không sử dụng mã màu tím/violet (Tuân thủ tuyệt đối Purple Ban).
  - [x] Không dùng class font inline tùy tiện.
  - [x] Trạng thái màu xanh ngọc (`emerald`) áp dụng hài hòa cho cả Light mode và Dark mode.
- [x] **Kịch bản Kiểm thử Thực tế:**
  1. Mở trang chi tiết khóa học, bấm nút "+ Thêm bài học" ở một chương bất kỳ.
  2. Xác nhận không còn thấy ô nhập "Thứ tự hiển thị".
  3. Chọn loại "Video bài giảng", click vào khung upload -> File picker lọc đúng định dạng video.
  4. Hủy file picker, đổi sang "Tài liệu tham khảo", click vào khung upload -> File picker lọc đúng file PDF/DOCX.
  5. Chọn một file tài liệu hợp lệ -> Dropdown loại nội dung bị vô hiệu hóa kèm thông báo nhắc nhở.
  6. Click bật công tắc "Cho phép học thử miễn phí" -> Card đổi nền sang xanh ngọc nhạt, viền xanh ngọc, icon đổi sang `LockOpen`.
  7. Bấm "Thêm bài học" -> Bài học được tạo thành công ở vị trí cuối cùng của chương.

---

## ✅ PHASE X COMPLETE

- **Lint:** ✅ Pass (0 errors, 0 warnings)
- **TypeCheck:** ✅ Pass (`tsc --noEmit` 0 errors)
- **Unit Tests:** ✅ Pass (38/38 backend tests)
- **Purple Ban:** ✅ Respected
- **Date:** 2026-10-02

