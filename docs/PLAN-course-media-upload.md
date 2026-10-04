# PLAN: Course Media Upload End-to-End (Thumbnail & Trailer)

> **Mục tiêu:**
> Triển khai toàn bộ logic thực tế End-to-End cho việc upload/thay đổi Course Thumbnail và Course Trailer Video trên giao diện Course Detail (`/instructor/courses/[id]`).
> Tái sử dụng tối đa hạ tầng lưu trữ MinIO và abstraction hiện tại.
>
> **Task Slug:** `course-media-upload`
> **Primary Agent:** `project-planner` / `backend-specialist` / `frontend-specialist`

---

## 1. Kết Quả Khảo Sát & Kiểm Tra Kiến Trúc Codebase

Theo yêu cầu kiểm tra kỹ lưỡng kiến trúc hiện tại trước khi code:

| Câu hỏi khảo sát | Hiện trạng trong Codebase | Vị trí kiểm chứng |
|:---|:---|:---|
| **1. Cách project upload lên MinIO** | Sử dụng `@aws-sdk/client-s3` (`S3Client`, `PutObjectCommand`, `DeleteObjectCommand`) vào bucket `thc-datn-media`. Ảnh được Sharp xử lý tự động nén WebP (1280x720 cho thumbnail). Media video được upload stream/buffer và gán unique key có tiền tố timestamp + UUID. File cũ được tự động xóa khi upload file mới. | `backend/src/modules/storage/storage.service.ts` |
| **2. Storage abstraction hiện tại** | Interface `IStorageService` với các hàm chuẩn: `uploadImage()`, `uploadLessonMedia()`, `deleteFile()`, `getPresignedStreamUrl()`. Đã được inject vào `CourseModule`. | `backend/src/modules/storage/interfaces/storage.interface.ts` |
| **3. API/backend endpoint của Course** | Đã triển khai sẵn 2 endpoints:<br>• `PATCH /api/v1/courses/:courseId/thumbnail` (FileInterceptor, `CourseImageValidationPipe`)<br>• `PATCH /api/v1/courses/:courseId/trailer` (FileInterceptor, `CourseTrailerValidationPipe`)<br>Cả hai đã phân quyền `Roles(INSTRUCTOR, ADMIN)` và kiểm tra quyền sở hữu khóa học. | `backend/src/modules/course/course.controller.ts`<br>`backend/src/modules/course/services/course.service.ts` |
| **4. Model/Database của Course** | `CourseEntity` đã có sẵn 2 trường `thumbnailUrl?: string \| null` và `trailerUrl?: string \| null` (kế thừa `BaseAbstractDocument`). Sync đồng bộ với `ICourse` trong `share-lib`. | `backend/src/modules/course/schemas/course.schema.ts`<br>`share-lib/src/interfaces/course.interface.ts` |
| **5. Cách Lesson xử lý upload** | Sử dụng API client `lessonContentApi.upload()` với `FormData` và `useMutation` từ `@tanstack/react-query`. Quản lý state `IDLE \| UPLOADING \| UPLOADED \| UPLOAD_ERROR`. Cảnh báo chặn submit khi file đang upload hoặc upload lỗi. | `frontend/src/features/course/api/lesson-content.api.ts`<br>`frontend/src/features/course/components/section-lesson-create-form.tsx` |
| **6. Cách Frontend quản lý upload state** | Sử dụng TanStack React Query `useMutation` để trigger upload, cập nhật optimistic hoặc invalidate `courseKeys.detail(courseId)`. Quản lý local state cho file name, loading state và tiến trình upload. | `frontend/src/features/course/api/course.api.ts`<br>`frontend/src/features/profile/components/avatar-uploader.tsx` |
| **7. Validation / Toast / Loading pattern** | Validate client-side trước khi upload (MIME + Size). Báo lỗi/thành công qua `toast.success` / `toast.error` (`sonner`). Loading hiển thị spinner quay `<Icon icon="lucide:loader-2" className="animate-spin" />` và disable thao tác tương tác. | Toàn bộ codebase Frontend |

---

## 2. Phân Tích Kỹ Thuật & Yêu Cầu Chi Tiết

### 2.1. Giới hạn dung lượng & Validation
- **Thumbnail:**
  - MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif` (`.jpg, .jpeg, .png, .webp, .gif`)
  - Kích thước tối đa: **10MB**
  - Text gợi ý trên UI: *"Hỗ trợ JPG, PNG, WEBP (Khuyến nghị 1280 x 720 px)"*
  - Xử lý backend: Nén & resize WebP 1280x720, quality 85, lưu tại `courses/thumbnail/{uuid}.webp`

- **Trailer:**
  - MIME types: `video/mp4`, `video/webm`, `video/quicktime` (`.mp4, .webm, .mov`)
  - Kích thước tối đa: **600MB** (cấu hình cả ở Frontend lẫn Backend `storage.constants.ts`)
  - **Quy tắc UI:** Tuyệt đối **KHÔNG** hiển thị thông báo text giới hạn dung lượng lên giao diện (theo đúng chỉ đạo của user). Nếu file chọn vượt 600MB, hiển thị `toast.error` thông báo rõ ràng.
  - Xử lý backend: Lưu trực tiếp vào `courses/trailer/{timestamp}-{uuid}-{filename}.{ext}`

### 2.2. Timeout cho Upload File Lớn
- Mặc định `apiClient` có timeout là 15.000ms (15s). Upload video lên đến 600MB sẽ bị timeout nếu không cấu hình riêng.
- Giải pháp: Khi gọi API upload trailer, truyền cấu hình `timeout: 0` (hoặc `600000ms` = 10 phút) kèm theo `onUploadProgress` để báo % tiến trình tải lên.

### 2.3. Trải Nghiệm Tương Tác (UX / Interactive Click-to-Preview)
- **Thumbnail:**
  - *Chưa có ảnh (Empty State):* Khung nét đứt xám nhạt, icon ảnh mờ, nút `[ ⬆️ Tải lên ảnh bìa ]`. Click vào khung hoặc nút đều mở hộp thoại chọn file.
  - *Đã có ảnh:* Hiển thị ảnh bìa chuẩn tỉ lệ 16:9 (`next/image` hoặc `<img>` với `object-cover`), hiệu ứng hover nhẹ. Click trực tiếp vào ảnh sẽ mở **Lightbox/Dialog xem ảnh phóng to sắc nét**. Nút bên dưới: `[ 📷 Thay ảnh bìa ]`.
- **Trailer:**
  - *Chưa có video (Empty State):* Khung nét đứt xám nhạt, icon phim mờ, không hiển thị text dung lượng, nút `[ 🎥 Tải lên trailer ]`. Click mở chọn file video.
  - *Đã có video:* Hiển thị khung phát video (hoặc poster với overlay nút Play), click vào mở **Dialog Video Player** phát trực tiếp video trailer sắc nét với đầy đủ controls. Nút bên dưới: `[ 🎬 Thay video trailer ]`.
- **Trạng thái Uploading:**
  - Hiển thị thanh tiến trình hoặc spinner quay cùng phần trăm upload (`Đang tải lên 45%...`).
  - Disable nút bấm và ngăn chặn điều hướng rời khỏi trang khi đang upload dở dang.

---

## 3. Kế Hoạch Thực Hiện Chi Tiết (Task Breakdown)

### Phase 1: Đồng Bộ Backend Giới Hạn 600MB
- [x] **TASK-01**: Cập nhật `MAX_TRAILER_SIZE_BYTES = 600 * 1024 * 1024` (600MB) trong `backend/src/modules/storage/storage.constants.ts`.
- [x] **TASK-02**: Cập nhật thông báo lỗi trong `CourseTrailerValidationPipe` và cập nhật test case vượt 600MB trong `course.service.media.spec.ts`. Chạy vitest xác nhận 16/16 tests pass.

### Phase 2: Frontend API Client & Mutations
- [x] **TASK-03**: Thêm 2 hàm `uploadThumbnail(courseId, file, onProgress?)` và `uploadTrailer(courseId, file, onProgress?)` vào `courseApi` trong `frontend/src/features/course/api/course.api.ts` (cấu hình multipart, timeout dài và theo dõi upload progress).
- [x] **TASK-04**: Thêm 2 React Query hooks: `useUploadCourseThumbnailMutation(courseId)` và `useUploadCourseTrailerMutation(courseId)` với việc tự động `invalidateQueries` cache `courseKeys.detail(courseId)` và hiển thị toast Sonner chi tiết.

### Phase 3: Hoàn Thiện Component `CourseMediaPreview`
- [x] **TASK-05**: Cập nhật interface props cho `CourseMediaPreview`: nhận `courseId`, `thumbnailUrl`, `trailerUrl`.
- [x] **TASK-06**: Triển khai logic input file ẩn (`<input type="file" ref=... />`) cho Thumbnail và Trailer kèm validation loại file và dung lượng (Thumbnail <= 10MB, Trailer <= 600MB).
- [x] **TASK-07**: Triển khai UI xem trước tương tác (Interactive Click-to-Preview):
  - Thumbnail Lightbox Modal (sử dụng `@/components/ui/dialog`) khi click vào thumbnail đã có.
  - Video Player Modal (sử dụng `@/components/ui/dialog` + `<video controls>`) khi click vào trailer đã có.
- [x] **TASK-08**: Triển khai trạng thái hiển thị tiến trình tải lên (progress bar / spinner) khi file đang được upload.

### Phase 4: Tích Hợp Vào Course Detail Page
- [x] **TASK-09**: Cập nhật `CourseDetailContent` (`course-detail-content.tsx`): truyền `courseId={course.id}`, `thumbnailUrl={course.thumbnailUrl}`, `trailerUrl={course.trailerUrl}` vào `<CourseMediaPreview />`.

### Phase 5: Verification (Phase X)
- [x] **TASK-10**: Chạy TypeScript type-check cho cả frontend và backend (`npx tsc --noEmit` - Exit code 0).
- [x] **TASK-11**: Chạy backend vitest test suite kiểm tra upload media (19/19 files, 251/251 tests pass 100%).
- [x] **TASK-12**: Sẵn sàng kiểm tra end-to-end trên trình duyệt.

---

## 4. Socratic Questions & Edge Cases Cần Lưu Ý

1. **Trường hợp xóa ảnh bìa / trailer đã upload:** Người dùng có cần thêm nút "Xóa ảnh bìa" / "Xóa video trailer" để trở về trạng thái chưa có media không, hay chỉ cần nút "Thay ảnh bìa" / "Thay trailer"?
2. **Video Trailer Codec:** Định dạng MP4/WebM phát trực tiếp trên trình duyệt qua thẻ `<video>`. Project có cần hỗ trợ video có track audio AAC/H264 chuẩn để tránh trường hợp codec không tương thích trên một số trình duyệt không?
