# Course Review — Rules & Business Flows

> **Module:** Course Review & Rating

---

## 1. Điều kiện Đánh giá (Eligibility Rules)

Học viên chỉ được tạo đánh giá khi thỏa mãn đồng thời:
1. Đã đăng nhập vào hệ thống.
2. Đã mua hoặc đăng ký khóa học hợp lệ (có bản ghi trong `enrollments` collection chưa bị xóa mềm).
3. Không phải giảng viên tạo ra khóa học (`course.instructorId !== userId`).
4. Tiến độ học tập thực tế nghiêm ngặt **lớn hơn 20%** (`progressPercent > 20%`).
   - Tiến độ 0%: Từ chối.
   - Tiến độ 15%: Từ chối.
   - Tiến độ 20%: Từ chối.
   - Tiến độ 20.1%: Chấp nhận.
   - Tiến độ 50%: Chấp nhận.
5. Chưa có đánh giá hiện có (active) cho khóa học đó (`deletedAt: null`).

---

## 2. Quy tắc Nghiệp vụ Tạo, Sửa, Xóa

- **Tạo Đánh giá:**
  - Số sao: Số nguyên từ 1 đến 5.
  - Nhận xét: Không bắt buộc, tự động trim khoảng trắng thừa, tối đa 2000 ký tự.
  - Chống trùng lặp & Race Condition: MongoDB Partial Unique Index `{ userId: 1, courseId: 1 }` với `{ partialFilterExpression: { deletedAt: null } }`.
  - Tự động cập nhật `ratingAvg` và `reviewCount` trên `CourseEntity` trong transaction.
- **Chỉnh sửa Đánh giá:**
  - Chỉ chủ sở hữu đánh giá (`review.userId === userId`) và vẫn còn quyền sở hữu khóa học mới được chỉnh sửa.
  - Cho phép thay đổi số sao và/hoặc nhận xét.
  - Tự động tính lại `ratingAvg` của khóa học. `reviewCount` không thay đổi.
- **Xóa Đánh giá:**
  - Chỉ chủ sở hữu đánh giá mới được xóa.
  - Sử dụng cơ chế Soft Delete (`deletedAt = new Date()`, `updatedById = userId`).
  - Hộp thoại xác nhận bắt buộc trước khi xóa (`DeleteConfirmDialog`).
  - Tự động giảm `reviewCount` và tính lại `ratingAvg` trên khóa học.
  - Đánh giá đã xóa không hiển thị công khai và không tính vào thống kê.
  - Học viên được phép tạo đánh giá mới sau khi xóa đánh giá cũ (nếu vẫn thỏa điều kiện).

