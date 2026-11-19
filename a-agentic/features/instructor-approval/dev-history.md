# Lịch Sử Phát Triển (Dev History): Phê Duyệt Giảng Viên

## [2026-11-19] - Kích Hoạt Tab "Lịch Sử Phê Duyệt", Bộ Lọc Trạng Thái Nâng Cao và Loại Bỏ Nút "Làm Mới"

### Bối cảnh & Yêu cầu
- Trang Admin `/admin/instructors`:
  - Nút/Tab **"Lịch sử phê duyệt"** trước đó bấm vào chưa kích hoạt chuyển tab do lỗi xung đột cập nhật URL query `tab` trong closure render frame.
  - Loại bỏ nút **"Làm mới"** tại header theo yêu cầu người dùng, giữ giao diện gọn gàng, trực quan.
  - Kiểm thử toàn diện chức năng tab "Lịch sử phê duyệt": Hiển thị đúng dữ liệu đã duyệt / đã từ chối, cột "Người duyệt" (`reviewedBy`), cột "Thời gian duyệt" (`reviewedAt`), các bộ lọc phụ (Tất cả, Đã duyệt, Đã từ chối) kèm badge số lượng thực tế.

### Phân tích Root Cause & Giải pháp
1. **Root cause nút tab chưa kích hoạt**:
   - Trong `admin-instructors-view.tsx`, trước đây `handleTabChange` gọi liên tiếp:
     `setFilter('tab', ...); setPage(1);`
     Cả hai hàm đều dùng snapshot `searchParams` cũ từ closure của frame render hiện tại. Khi `setPage(1)` gọi `updateUrl`, nó ghi đè và làm mất tham số `tab=HISTORY`.
   - **Giải pháp**:
     - Quản lý `currentTab` và `currentStatus` bằng state đồng bộ với URL search params.
     - Hàm `handleTabChange` và `handleStatusChange` chuẩn hóa tham số URL và gọi `router.replace` một lần duy nhất với toàn bộ params mong muốn (`tab`, `status`, reset `page`).
2. **Loại bỏ nút "Làm mới"**:
   - Gỡ bỏ hoàn toàn nút Button "Làm mới" tại header trang, chỉ giữ nút "Thiết lập điều khoản" đồng nhất với layout hệ thống. Dữ liệu được TanStack React Query tự động invalidate và re-fetch khi có bất kỳ thao tác phê duyệt/từ chối nào.
3. **Thêm API Stats & Badges sống động**:
   - Thêm hook `useAdminInstructorApplicationsStatsQuery()` kết nối backend endpoint `/api/v1/instructor-applications/stats`.
   - Tab "Phê duyệt" hiển thị badge số lượng chờ duyệt (`pendingTotal`).
   - Tab "Lịch sử phê duyệt" hiển thị badge tổng số hồ sơ đã xử lý (`historyTotal = approvedTotal + rejectedTotal`).
   - Sub-filters trong Tab Lịch sử:
     - "Tất cả" kèm số lượng `(historyTotal)`
     - "Đã duyệt" kèm số lượng `(approvedTotal)`
     - "Đã từ chối" kèm số lượng `(rejectedTotal)`
4. **Kiểm thử**:
   - Thêm và cập nhật bộ test suite `frontend/src/features/admin/tests/instructor-approval.spec.ts` (5/5 tests passed).
   - Kiểm tra tương thích TypeScript: `tsc --noEmit` đạt 0 lỗi.
   - Kiểm tra ESLint: `eslint` đạt 0 lỗi.
   - Kiểm tra Backend: `instructor-application.service.spec.ts` đạt 17/17 tests passed.

---

## [2026-11-18] - Chuyển Đổi Dữ Liệu Thật & Lưu Vết Lịch Sử Phê Duyệt Kèm Định Danh Admin Duyệt

### Bối cảnh & Yêu cầu
- Trang Admin `/admin/instructors` cần loại bỏ hoàn toàn dữ liệu mock ngẫu nhiên, chuyển sang dữ liệu thật từ cơ sở dữ liệu và liên kết với người dùng thật.
- Kiểm tra toàn bộ luồng phê duyệt và từ chối: Khi từ chối hay phê duyệt đều phải lưu lại lịch sử phê duyệt chi tiết và phải biết **Ai đã phê duyệt/từ chối** (định danh Admin, tên, thời gian, ghi chú/lý do).
- Kết nối luồng học viên nộp đơn thật tại `/become-instructor`.

### Các thay đổi kỹ thuật
1. **Share-Lib**:
   - Thêm interface `IInstructorApplicationHistoryItem` (`action`, `actorId`, `actorName`, `actorRole`, `comment`, `timestamp`).
   - Mở rộng `IInstructorApplication` với trường `history?: IInstructorApplicationHistoryItem[]`.
   - Build và đồng bộ `share-lib/dist`.
2. **Backend (NestJS + MongoDB / Mongoose)**:
   - Cập nhật schema `InstructorApplicationEntity`: thêm trường `history` dạng mảng embedded objects ghi nhận từng mốc hành động (`SUBMITTED`, `APPROVED`, `REJECTED`, `RESUBMITTED`).
   - Cập nhật `InstructorApplicationRepository`:
     - Trích xuất `history` trong mapper `toDomain`.
     - Tìm kiếm linh hoạt theo cả tên người duyệt `reviewedByName`.
     - Thêm phương thức `findByUserId`, `createWithHistory`, `resubmitApplication`, `deleteMany`.
   - Cập nhật `InstructorApplicationService`:
     - Khi `approveApplication`: Đẩy sự kiện `APPROVED` vào `history` kèm định danh Admin duyệt (`actorId`, `actorName`), nâng vai trò tài khoản học viên thật thành `INSTRUCTOR`.
     - Khi `rejectApplication`: Đẩy sự kiện `REJECTED` vào `history` kèm lý do từ chối (>= 10 ký tự) và định danh Admin.
     - Thêm `applyOrResubmitApplication` và `getMyApplication` cho học viên nộp đơn thật.
     - Cập nhật `seedInitialDataIfEmpty`: Xóa bỏ 5 hồ sơ mock ngẫu nhiên cũ; liên kết hồ sơ với tài khoản học viên thật trong hệ thống (`student1@thc.edu.vn`, `student2@thc.edu.vn`, `student3@thc.edu.vn`) và Admin thật (`CUONG TRINH` / `sseu1804@gmail.com`).
   - Cập nhật `InstructorApplicationController`: Thêm `InstructorApplicationUserController` phục vụ endpoints học viên:
     - `POST /api/v1/instructor-applications/apply`
     - `GET /api/v1/instructor-applications/my-application`
     - `GET /api/v1/instructor-applications/terms`
   - Unit tests backend `instructor-application.service.spec.ts` đạt 100% pass (17/17 test cases).
3. **Frontend (Next.js App Router + React + Tailwind CSS)**:
   - Thêm `instructor-application.api.ts` cho học viên gọi API thật (`useMyInstructorApplicationQuery`, `useApplyInstructorMutation`).
   - Cập nhật `useInstructorApplication`: Lấy dữ liệu hồ sơ thật từ backend API.
   - Cập nhật `InstructorApplicationForm`: Kết nối mutation nộp hồ sơ thật, hiển thị điều khoản thực tế từ server.
   - Cập nhật `ApplicationPanel`: Xử lý nộp lại sau khi bị từ chối với dữ liệu thật.
   - Cập nhật `createInstructorApprovalColumns`:
     - Tại Tab "Lịch sử phê duyệt" (`HISTORY`): Thêm cột **"Người duyệt"** (`reviewedByName`) có icon Quản trị viên và cột **"Thời gian duyệt"** (`reviewedAt`).
   - Cập nhật `InstructorDetailDialog`: Thêm khối giao diện **Timeline Lịch sử xét duyệt & xử lý** trực quan, minh bạch.
   - Unit tests frontend đạt 100% pass (3/3 test cases trong `instructor-approval.spec.ts`).
   - TypeScript build typecheck toàn frontend đạt 0 lỗi (`tsc --noEmit`).

### Gotchas & Ghi chú
- `InstructorApplicationRepository.deleteMany` cần dùng `{ ...(session ? { session } : {}) }` để tránh gán `null` cho `ClientSession | undefined`.
- Khi cập nhật `share-lib`, bắt buộc build `tsc -p share-lib/tsconfig.json` để đồng bộ `dist/`.

---

## [2026-11-18] - Khởi tạo Phân hệ Phê Duyệt Giảng Viên & Thiết Lập Điều Khoản (Full-stack)

### Bối cảnh & Yêu cầu
- Giao diện Admin Portal (`/admin`) cần bổ sung tab **"Phê duyệt giảng viên"** nằm ngay dưới tab **"Quản lý & Phê duyệt Khóa học"**.
- Cấu trúc gồm 2 tab: **"Phê duyệt"** (các hồ sơ chờ duyệt) và **"Lịch sử phê duyệt"** (các hồ sơ đã xử lý).
- Ở giao diện chính có nút **"Thiết lập điều khoản"** để quản trị viên cấu hình các điều khoản thỏa thuận với giảng viên.
- Áp dụng kỹ năng thiết kế chuyên nghiệp `/design-taste-frontend` (`references/app-screens.md`): Giao diện phẳng, viền 1px mờ, không template slop, cấm màu tím/violet, tập trung vào trải nghiệm công việc của Admin.

### Các thay đổi kỹ thuật
1. **Share-Lib**:
   - Thêm enum `InstructorApplicationStatusEnum` (`PENDING`, `APPROVED`, `REJECTED`).
   - Thêm interface `IInstructorApplication`, `IInstructorTerm`, `IAdminInstructorApplicationsStats`.
2. **Backend (NestJS + MongoDB / Mongoose)**:
   - Module `instructor-application` kế thừa `BaseAbstractDocument`, `BaseMongoRepository`, `BaseService`.
   - Collections: `instructor_applications`, `instructor_terms`.
   - Phân quyền `@Roles(RoleEnum.ADMIN)`.
   - Logic tự động kích hoạt vai trò `RoleEnum.INSTRUCTOR` cho ứng viên khi hồ sơ được duyệt.
   - Logic kiểm tra và bắt buộc lý do từ chối (>= 10 ký tự) khi hồ sơ bị từ chối.
   - Tự động khởi tạo dữ liệu mẫu phong phú khi database trống (seeding ban đầu).
   - Bộ unit tests `instructor-application.service.spec.ts` đạt 100% pass (12/12 test cases).
3. **Frontend (Next.js App Router + React + Tailwind CSS)**:
   - Cập nhật Sidebar: Thêm mục `Phê duyệt giảng viên` (`/admin/instructors`) ngay sau `/admin/courses`.
   - Route `/admin/instructors` với metadata chuẩn SEO/Admin.
   - Bảng dữ liệu `BaseDataTable` cố định viewport, sticky header, phân trang và tìm kiếm đồng bộ URL.
   - 4 Modals/Dialogs chuẩn UX:
     - `InstructorApprovalDialog`
     - `InstructorRejectionDialog`
     - `InstructorDetailDialog`
     - `InstructorTermsDialog` (Chỉnh sửa + Xem trước)
   - Bộ unit tests `admin-navigation.spec.ts` và `instructor-approval.spec.ts` đạt 100% pass (7/7 test cases).
   - TypeScript build typecheck đạt 0 lỗi (`tsc --noEmit`).

### Gotchas & Ghi chú
- `BaseDataTable` sử dụng các props `emptyTitle`, `emptyDescription`, `emptyIcon` thay vì `emptyMessage`.
- `InstructorApplicationRepository.replaceAllTerms` khi truyền options vào `updateMany` và `insertMany` của Mongoose cần sử dụng `{ ...(session ? { session } : {}) }` để tránh lỗi TypeScript gán `null` cho `ClientSession | undefined`.
