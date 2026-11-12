# Course Review — Dependencies & Module Integrations

> **Module:** Course Review & Rating

---

## 1. Upstream & Downstream Dependencies

- **Upstream Dependencies (Module này phụ thuộc vào):**
  - `auth-identity`: Xác thực danh tính học viên & phân quyền Admin (`@Roles(RoleEnum.ADMIN)`).
  - `base-abstract-audit`: Cung cấp `BaseAbstractDocument`, `BaseRepository`, `BaseService`, quản lý session transaction và audit fields.
  - `user`: Cung cấp `UserRepository` để lấy thông tin Admin xử lý kiểm duyệt (`adminName`) và thông tin người dùng báo cáo vi phạm.
  - `course-management`: Cung cấp `CourseRepository` và `CourseEntity` để kiểm tra sự tồn tại khóa học, xác định giảng viên, và cập nhật `ratingAvg`, `reviewCount`.
  - `enrollment`: Cung cấp `EnrollmentRepository` để kiểm tra quyền sở hữu khóa học hợp lệ.
  - `learning-progress`: Cung cấp `LearningProgressService` để kiểm tra tiến độ học tập thực tế (> 20%).

- **Downstream Dependencies (Các module phụ thuộc vào module này):**
  - `frontend/src/features/admin/reviews/`: Hệ thống giao diện quản lý và kiểm duyệt đánh giá dành cho Quản trị viên (`AdminReviewsView`, `ReviewDetailDialog`, `HideReviewDialog`, `RestoreReviewDialog`).
  - `frontend/src/app/(admin)/admin/reviews/page.tsx`: Tuyến trang admin quản lý đánh giá khóa học.
  - `frontend/src/features/course/components/public-detail/course-reviews-tab.tsx`: Hiển thị thống kê đánh giá thật, danh sách nhận xét, thông báo đánh giá bị ẩn và modal báo cáo vi phạm (`ReportReviewDialog`).
  - `frontend/src/features/course/components/public-detail/course-detail-header.tsx`: Hiển thị điểm trung bình và tổng lượt đánh giá thật.
  - `frontend/src/features/course/components/public-discovery/course-card.tsx`: Hiển thị số sao trung bình trên danh mục khóa học công khai.
