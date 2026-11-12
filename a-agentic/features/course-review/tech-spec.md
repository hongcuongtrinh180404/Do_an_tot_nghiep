# Course Review — Technical Specification

> **Module:** Course Review & Rating

---

## 1. Data Schema & Indexes

- **Collection:** `reviews`
- **Entity:** `ReviewEntity` kế thừa `BaseAbstractDocument`
  - `userId`: `ObjectId`, ref: `users`, required, index: true
  - `courseId`: `ObjectId`, ref: `courses`, required, index: true
  - `rating`: `Number` (1..5), required
  - `comment`: `String`, optional, trim: true, default null
  - `status`: `String`, enum `['visible', 'hidden', 'deleted']`, default: `'visible'`, index: true
  - `hideReason`: `String`, optional, default null
  - `moderationHistory`: `Array` of embedded subdocuments:
    - `action`: `String` (`'HIDE' | 'RESTORE' | 'DELETE'`), required
    - `adminId`: `ObjectId`, ref: `users`, required
    - `adminName`: `String`, optional
    - `reason`: `String`, optional
    - `createdAt`: `Date`, default `Date.now`
  - `reports`: `Array` of embedded subdocuments:
    - `userId`: `ObjectId`, ref: `users`, required
    - `userName`: `String`, optional
    - `reason`: `String`, required, trim: true
    - `createdAt`: `Date`, default `Date.now`
  - `reportCount`: `Number`, default 0, index: true
  - `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`

### Indexes:
1. `ReviewSchema.index({ userId: 1, courseId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });`
2. `ReviewSchema.index({ courseId: 1, status: 1, deletedAt: 1, createdAt: -1 });`
3. `ReviewSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });`
4. `ReviewSchema.index({ reportCount: -1, status: 1 });`

---

## 2. API Endpoints

### 2.1. Admin Moderation APIs

| Method | Endpoint | Auth / Role | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reviews/admin/stats` | `@Roles(ADMIN)` | Lấy chỉ số KPI: tổng số, số công khai, số bị ẩn, số bị báo cáo, số đã xóa, điểm TB |
| `GET` | `/api/v1/reviews/admin` | `@Roles(ADMIN)` | Danh sách đánh giá phân trang, tìm kiếm đa trường (học viên, khóa học, nhận xét), lọc theo sao, trạng thái, khóa học, báo cáo |
| `GET` | `/api/v1/reviews/admin/:id` | `@Roles(ADMIN)` | Chi tiết đánh giá kèm thông tin học viên, khóa học, lịch sử kiểm duyệt, danh sách báo cáo |
| `PATCH` | `/api/v1/reviews/admin/:id/hide` | `@Roles(ADMIN)` | Ẩn đánh giá vi phạm (bắt buộc `reason`), ghi lịch sử, tính lại `ratingAvg` và `reviewCount` |
| `PATCH` | `/api/v1/reviews/admin/:id/restore` | `@Roles(ADMIN)` | Khôi phục hiển thị đánh giá công khai, ghi lịch sử, tính lại điểm trung bình |
| `DELETE` | `/api/v1/reviews/admin/:id` | `@Roles(ADMIN)` | Xóa mềm đánh giá vi phạm nghiêm trọng sau khi xác nhận, ghi lịch sử, tính lại điểm TB |
| `PATCH` | `/api/v1/reviews/admin/:id/dismiss-reports` | `@Roles(ADMIN)` | Bỏ qua báo cáo vi phạm, giữ nguyên trạng thái visible, ghi lịch sử |

### 2.2. Public & Learner APIs

| Method | Endpoint | Auth / Role | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reviews/courses/:courseId/stats` | `@Public()` | Thống kê khóa học: điểm TB (chỉ tính đánh giá `visible`), tổng lượt, phân bố sao 1-5 |
| `GET` | `/api/v1/reviews/courses/:courseId` | `@Public()` | Danh sách đánh giá công khai phân trang (chỉ hiển thị `status: 'visible'` và `deletedAt: null`) |
| `GET` | `/api/v1/reviews/courses/:courseId/eligibility` | `@Roles(...)` | Kiểm tra điều kiện được đánh giá & lý do chi tiết |
| `GET` | `/api/v1/reviews/courses/:courseId/my-review` | `@Roles(...)` | Lấy đánh giá của học viên (kể cả khi bị ẩn để học viên nắm lý do) |
| `POST` | `/api/v1/reviews/courses/:courseId` | `@Roles(...)` | Tạo đánh giá (chạy trong transaction & tính lại thống kê) |
| `POST` | `/api/v1/reviews/:id/report` | `@Roles(...)` | Học viên/người dùng gửi báo cáo vi phạm đánh giá kèm lý do |
| `PATCH` | `/api/v1/reviews/:id` | `@Roles(...)` | Học viên cập nhật đánh giá của chính mình (chỉ chủ sở hữu, từ chối nếu đánh giá đang bị ẩn) |
| `DELETE` | `/api/v1/reviews/:id` | `@Roles(...)` | Học viên soft delete đánh giá & tính lại thống kê |
