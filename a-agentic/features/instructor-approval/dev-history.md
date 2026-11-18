# Lịch Sử Phát Triển (Dev History): Phê Duyệt Giảng Viên

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
