# Revenue & Commission Management — Technical Specification

> **Module:** Revenue & Commission Management

---

## 1. Database Schemas

### 1.1 CommissionSettingEntity (`backend/src/modules/payment/schemas/commission-setting.schema.ts`)
- Kế thừa: `BaseAbstractDocument`
- Fields:
  - `platformCommissionRate`: `number` (0 - 100, default 30)
  - `description`: `string`
  - `effectiveFrom`: `Date`
  - `isCurrent`: `boolean` (unique index cho bản ghi hiện tại)
  - `updatedById`: `string`

### 1.2 CommissionHistoryEntity (`backend/src/modules/payment/schemas/commission-history.schema.ts`)
- Kế thừa: `BaseAbstractDocument`
- Fields:
  - `targetType`: `SYSTEM` | `INSTRUCTOR`
  - `instructorId`?: `string` (indexed)
  - `oldRate`: `number`
  - `newRate`: `number`
  - `reason`: `string`
  - `updatedById`: `string`

### 1.3 OrderEntity updates (`backend/src/modules/enrollment/schemas/order.schema.ts`)
- Bổ sung fields:
  - `instructorId`: `string` (indexed)
  - `platformCommissionRate`: `number` (snapshot)
  - `platformEarnings`: `number` (snapshot)
  - `instructorEarnings`: `number` (snapshot)
- Compound indexes:
  - `{ status: 1, createdAt: -1 }`
  - `{ instructorId: 1, status: 1, createdAt: -1 }`

---

## 2. Repositories & Aggregations

### 2.1 OrderRepository Aggregations
- `getRevenueOverview(startDate, endDate)`: Thống kê `$facet` cho 4 KPI. Hỗ trợ fallback tỷ lệ 30% cho đơn hàng cũ.
- `getRevenueChart(startDate, endDate)`: Nhóm theo ngày `$dateToString: "%Y-%m-%d"` hoặc tháng `"%Y-%m"`.
- `findSuccessfulTransactions(filter, pagination)`: Lookup learner, instructor, course, paymentTransaction.
- `findRevenueTransactionDetail(orderCode)`: Lookup chi tiết 5 nhóm dữ liệu.
- `getInstructorsRevenueStats(filter, pagination)`: Aggregation theo `instructorId` trên đơn hàng thành công, lookup `users`.
- `getInstructorRevenueKpi(instructorId, startDate, endDate)`: KPI riêng của giảng viên.
- `getInstructorCoursesRevenue(instructorId, pagination)`: Nhóm theo `courseId`.
- `getInstructorTransactions(instructorId, pagination)`: Giao dịch của giảng viên.

### 2.2 Repositories
- `CommissionSettingRepository`: Quản lý cấu hình hoa hồng mặc định (`getCurrentSetting`, `updateCurrentSetting`).
- `CommissionHistoryRepository`: Ghi nhận và truy vấn lịch sử điều chỉnh hoa hồng.
- `UserRepository`: Bổ sung hàm `updateCommissionRate`.

---

## 3. Backend Services & Controllers

### 3.1 RevenueService (`backend/src/modules/payment/services/revenue.service.ts`)
- Kế thừa `BaseService`.
- Các hàm:
  - `getOverview(dto)`
  - `getChart(dto)`
  - `getTransactions(dto)`
  - `getTransactionDetail(orderCode)`
  - `getInstructorsRevenue(dto)`
  - `getInstructorDetail(instructorId, dto)`
  - `getInstructorCourses(instructorId, dto)`
  - `getInstructorTransactions(instructorId, dto)`
  - `getInstructorCommissionHistory(instructorId)`
  - `getDefaultCommissionConfig()`
  - `updateDefaultCommissionConfig(dto, adminUserId)`
  - `updateInstructorCommission(instructorId, dto, adminUserId)`

### 3.2 RevenueController (`backend/src/modules/payment/revenue.controller.ts`)
- Route prefix: `/payments/revenue`
- Auth: `@Roles(RoleEnum.ADMIN)`
- Endpoints:
  - `GET /payments/revenue/overview`
  - `GET /payments/revenue/chart`
  - `GET /payments/revenue/transactions`
  - `GET /payments/revenue/transactions/:orderCode`
  - `GET /payments/revenue/instructors`
  - `GET /payments/revenue/instructors/:id`
  - `GET /payments/revenue/instructors/:id/courses`
  - `GET /payments/revenue/instructors/:id/transactions`
  - `GET /payments/revenue/instructors/:id/commission-history`
  - `GET /payments/revenue/commission-config`
  - `PUT /payments/revenue/commission-config`
  - `PUT /payments/revenue/instructors/:id/commission`

---

## 4. Frontend Architecture

### 4.1 Path & Navigation
- URL: `/admin/revenue`
- File: `frontend/src/app/(admin)/admin/revenue/page.tsx`
- Instructor Detail: `frontend/src/app/(admin)/admin/revenue/instructors/[instructorId]/page.tsx`
- Sidebar: Đổi từ `/admin/orders` thành `/admin/revenue` ("Quản lý Đơn hàng, Giao dịch & Doanh thu").

### 4.2 State Management & Hooks
- TanStack Query hooks: `useRevenueOverviewQuery`, `useRevenueChartQuery`, `useRevenueTransactionsQuery`, `useRevenueTransactionDetailQuery`, `useInstructorsRevenueQuery`, `useInstructorDetailQuery`, `useDefaultCommissionMutation`, `useInstructorCommissionMutation`.
- URL Query Params sync: `tab`, `timeRange`, `startDate`, `endDate`, `search`, `sort`, `page`, `limit`.
- Modals & Drawers:
  - `TransactionDetailDrawer`: Hiển thị chi tiết 5 nhóm thông tin.
  - `DefaultCommissionDialog`: Cấu hình hoa hồng toàn hệ thống qua icon bánh răng.
  - `InstructorCommissionDialog`: Cấu hình hoa hồng riêng tại trang chi tiết giảng viên.

