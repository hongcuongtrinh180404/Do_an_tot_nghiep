# Course Review — Development History

> **Module:** Course Review & Rating

---

## 2026-11-09: Triển khai toàn diện Module Đánh giá & Nhận xét khóa học

### Root Cause / Bối cảnh:
Khóa học trên Mindly trước đây sử dụng dữ liệu review mẫu (`SAMPLE_REVIEWS`) với các chỉ số giả lập cứng (4.9 / 583 đánh giá). Hệ thống chưa có cơ chế cho phép học viên gửi đánh giá thật, chưa có điều kiện xác minh tiến độ học tập (> 20%) và chưa có cơ chế tính toán lại điểm trung bình an toàn.

### Giải pháp Kỹ thuật:
1. **Shared Contracts (`share-lib`):**
   - Tạo `IReview`, `IReviewUserSummary`, `ICourseReviewStats`, `IReviewEligibility`, `ICreateReviewPayload`, `IUpdateReviewPayload`.
   - Bổ sung `ratingAvg` và `reviewCount` vào `ICourse`.
2. **Backend Architecture (`backend/src/modules/review/`):**
   - Thiết kế `ReviewEntity` kế thừa `BaseAbstractDocument`, tạo Partial Unique Index `{ userId: 1, courseId: 1 }` trên các bản ghi chưa xóa (`deletedAt: null`).
   - `ReviewRepository` triển khai MongoDB Aggregation Pipeline tính toán trung bình điểm và phân bố 5 mức sao (1–5) chính xác, tự động loại bỏ các bản ghi đã xóa mềm.
   - `ReviewService` tích hợp `EnrollmentRepository` và `LearningProgressService` để kiểm tra quyền sở hữu và tiến độ học tập thực tế (> 20%). Tự động thực hiện các thao tác ghi và cập nhật thống kê khóa học bên trong session transaction (`withTransaction`).
   - `ReviewController` cung cấp các API công khai và bảo mật theo chuẩn REST.
3. **Frontend Integration (`frontend/src/features/course/`):**
   - Triển khai React Query API client và hooks quản lý review (`review.api.ts`).
   - Xây dựng component chọn sao trực quan (`StarRatingInput`), form đánh giá (`ReviewForm`) và tích hợp đầy đủ vào `CourseReviewsTab`, `CourseDetailHeader`, `CourseCard`.
   - Sử dụng `DeleteConfirmDialog` cho thao tác xóa đánh giá.

### Gotchas & Bài học Kinh nghiệm:
- **Xác định tiến độ > 20%:** Phải gọi trực tiếp `learningProgressService.getProgress()` để lấy `progressPercent` chuẩn từ cơ sở dữ liệu thay vì nhận tham số từ client để tránh giả mạo tiến độ.
- **Race Condition khi tạo đánh giá:** Sử dụng Partial Unique Index trong MongoDB kết hợp bắt mã lỗi `11000` để trả về `ConflictException` (409) an toàn khi học viên gửi nhiều yêu cầu đồng thời.
- **Tính toán lại thống kê an toàn:** Khi xóa mềm, cập nhật hoặc tạo mới, aggregation pipeline chạy trực tiếp với transaction session để đảm bảo tính nhất quán tuyệt đối giữa `reviews` collection và `courses.ratingAvg` / `courses.reviewCount`.

