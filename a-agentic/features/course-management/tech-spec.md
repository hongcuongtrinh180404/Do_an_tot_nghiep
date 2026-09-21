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

### B. Chapter Schema (`chapters`)
- `courseId`: Types.ObjectId (ref: `Course`, required, index)
- `title`: string (required, trimmed)
- `orderIndex`: number (required, default: 0)
- Inherits `BaseAbstractDocument`.

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
| `GET` | `/api/v1/courses/:slug` | Chi tiết khóa học và cấu trúc chương/bài | Public |
| `POST` | `/api/v1/courses` | Tạo khóa học mới | `INSTRUCTOR`, `ADMIN` |
| `PATCH` | `/api/v1/courses/:id` | Cập nhật thông tin khóa học | `INSTRUCTOR` (Owner), `ADMIN` |
| `DELETE` | `/api/v1/courses/:id` | Xóa mềm khóa học | `INSTRUCTOR` (Owner), `ADMIN` |
| `POST` | `/api/v1/courses/:id/chapters` | Thêm chương học mới | `INSTRUCTOR` (Owner), `ADMIN` |
| `POST` | `/api/v1/chapters/:id/lessons` | Thêm bài học mới | `INSTRUCTOR` (Owner), `ADMIN` |
| `GET` | `/api/v1/lessons/:id` | Xem bài học (Check enrollment if not free) | `USER`, `INSTRUCTOR`, `ADMIN` |
