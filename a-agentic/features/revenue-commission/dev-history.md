# Revenue & Commission Management — Dev History

> **Module:** Revenue & Commission Management

---

## 2026-11-22: Nâng cấp Bộ lọc Thời gian "Kỳ báo cáo" tại Trang Thống kê Giảng dạy (/instructor/statistics)

- **Yêu cầu**:
  - Tại trang Thống kê giảng dạy (`/instructor/statistics`):
    - Thêm tùy chọn **"Hôm nay"** (`today`) và **"Tùy chỉnh khoảng ngày"** (`custom`) vào dropdown select "Kỳ báo cáo".
    - Áp dụng cơ chế lọc ngày và trải nghiệm người dùng tương tự như trang Admin Dashboard.
- **Triển khai**:
  1. **Frontend Component (`frontend/src/features/instructor/statistics`)**:
     - `teaching-revenue-time-filter.tsx`:
       - Mở rộng kiểu dữ liệu `TeachingTimeFilterValue`: `{ timeRange: string; startDate?: string; endDate?: string }`.
       - Bổ sung tùy chọn `today` ("Hôm nay") và `custom` ("Tùy chỉnh khoảng ngày") vào `PRESET_OPTIONS`.
       - Tích hợp cụm điều khiển khoảng ngày (Custom Date Pickers): input `Từ:`, `Đến:` và nút `Áp dụng` đồng bộ phong cách Admin Dashboard.
       - Tích hợp kiểm tra tính hợp lệ: nếu `startDate > endDate` thì chặn submit và thông báo `toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc')`. Khi hợp lệ, gọi `onChange` và hiển thị `toast.success`.
       - Tích hợp huy hiệu (badge) định dạng khoảng ngày theo thời gian thực tương ứng với từng mốc thời gian hoặc tùy chỉnh.
     - `teaching-stats-view.tsx`:
       - Cập nhật truy vấn `useTeachingOverviewQuery` và `useCoursesRevenueQuery` để đồng bộ truyền `startDate` và `endDate` khi `timeFilter.timeRange === 'custom'`.
       - Điều chỉnh container bộ lọc sang `flex flex-wrap items-center gap-3 shrink-0` chống tràn giao diện trên thiết bị di động/màn hình nhỏ.
     - `teaching-revenue-time-filter.spec.tsx`:
       - Viết bộ 5 unit test kiểm thử render mặc định, render tùy chọn hôm nay, hiển thị date pickers khi chọn custom, kích hoạt `onChange` khi áp dụng ngày hợp lệ, và bắt lỗi khi ngày bắt đầu lớn hơn ngày kết thúc.
  2. **Backend Controller Test (`backend/src/modules/payment/tests`)**:
     - `instructor-teaching-stats.controller.spec.ts`: Bổ sung các unit test cases kiểm tra `getOverview` và `getCourses` với tham số `today` và `custom` (`startDate`, `endDate`).
- **Kết quả kiểm thử**:
  - Frontend: 5/5 unit tests pass (`teaching-revenue-time-filter.spec.tsx`).
  - Admin Dashboard regression: 27/27 unit tests pass (`admin-dashboard.spec.ts`).
  - Backend: 5/5 unit tests pass (`instructor-teaching-stats.controller.spec.ts`).

---

## 2026-11-21: Chuyển đổi "Bảng xếp hạng Giảng viên tiêu biểu" sang dữ liệu thật MongoDB và loại bỏ mock data

- **Yêu cầu**:
  - Tại 2 trang Quản Trị:
    - **Tổng quan** (`/admin/dashboard`)
    - **Quản Lý Doanh Thu & Hoa Hồng** (`/admin/revenue`)
  - Bảng "Bảng xếp hạng Giảng viên tiêu biểu" (`DashboardInstructorsSection`) đang dùng mock data tĩnh `INSTRUCTORS_DATA` và công thức giả lập `scaleMap`.
  - Chuyển sang truy vấn dữ liệu thực tế từ database MongoDB, loại bỏ mock data ở frontend. Không kích hoạt tương tác mở Drawer khi click hàng.
- **Triển khai**:
  1. **Shared Library (`share-lib`)**:
     - Bổ sung interface `IDashboardInstructor` và `IDashboardInstructorCourse` vào `share-lib/src/interfaces/admin-dashboard.interface.ts`.
     - Cập nhật `IAdminDashboardAggregateResponse` hỗ trợ `instructors?: IDashboardInstructor[]`.
     - Build `share-lib`.
  2. **Backend NestJS (`backend/src/modules/admin-dashboard`)**:
     - `admin-dashboard.dto.ts`: Tạo `AdminInstructorsRankingQueryDto` hỗ trợ `period`, `startDate`, `endDate`, `sortBy` (`grossRevenue`, `salesCount`, `netRevenue`), `limit`.
     - `admin-dashboard.repository.ts`: Triển khai pipeline aggregation `getInstructorsRanking()`:
       - Lọc giảng viên hợp lệ từ collection `users` (`role: instructor`, `deletedAt: null`).
       - `$lookup` khóa học đã công khai từ `courses` (`status: published`, `deletedAt: null`) để đếm `coursesCount`.
       - `$lookup` đơn hàng thành công từ `orders` (`status: paid`, `deletedAt: null`, lọc theo `paidAt`/`createdAt` trong kỳ) để tính `salesCount`, `grossRevenue`, `netRevenue` (`instructorEarnings`).
       - Sắp xếp linh hoạt theo `sortBy` (`grossRevenue`, `salesCount`, `netRevenue`) và giới hạn theo `limit`.
     - `admin-dashboard.service.ts`: Thêm `getInstructorsRanking()` và tích hợp vào `getAggregate()`.
     - `admin-dashboard.controller.ts`: Thêm endpoint `GET /admin/dashboard/instructors/ranking` kèm `@Header('Cache-Control', 'no-store')`.
     - `admin-dashboard.service.spec.ts`: Bổ sung unit tests cho phương thức `getInstructorsRanking` và `getAggregate`.
  3. **Frontend Next.js (`frontend/src/features/admin`)**:
     - `admin-dashboard.api.ts`: Bổ sung `fetchAdminDashboardInstructorsRanking` và query hook `useAdminDashboardInstructorsRankingQuery`.
     - `mock-dashboard-data.ts`: Xóa bỏ hoàn toàn mảng mock `INSTRUCTORS_DATA`.
     - `dashboard-instructors-section.tsx`:
       - Tích hợp hook `useAdminDashboardInstructorsRankingQuery`.
       - Hỗ trợ lọc theo thời gian (`period`, `customDates`), tiêu chí sắp xếp (`grossRevenue`, `salesCount`, `netRevenue`), và số lượng hiển thị (`Top 5`, `Top 10`).
       - Thêm Skeleton loading state khi đang tải dữ liệu.
       - Thêm Empty state khi chưa có dữ liệu xếp hạng trong kỳ lọc.
       - Thêm Error state kèm nút thử lại khi kết nối gián đoạn.
       - Hỗ trợ hiển thị ảnh đại diện thật từ `avatarUrl`, tự động fallback về initials badge kèm màu sắc theo palette.
       - Giữ nguyên trạng thái không kích hoạt drawer khi click dòng theo yêu cầu người dùng.
     - `revenue-view.tsx` & `admin-dashboard-view.tsx`: Đồng bộ truyền `globalPeriod` và `customDates` sang `DashboardInstructorsSection`.
     - `revenue-instructors-ranking.spec.ts` & `admin-dashboard.spec.ts`: Cập nhật unit tests kiểm tra bảng xếp hạng với dữ liệu thực tế và mock API.
- **Kết quả kiểm thử**:
  - Backend tests: 22/22 unit tests pass (`admin-dashboard.service.spec.ts`, `revenue.service.spec.ts`).
  - Backend build: `nest build` thành công 100%.
  - Frontend tests: 30/30 unit tests pass (`revenue-instructors-ranking.spec.ts`, `admin-dashboard.spec.ts`).
  - Toàn bộ feature tests của revenue: 24/24 tests pass.

---

## 2026-11-21: Chuẩn hóa toàn diện Dropdown Select theo mẫu UI Base UI

- **Yêu cầu**:
  - Dựa trên giao diện mẫu từ ảnh thực tế trên trang Quản Lý Doanh Thu & Hoa Hồng (`/admin/revenue`), chuẩn hóa toàn bộ Dropdown Select trong hệ thống:
    - Popup dropdown bo góc lớn `rounded-2xl`, bóng đổ mềm `shadow-xl`, viền mỏng tinh tế `border-border/60`.
    - Tự động highlight mục đang chọn bằng màu xanh chủ đạo (`data-selected:text-primary data-selected:font-semibold`) kèm icon tick `✓` (`lucide:check`) nằm ở cạnh phải (`absolute right-2.5`).
    - Nút Trigger bo góc `rounded-xl`, chiều cao chuẩn `h-9` hoặc `h-8`, mũi tên `lucide:chevron-down` tự xoay 180° khi mở menu.
  - Đồng bộ hóa toàn bộ các trang khác trong hệ thống để thay thế hoàn toàn các thẻ HTML `<select>` nguyên bản cũ còn sót lại.
- **Triển khai**:
  1. **Core Component (`frontend/src/components/ui/select.tsx`)**:
     - Cập nhật `SelectTrigger` bo góc `rounded-xl`, viền và hover tinh tế.
     - Cập nhật `SelectContent` bo góc `rounded-2xl`, shadow `shadow-xl`, padding `p-1.5`.
     - Cập nhật `SelectItem` có class `data-selected:text-primary data-selected:font-semibold`, padding `py-2 pl-3 pr-8`, indicator icon `lucide:check` bên phải `size-4`.
  2. **Trang Doanh Thu & Hoa Hồng (`/admin/revenue`)**:
     - `transaction-time-filter.tsx`: Thay thế thẻ `<select>` nguyên bản bằng `@/components/ui/select`, giữ nguyên toàn bộ logic xử lý ngày và lọc tùy chỉnh.
  3. **Trang Dashboard Admin (`/admin/dashboard`)**:
     - `dashboard-header.tsx`: Thay thế `<select>` kỳ báo cáo thời gian bằng `Select`.
     - `dashboard-revenue-section.tsx`: Thay thế `<select>` kỳ ghi đè bằng `Select`.
     - `dashboard-courses-section.tsx`: Thay thế 3 `<select>` (thời gian, danh mục, giảng viên) bằng `Select`.
     - `dashboard-instructors-section.tsx`: Thay thế 3 `<select>` (thời gian, tiêu chí sắp xếp, giới hạn hiển thị) bằng `Select`.
     - `dashboard-reviews-section.tsx`: Thay thế 3 `<select>` (thời gian, danh mục, ngưỡng tối thiểu) bằng `Select`.
  4. **Trang Khóa học & Catalog**:
     - `course-management-content.tsx`: Thay thế `<select>` sắp xếp danh sách bằng `Select`.
     - `course-catalog-sort.tsx`: Thay thế `<select>` sắp xếp bằng `Select`.
     - `recent-courses.tsx`: Thay thế `<select>` sắp xếp bằng `Select`.
- **Kết quả kiểm thử**:
  - `tsc --noEmit`: 0 lỗi typecheck trên toàn bộ project frontend.
  - Vitest: 18/18 tests pass (`transaction-time-filter.spec.ts`, `transaction-table.spec.ts`, `revenue-instructors-ranking.spec.ts`).
  - Đã loại bỏ 100% các thẻ `<select>` HTML thô trên toàn codebase.

---

## 2026-11-20: Khắc phục lỗi hiển thị Biểu Đồ Doanh Thu & Hoa Hồng theo chuẩn design-taste-frontend & web-design-guidelines

- **Nguyên nhân lỗi (Root Cause)**:
  1. *Unmount Canvas khi Loading/Empty*: Component cũ sử dụng `if (isLoading) return <Skeleton />` và `if (isEmpty) return <EmptyState />`. Khi component mount lúc đang load dữ liệu (`isLoading = true`), thẻ `<canvas ref={canvasRef} />` chưa có trong DOM (`canvasRef.current === null`). Khi query hoàn tất và `isLoading` chuyển về `false`, thẻ canvas mới được render nhưng `useEffect([chartType, isEmpty])` không chạy lại (do dependency không chứa `isLoading`), dẫn đến Chart.js không bao giờ được khởi tạo trên canvas mới.
  2. *Xung đột Canvas Registry trong Chart.js*: Khi Fast Refresh hoặc React re-render, canvas cũ chưa được giải phóng qua `Chart.getChart(canvas)?.destroy()`, có thể gây lỗi "Canvas is already in use".
  3. *Lỗi kiểu dữ liệu trong dashboard-revenue-section.tsx*: `groupBy` kiểu `RevenueGroupBy` ('day' | 'month' | 'year') truyền vào `useAdminDashboardChartQuery` vốn chỉ nhận `'day' | 'month'`.
- **Giải pháp áp dụng chuẩn `design-taste-frontend` & `web-design-guidelines`**:
  1. *Khung cố định ổn định (Keep its frame)*: Thẻ `<section>` và khung `<canvas>` luôn được giữ cố định trong DOM từ khi mount, triệt tiêu hoàn toàn layout shift (CLS).
  2. *Trạng thái Loading dạng Overlay*: Khi `isLoading = true`, hiển thị overlay mờ phủ lên khung biểu đồ (`bg-card/75 backdrop-blur-2xs`) với spinner, không unmount canvas.
  3. *Trạng thái Rỗng trung thực (Honest data state)*: Dữ liệu trống hoặc bằng 0 vẫn vẽ đường baseline 0 rõ ràng, kèm badge thông báo nhẹ nhàng giữa biểu đồ.
  4. *Quản lý Lifecycle Chart.js an toàn*: Kiểm tra và hủy `Chart.getChart(canvas)` trước khi khởi tạo instance mới, cleanup triệt để khi unmount.
  5. *Khả năng tiếp cận (Accessibility - a11y)*: Bổ sung `aria-label`, `role="group"`, `aria-pressed` cho các nút bật/tắt chuỗi dữ liệu, hiệu ứng focus ring rõ ràng (`focus-visible:ring-2 focus-visible:ring-primary`).
  6. Sửa type `groupBy === 'year' ? 'month' : groupBy` trong `dashboard-revenue-section.tsx`.
- **Kết quả kiểm thử**:
  - `audit-ui.mjs`: Pass 100% không vi phạm Web Interface Guidelines.
  - Vitest: 21/21 passed toàn bộ test suite revenue.
  - TypeScript (`tsc --noEmit`): 0 error trên toàn bộ dự án frontend.
  - ESLint: 0 warning, 0 error.

---

## 2026-11-20: Tái thiết kế Biểu Đồ Doanh Thu & Hoa Hồng theo chuẩn Chart.js của Dashboard

- **Yêu cầu**:
  - Dựa trên code biểu đồ "Phân tích doanh thu & phân chia hoa hồng" tại `/admin/dashboard` để làm hiển thị bắt mắt, chuyên nghiệp cho "Biểu Đồ Doanh Thu & Hoa Hồng" tại `/admin/revenue`.
  - Giữ bảng màu Phương án 2 (Đồng bộ tuyệt đối với Dashboard: Indigo `#4f46e5` cho Tổng doanh thu, Emerald `#10b981` cho Doanh thu nền tảng, Amber `#f59e0b` cho Doanh thu giảng viên).
  - Giữ Tooltip gọn gàng, hiển thị nhãn mốc thời gian, số lượng đơn hàng và số tiền VNĐ tương ứng của từng chuỗi.
- **Triển khai**:
  - **Component (`frontend/src/features/admin/revenue/components/revenue-chart.tsx`)**:
    - Thay thế toàn bộ SVG/CSS bar thủ công bằng **Chart.js** (`chart.js/auto`) trên thẻ `<canvas>`.
    - Bộ điều khiển linh hoạt: Cho phép chuyển đổi dạng biểu đồ Đường (**Line**) và Cột (**Bar**), kèm nút **Khôi phục mặc định** (`rotate-ccw`) khi trạng thái hiển thị bị thay đổi.
    - Bộ lọc chuỗi dữ liệu độc lập: 3 nút Badge bật/tắt hiển thị từng chuỗi: Tổng doanh thu, Doanh thu nền tảng (Mindly), Doanh thu giảng viên.
    - Floating dark tooltip (`#0f172a`, bo tròn `cornerRadius: 12`, đệm 12px) định dạng chuẩn tiền tệ VNĐ và số lượng đơn hàng.
    - Trục tung (Y-axis) tự động quy đổi đơn vị theo thói quen người dùng Việt Nam (`tỷ`, `tr`, `₫`), bắt đầu từ 0.
    - Badge tóm tắt tổng giá trị kỳ biểu đồ và tổng số đơn hàng thành công.
    - Overlay cảnh báo khi tất cả chuỗi dữ liệu bị ẩn.
    - Thẻ ghi chú chân trang giải thích nguyên tắc ghi nhận tỷ lệ hoa hồng cố định theo lịch sử giao dịch.
    - Quản lý lifecycle Chart.js chặt chẽ: Hủy instance cũ khi unmount/đổi dạng biểu đồ, cập nhật dữ liệu in-place mượt mà tránh giật lag canvas.
  - **Unit Tests (`frontend/src/features/admin/revenue/tests/revenue-chart.spec.ts`)**:
    - Mock class `Chart` từ `chart.js/auto` trong môi trường Vitest / SSR.
    - Kiểm thử trạng thái loading skeleton.
    - Kiểm thử trạng thái không có dữ liệu (Empty state).
    - Kiểm thử render đầy đủ các nút Line/Bar, nút bật/tắt 3 chuỗi, tổng giá trị kỳ và chú thích chân trang.
- **Kết quả kiểm thử**:
  - Vitest: 3/3 passed (`revenue-chart.spec.ts`), 10/10 passed toàn bộ feature `revenue`.
  - TypeScript type check (`tsc --noEmit`): 0 error.
  - ESLint: 0 warning, 0 error.

---

## 2026-11-19: Tái thiết kế giao diện Danh sách giao dịch theo chuẩn design-taste-frontend

- **Yêu cầu**:
  - Chuyển đổi danh sách giao dịch từ dạng thẻ ngang (Card stack) sang bảng dữ liệu chuẩn (**Transaction Table**) với đúng 6 cột: Mã đơn hàng, Học viên, Khóa học, Số tiền thực nhận, Trạng thái, Thời gian giao dịch.
  - Hỗ trợ 3 trạng thái giao dịch: **"Thành công"**, **"Thiếu tiền"**, **"Thừa tiền"** (tuân thủ **Purple Ban**, dùng palette Emerald / Amber / Sky).
  - Tích hợp thanh lọc nhanh theo trạng thái (**Tất cả**, **Thành công**, **Thiếu tiền**, **Thừa tiền**) trên toolbar.
  - Khi click vào bất kỳ hàng nào (hoặc nút hành động), mở slide-over drawer `TransactionDetailDrawer` chi tiết 5 nhóm thông tin.
- **Triển khai**:
  - **Shared Library (`share-lib`)**: Cập nhật `IRevenueTransactionItem` và `RevenueTransactionsParams` bổ sung `receivedAmount`, `status`, `reconciliationStatus`, `studentEmail`.
  - **Backend (`backend/`)**:
    - `RevenueTransactionsQueryDto`: Hỗ trợ param lọc `status`.
    - `OrderRepository.findSuccessfulTransactions`: Mở rộng query để lấy cả các đơn hàng có thanh toán thực nhận (`status: PAID`, `lastPaymentStatus: UNDERPAID`, `receivedAmount > 0`), phân loại chính xác `reconciliationStatus` (`MATCHED`, `UNDERPAID`, `OVERPAID`).
    - `RevenueService.getTransactions`: Truyền `status` vào repository.
    - Chạy toàn bộ unit tests `revenue.service.spec.ts` vượt qua 100%.
  - **Frontend (`frontend/`)**:
    - Tạo `TransactionTable` (`transaction-table.tsx`): Bảng dữ liệu phẳng 1px tinh tế, căn phải số tiền font mono `tabular-nums`, badge trạng thái với chấm tròn đặc, interactive row với hover và keyboard accessibility (`Enter`/`Space`), thanh lọc nhanh trạng thái, toolbar tìm kiếm và sắp xếp, pagination đầy đủ.
    - Cập nhật `RevenueView` (`revenue-view.tsx`): Tích hợp `TransactionTable`, quản lý state `statusFilter`.
    - Cập nhật `TransactionDetailDrawer` (`transaction-detail-drawer.tsx`): Hiển thị badge trạng thái chuẩn màu và hiển thị chi tiết số tiền thiếu / thừa tại Nhóm 4 nếu có chênh lệch.
    - Viết unit test `transaction-table.spec.ts` kiểm thử phân loại trạng thái, đạt 100% test pass.
- **Kết quả kiểm thử**:
  - Backend vitest: 17/17 passed.
  - Frontend vitest: 4/4 passed.
  - Frontend typecheck (`tsc --noEmit`): 0 error.

---

## 2026-11-18: Cập nhật nhãn tab Sidebar Admin

- **Yêu cầu**: Đổi tiêu đề tab trên sidebar Admin từ `"Quản lý Đơn hàng, Giao dịch & Doanh thu"` thành `"Quản Lý Doanh Thu & Hoa Hồng"`.
- **Files thay đổi**:
  - `frontend/src/features/admin/constants/admin-navigation.ts`: Cập nhật `title: 'Quản Lý Doanh Thu & Hoa Hồng'`.
  - `frontend/src/app/(admin)/admin/revenue/page.tsx`: Cập nhật metadata `title: 'Quản Lý Doanh Thu & Hoa Hồng | Mindly Admin'`.
  - Cập nhật living docs tương ứng.

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


