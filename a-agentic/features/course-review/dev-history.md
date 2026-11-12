# Course Review — Development History

> **Module:** Course Review & Rating

---

## 2026-11-11: Sửa kết nối dữ liệu database trên trang Admin Reviews

### Nguyên nhân:
- API admin trả 404 do backend không biên dịch lại được: aggregation pipeline dùng kiểu `Record<string, unknown>[]` thay vì `PipelineStage[]`, và `ReviewModerationAction` chưa được import dưới dạng type-only trong schema có decorator.
- Giao diện không phân biệt lỗi tải dữ liệu với danh sách rỗng. Handler phân trang gọi cả `setPage` và `setLimit`, khiến URL bị đặt lại về trang 1.

### Thay đổi:
- Sửa kiểu dữ liệu để backend build và nạp được các endpoint admin hiện có; escape ký tự regex trong tìm kiếm để truy vấn theo văn bản nguyên nghĩa.
- Sửa handler phân trang, bổ sung nút Làm mới, trạng thái lỗi/thử lại cho danh sách, thống kê và chi tiết; hiển thị điểm trung bình bằng 0 khi chưa có đánh giá.
- Hiển thị đúng nhãn lọc số sao và giữ các thẻ thống kê nằm ngang để bảng còn vùng hiển thị dữ liệu trên điện thoại.
- Không chạy script seed, không xóa hay thay đổi dữ liệu đánh giá hiện có. Dữ liệu seed đã nằm trong database vẫn được trả về như các bản ghi khác.

### Kiểm chứng:
- Build `share-lib`, backend và frontend thành công; ESLint các component được sửa và Oxlint các file backend liên quan thành công.
- `pnpm --filter backend exec vitest run src/modules/review/tests`: 55/55 tests đạt, bao gồm HTTP contract, quyền admin, DTO, aggregation, dữ liệu rỗng và thống kê.
- Đối chiếu API đang chạy với MongoDB bằng truy vấn chỉ đọc: phân trang, lọc trạng thái/số sao, sắp xếp, tìm kiếm, thông tin học viên/khóa học và chi tiết đều khớp. Không đăng nhập trả 401, học viên trả 403.
- Kiểm tra bản production trong trình duyệt ở 1440/768/390px, cùng luồng lỗi/thử lại, dữ liệu rỗng và thống kê bằng 0; không có lỗi JavaScript. Hash collection reviews trước và sau kiểm tra không thay đổi.
- Type-check production backend đạt. Type-check toàn bộ backend (gồm tests) còn lỗi có sẵn trong các test course service, ngoài phạm vi thay đổi này.

---

## 2026-11-11: Triển khai Hệ thống Quản trị & Kiểm duyệt Đánh giá Khóa học (Admin Course Reviews Management)

### Root Cause / Bối cảnh:
Trước đây hệ thống chỉ có luồng đánh giá phía học viên. Quản trị viên (Admin) chưa có trang quản lý tập trung toàn bộ đánh giá trên sàn, chưa có công cụ kiểm duyệt để ẩn các đánh giá vi phạm quy tắc cộng đồng kèm lý do bắt buộc, chưa thể khôi phục hay xóa mềm và chưa có tính năng tiếp nhận / giải quyết báo cáo vi phạm từ học viên.

### Giải pháp Kỹ thuật:
1. **Shared Contracts (`share-lib`):**
   - Định nghĩa `ReviewStatusEnum` với 3 trạng thái: `VISIBLE = 'visible'`, `HIDDEN = 'hidden'`, `DELETED = 'deleted'`.
   - Bổ sung `IReviewModerationEntry` (hành động `HIDE` / `RESTORE` / `DELETE`, `adminId`, `adminName`, `reason`, `createdAt`).
   - Bổ sung `IReviewReportEntry` (thông tin người báo cáo và lý do vi phạm).
   - Mở rộng `IReview` và `IAdminReviewStats` (KPI cards).
2. **Backend Architecture (`backend/src/modules/review/`):**
   - Nâng cấp `ReviewEntity` lưu trữ `status`, `hideReason`, `moderationHistory` (embedded), `reports` (embedded), `reportCount`.
   - Thiết lập Compound Indexes: `{ courseId: 1, status: 1, deletedAt: 1, createdAt: -1 }`, `{ status: 1, deletedAt: 1, createdAt: -1 }`, `{ reportCount: -1, status: 1 }`.
   - Nâng cấp `ReviewRepository`: Public listing và `calculateCourseReviewStats` chỉ tổng hợp các bản ghi `status: 'visible'` và `deletedAt: null`. Thêm `findAdminReviews` tìm kiếm đa trường qua MongoDB Aggregation `$lookup` (học viên, khóa học, nhận xét).
   - Nâng cấp `ReviewService`:
     - `adminHideReview`: Bắt buộc nhập lý do ẩn (tối thiểu 5 ký tự), chuyển trạng thái `hidden`, ghi nhận vào `moderationHistory`, tự động loại khỏi thống kê và cập nhật điểm khóa học trong session transaction.
     - `adminRestoreReview`: Chuyển trạng thái `visible`, xóa `hideReason`, tính lại điểm trung bình trong transaction.
     - `adminDeleteReview`: Soft delete, ghi log kiểm duyệt và tính lại điểm khóa học.
     - `reportReview`: Cho phép học viên gửi báo cáo vi phạm, tăng `reportCount`.
     - `adminDismissReports`: Xóa danh sách báo cáo nếu đánh giá không vi phạm.
     - **Bảo vệ quyền tác giả:** Khóa quyền sửa nội dung hoặc thay đổi số sao đối với Admin (`updateReview` chỉ cho phép chính học viên sở hữu). Khóa quyền chỉnh sửa của học viên nếu đánh giá đang bị ẩn.
   - Viết 25/25 unit tests kiểm thử toàn diện (`review.service.spec.ts`), đạt tỷ lệ vượt qua 100%.
3. **Frontend Architecture (`frontend/src/features/admin/reviews/` & `course/`):**
   - Thay thế trang placeholder tại `frontend/src/app/(admin)/admin/reviews/page.tsx` bằng `AdminReviewsView`.
   - Tích hợp `BaseDataTable` và `useDataTableUrlState` (URL params sync: page, limit, search, status, rating, sort).
   - Cung cấp KPI Cards (Tổng số, Công khai, Bị ẩn, Bị báo cáo, Điểm TB toàn sàn) và 5 Tab điều hướng nhanh (`ALL`, `visible`, `hidden`, `reported`, `deleted`).
   - Xây dựng bộ dialog kiểm duyệt chuyên nghiệp: `ReviewDetailDialog` (xem chi tiết, timeline lịch sử, báo cáo), `HideReviewDialog` (bắt buộc nhập lý do vi phạm qua Zod), `RestoreReviewDialog`, và `DeleteConfirmDialog`.
   - Nâng cấp `CourseReviewsTab`: Hiển thị cảnh báo giải thích rõ ràng khi đánh giá của chính học viên bị ẩn (`myReview.status === 'hidden'`) kèm lý do từ Admin, đồng thời bổ sung `ReportReviewDialog` để học viên báo cáo các nhận xét vi phạm khác.

### Gotchas & Bài học Kinh nghiệm:
- **Tính nhất quán thống kê đa collection:** Khi ẩn hoặc khôi phục đánh giá, việc tính toán lại `ratingAvg` và `reviewCount` của `CourseEntity` phải được thực hiện bên trong MongoDB Transaction (`withTransaction`) để tránh sai lệch dữ liệu nếu có lỗi gián đoạn.
- **Embedded vs Referenced Audit Trail:** Lưu lịch sử kiểm duyệt (`moderationHistory`) dạng mảng embedded trong `ReviewEntity` giúp truy vấn chi tiết nhanh gấp nhiều lần so với join collection riêng, hoàn toàn phù hợp với vòng đời kiểm duyệt hữu hạn của một bản ghi đánh giá.
- **Bảo vệ học viên và kiểm duyệt:** Khi đánh giá bị ẩn do vi phạm, cần tạm khóa nút "Chỉnh sửa" phía học viên để ngăn học viên cố ý sửa nội dung nhẹ hơn nhằm lách luật mà không qua quy trình giải trình / xem xét lại của Quản trị viên.

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
