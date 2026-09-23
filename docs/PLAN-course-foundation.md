# PLAN: Course Domain Foundation (Version 1)

> **Mục tiêu:**
> 1. Triển khai tầng dữ liệu cốt lõi (Domain Foundation) cho `Course` trong backend NestJS + MongoDB / Mongoose.
> 2. Tuân thủ tuyệt đối quy tắc kiến trúc dự án: kế thừa `BaseAbstractDocument`, sử dụng `BaseMongoRepository`, `BaseService`, đồng bộ `share-lib`.
> 3. Thiết lập liên kết tham chiếu `instructorId` tới `User` với các ràng buộc kiểm tra hợp lệ (tồn tại, chưa soft-delete, status `ACTIVE`, role `INSTRUCTOR` hoặc `ADMIN`).
> 4. Xây dựng chiến lược indexing tinh gọn (partial unique `slug` với soft delete, compound query index cho catalog và instructor management), tránh tạo index dư thừa.
> 5. Viết unit test và integration test đạt độ bao phủ đầy đủ cho Schema, Repository và Service.
>
> **Task Slug:** `course-foundation`  
> **Primary Agent:** `backend-specialist`  
> **Supporting Agents:** `project-planner`, `database-architect`

---

## 1. Phân Tích Kỹ Thuật & Phạm Vi Triển Khai

### 1.1. Các Trường Dữ Liệu & Ràng Buộc Schema

| Field | Kiểu Dữ Liệu | Ràng Buộc | Giá Trị Mặc Định / Index |
| :--- | :--- | :--- | :--- |
| `title` | `String` | `required: true`, `trim: true` | Tiêu đề khóa học |
| `slug` | `String` | `required: true`, `lowercase: true`, `trim: true` | Partial Unique index (`deletedAt: null`) |
| `shortDescription` | `String` | `required: false`, `trim: true` | Mặc định `null` |
| `description` | `String` | `required: false`, `trim: true` | Mặc định `null` |
| `thumbnailUrl` | `String` | `required: false`, `trim: true` | Mặc định `null` |
| `price` | `Number` | `required: true`, `min: 0` | Mặc định `0` |
| `instructorId` | `Types.ObjectId` | `required: true`, ref: `UserEntity` | Single index (`index: true`) |
| `status` | `String` (Enum) | `draft` \| `published` \| `archived` | Mặc định `draft`, index compound |
| `level` | `String` (Enum) | `beginner` \| `intermediate` \| `advanced` \| `all_levels` | Mặc định `all_levels` |
| `createdAt`, `updatedAt` | `Date` | Tự động sinh bởi timestamps | Kế thừa từ `BaseAbstractDocument` |
| `deletedAt`, `createdById`, `updatedById` | `Date / String` | Trường kiểm toán & Soft delete | Kế thừa từ `BaseAbstractDocument` |

### 1.2. Chiến Lược Indexing (Chỉ Giữ Index Thực Sự Cần Thiết)
1. **Partial Unique Slug**: `{ slug: 1 }` với `{ unique: true, partialFilterExpression: { deletedAt: null } }` (cho phép tái sử dụng slug sau khi soft-delete).
2. **Instructor Management Query**: `{ instructorId: 1, deletedAt: 1, createdAt: -1 }` (cho phép lọc các khóa học của một giảng viên).
3. **Published Catalog Query**: `{ status: 1, deletedAt: 1, createdAt: -1 }` (cho trang danh mục khóa học công khai của học viên).

---

## 2. Kế Hoạch Thực Hiện Chi Tiết (Task Breakdown)

| Task ID | Nhiệm Vụ | File Thực Hiện |
| :--- | :--- | :--- |
| **TASK-01** | Tạo enums `CourseStatusEnum`, `CourseLevelEnum` | `share-lib/src/enums/course-status.enum.ts`<br>`share-lib/src/enums/course-level.enum.ts` |
| **TASK-02** | Tạo interface `ICourse` & export trong `share-lib` | `share-lib/src/interfaces/course.interface.ts`<br>`share-lib/src/index.ts` |
| **TASK-03** | Tạo `CourseEntity` + `CourseSchema` kế thừa `BaseAbstractDocument` | `backend/src/modules/course/schemas/course.schema.ts` |
| **TASK-04** | Tạo `CourseRepository` kế thừa `BaseMongoRepository` | `backend/src/modules/course/repositories/course.repository.ts` |
| **TASK-05** | Tạo `CourseService` kế thừa `BaseService` với instructor & slug validation | `backend/src/modules/course/services/course.service.ts` |
| **TASK-06** | Tạo `CourseModule` và đăng ký vào `AppModule` | `backend/src/modules/course/course.module.ts`<br>`backend/src/app.module.ts` |
| **TASK-07** | Viết Integration Tests cho `CourseSchema` (defaults, unique slug, soft-delete reuse, price >= 0) | `backend/src/modules/course/tests/course.schema.integration.spec.ts` |
| **TASK-08** | Viết Unit Tests cho `CourseService` (instructor validation, status/level defaults, reject invalid roles/statuses) | `backend/src/modules/course/tests/course.service.spec.ts` |
| **TASK-09** | Chạy toàn bộ Test Suites và nghiệm thu Phase X | Vitest & TypeScript build |

---

## 3. Giai Đoạn Kiểm Thử & Nghiệm Thu (Phase X)

- [x] Build `share-lib`: `pnpm --filter share-lib build` (Exit code: 0)
- [x] Type Check Backend: `pnpm --filter backend exec npx tsc --noEmit` (Exit code: 0)
- [x] Backend Vitest Suite: `pnpm --filter backend test` (12 test suites / 80 tests pass 100%)
- [x] Xác minh ràng buộc: `price >= 0`, `slug` partial unique, instructor validation, soft-delete slug reuse

## ✅ PHASE X COMPLETE
- Vitest Suite: ✅ 80/80 Pass (12 test suites)
- Type Check: ✅ 0 errors
- Date: 2026-09-23
