# Course Management — Technical Specifications

> **Module:** Data Models, Schemas, DTOs, and REST API Endpoints for Course Management.

---

## 1. Mongoose Schema & Domain Models

### A. Course Schema (`courses`)
- `title`: string (required, trimmed, index)
- `slug`: string (unique index, auto-generated from title)
- `description`: string
- `thumbnailUrl`: string
- `price`: number (min: 0, default: 0)
- `instructorId`: Types.ObjectId (ref: `User`, required, index)
- `isPublished`: boolean (default: false, index)
- Inherits `BaseAbstractDocument` (`createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`).

### B. Section Schema (`sections`)
- `courseId`: Types.ObjectId (ref: `CourseEntity`, required, index)
- `title`: string (required, trimmed)
- `description`: string (optional, default: null, trimmed)
- `order`: number (required, min: 0)
- Inherits `BaseAbstractDocument` (`createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`).
- Compound Index: `{ courseId: 1, deletedAt: 1, order: 1 }`.

### C. Lesson Schema (`lessons`)
- `courseId`: Types.ObjectId (ref: `Course`, required, index)
- `chapterId`: Types.ObjectId (ref: `Chapter`, required, index)
- `title`: string (required, trimmed)
- `orderIndex`: number (required, default: 0)
- `videoUrl`: string
- `durationSeconds`: number (default: 0)
- `isFreePreview`: boolean (default: false)
- `videoStatus`: Enum (`UPLOADED`, `QUEUED`, `PROCESSING`, `READY`, `FAILED`)
- `mindmapMarkdown`: string (AI generated markdown for Markmap)
- `inVideoQuizzes`: Array of Embedded Quiz Objects:
  - `timestamp`: number (in seconds)
  - `question`: string
  - `options`: string[]
  - `correctIndex`: number
  - `explanation`: string
- Inherits `BaseAbstractDocument`.

---

## 2. API Endpoints

| Method | Endpoint | Description | Auth & Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/courses` | Danh sách khóa học có phân trang & lọc | Public |
| `GET` | `/api/v1/courses/my-courses` | Danh sách khóa học của giảng viên hiện tại (chưa xóa mềm) | `INSTRUCTOR`, `ADMIN` |
| `GET` | `/api/v1/courses/:slug` | Chi tiết khóa học và cấu trúc chương/bài | Public |
| `POST` | `/api/v1/courses` | Tạo khóa học mới | `INSTRUCTOR`, `ADMIN` |
| `PATCH` | `/api/v1/courses/:id` | Cập nhật thông tin khóa học | `INSTRUCTOR` (Owner), `ADMIN` |
| `DELETE` | `/api/v1/courses/:id` | Xóa mềm khóa học | `INSTRUCTOR` (Owner), `ADMIN` |
| `POST` | `/api/v1/courses/:id/chapters` | Thêm chương học mới (tự động gán thứ tự nếu không truyền order) | `INSTRUCTOR` (Owner), `ADMIN` |
| `PUT` | `/api/v1/courses/:id/sections/reorder` | Sắp xếp lại thứ tự các chương học hàng loạt bằng transaction | `INSTRUCTOR` (Owner), `ADMIN` |
| `POST` | `/api/v1/sections/:sectionId/lessons` | Thêm bài học mới vào section | `INSTRUCTOR` (Owner), `ADMIN` |
| `GET` | `/api/v1/sections/:sectionId/lessons` | Lấy danh sách bài học theo section | Public |
| `GET` | `/api/v1/lessons/:id` | Xem chi tiết bài học & content | Public |

---

## 3. Frontend Components & Viewers (Milestone 26)

- **Routes**:
  - `/instructor/courses/:id/lessons/:lessonId`: Giao diện xem chi tiết bài học dành cho giảng viên.
  - `/courses/:courseId/lessons/:lessonId`: Giao diện xem chi tiết bài học tiêu chuẩn.
- **Component `LessonDetailContent`**:
  - Tải dữ liệu qua hook `useLessonDetailQuery(lessonId)`.
  - Hiển thị badge: `Bài {order}`, `Học thử` (`isPreview`), badge loại nội dung (`Video`, `Tài liệu`, `Chưa có nội dung`).
  - **Video Viewer**: Thẻ HTML5 `<video controls>` phát trực tiếp `lesson.content.url`, kèm dải metadata (thời lượng, dung lượng file, định dạng MIME).
  - **Document Viewer**: Card thông tin tài liệu (tên file, định dạng, dung lượng) + nút "Mở tài liệu" mở URL trong tab mới.
  - **Empty State**: Hiển thị khi `lesson.content === null`.
  - **Loading & Error**: `LessonDetailSkeleton` và Card báo lỗi thân thiện với nút "Thử lại" và "Quay lại khóa học".
