# Course Management — Development History & Gotchas

> **Module:** Course Management

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `IN_PROGRESS` (Đã hoàn thành Course Domain Foundation v1: Schema, Repository, Service, Enums và Tests).
- **Kế hoạch triển khai:** Sprint 1 — Tiếp theo: Course CRUD REST API & Chapter/Lesson foundation.

---

## 2. Technical Notes & Gotchas

- **Slug Generation & Soft-delete Index**: Sử dụng Partial Unique Index `{ slug: 1 }` với `partialFilterExpression: { deletedAt: null }`. Đảm bảo slug chỉ duy nhất giữa các khóa học đang hoạt động và cho phép tái sử dụng slug nếu khóa học cũ đã bị xóa mềm.
- **Instructor Reference & Validation**: `instructorId` tham chiếu tới User. Khi tạo khóa học, `CourseService` kiểm tra người dùng phải tồn tại, chưa bị soft-delete, có `status === ACTIVE` và vai trò `role` là `INSTRUCTOR` hoặc `ADMIN`.
- **Nested Population Guard**: Không dùng cascading `.populate()` đa tầng từ Course -> Chapters -> Lessons. Thay vào đó dùng Aggregation Pipeline `$lookup` có `$project` tường minh các trường cần thiết để đảm bảo hiệu năng cao.

