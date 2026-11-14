# Revenue & Commission Management — Dev History

> **Module:** Revenue & Commission Management

---

## 2026-11-12: Triển khai Quản lý Doanh thu & Hoa hồng Admin Mindly

### 1. Yêu cầu & Bối cảnh
- Triển khai toàn diện tính năng Quản lý Doanh thu dành cho Admin với đúng 2 tab: "Tổng quan doanh thu" và "Doanh thu giảng viên".
- Chuyển hướng mục "Quản lý đơn hàng" (`/admin/orders`) thành "Quản lý Đơn hàng, Giao dịch & Doanh thu" (`/admin/revenue`). Xóa bỏ hoàn toàn route cũ `/admin/orders`.
- Tính toán chia doanh thu chính xác: Nền tảng ($R\%$) và Giảng viên ($(100-R)\%$). Bất biến: Tổng tiền nền tảng + giảng viên luôn bằng tổng số tiền thanh toán thực tế của học viên.
- Xử lý đơn hàng lịch sử cũ (legacy fallback 30% Mindly / 70% giảng viên).
- Cấu hình hoa hồng mặc định qua biểu tượng bánh răng ở góc trên bên phải tab Doanh thu giảng viên.
- Điều chỉnh hoa hồng riêng theo từng giảng viên tại trang chi tiết `/admin/revenue/instructors/[instructorId]`.
- Lưu vết lịch sử thay đổi hoa hồng bất biến.
- Danh sách giao dịch thành công dạng thẻ ngang (Card ngang), không dùng bảng, tuyệt đối không hiển thị badge trạng thái thanh toán trên thẻ. Drawer chi tiết 5 nhóm thông tin.

### 2. Implementation Details

#### Shared Library (`share-lib`):
- `share-lib/src/interfaces/order.interface.ts`: Bổ sung `instructorId`, `platformCommissionRate`, `platformEarnings`, `instructorEarnings`.
- `share-lib/src/interfaces/user.interface.ts`: Bổ sung `commissionRate`, `commissionRateUpdatedAt`, `commissionRateUpdatedById`.
- `share-lib/src/interfaces/revenue.interface.ts`: Định nghĩa bộ interfaces cho KPI, Chart, Transaction Cards, Transaction Detail, Instructor Summary/Detail/Courses, Commission Config/History.

#### Backend (`backend/`):
- Schemas: `CommissionSettingEntity`, `CommissionHistoryEntity`. Bổ sung trường & compound indexes trên `OrderEntity` và `UserEntity`.
- Repositories: `CommissionSettingRepository`, `CommissionHistoryRepository`, `OrderRepository` (implement 7 aggregation pipelines tối ưu cho doanh thu, hỗ trợ legacy fallback), `UserRepository`.
- Service: `RevenueService` kế thừa `BaseService`, quản lý trọn vẹn nghiệp vụ doanh thu, hoa hồng, làm tròn chuẩn xác. Cập nhật `PaymentService.createOrder` để snapshot tỷ lệ hoa hồng lúc tạo đơn hàng.
- Controller: `RevenueController` với `@Roles(RoleEnum.ADMIN)`.
- Tests: 12 unit tests cho `RevenueService` trong `revenue.service.spec.ts`. Toàn bộ 60 tests module payment vượt qua 100%.

#### Frontend (`frontend/`):
- Xóa bỏ trang `/admin/orders`, cập nhật menu admin sang `/admin/revenue`.
- Xây dựng API client và TanStack Query hooks trong `features/admin/revenue/api/revenue-admin.api.ts`.
- Components:
  - `revenue-time-filter.tsx`: Bộ lọc thời gian chuẩn giờ VN UTC+7 (presets + custom).
  - `revenue-kpi-cards.tsx`: 4 thẻ KPI doanh thu kèm skeleton.
  - `revenue-chart.tsx`: Biểu đồ SVG chuyên nghiệp thể hiện 3 luồng doanh thu.
  - `transaction-card.tsx` & `transaction-cards-list.tsx`: Thẻ ngang không có badge trạng thái, tìm kiếm 1 ô tổng hợp, select sắp xếp, pagination chuẩn 10/20/50.
  - `transaction-detail-drawer.tsx`: Drawer chi tiết trượt ngang 5 nhóm thông tin rõ ràng.
  - `default-commission-dialog.tsx`: Modal cài đặt hoa hồng mặc định hệ thống.
  - `instructor-commission-dialog.tsx`: Modal điều chỉnh hoa hồng giảng viên.
  - `instructors-revenue-table.tsx`: Bảng thống kê giảng viên kèm link xem chi tiết và nút bánh răng.
  - `revenue-view.tsx`: Giao diện 2 tab chính đồng bộ URL query params.
  - `instructor-detail-view.tsx`: Giao diện chi tiết doanh thu giảng viên với banner, KPI, lịch sử hoa hồng, danh sách khóa học và giao dịch gần đây.

### 3. Root Causes & Gotchas Resolved
- **Gotcha 1: `PaginationResult` name collision**: Cả `users-admin.api.ts` và `revenue-admin.api.ts` cùng export `PaginationResult`, dẫn đến lỗi TS2308 khi export trong `src/features/admin/index.ts`. Giải pháp: đổi thành `RevenuePaginationResult<T>` trong revenue API client tương tự như `AdminCoursesPaginationResult<T>`.
- **Gotcha 2: Button `asChild` không hỗ trợ trong `@base-ui/react/button`**: Dự án dùng `@base-ui/react/button` thay vì Radix UI, nên prop `asChild` bị báo lỗi type. Giải pháp: render trực tiếp thẻ `<Link>` của Next.js với class button tiện ích.

---

## 2026-11-12: Triển khai Trang "Thống kê giảng dạy" Dành Riêng Cho Giảng Viên

### 1. Yêu cầu & Bối cảnh
- Xây dựng trang Thống kê giảng dạy (`/instructor/statistics`) chuyên biệt cho tài khoản Giảng viên theo dõi 4 phân khu chính:
  1. Tổng quan (4 KPI Cards: Tổng doanh thu trước hoa hồng, Thu nhập sau hoa hồng theo tỷ lệ thực tế từng giao dịch, Lượt mua thành công, Đánh giá trung bình kèm số lượng đánh giá hợp lệ).
  2. Doanh thu theo khóa học (Bảng thống kê với thumbnail, tên, số lượt mua, tổng doanh thu, thu nhập sau hoa hồng, tìm kiếm, sắp xếp doanh thu/thu nhập/lượt mua, phân trang, hiển thị cả khóa 0 doanh thu và khóa học ngừng bán).
  3. Thống kê đánh giá (Điểm TB, tổng lượt đánh giá, phân bổ thanh tiến trình 1-5 sao theo tỷ lệ thực tế, lọc theo tất cả khóa học hoặc từng khóa học cụ thể).
  4. Đánh giá gần đây (Card nhận xét học viên với tên, avatar, khóa học, điểm sao, nội dung nhận xét, thời gian, hỗ trợ lọc theo khóa học, lọc 1-5 sao, sắp xếp mới nhất/cũ nhất, phân trang).
- Bảo mật nghiêm ngặt: Phân quyền tại Backend `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`, cách ly dữ liệu bằng `@CurrentUser('id')`, không lộ thông tin giao dịch, số tài khoản học viên hay mã SePay.
- Giao diện chuẩn Anti-Slop (`design-taste-frontend` v2, `references/app-screens.md`): Không icon viền dạ quang, không gradient sặc sỡ, cấm màu tím (Purple Ban), typography sắc nét, căn phải chuẩn xác số liệu tiền tệ `tabular-nums`.

### 2. Implementation Details
- **`share-lib`**:
  - `IInstructorCourseRevenue`: Thêm `instructorEarnings?: number`.
  - `ITeachingStatsOverview`: Định nghĩa interface cho 4 KPI tổng quan.
- **Backend (`backend/src/modules/`)**:
  - `OrderRepository.getInstructorCoursesRevenue`: Bổ sung tham số `search` (regex case-insensitive), `sort` (`revenue_desc`, `earnings_desc`, `sales_desc`), projection `instructorEarnings` từ đơn hàng kèm fallback.
  - `ReviewRepository`: Bổ sung `calculateInstructorReviewStats` (hỗ trợ lọc theo `courseId` hoặc tổng hợp tất cả khóa học) và `findInstructorReviews` (lọc đánh giá hợp lệ `status === ReviewStatusEnum.VISIBLE` và `deletedAt === null`, hỗ trợ lọc sao, lọc khóa học, sắp xếp, phân trang).
  - `RevenueService`: Thêm `getInstructorTeachingOverview` và `getInstructorCoursesStats`.
  - `InstructorTeachingStatsController`: Khởi tạo controller `@Controller('instructor/teaching-stats')` với 2 endpoint `@Get('overview')` và `@Get('courses')`.
  - `ReviewController`: Bổ sung 2 endpoint `@Get('instructor/stats')` và `@Get('instructor')`.
  - Tests: Đầy đủ 52 unit test cases vượt qua 100% trong `instructor-teaching-stats.controller.spec.ts`, `revenue.service.spec.ts`, `review.controller.spec.ts`, `review.service.spec.ts`.
- **Frontend (`frontend/src/features/instructor/statistics/`)**:
  - `teaching-stats.api.ts`: API client và TanStack Query hooks.
  - `teaching-revenue-time-filter.tsx`: Bộ lọc thời gian (Tất cả thời gian [mặc định], 7 ngày, 30 ngày, Tháng này, Năm nay).
  - `teaching-overview-cards.tsx`: 4 thẻ KPI tổng quan chuẩn typography.
  - `course-revenue-table.tsx`: Bảng doanh thu theo khóa học với tìm kiếm, sắp xếp và phân trang.
  - `teaching-review-stats-section.tsx`: Thống kê phân bổ sao 1-5 kèm lọc theo khóa học.
  - `teaching-recent-reviews-section.tsx`: Thẻ nhận xét học viên, xử lý đánh giá chỉ có sao không có văn bản.
  - `teaching-stats-view.tsx`: Điều phối 4 section mượt mà trên 1 trang.
  - `page.tsx`: Route `/instructor/statistics` bọc trong `InstructorCourseAccess`.
  - Điều hướng: Nút "Thống kê giảng dạy" được đặt trong menu dropdown tài khoản của Giảng viên (và phần tài khoản mobile), ẩn khỏi thanh header chung và header khóa học để giao diện tinh gọn, tập trung.

### 3. Root Causes & Gotchas Resolved
- **Gotcha: Mặc định lọc thời gian "Tất cả thời gian"**: Trong `revenue-date.util.ts`, trước đây `all` bị rơi vào `default` (30 ngày). Đã bổ sung `case 'all': case 'all_time':` trả về `startDate: undefined, endDate: undefined`, qua đó không áp đặt điều kiện ngày tháng lên MongoDB query, đảm bảo trả về chính xác toàn bộ lịch sử giao dịch.
- **Gotcha 3: Cache stale types của `.next` sau khi xóa thư mục `/admin/orders`**: Next.js cache kiểu trang cũ gây lỗi TS2307. Giải pháp: xóa thư mục `frontend/.next`, `tsc --noEmit` hoàn thành thành công không còn lỗi nào.

---

## 2026-11-12 (Update): Cấu hình hoa hồng mặc định ghi đè toàn bộ giảng viên & khóa học

### 1. Yêu cầu & Bối cảnh
- Khi Admin thay đổi tỷ lệ hoa hồng mặc định tại biểu tượng bánh răng, hệ thống phải áp dụng đồng loạt cho **TẤT CẢ giảng viên**, ghi đè toàn bộ tỷ lệ hoa hồng riêng từng cài đặt trước đó, và áp dụng ngay lập tức cho các giao dịch mua khóa học mới.

### 2. Triển khai
- **Shared Library (`share-lib`)**: Thêm `targetType?: 'SYSTEM' | 'INSTRUCTOR'` vào `ICommissionHistoryItem`.
- **Backend (`backend/`)**:
  - `UpdateCommissionConfigDto`: Bổ sung trường `reason?: string` kèm validation & transformer.
  - `UserRepository`: Thêm `updateAllInstructorsCommissionRate(newRate, adminId, session)` thực thi `updateMany` trên toàn bộ user role `INSTRUCTOR`.
  - `CommissionHistoryRepository`: Cập nhật schema & query `findByInstructorId` truy vấn cả lịch sử cá nhân lẫn lịch sử hệ thống (`targetType: 'SYSTEM'`).
  - `RevenueService`: Bọc `updateCommissionConfig` trong MongoDB Transaction: cập nhật setting hệ thống $\rightarrow$ ghi đè toàn bộ giảng viên $\rightarrow$ ghi log lịch sử `targetType: 'SYSTEM'`.
  - Unit tests: Bổ sung test kiểm tra gọi đồng thời `updateAllInstructorsCommissionRate` và `create` history với `SYSTEM`.
- **Frontend (`frontend/`)**:
  - `revenue-admin.api.ts`: Cập nhật `updateCommissionConfig` nhận object `{ defaultRate, reason }` và invalidate toàn bộ query liên quan (`all`, `commissionConfig`).
  - `default-commission-dialog.tsx`: Bổ sung ô nhập lý do bắt buộc, cập nhật cảnh báo ghi đè toàn bộ giảng viên, và bước xác nhận 2 bước rõ ràng.
  - `instructor-detail-view.tsx`: Bổ sung cột và Badge phân biệt "Toàn hệ thống" vs "Tùy chỉnh riêng" trong bảng lịch sử hoa hồng của từng giảng viên.


