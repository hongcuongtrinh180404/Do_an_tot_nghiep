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

## 2. Quy tắc Nghiệp vụ Tạo, Sửa, Xóa (Học viên)

- **Tạo Đánh giá:**
  - Số sao: Số nguyên từ 1 đến 5.
  - Nhận xét: Không bắt buộc, tự động trim khoảng trắng thừa, tối đa 2000 ký tự.
  - Trạng thái ban đầu: `visible`.
  - Chống trùng lặp & Race Condition: MongoDB Partial Unique Index `{ userId: 1, courseId: 1 }` với `{ partialFilterExpression: { deletedAt: null } }`.
  - Tự động cập nhật `ratingAvg` và `reviewCount` trên `CourseEntity` trong transaction.
- **Chỉnh sửa Đánh giá:**
  - Chỉ chủ sở hữu đánh giá (`review.userId === userId`) và vẫn còn quyền sở hữu khóa học mới được chỉnh sửa.
  - **Khóa chỉnh sửa khi bị ẩn:** Nếu đánh giá đang ở trạng thái `hidden` do Admin ẩn vi phạm, học viên bị khóa quyền chỉnh sửa để ngăn vượt mặt kiểm duyệt.
  - Cho phép thay đổi số sao và/hoặc nhận xét.
  - Tự động tính lại `ratingAvg` của khóa học. `reviewCount` không thay đổi.
- **Xóa Đánh giá:**
  - Chỉ chủ sở hữu đánh giá mới được xóa.
  - Sử dụng cơ chế Soft Delete (`deletedAt = new Date()`, `updatedById = userId`).
  - Hộp thoại xác nhận bắt buộc trước khi xóa (`DeleteConfirmDialog`).
  - Tự động giảm `reviewCount` và tính lại `ratingAvg` trên khóa học.
  - Đánh giá đã xóa không hiển thị công khai và không tính vào thống kê.

---

## 3. Quy tắc Nghiệp vụ Quản trị & Kiểm duyệt (Admin)

### 3.1. Trạng thái Đánh giá
1. `visible`: Đánh giá đang được công khai trên trang chi tiết khóa học và được tính vào điểm trung bình.
2. `hidden`: Đánh giá bị Quản trị viên ẩn do vi phạm quy tắc cộng đồng hoặc nội dung không phù hợp.
3. `deleted`: Đánh giá đã bị xóa mềm (bởi học viên hoặc Admin).

### 3.2. Nghiêm cấm Sửa đổi Nội dung & Số sao
- **Admin TUYỆT ĐỐI KHÔNG** được tự ý sửa nội dung nhận xét hoặc thay đổi số sao của học viên. Quyền đánh giá thuộc về trải nghiệm của học viên. Admin chỉ có quyền ẩn, khôi phục hoặc xóa mềm đánh giá vi phạm.

### 3.3. Quy trình Ẩn Đánh giá (Hide)
- **Bắt buộc nhập lý do ẩn:** Admin phải cung cấp lý do vi phạm cụ thể (tối thiểu 5 ký tự).
- **Loại bỏ khỏi giao diện công khai:** Đánh giá lập tức biến mất khỏi trang chi tiết khóa học.
- **Loại khỏi thống kê:** Đánh giá bị ẩn không được tính vào `ratingAvg` và `reviewCount` của khóa học (tự động tính lại trong MongoDB Transaction).
- **Minh bạch với học viên:** Học viên vẫn xem được đánh giá của mình trong khóa học kèm thông báo trạng thái bị ẩn và lý do Admin đưa ra.
- **Lưu lịch sử:** Hệ thống tự động ghi nhận thông tin Admin thực hiện, hành động `'HIDE'`, lý do và thời gian xử lý vào mảng `moderationHistory`.

### 3.4. Quy trình Khôi phục Đánh giá (Restore)
- Admin có thể khôi phục đánh giá đã bị ẩn sau khi xác minh không vi phạm.
- Đánh giá chuyển về `visible`, `hideReason = null`.
- Đánh giá được hiển thị công khai trở lại tại trang khóa học.
- Điểm trung bình và tổng số đánh giá được tự động cộng lại trong Transaction.
- Hệ thống lưu lại lịch sử khôi phục (`'RESTORE'`) kèm ghi chú của Admin.

### 3.5. Quy trình Xóa Đánh giá Vi phạm (Delete)
- Ưu tiên xóa mềm (Soft Delete: gán `deletedAt = new Date()`, `status = 'deleted'`) sau khi Admin xác nhận qua hộp thoại `DeleteConfirmDialog`.
- Dữ liệu và lịch sử vi phạm được bảo toàn trong cơ sở dữ liệu phục vụ đối soát, thanh tra.
- Điểm trung bình và tổng số đánh giá được tính toán lại ngay lập tức.

### 3.6. Quy trình Xử lý Báo cáo Đánh giá (Reports)
- Người dùng/học viên có thể bấm cờ báo cáo vi phạm (`POST /api/v1/reviews/:id/report`) kèm lý do.
- Đánh giá bị báo cáo được đánh dấu với số lượt `reportCount > 0`.
- Admin xem xét chi tiết từng báo cáo tại trang quản trị:
  - Nếu vi phạm: Thực hiện **Ẩn** hoặc **Xóa mềm** đánh giá.
  - Nếu không vi phạm: Bấm **Bỏ qua báo cáo (Dismiss reports)** để xóa cờ cảnh báo và giữ nguyên trạng thái công khai.
