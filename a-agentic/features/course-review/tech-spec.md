# Course Review — Technical Specification

> **Module:** Course Review & Rating

---

## 1. Data Schema & Indexes

- **Collection:** `reviews`
- **Entity:** `ReviewEntity` kế thừa `BaseAbstractDocument`
  - `userId`: `ObjectId`, ref: `users`, required
  - `courseId`: `ObjectId`, ref: `courses`, required
  - `rating`: `Number` (1..5), required
  - `comment`: `String`, optional, trim: true, default null
  - `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`

### Indexes:
1. `ReviewSchema.index({ userId: 1, courseId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });`
2. `ReviewSchema.index({ courseId: 1, deletedAt: 1, createdAt: -1 });`

---

## 2. API Endpoints

| Method | Endpoint | Auth / Role | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reviews/courses/:courseId/stats` | `@Public()` | Lấy thống kê: điểm TB (làm tròn 1 số thập phân), tổng lượt, phân bố sao 1-5 |
| `GET` | `/api/v1/reviews/courses/:courseId` | `@Public()` | Danh sách đánh giá công khai phân trang (sắp xếp mới nhất) |
| `GET` | `/api/v1/reviews/courses/:courseId/eligibility` | `@Roles(...)` | Kiểm tra điều kiện được đánh giá & lý do chi tiết |
| `GET` | `/api/v1/reviews/courses/:courseId/my-review` | `@Roles(...)` | Lấy đánh giá của học viên hiện tại |
| `POST` | `/api/v1/reviews/courses/:courseId` | `@Roles(...)` | Tạo đánh giá (chạy trong transaction & tính lại thống kê) |
| `PATCH` | `/api/v1/reviews/:id` | `@Roles(...)` | Cập nhật đánh giá của chính mình |
| `DELETE` | `/api/v1/reviews/:id` | `@Roles(...)` | Soft delete đánh giá & tính lại thống kê |

