# PLAN: Thiết Kế & Chuẩn Hóa Mongoose User Schema (Phiên Bản Đầu Tiên)

> **Mục tiêu:**
> 1. Thiết kế và triển khai `User` schema phiên bản 1 chuẩn Mongoose + NestJS cho nền tảng khóa học trực tuyến.
> 2. Tập trung chặt chẽ vào: Authentication, Profile người dùng và Phân quyền (`student`, `instructor`, `admin`).
> 3. Không tích hợp các trường của khóa học, video, thanh toán, quiz ở thời điểm này (tách biệt domain).
> 4. Đảm bảo tuân thủ nghiêm ngặt quy tắc kiến trúc dự án: kế thừa `BaseAbstractDocument`, sử dụng Repository Pattern, đồng bộ `share-lib`, bảo mật `select: false` cho mật khẩu, và thiết lập indexing tối ưu cho MongoDB.
>
> **Task Slug:** `user-schema`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`, `database-architect`, `security-auditor`  

---

## 1. Phân Tích Yêu Cầu & So Sánh Hiện Trạng

### 1.1. Yêu Cầu Các Field & Quy Cách

| Field | Kiểu Dữ Liệu | Thuộc Tính / Ràng Buộc | Giá Trị Mặc Định / Index |
| :--- | :--- | :--- | :--- |
| `email` | `String` | `required: true`, `lowercase: true`, `trim: true` | Unique index kết hợp `deletedAt: null` |
| `passwordHash` | `String` | `required: true`, `select: false` | Ẩn mặc định khỏi query kết quả |
| `fullName` | `String` | `required: true`, `trim: true` | Chuẩn hóa họ và tên hiển thị |
| `username` | `String` | `required: false`, `lowercase: true`, `trim: true` | Unique sparse index khi có giá trị |
| `avatarUrl` | `String` | `required: false`, lưu trữ URL Cloudinary | Mặc định `null` |
| `bio` | `String` | `required: false`, `trim: true` | Giới thiệu ngắn về bản thân, mặc định `null` |
| `role` | `String` (Enum) | `student` \| `instructor` \| `admin` | Mặc định `student`, có đánh index |
| `status` | `String` (Enum) | `active` \| `inactive` \| `banned` | Mặc định `active`, có đánh index |
| `createdAt`, `updatedAt` | `Date` | Tự động sinh từ Mongoose timestamps | Thông qua `BaseAbstractDocument` |
| `deletedAt`, `createdById`, `updatedById` | `Date / String` | Trường kiểm toán (Audit Fields) & Soft Delete | Kế thừa từ `BaseAbstractDocument` |

### 1.2. Hiện Trạng Codebase & Khoảng Cách Cần Refactor
- Hiện tại, file `backend/src/modules/user/schemas/user.schema.ts` đã có sẵn nhưng dùng tên `password` thay vì `passwordHash`, tách thành `firstName`/`lastName` thay vì `fullName`, dùng `avatar` thay vì `avatarUrl`, chưa có `username` và `bio`.
- Enums trong `share-lib` đang định nghĩa `RoleEnum` (`ADMIN`, `USER`) và `UserStatusEnum` (`ACTIVE`, `INACTIVE`, `SUSPENDED`).
- Cần chuẩn hóa đồng bộ `share-lib` (để frontend/backend cùng hiểu), cập nhật `UserEntity`, `UserRepository`, `UserService`, `AuthService` và các unit tests liên quan.

---

## 2. Thiết Kế Chi Tiết & Giải Pháp Kỹ Thuật

### 2.1. Mongoose Schema (`backend/src/modules/user/schemas/user.schema.ts`)

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';

export type UserDocument = HydratedDocument<UserEntity>;

@Schema({ timestamps: true, collection: 'users' })
export class UserEntity extends BaseAbstractDocument {
  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({ type: String, required: false, default: null, lowercase: true, trim: true })
  username?: string | null;

  @Prop({ type: String, required: false, default: null })
  avatarUrl?: string | null;

  @Prop({ type: String, required: false, default: null, trim: true })
  bio?: string | null;

  @Prop({
    type: String,
    enum: Object.values(RoleEnum),
    default: RoleEnum.STUDENT,
    index: true,
  })
  role: RoleEnum;

  @Prop({
    type: String,
    enum: Object.values(UserStatusEnum),
    default: UserStatusEnum.ACTIVE,
    index: true,
  })
  status: UserStatusEnum;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);

// Partial Indexes tối ưu cho soft delete & sparse username
UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);

UserSchema.index(
  { username: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      deletedAt: null,
      username: { $type: 'string' },
    },
  },
);

UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ deletedAt: 1, createdAt: -1 });
```

### 2.2. Chiến Lược Indexing & Concurrency
- **Soft-Delete Unique Email**: Tránh xung đột khi người dùng soft-delete tài khoản rồi tạo tài khoản mới cùng email. `partialFilterExpression: { deletedAt: null }` chỉ đảm bảo tính duy nhất trên các bản ghi chưa bị xóa.
- **Sparse Unique Username**: Tránh lỗi MongoDB duplicate key khi nhiều user chưa đặt username (`username: null`). Chỉ các bản ghi có `username` là `string` và chưa bị xóa mới bị ép unique.
- **Role & Status Indexing**: Hỗ trợ lọc danh sách giảng viên (`instructor`), học viên (`student`) hoặc kiểm tra trạng thái hoạt động (`active`/`banned`) trong các guards với hiệu năng $O(\log N)$.

---

## 3. Phân Công Tác Vụ Chi Tiết (Task Breakdown)

| Task ID | Nhiệm Vụ | Agent Phụ Trách | Skill | Input → Output → Verification |
| :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | Cập nhật enums `RoleEnum` & `UserStatusEnum` trong `share-lib` | `backend-specialist` | `clean-code` | **IN**: Định nghĩa role/status mới<br>**OUT**: `share-lib/src/enums/`<br>**VERIFY**: `pnpm --filter share-lib build` thành công |
| **TASK-02** | Cập nhật `IUser` và `IUserProfile` trong `share-lib/src/interfaces/` | `backend-specialist` | `api-patterns` | **IN**: Contracts mới (`fullName`, `passwordHash`, `avatarUrl`, v.v.)<br>**OUT**: `user.interface.ts`<br>**VERIFY**: `pnpm --filter share-lib build` thành công |
| **TASK-03** | Cập nhật `UserEntity` và `UserSchema` | `backend-specialist` | `database-design` | **IN**: Schema requirements<br>**OUT**: `user.schema.ts`<br>**VERIFY**: TypeScript compile không lỗi cú pháp |
| **TASK-04** | Cập nhật `UserRepository` & `UserService` | `backend-specialist` | `clean-code` | **IN**: Schema mới<br>**OUT**: Repository method với `+passwordHash`, `findByUsername`<br>**VERIFY**: Unit tests cho service |
| **TASK-05** | Cập nhật `AuthService` và `LocalAuthService` | `security-auditor` | `clean-code` | **IN**: `passwordHash`, `RoleEnum.STUDENT`<br>**OUT**: Register/Login luồng mới<br>**VERIFY**: Chạy `auth.service.spec.ts` |
| **TASK-06** | Cập nhật Unit Tests & Chạy toàn bộ test suite | `backend-specialist` | `testing-patterns` | **IN**: Mock data cũ<br>**OUT**: Mock data mới theo schema v1<br>**VERIFY**: `pnpm --filter backend test` (100% Passed) |
| **TASK-07** | Đồng bộ Living Docs trong `a-agentic/features/auth-identity/` | `project-planner` | `documentation-templates` | **IN**: Kết quả triển khai<br>**OUT**: Cập nhật `tech-spec.md`, `rules-and-flows.md`, `dev-history.md`<br>**VERIFY**: Docs phản ánh chính xác schema |

---

## 4. Giai Đoạn Kiểm Thử & Nghiệm Thu (Phase X)

- [x] Build `share-lib`: `pnpm --filter share-lib build` (Exit code: 0)
- [x] Type Check Backend: `pnpm --filter backend exec npx tsc --noEmit` (Không có lỗi type)
- [x] Backend Vitest Suite: `pnpm --filter backend test` (Toàn bộ 9 test suites / 56 tests pass 100%)
- [x] Tuân thủ nguyên tắc Clean Code: Không dùng `any`, tuân thủ Repository Pattern, không inject trực tiếp Model vào Service.

## ✅ PHASE X COMPLETE
- Lint & Type Check: ✅ Pass (0 error)
- MongoDB Integration Tests: ✅ 10/10 Pass (xác minh trực tiếp partial unique indexes)
- Vitest Suite: ✅ 56/56 Pass
- Date: 2026-09-22

