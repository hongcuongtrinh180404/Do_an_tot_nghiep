# Course Management — Rules & Business Flows

> **Module:** Quản lý khóa học, chương học, bài giảng video và phân quyền giảng viên/học viên.

---

## 1. Nghiệp vụ & Luồng Dữ liệu (Business Overview)

- **Cấu trúc Khóa học phân cấp**:
  - `Course` (Khóa học): Chứa thông tin tiêu đề, mô tả, ảnh bìa (thumbnail), giảng viên (`instructorId`), giá bán (`price`), trạng thái xuất bản (`isPublished`).
  - `Chapter` (Chương học): Nhóm các bài học theo chủ đề thuộc một khóa học, có trường thứ tự `orderIndex`.
  - `Lesson` (Bài học): Đơn vị học tập cốt lõi. Mỗi bài học có thể chứa Video bài giảng, Mindmap Markdown, và bộ In-video Quiz.
- **Quyền hạn Giảng viên & Quản trị viên**:
  - Giảng viên (`INSTRUCTOR`) chỉ có thể chỉnh sửa, thêm bài học và xem doanh thu thuộc các khóa học do chính mình tạo ra (`createdById === user._id`).
  - Quản trị viên (`ADMIN`) có quyền duyệt (`publish`), gỡ bài hoặc xem toàn bộ danh mục khóa học của tất cả giảng viên.
- **Quyền hạn Học viên**:
  - Học viên (`USER`) xem được danh sách khóa học, xem thử các bài học miễn phí (`isFreePreview: true`).
  - Chỉ khi đã thanh toán thành công (có bản ghi `Enrollment` hợp lệ), học viên mới được mở khóa toàn bộ bài học có tính phí.

---

## 2. Quy tắc Nghiệp vụ Cốt lõi (Core Business Rules)

1. **Thứ tự hiển thị (Order Indexing) & Kéo - Thả (Drag & Drop)**:
   - Các chương học (`Section`) và bài học (`Lesson`) được sắp xếp tăng dần theo trường `order` (0-based).
   - Khi tạo chương học mới, trường `order` tự động được tính bằng `max(current_orders) + 1` (hoặc `0` nếu là chương đầu tiên) mà không cần người dùng nhập tay.
   - Thao tác Kéo - Thả (Drag & Drop) tại giao diện Master Tree tự động kích hoạt tính năng tính toán lại vị trí và đồng bộ hàng loạt vào CSDL thông qua MongoDB Transaction với cơ chế Silent Optimistic UI.
2. **Trạng thái bài giảng liên quan tới Video**:
   - Khi tạo bài học mới và tải video lên, trạng thái video ban đầu là `UPLOADED`. Bài học chỉ có thể chuyển sang trạng thái `ACTIVE` khi AI Pipeline hoàn tất xử lý và trả về `READY`.
3. **Audit & Soft Delete**:
   - Mọi thao tác xóa khóa học/bài học đều sử dụng Soft Delete (`deletedAt != null`) để đảm bảo quyền lợi của học viên đã mua khóa học trước đó.
4. **Lưu trữ & Truy vấn Sơ đồ Tư duy (`course_mindmaps`)**:
   - Nhằm tối ưu hóa tốc độ tải trang sơ đồ tư duy cho học viên mà không phải thực hiện các phép JOIN / `$lookup` qua 4 collection (`courses` -> `sections` -> `lessons` -> `keypoints`), hệ thống duy trì một document store `course_mindmaps` với khóa chính `courseId`.
   - **Ghi (Upsert)**: Khi Giảng viên nhấn nút "Cập nhật Mindmap", backend nhận toàn bộ chuỗi JSON và thực hiện upsert ghi đè (`findOneAndUpdate` với `upsert: true`). Chỉ Giảng viên sở hữu khóa học hoặc Quản trị viên (`ADMIN`) mới có quyền ghi đè.
   - **Đọc (Query)**: Endpoint `GET /api/v1/courses/:courseId/mindmap` mở công khai (Public), cho phép học viên và khách vãng lai truy vấn trực tiếp cây phân cấp JSON trong vài mili-giây để vẽ giao diện sơ đồ tư duy 4 cấp độ.
