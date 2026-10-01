# Kế hoạch Triển khai: Lesson Content Upload Foundation

> **Mục tiêu**: Xây dựng hạ tầng upload file nội dung bài học (Video & Document) lên Cloudinary, trả về metadata chuẩn `ILessonContent` cho frontend. Tuyệt đối **không** tạo Lesson, không sửa Create Lesson API, không can thiệp Database Lesson, và không kích hoạt RabbitMQ/AI pipeline trong milestone này.

---

## 1. Tổng quan & Ranh giới (Scope & Boundaries)

| Tiêu chí | Phạm vi trong Milestone này (IN SCOPE) | Ngoài phạm vi (OUT OF SCOPE) |
| :--- | :--- | :--- |
| **Backend Endpoint** | `POST /api/v1/lesson-content/upload` (multipart/form-data) | API tạo bài học, API cập nhật bài học |
| **Lưu trữ Cloud** | Cloudinary: Folder `courses/lessons` | S3, local storage, CDN riêng |
| **Định dạng file** | **Video**: mp4, webm, quicktime (≤ 900MB)<br>**Document**: pdf, docx (≤ 50MB) | File .doc cũ, audio riêng, file nén zip/rar |
| **Phân quyền** | `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)` + JWT Auth | Public upload, Student upload |
| **Hợp đồng dữ liệu** | Trả về `ApiResponse<ILessonContent>` | Thay đổi schema `LessonEntity` |
| **Frontend** | API Client + React Query Mutation hook (`useUploadLessonContentMutation`) | Form tự động submit, nhúng video player |
| **Xử lý nền** | Không có | RabbitMQ message queue, AssemblyAI, Gemini AI Mindmap/Quiz |

---

## 2. Kiến trúc Kỹ thuật (Technical Architecture)

### 2.1. Shared Cloudinary Module (`backend/src/modules/cloudinary/`)
- Tách `CloudinaryService` ra khỏi `UserModule` để tránh phụ thuộc chéo (circular dependency) hoặc coupling không tự nhiên.
- Tạo `CloudinaryModule` cung cấp `CloudinaryService` dùng chung cho toàn backend.
- `CloudinaryService` hỗ trợ:
  - `uploadImage(file, subFolder)`: Giữ nguyên logic crop mặt 500x500 cho avatar người dùng (bảo toàn 100% backward compatibility và test hiện có).
  - `uploadLessonMedia(file, subFolder)`: Xử lý upload linh hoạt theo MIME type:
    - Video (`resource_type: 'video'`): Trích xuất `secure_url`, `public_id`, `bytes`, `duration`, `format`.
    - Document (`resource_type: 'raw'`): Đảm bảo các file PDF và Word DOCX không bị nén hoặc lỗi định dạng. Trích xuất `secure_url`, `public_id`, `bytes`.
- Folder mặc định cho Lesson: `courses/lessons`.

### 2.2. Validation Rules & Giới hạn File
- **Video Limits**:
  - MIME types: `video/mp4`, `video/webm`, `video/quicktime`.
  - Max Size: **900MB** (`900 * 1024 * 1024` bytes).
  - Type output: `LessonContentTypeEnum.VIDEO` (`'video'`).
- **Document Limits**:
  - MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX).
  - Max Size: **50MB** (`50 * 1024 * 1024` bytes).
  - Type output: `LessonContentTypeEnum.DOCUMENT` (`'document'`).
- **Rejected**:
  - Bất kỳ MIME type nào khác (bao gồm `application/msword` cũ, executable, images vào endpoint này).
  - File vượt quá kích thước quy định theo loại tương ứng.
  - Request không có file hoặc file rỗng.

### 2.3. Endpoint & Security
- **Route**: `POST /api/v1/lesson-content/upload`
- **Controller**: `LessonContentController` nằm trong `backend/src/modules/course/lesson-content.controller.ts`.
- **Bảo mật**:
  - Yêu cầu JWT Access Token hợp lệ (xác thực toàn cục qua `JwtAuthGuard`).
  - Kiểm tra vai trò: `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)` qua `RolesGuard`.
  - Không cho phép client gửi tham số `publicId` hay folder tùy ý (backend kiểm soát toàn bộ namespace trên Cloudinary).
  - File name được chuẩn hóa và loại bỏ các ký tự độc hại trước khi ghi nhận vào metadata.

### 2.4. Mapping Contract `ILessonContent`
Response trả về chuẩn `ApiResponse<ILessonContent>`:
```ts
{
  success: true,
  statusCode: 201,
  message: 'Tải lên nội dung bài học thành công',
  data: {
    type: 'video', // hoặc 'document'
    url: 'https://res.cloudinary.com/...',
    publicId: 'courses/lessons/...',
    fileName: 'lesson-01.mp4',
    fileSize: 35680120,
    mimeType: 'video/mp4',
    duration: 485 // Chỉ có khi là video nếu Cloudinary cung cấp
  }
}
```

### 2.5. Frontend Client & Hook
- Tạo `frontend/src/features/course/api/lesson-content.api.ts`:
  - `lessonContentApi.upload(file: File): Promise<ILessonContent>` sử dụng `FormData` gửi tới `/lesson-content/upload`.
  - Hook `useUploadLessonContentMutation()` với `isPending`, `mutateAsync`, `error`.

---

## 3. Cấu trúc Thư mục & Tệp tin Dự kiến

```text
backend/
├── src/
│   ├── modules/
│   │   ├── cloudinary/                  # [NEW] Shared Cloudinary Module
│   │   │   ├── cloudinary.module.ts
│   │   │   ├── cloudinary.service.ts
│   │   │   └── tests/
│   │   │       └── cloudinary.service.spec.ts
│   │   ├── course/
│   │   │   ├── course.module.ts         # [UPDATE] Import CloudinaryModule, register LessonContentController
│   │   │   ├── lesson-content.controller.ts # [NEW] Controller POST /lesson-content/upload
│   │   │   ├── pipes/
│   │   │   │   └── lesson-file-validation.pipe.ts # [NEW] Pipe validate MIME type & size (900MB/50MB)
│   │   │   └── tests/
│   │   │       └── lesson-content.controller.spec.ts # [NEW] Controller & Validation Unit Tests
│   │   └── user/
│   │       ├── user.module.ts           # [UPDATE] Import CloudinaryModule thay vì tự khai báo
│   │       ├── services/
│   │       │   └── user.service.ts      # [UPDATE] Inject CloudinaryService từ shared module
│   │       └── tests/
│   │           └── user.service.avatar.spec.ts # [UPDATE] Đảm bảo import đúng
│   └── app.module.ts                    # [UPDATE] Đăng ký CloudinaryModule
frontend/
└── src/
    └── features/
        └── course/
            ├── api/
            │   └── lesson-content.api.ts # [NEW] API client & useUploadLessonContentMutation
            └── index.ts                 # [UPDATE] Export lesson-content API/hooks
```

---

## 4. Kế hoạch Chi tiết Từng Tác vụ (Task Breakdown)

### Tác vụ 1: Xây dựng Shared `CloudinaryModule` và hoàn thiện `CloudinaryService`
- **Agent**: `backend-specialist`
- **Kỹ năng**: `clean-code`, `api-patterns`
- **Độ ưu tiên**: P0 (Nền tảng)
- **Input**: `backend/src/modules/user/services/cloudinary.service.ts`.
- **Output**: 
  - Tạo `backend/src/modules/cloudinary/cloudinary.module.ts`.
  - Tạo `backend/src/modules/cloudinary/cloudinary.service.ts` với cả `uploadImage` và `uploadLessonMedia(file, subFolder)`.
  - Cập nhật `UserModule` và `user.service.ts` để sử dụng `CloudinaryModule`.
- **Xác minh (Verify)**:
  - Chạy `pnpm --filter backend test src/modules/user/tests/user.service.avatar.spec.ts` -> 100% pass.

### Tác vụ 2: Thiết kế `LessonFileValidationPipe` kiểm tra định dạng & dung lượng
- **Agent**: `backend-specialist`
- **Kỹ năng**: `clean-code`
- **Độ ưu tiên**: P1
- **Input**: Yêu cầu dung lượng (Video ≤ 900MB, Document ≤ 50MB) và MIME types (mp4, webm, quicktime, pdf, docx).
- **Output**:
  - `backend/src/modules/course/pipes/lesson-file-validation.pipe.ts` kế thừa `PipeTransform`.
  - Kiểm tra file tồn tại: `BadRequestException('Vui lòng chọn file tải lên')`.
  - Phân loại MIME type ra `LessonContentTypeEnum.VIDEO` hoặc `DOCUMENT`.
  - Kiểm tra size tương ứng: Video > 900MB hoặc Document > 50MB -> throw `BadRequestException`.
  - Từ chối các định dạng không hỗ trợ (kể cả `.doc` cũ) -> throw `BadRequestException`.
- **Xác minh (Verify)**:
  - Unit test pipe với các mẫu file mock (vượt kích thước, sai mime type, hợp lệ).

### Tác vụ 3: Xây dựng `LessonContentController` (`POST /api/v1/lesson-content/upload`)
- **Agent**: `backend-specialist`
- **Kỹ năng**: `clean-code`, `api-patterns`
- **Độ ưu tiên**: P1
- **Phụ thuộc**: Tác vụ 1, Tác vụ 2
- **Input**: `LessonFileValidationPipe`, `CloudinaryService`.
- **Output**:
  - `backend/src/modules/course/lesson-content.controller.ts`:
    - `@Controller('lesson-content')`
    - `@Post('upload')` với `@HttpCode(HttpStatus.OK)` hoặc `HttpStatus.CREATED`.
    - `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`
    - `@UseInterceptors(FileInterceptor('file'))`
    - Upload file vào Cloudinary qua `this.cloudinaryService.uploadLessonMedia(file, 'courses/lessons')`.
    - Trả về `ApiResponse.success(lessonContent, 'Tải lên nội dung bài học thành công')`.
  - Đăng ký `LessonContentController` vào `CourseModule`.
- **Xác minh (Verify)**:
  - Viết bộ test `lesson-content.controller.spec.ts`: test upload video thành công, upload document thành công, lỗi Cloudinary, lỗi phân quyền.

### Tác vụ 4: Xây dựng Unit Test cho `CloudinaryService` và `LessonContentController`
- **Agent**: `backend-specialist`
- **Kỹ năng**: `testing-patterns`, `tdd-workflow`
- **Độ ưu tiên**: P1
- **Input**: Source code mới ở Tác vụ 1, 2, 3.
- **Output**:
  - `backend/src/modules/cloudinary/tests/cloudinary.service.spec.ts`:
    - Mock Cloudinary SDK `uploader.upload_stream`.
    - Test upload video trả về đúng duration và metadata.
    - Test upload document với `resource_type: 'raw'`.
    - Test upload khi thiếu cấu hình env.
  - `backend/src/modules/course/tests/lesson-content.controller.spec.ts`:
    - Test đầy đủ các kịch bản thành công và ngoại lệ.
- **Xác minh (Verify)**:
  - Chạy `pnpm --filter backend test` -> Toàn bộ các test suite mới và cũ đều pass 100%.

### Tác vụ 5: Xây dựng Frontend API Client & Mutation Hook
- **Agent**: `frontend-specialist`
- **Kỹ năng**: `clean-code`, `react-best-practices`
- **Độ ưu tiên**: P2
- **Input**: Contract `ILessonContent`, endpoint `POST /api/v1/lesson-content/upload`.
- **Output**:
  - `frontend/src/features/course/api/lesson-content.api.ts`:
    - `lessonContentApi.upload(file: File): Promise<ILessonContent>`
    - `useUploadLessonContentMutation()` sử dụng `useMutation` từ `@tanstack/react-query`.
    - Quản lý trạng thái: `isPending`, `mutateAsync`, `error`.
    - Toast notifications: `toast.success` khi thành công, `toast.error` khi thất bại.
  - Re-export qua `frontend/src/features/course/index.ts`.
  - Không sửa `section-lesson-create-form.tsx` để tạo lesson trong milestone này (chỉ hoàn thiện API client foundation).
- **Xác minh (Verify)**:
  - Chạy `pnpm --filter frontend exec tsc --noEmit` -> 0 lỗi.
  - Chạy `pnpm --filter frontend lint` -> 0 warnings/errors.

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
  - `pnpm --filter backend test` (Đạt 100% tests pass: 25/25 test files, 249/249 tests pass).
- [x] **Kiểm tra ranh giới kiến trúc**:
  - [x] Không sửa `CreateLessonDto`, không thay đổi `LessonEntity`, không tạo Lesson trong database.
  - [x] Không can thiệp RabbitMQ / AI video pipeline.
  - [x] Không hardcode secret/token Cloudinary.
  - [x] Phân quyền chặt chẽ: chỉ `INSTRUCTOR` và `ADMIN` được phép gọi upload.

## ✅ PHASE X COMPLETE

- Typecheck: ✅ Pass (share-lib, backend, frontend)
- Lint: ✅ Pass (backend oxlint 0 errors, frontend eslint 0 errors)
- Tests: ✅ 25/25 test files, 249/249 tests pass 100%
- Date: 2026-10-01

