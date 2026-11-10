# Course Review — Dependencies & Module Integrations

> **Module:** Course Review & Rating

---

## 1. Upstream & Downstream Dependencies

- **Upstream Dependencies (Module này phụ thuộc vào):**
  - `auth-identity`: Xác thực danh tính học viên (JWT token, `userId`, `RoleEnum`).
  - `base-abstract-audit`: Cung cấp `BaseAbstractDocument`, `BaseRepository`, `BaseService`, quản lý session transaction và audit fields.
  - `course-management`: Cung cấp `CourseRepository` và `CourseEntity` để kiểm tra sự tồn tại khóa học, xác định giảng viên, và cập nhật `ratingAvg`, `reviewCount`.
  - `enrollment`: Cung cấp `EnrollmentRepository` để kiểm tra quyền sở hữu khóa học hợp lệ.
  - `learning-progress`: Cung cấp `LearningProgressService` để kiểm tra tiến độ học tập thực tế (> 20%).

- **Downstream Dependencies (Các module phụ thuộc vào module này):**
  - `frontend/src/features/course/components/public-detail/course-reviews-tab.tsx`: Hiển thị thống kê đánh giá thật, danh sách nhận xét, và form đánh giá/chỉnh sửa/xóa.
  - `frontend/src/features/course/components/public-detail/course-detail-header.tsx`: Hiển thị điểm trung bình và tổng lượt đánh giá thật.
  - `frontend/src/features/course/components/public-discovery/course-card.tsx`: Hiển thị số sao trung bình trên danh mục khóa học công khai.

