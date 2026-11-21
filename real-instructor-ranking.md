# Plan: Thay thế dữ liệu mock bằng dữ liệu thật Database cho "Bảng xếp hạng Giảng viên tiêu biểu"

## 1. Mục tiêu
Thay thế mock data `INSTRUCTORS_DATA` trên component `DashboardInstructorsSection` ở cả 2 trang:
- `/admin/dashboard`
- `/admin/revenue`
bằng dữ liệu thật truy vấn và tổng hợp từ MongoDB. Không kích hoạt tương tác Drawer theo yêu cầu người dùng.

## 2. Các tác vụ triển khai (Tasks Breakdown)

- [x] **Task 1: Cập nhật Models & Interfaces (`share-lib`)**
  - Đồng bộ `IDashboardInstructor` và `IDashboardInstructorCourse` vào `share-lib`.
  - Cập nhật `IAdminDashboardAggregateResponse` có trường `instructors?: IDashboardInstructor[]`.
  - Build `share-lib` thành công.

- [x] **Task 2: Xây dựng Backend Aggregation & API (`backend`)**
  - Tạo `AdminInstructorsRankingQueryDto` trong `admin-dashboard.dto.ts`.
  - Triển khai phương thức aggregation `getInstructorsRanking()` trong `AdminDashboardRepository`.
  - Bổ sung logic xử lý trong `AdminDashboardService`.
  - Thêm endpoint `GET /admin/dashboard/instructors/ranking` trong `AdminDashboardController` và tích hợp vào `getAggregate()`.
  - Viết unit test trong `admin-dashboard.service.spec.ts` (pass 100%).

- [x] **Task 3: Refactor Frontend & Xóa Mock Data (`frontend`)**
  - Bổ sung `fetchAdminDashboardInstructorsRanking` và `useAdminDashboardInstructorsRankingQuery` trong `admin-dashboard.api.ts`.
  - Xóa bỏ `INSTRUCTORS_DATA` trong `mock-dashboard-data.ts`.
  - Refactor `dashboard-instructors-section.tsx`: tích hợp query thật, hỗ trợ lọc, sort, limit, loading skeleton, empty state, error state. Không kích hoạt mở Drawer khi click dòng.
  - Cập nhật `revenue-view.tsx` và `admin-dashboard-view.tsx` truyền đúng tham số thời gian và custom dates.

- [x] **Task 4: Kiểm thử & Xác minh chất lượng (Testing & Verification)**
  - Chạy unit tests backend: `src/modules/admin-dashboard/tests/admin-dashboard.service.spec.ts` (5/5 tests pass).
  - Chạy unit tests frontend: `revenue-instructors-ranking.spec.ts`, `admin-dashboard.spec.ts` (30/30 tests pass).
  - Toàn bộ suite revenue frontend: 24/24 tests pass.
  - Build kiểm tra TypeScript backend `nest build` thành công 100%.
