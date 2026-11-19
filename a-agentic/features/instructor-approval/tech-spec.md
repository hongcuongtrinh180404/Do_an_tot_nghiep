# Đặc Tả Kỹ Thuật (Tech Spec): Phê Duyệt Giảng Viên & Điều Khoản

## 1. Cơ sở Dữ liệu & Mongoose Schemas

### 1.1 Collection `instructor_applications`
```typescript
@Schema({ timestamps: true, collection: 'instructor_applications' })
export class InstructorApplicationEntity extends BaseAbstractDocument {
  userId: Types.ObjectId; // ref 'UserEntity', index
  applicantName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  expertises: string[];
  bio: string;
  experience: string;
  cvFileName?: string;
  cvFileUrl?: string;
  status: InstructorApplicationStatusEnum; // PENDING | APPROVED | REJECTED, index
  rejectionReason?: string;
  reviewedById?: Types.ObjectId;
  reviewedByName?: string;
  reviewedAt?: Date;
  history: Array<{
    action: string; // SUBMITTED | APPROVED | REJECTED | RESUBMITTED
    actorId: Types.ObjectId;
    actorName: string;
    actorRole: string; // ADMIN | STUDENT
    comment?: string;
    timestamp: Date;
  }>;
}
```

### 1.2 Collection `instructor_terms`
```typescript
@Schema({ timestamps: true, collection: 'instructor_terms' })
export class InstructorTermEntity extends BaseAbstractDocument {
  title: string;
  content: string;
  isMandatory: boolean; // default: true
  order: number;        // index
}
```

## 2. API Endpoints

| Method | Endpoint | Quyền hạn | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/admin/instructor-applications` | `ADMIN` | Lấy danh sách hồ sơ (tab, status, search, pagination) |
| `GET` | `/api/v1/admin/instructor-applications/stats/pending-count` | `ADMIN` | Lấy số lượng hồ sơ đang chờ duyệt |
| `GET` | `/api/v1/admin/instructor-applications/stats/overview` | `ADMIN` | Thống kê số lượng theo từng trạng thái |
| `GET` | `/api/v1/admin/instructor-applications/:id` | `ADMIN` | Lấy chi tiết hồ sơ ứng viên |
| `PATCH` | `/api/v1/admin/instructor-applications/:id/approve` | `ADMIN` | Phê duyệt hồ sơ & nâng quyền user thành `INSTRUCTOR` |
| `PATCH` | `/api/v1/admin/instructor-applications/:id/reject` | `ADMIN` | Từ chối hồ sơ kèm lý do |
| `GET` | `/api/v1/admin/instructor-terms` | `ADMIN` | Lấy danh sách điều khoản sắp xếp theo order |
| `PUT` | `/api/v1/admin/instructor-terms` | `ADMIN` | Cập nhật toàn bộ danh sách điều khoản |
| `POST` | `/api/v1/instructor-applications/apply` | Authenticated | Học viên nộp đơn hoặc nộp lại hồ sơ giảng viên |
| `GET` | `/api/v1/instructor-applications/my-application` | Authenticated | Học viên tra cứu trạng thái hồ sơ của mình |
| `GET` | `/api/v1/instructor-applications/terms` | Public | Học viên đọc các điều khoản giảng viên mới nhất |

## 3. Kiến trúc Frontend (`frontend/src/features/admin/instructors`)
- `AdminInstructorsView`: View chính với 2 tabs đồng bộ URL query (`tab=PENDING|HISTORY`).
- `BaseDataTable`: Khung bảng cố định viewport, sticky header, pagination đồng bộ URL.
- Dialogs:
  - `InstructorApprovalDialog`: Xác nhận nâng quyền tài khoản.
  - `InstructorRejectionDialog`: Validate lý do từ chối (>= 10 ký tự).
  - `InstructorDetailDialog`: Xem chi tiết bio, kinh nghiệm, CV đính kèm.
  - `InstructorTermsDialog`: Quản lý thêm/sửa/xóa điều khoản và tab preview.
