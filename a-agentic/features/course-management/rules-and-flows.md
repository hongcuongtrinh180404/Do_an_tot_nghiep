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

1. **Thứ tự hiển thị (Order Indexing)**:
   - Các chương học (`Chapter`) và bài học (`Lesson`) phải luôn được sắp xếp tăng dần theo trường `orderIndex`. Khi xóa hoặc chèn bài học, hệ thống duy trì tính liên tục của `orderIndex`.
2. **Trạng thái bài giảng liên quan tới Video**:
   - Khi tạo bài học mới và tải video lên, trạng thái video ban đầu là `UPLOADED`. Bài học chỉ có thể chuyển sang trạng thái `ACTIVE` khi AI Pipeline hoàn tất xử lý và trả về `READY`.
3. **Audit & Soft Delete**:
   - Mọi thao tác xóa khóa học/bài học đều sử dụng Soft Delete (`deletedAt != null`) để đảm bảo quyền lợi của học viên đã mua khóa học trước đó.
