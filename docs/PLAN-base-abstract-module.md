# PLAN: Triển Khai Thư Mục Base & Các Base Abstract Classes Trong `backend/src/modules/base`

> **Mục tiêu:** Xây dựng toàn bộ lớp nền tảng (Base Architecture) cho backend NestJS + MongoDB theo chuẩn Clean Code, Zero-`any` và Domain Repository Pattern để tất cả các feature sau này (Auth, User, v.v.) kế thừa đồng nhất.
>
> **Task Slug:** `base-abstract-module`
> **Primary Agent:** `backend-specialist`
> **Supporting Agents:** `project-planner`, `test-engineer`

---

## 1. Phân Tích Phạm Vi & Yêu Cầu Kỹ Thuật

Theo đúng các quy tắc kiến trúc đã thống nhất trong [`.agent/rules/project-architecture.md`](file:///d:/TrinhHongCuong/thc-datn/Do_an_tot_nghiep/.agent/rules/project-architecture.md) và feature spec [`a-agentic/features/base-abstract-audit/`](file:///d:/TrinhHongCuong/thc-datn/Do_an_tot_nghiep/a-agentic/features/base-abstract-audit/):

1. **Base Document (`BaseAbstractDocument`)**:
   - Khung Schema Mongoose chứa: `_id: Types.ObjectId`, `createdAt: Date`, `updatedAt: Date`, `deletedAt?: Date | null` (soft delete có index), `createdById?: string | null`, `updatedById?: string | null`.
2. **Base Repository Interface (`BaseRepository<DomainModel, ID>`)**:
   - Giao diện trừu tượng định nghĩa các hàm chuẩn: `create`, `findById`, `findOne`, `findManyWithPagination`, `update`, `softDelete`, `restore`, `withTransaction`.
3. **Base Mongo Repository (`BaseMongoRepository<DomainModel, DocumentType>`)**:
   - Lớp cài đặt cụ thể bọc Mongoose `Model<DocumentType>`.
   - Tự động lọc `{ deletedAt: null }` cho mọi truy vấn đọc.
   - Hỗ trợ truyền session MongoDB (`ClientSession`) cho transactions.
   - Xử lý phân trang chuẩn (`PaginationResult`) và ánh xạ sang Domain Model mà không để lộ Mongoose Document thô ra ngoài.
4. **Base Service (`BaseService<DomainModel, ID>`)**:
   - Tích hợp `ClsService` (Continuation Local Storage) để trích xuất `currentUserId` và `correlationId`.
   - Tự động điền `createdById` khi tạo mới và `updatedById` khi cập nhật / xóa mềm.
   - Bọc sẵn logging có cấu trúc và xử lý ngoại lệ HTTP chuẩn NestJS.
5. **DTOs & Chuẩn Phản Hồi**:
   - `PaginationParamsDto`: `page`, `limit`, `isPagination`, `sort`, `filters` (validate bằng `class-validator`, transform số nguyên).
   - `PaginationResult<T>`: Kết quả phân trang `items: T[]`, `total`, `page`, `limit`, `totalPages`.
   - `ApiResponse<T>`: Chuẩn hóa envelope phản hồi API `{ success: boolean, data: T, message?: string, timestamp: string }`.
6. **Interceptors**:
   - `AuditContextInterceptor`: Lấy `userId` từ JWT token / request header gán vào `ClsService`.
   - `TransformResponseInterceptor`: Tự động bọc dữ liệu trả về của controller vào `ApiResponse<T>`.
7. **Kiểm thử Unit Test**:
   - Kiểm thử toàn diện cho `BaseMongoRepository` và `BaseService` theo chuẩn AAA Pattern và mocking abstract repository.
8. **Đồng bộ Living Docs**:
   - Cập nhật lịch sử triển khai vào [`a-agentic/features/base-abstract-audit/dev-history.md`](file:///d:/TrinhHongCuong/thc-datn/Do_an_tot_nghiep/a-agentic/features/base-abstract-audit/dev-history.md).

---

## 2. Cấu Trúc Thư Mục Dự Kiến (`backend/src/modules/base/`)

```plaintext
backend/src/modules/base/
├── documents/
│   └── base.abstract.document.ts        # Mongoose Schema base (_id, timestamps, deletedAt, createdById, updatedById)
├── repositories/
│   ├── base.repository.interface.ts     # Domain Repository Interface chuẩn (BaseRepository<DomainModel, ID>)
│   └── base.mongo.repository.ts         # Generic Mongoose Repository cài đặt BaseRepository
├── services/
│   └── base.service.ts                  # Base Service với audit injection, CLS context và logging
├── dto/
│   ├── pagination-params.dto.ts         # Query params: page, limit, isPagination, sort, filters
│   ├── pagination-result.dto.ts         # Interface / Class kết quả phân trang
│   └── api-response.dto.ts              # Format bọc response chuẩn ApiResponse<T>
├── interceptors/
│   ├── audit-context.interceptor.ts     # Interceptor lấy user ID từ request đưa vào CLS
│   └── transform.interceptor.ts         # Interceptor chuẩn hóa response format
├── tests/
│   ├── base.mongo.repository.spec.ts    # Unit test cho repository (CRUD, soft-delete, pagination)
│   └── base.service.spec.ts             # Unit test cho service (audit tracking, context handling)
├── base.module.ts                       # Module xuất khẩu dùng chung (BaseModule)
└── index.ts                             # Barrel export toàn bộ class/interface chuẩn ESM (.js)
```

---

## 3. Kế Hoạch Triển Khai Chi Tiết (Implementation Steps)

### Bước 1: Tạo Documents & DTOs Nền Tảng
- Tạo `documents/base.abstract.document.ts` với `@Schema({ timestamps: true })`.
- Tạo `dto/pagination-params.dto.ts` với `@IsOptional()`, `@Type(() => Number)`, `@Transform()`.
- Tạo `dto/pagination-result.dto.ts` và `dto/api-response.dto.ts`.

### Bước 2: Tạo Repository Layer
- Tạo `repositories/base.repository.interface.ts` định nghĩa hợp đồng CRUD và transaction.
- Tạo `repositories/base.mongo.repository.ts` kế thừa interface trên, cài đặt query Mongoose tự động áp dụng `{ deletedAt: null }`.

### Bước 3: Tạo Service Layer & Context Interceptors
- Tạo `services/base.service.ts` kế thừa CLS context, bọc các method `create`, `update`, `delete`, `findById`, `findManyWithPagination`.
- Tạo `interceptors/audit-context.interceptor.ts` và `interceptors/transform.interceptor.ts`.

### Bước 4: Tạo Module & Barrel Exports
- Tạo `base.module.ts` và `index.ts` xuất khẩu toàn bộ public API của thư mục base.

### Bước 5: Viết Unit Tests Đầy Đủ
- Viết `tests/base.mongo.repository.spec.ts` kiểm thử các kịch bản:
  - Tạo mới document.
  - Tìm theo ID (lọc bỏ bản ghi đã xóa mềm).
  - Cập nhật thông tin.
  - Xóa mềm (`deletedAt != null`) và phục hồi (`restore`).
  - Phân trang tính đúng `total` và `totalPages`.
- Viết `tests/base.service.spec.ts` kiểm thử:
  - Tự động điền `createdById` khi create.
  - Tự động điền `updatedById` khi update / softDelete.
  - Xử lý khi context không có user (fallback sang `'SYSTEM'`).

### Bước 6: Build, Test & Ghi Chép Living Docs
- Chạy `pnpm run build` để kiểm tra compile TypeScript ESM (.js) không lỗi.
- Chạy `pnpm test` bảo đảm 100% test pass.
- Ghi lại log chi tiết vào `a-agentic/features/base-abstract-audit/dev-history.md`.

---

## 4. Verification Checklist

- [ ] Tất cả file đều tuân thủ **Zero `any`** (dùng generic `<T, ID>`, `<DomainModel, DocumentType>`).
- [ ] Mọi import nội bộ đều có đuôi `.js` chuẩn ESM (ví dụ: `from './base.abstract.document.js'`).
- [ ] `pnpm run build` thành công exit code 0.
- [ ] `pnpm test` chạy thành công toàn bộ unit test mới.
- [ ] File `dev-history.md` được cập nhật đầy đủ thông tin.
