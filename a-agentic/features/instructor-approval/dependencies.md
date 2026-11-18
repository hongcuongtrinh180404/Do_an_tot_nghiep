# Phụ thuộc Module: Phê Duyệt Giảng Viên & Điều Khoản (Instructor Approval & Terms)

## 1. Phụ thuộc Nội bộ (Internal Dependencies)
- `backend/src/modules/base/`:
  - `BaseAbstractDocument`: Kế thừa trường `_id`, `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`.
  - `BaseMongoRepository`: Cung cấp CRUD và pagination trừu tượng.
  - `BaseService`: Tích hợp CLS context, correlation ID và audit logging.
  - `ApiResponse`: Chuẩn hóa envelope HTTP response.
- `backend/src/modules/user/`:
  - `UserEntity`: Tham chiếu liên kết tài khoản ứng viên (`userId`) và admin duyệt (`reviewedById`).
  - `UserRepository`: Nâng vai trò của người dùng (`role: RoleEnum.INSTRUCTOR`) khi phê duyệt hồ sơ.
- `share-lib`:
  - `RoleEnum`: Quyền hạn người dùng (`ADMIN`, `INSTRUCTOR`, `STUDENT`).
  - `InstructorApplicationStatusEnum`: `PENDING`, `APPROVED`, `REJECTED`.
  - `IInstructorApplication`, `IInstructorTerm`, `IAdminInstructorApplicationsStats`.

## 2. Phụ thuộc Giao diện (Frontend Dependencies)
- `@tanstack/react-table`: Quản lý bảng dữ liệu ứng viên.
- `@tanstack/react-query`: Cache dữ liệu, invalidation và tự động đồng bộ.
- `components/shared/data-table/`: `BaseDataTable`, `useDataTableUrlState`.
- `components/shared/dialog/`: `DialogLayout` cho modals (Duyệt, Từ chối, Chi tiết hồ sơ, Thiết lập điều khoản).
- `sonner`: Thông báo toast phản hồi tương tác người dùng.
- `lucide`: Iconography chuẩn cho hệ thống Admin.
