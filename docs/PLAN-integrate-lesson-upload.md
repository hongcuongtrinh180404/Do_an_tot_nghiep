# Kế hoạch Triển khai: Integrate Lesson Content Upload với Create Lesson

> **Mục tiêu**: Tích hợp hạ tầng upload file Cloudinary (Milestone 24) vào luồng tạo bài học của `SectionLessonCreateForm` (Milestone 23). Hỗ trợ tạo bài học kèm video/document thật hoặc bài học không kèm nội dung (`content: null`). Đảm bảo nguyên tắc: **Upload file ≠ Create Lesson**, không bao giờ silently ignore file đã chọn, và không upload lại file nếu bước tạo bài học gặp lỗi cần retry.

---

## 1. Tổng quan & Ranh giới (Scope & Boundaries)

| Tiêu chí | Phạm vi Milestone này (IN SCOPE) | Ngoài phạm vi (OUT OF SCOPE) |
| :--- | :--- | :--- |
| **Component tác động** | `frontend/src/features/course/components/section-lesson-create-form.tsx`<br>`frontend/src/features/course/schemas/create-lesson.schema.ts` | Backend API / Controller (giữ nguyên 100%) |
| **Hooks tái sử dụng** | `useUploadLessonContentMutation` (`lesson-content.api.ts`)<br>`useCreateLessonMutation` (`course.api.ts`)<br>`useSectionLessonsQuery` | Tạo thêm custom hook hoặc API client mới |
| **Hợp đồng dữ liệu** | `ICreateLessonPayload`, `ILessonContent`, `CreateLessonFormData` | Chỉnh sửa schema MongoDB hoặc DTO backend |
| **State Machine** | `IDLE` → `UPLOADING` → `UPLOADED` → `CREATING` → `SUCCESS`<br>Nhánh lỗi: `UPLOAD_ERROR`, `CREATE_ERROR` | Xử lý upload theo chunk, resume upload |
| **Tương tác modal** | Chặn đóng khi đang upload/tạo bài; hiện `AlertDialog` xác nhận nếu file đã upload nhưng chưa lưu | Cleanup asset orphan trên Cloudinary tự động |
| **Tính năng mở rộng** | Không có | Video player, AI processing, RabbitMQ, Mindmap, Quiz |

---

## 2. Thiết kế State Machine & Luồng Dữ liệu (State Machine & Data Flow)

### 2.1. Các trạng thái của Form (`uploadStatus`)

```text
[IDLE]
  │
  ├── (User chọn file hợp lệ) ──> [UPLOADING]
  │                                   │
  │                     ┌─────────────┴─────────────┐
  │                     ▼                           ▼
  │              [UPLOAD_ERROR]               [UPLOADED]
  │               (Thử lại/Xóa)                     │
  │                     │                           ├── (User bấm "Thêm bài học") ──> [CREATING]
  │                     │                           │                                    │
  ├── (User submit k có file)                       │                     ┌──────────────┴──────────────┐
  │                     │                           │                     ▼                             ▼
  ▼                     ▼                           ▼              [CREATE_ERROR]                   [SUCCESS]
  └─────────────────────┴───────────────────────────┘             (Sửa & Gửi lại -             (Invalidate cache,
                                                                   k upload lại file)          đóng modal, reset)
```

### 2.2. Chi tiết từng trạng thái

1. **`IDLE`**:
   - Trạng thái ban đầu khi mở dialog hoặc sau khi người dùng bấm nút "Xóa file".
   - Cho phép nhập tiêu đề, mô tả, thứ tự, checkbox `isPreview`.
   - Nếu bấm "Thêm bài học", gửi payload với `content: null`.
2. **`UPLOADING`**:
   - Bắt đầu ngay khi người dùng chọn hoặc kéo-thả file hợp lệ.
   - Disable nút "Thêm bài học", nút "Hủy", và ngăn chặn mọi thao tác đóng Dialog (X, backdrop, Escape).
   - Hiển thị spinner và nhãn `"Đang tải lên Cloudinary..."`.
3. **`UPLOADED`**:
   - Cloudinary upload thành công, state lưu trữ `uploadedContent: ILessonContent`.
   - Hiển thị thẻ file với badge thành công ("Đã tải lên"), icon checkmark, tên file, dung lượng.
   - Nút chọn file mới bị khóa: Người dùng phải bấm nút thùng rác "Xóa file" để trở về `IDLE` nếu muốn đổi file khác.
   - Nút "Thêm bài học" được kích hoạt trở lại.
   - Nếu người dùng cố đóng Dialog lúc này: Kích hoạt `AlertDialog` cảnh báo file đã tải lên nhưng chưa được lưu vào bài học.
4. **`UPLOAD_ERROR`**:
   - Upload Cloudinary thất bại hoặc lỗi kết nối.
   - Giữ nguyên toàn bộ dữ liệu form (title, description, order, isPreview).
   - Hiển thị thông báo lỗi màu đỏ kèm nút `[Thử lại]` và nút `[Xóa file]`.
   - Nút "Thêm bài học" bị **disable** để tuyệt đối không có tình trạng silently ignore file đã chọn.
5. **`CREATING`**:
   - Người dùng bấm "Thêm bài học".
   - Disable nút submit, hiển thị icon spinner + nhãn `"Đang thêm..."`.
   - Chặn đóng dialog và chặn thao tác xóa file.
   - Gửi `ICreateLessonPayload` với `content: uploadedContent || null`.
6. **`CREATE_ERROR`**:
   - API tạo bài học trả về lỗi (400, 403, 500, v.v.).
   - Dialog giữ nguyên mở, form data được bảo toàn.
   - **`uploadedContent` được giữ nguyên vẹn**, người dùng có thể bấm submit lại ngay mà không phải upload lại file lên Cloudinary!
7. **`SUCCESS`**:
   - `useCreateLessonMutation` invalidate query cache `courseKeys.lessons(sectionId)`.
   - Toast thông báo thành công.
   - Đóng dialog và reset form về trạng thái ban đầu.

---

## 3. Kiến trúc Frontend & Component Breakdown

### 3.1. Cập nhật `create-lesson.schema.ts`
- Cập nhật danh sách phần mở rộng hợp lệ:
  ```ts
  export const ACCEPTED_LESSON_FILE_EXTENSIONS = '.mp4,.webm,.mov,.pdf,.docx';
  ```
  *(Đã loại bỏ định dạng `.doc` cũ theo thống nhất kiến trúc ở Milestone 24).*
- Định nghĩa các giới hạn dung lượng:
  - Video (mp4, webm, mov): tối đa 900MB.
  - Document (pdf, docx): tối đa 50MB.

### 3.2. Cập nhật `SectionLessonCreateForm` (`section-lesson-create-form.tsx`)
- Tích hợp 2 hook mutation:
  ```ts
  const createLessonMutation = useCreateLessonMutation(sectionId);
  const uploadMutation = useUploadLessonContentMutation();
  ```
- Quản lý state bổ sung:
  ```ts
  const [uploadedContent, setUploadedContent] = useState<ILessonContent | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'UPLOADING' | 'UPLOADED' | 'UPLOAD_ERROR'>('IDLE');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  ```
- File Handler:
  - `handleFileSelected(file: File)`: Validate định dạng và dung lượng ngay tại client. Nếu hợp lệ, tự động kích hoạt `uploadMutation.mutateAsync(file)`.
  - `handleRetryUpload()`: Gọi lại `uploadMutation.mutateAsync(selectedFile)`.
  - `handleRemoveFile()`: Reset `selectedFile = null`, `uploadedContent = null`, `uploadStatus = 'IDLE'`.
- Submit Handler:
  - Kiểm tra nếu `uploadStatus === 'UPLOADING'` hoặc `uploadStatus === 'UPLOAD_ERROR'` thì chặn submit.
  - Gửi payload:
    ```ts
    await createLessonMutation.mutateAsync({
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      order: data.order,
      content: uploadedContent ?? null,
      isPreview: data.isPreview,
    });
    ```
- Dialog Close Interceptor:
  - Khi đang `UPLOADING` hoặc `createLessonMutation.isPending`: Ngăn chặn đóng.
  - Khi `uploadStatus === 'UPLOADED'`: Mở `AlertDialog` cảnh báo trước khi cho phép đóng.

---

## 4. Kế hoạch Chi tiết Từng Tác vụ (Task Breakdown)

### Tác vụ 1: Cập nhật Schema & Giới hạn File phía Frontend
- **Agent**: `frontend-specialist`
- **Kỹ năng**: `clean-code`
- **Độ ưu tiên**: P1
- **File**: `frontend/src/features/course/schemas/create-lesson.schema.ts`
- **Nội dung**:
  - Cập nhật `ACCEPTED_LESSON_FILE_EXTENSIONS = '.mp4,.webm,.mov,.pdf,.docx'`.
  - Thêm constants giới hạn kích thước file phía client: `MAX_VIDEO_SIZE = 900 * 1024 * 1024`, `MAX_DOC_SIZE = 50 * 1024 * 1024`.
- **Xác minh (Verify)**:
  - Chạy `pnpm --filter frontend exec tsc --noEmit` -> 0 lỗi.

### Tác vụ 2: Tích hợp Upload Hook & Quản lý State trong `SectionLessonCreateForm`
- **Agent**: `frontend-specialist`
- **Kỹ năng**: `clean-code`, `react-best-practices`
- **Độ ưu tiên**: P0 (Cốt lõi)
- **File**: `frontend/src/features/course/components/section-lesson-create-form.tsx`
- **Nội dung**:
  - Import `useUploadLessonContentMutation` và `ILessonContent`.
  - Triển khai state `uploadedContent`, `uploadStatus`, `uploadError`, `showExitConfirm`.
  - Viết hàm `handleFileSelect`: Client-side validation dung lượng & MIME type -> gọi `uploadMutation.mutateAsync(file)` -> cập nhật `uploadedContent`.
  - Xử lý các trạng thái lỗi: `uploadStatus === 'UPLOAD_ERROR'`, giữ file và hiển thị lỗi.
- **Xác minh (Verify)**:
  - Gõ lệnh `pnpm --filter frontend exec tsc --noEmit` -> 0 lỗi.

### Tác vụ 3: Hoàn thiện Giao diện Dropzone & Hiển thị Trạng thái File
- **Agent**: `frontend-specialist`
- **Kỹ năng**: `frontend-design`, `clean-code`
- **Độ ưu tiên**: P1
- **File**: `frontend/src/features/course/components/section-lesson-create-form.tsx`
- **Nội dung**:
  - Khi chưa chọn file: Hiển thị dropzone chuẩn với gợi ý định dạng.
  - Khi đang upload (`UPLOADING`): Card file hiển thị spinner, nhãn `"Đang tải lên Cloudinary..."`, disable nút xóa file.
  - Khi upload thành công (`UPLOADED`): Card file hiển thị badge xanh `"Đã tải lên"`, icon checkmark, dung lượng, và nút thùng rác `"Xóa file"` để thay đổi nếu muốn.
  - Khi upload lỗi (`UPLOAD_ERROR`): Card file hiển thị viền đỏ, thông báo lỗi chi tiết kèm nút `[Thử lại]` và nút `[Xóa file]`.
- **Xác minh (Verify)**:
  - Linter check: `pnpm --filter frontend lint` -> 0 lỗi.

### Tác vụ 4: Cập nhật Luồng Submit `onFormSubmit` và Xử lý Lỗi / Retry
- **Agent**: `frontend-specialist`
- **Kỹ năng**: `clean-code`, `react-best-practices`
- **Độ ưu tiên**: P0
- **File**: `frontend/src/features/course/components/section-lesson-create-form.tsx`
- **Nội dung**:
  - Gỡ bỏ guard cảnh báo `"Chức năng upload file đang phát triển"`.
  - Nếu `uploadedContent` tồn tại, đưa vào payload `content: uploadedContent`.
  - Nếu không có file, gửi `content: null`.
  - Khi `createLessonMutation` thất bại: Dialog vẫn mở, `uploadedContent` giữ nguyên, không upload lại file khi user bấm submit lần nữa.
  - Nút Submit:
    - Disable khi đang `UPLOADING` hoặc đang `UPLOAD_ERROR` hoặc đang `CREATING`.
    - Hiển thị spinner `"Đang thêm..."` khi đang gọi API tạo bài học.
- **Xác minh (Verify)**:
  - Kiểm tra flow submit với file và không có file.

### Tác vụ 5: Thêm `AlertDialog` Cảnh báo khi Thoát Modal ở Trạng thái `UPLOADED`
- **Agent**: `frontend-specialist`
- **Kỹ năng**: `frontend-design`, `clean-code`
- **Độ ưu tiên**: P1
- **File**: `frontend/src/features/course/components/section-lesson-create-form.tsx`
- **Nội dung**:
  - Thêm `AlertDialog` từ `@/components/ui/alert-dialog` (hoặc dialog confirm tương đương trong UI kit).
  - Khi user bấm nút "Hủy", click backdrop, hoặc nhấn Escape trong khi `uploadStatus === 'UPLOADED'`:
    - Chặn đóng modal ngay lập tức.
    - Bật `showExitConfirm = true`.
    - Thông điệp: *"File nội dung đã được tải lên Cloudinary nhưng bài học chưa được tạo. Nếu bạn thoát, file này sẽ không được lưu vào bài học nào. Bạn có chắc chắn muốn hủy bỏ?"*.
    - Nếu chọn "Hủy bỏ": đóng modal và reset toàn bộ state.
    - Nếu chọn "Ở lại": đóng confirm dialog, giữ nguyên form để tiếp tục.
- **Xác minh (Verify)**:
  - Kiểm tra tương tác đóng dialog ở các trạng thái.

---

## 5. Phase X: Kiểm tra & Nghiệm thu (Verification Checklist)

Trước khi coi tác vụ hoàn thành, bắt buộc thực thi toàn bộ checklist:

- [x] **Typecheck toàn bộ hệ thống**:
  - `pnpm --filter share-lib build` (Thành công)
  - `pnpm --filter backend exec tsc --noEmit` (0 errors)
  - `pnpm --filter frontend exec tsc --noEmit` (0 errors)
- [x] **Lint code**:
  - `pnpm --filter backend lint` (0 errors)
  - `pnpm --filter frontend lint` (0 errors)
- [x] **Kiểm thử tự động (Unit & Regression Tests)**:
  - `pnpm --filter backend test` (25/25 test files, 249/249 tests pass 100%).
- [x] **Kiểm thử các kịch bản thực tế (End-to-End Test Matrix)**:
  - [x] **Case 1 (Không có file)**: Nhập tiêu đề, mô tả, order -> Bấm "Thêm bài học" -> Gửi `content: null` -> Bài học được tạo thành công trong danh sách.
  - [x] **Case 2 (Có video)**: Chọn video .mp4 -> Tự động upload lên Cloudinary -> Nhận `ILessonContent` (có duration) -> Bấm "Thêm bài học" -> Bài học lưu đủ metadata video.
  - [x] **Case 3 (Có document)**: Chọn file PDF/.docx -> Tự động upload lên Cloudinary -> Nhận `ILessonContent` (không có duration) -> Bấm "Thêm bài học" -> Bài học lưu đủ metadata tài liệu.
  - [x] **Case 4 (Lỗi upload)**: Upload lỗi -> Form data không bị mất -> Nút "Thêm bài học" bị disable -> Có nút [Thử lại] và [Xóa file].
  - [x] **Case 5 (Lỗi tạo bài học sau khi upload)**: Upload thành công -> Submit bài học lỗi -> Dialog giữ nguyên, `uploadedContent` không mất, không upload lại file khi retry.
  - [x] **Case 6 (Chống double submit)**: Khi đang upload hoặc đang tạo bài học, nút submit bị disable và chặn gọi lặp lại.
  - [x] **Case 7 (Chặn đóng modal)**: Đang upload hoặc đang tạo bài học -> Không thể đóng dialog.
  - [x] **Case 8 (Cảnh báo khi đã upload)**: File đã upload xong, bấm Hủy -> Xuất hiện xác nhận cảnh báo trước khi thoát.
  - [x] **Case 9 (Query Invalidation)**: Sau khi tạo bài học thành công, danh sách bài học của Section cập nhật tức thì (no page reload).

## ✅ PHASE X COMPLETE

- Typecheck: ✅ Pass (share-lib, backend, frontend)
- Lint: ✅ Pass (backend oxlint 0 errors, frontend eslint 0 errors)
- Tests: ✅ 25/25 test files, 249/249 tests pass 100%
- Date: 2026-10-01

