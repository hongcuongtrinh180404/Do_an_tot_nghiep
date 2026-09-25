# PLAN: Thiết Kế & Triển Khai Mongoose Section Schema

> **Mục tiêu:**
> 1. Thiết kế và tạo schema `Section` (chương/phần bên trong một Course) chuẩn Mongoose + NestJS trong MongoDB.
> 2. Đảm bảo tuân thủ tuyệt đối quy tắc kiến trúc dự án: kế thừa `BaseAbstractDocument` (timestamps, soft delete `deletedAt`, audit fields `createdById`, `updatedById`), cấu hình Typescript chuẩn và Mongoose SchemaFactory.
> 3. Thiết lập mối quan hệ Course 1 → N Section: `courseId` reference đến `CourseEntity`.
> 4. Định nghĩa `ISection` trong `share-lib` để đồng bộ kiểu dữ liệu toàn bộ monorepo (Backend & Frontend).
> 5. Đăng ký model `SectionEntity` vào `CourseModule` để sẵn sàng cho Dependency Injection trong tương lai.
> 6. Không tạo API CRUD, không tạo frontend, không can thiệp schema Course khi không cần thiết.
>
> **Task Slug:** `section-model`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`, `database-architect`  

---

## 1. Khảo Sát Hiện Trạng & Phân Tích Kiến Trúc Codebase

### 1.1. Course Schema & Thư Viện MongoDB Hiện Tại
- **Thư viện MongoDB:** Dự án sử dụng `@nestjs/mongoose` cùng thư viện chính `mongoose` (với `HydratedDocument`, `SchemaFactory`, `Types.ObjectId`).
- **Vị trí Course Schema:** [course.schema.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/schemas/course.schema.ts).
- **Quy ước kế thừa:** Tất cả Entity kế thừa [`BaseAbstractDocument`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/base/documents/base.abstract.document.ts).
  - `BaseAbstractDocument` đã định nghĩa sẵn:
    - `_id: Types.ObjectId`
    - `createdAt: Date`, `updatedAt: Date` (được tự động kích hoạt qua `@Schema({ timestamps: true })`)
    - `deletedAt?: Date | null` (soft-delete field với index: true)
    - `createdById?: string | null` (audit field)
    - `updatedById?: string | null` (audit field)
  - ⚠️ **RÀNG BUỘC KIẾN TRÚC:** `SectionEntity` **TUYỆT ĐỐI KHÔNG KHAI BÁO LẠI** bất kỳ trường nào trong các trường trên (`_id`, `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`). Entity con chỉ khai báo các field riêng biệt của Section.
- **Quy ước Reference ObjectId:**
  ```typescript
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: CourseEntity.name,
    required: true,
    index: true,
  })
  courseId: Types.ObjectId;
  ```
- **Quy ước Trim/Validation trên Schema:**
  - `trim: true` cho các trường String.
  - `min: [0, ...]` cho các trường Number không âm.
  - Sử dụng options `@Schema({ timestamps: true, collection: 'sections' })`.

---

## 2. Thiết Kế Chi Tiết & Ràng Buộc Kỹ Thuật

### 2.1. Cấu Trúc Fields Của `Section`

#### A. Các trường khai báo trực tiếp trong `SectionEntity`:
| Field | Kiểu Dữ Liệu | Ràng Buộc / Decorator | Ý Nghĩa / Ghi Chú |
| :--- | :--- | :--- | :--- |
| `courseId` | `Types.ObjectId` | `type: MongooseSchema.Types.ObjectId`, `ref: CourseEntity.name`, `required: true`, `index: true` | Khóa ngoại tham chiếu tới `Course` (Quan hệ Course 1 → N Section) |
| `title` | `string` | `type: String`, `required: true`, `trim: true` | Tiêu đề của chương học |
| `description` | `string \| null` | `type: String`, `required: false`, `default: null`, `trim: true` | Mô tả ngắn nội dung chương học (optional) |
| `order` | `number` | `type: Number`, `required: true`, `min: [0, 'Section order cannot be negative']` | Số thứ tự của chương trong khóa học |

#### B. Các trường kế thừa từ `BaseAbstractDocument` (KHÔNG khai báo lại):
| Field | Kiểu Dữ Liệu | Nguồn Gốc | Hành Vi |
| :--- | :--- | :--- | :--- |
| `_id` | `Types.ObjectId` | `BaseAbstractDocument` | Mặc định MongoDB ObjectId |
| `createdAt` | `Date` | `BaseAbstractDocument` | Mongoose tự động tạo khi insert |
| `updatedAt` | `Date` | `BaseAbstractDocument` | Mongoose tự động update khi save/update |
| `deletedAt` | `Date \| null` | `BaseAbstractDocument` | Lưu thời điểm xóa mềm (soft-delete) |
| `createdById` | `string \| null` | `BaseAbstractDocument` | Audit ID người tạo qua Interceptor |
| `updatedById` | `string \| null` | `BaseAbstractDocument` | Audit ID người cập nhật qua Interceptor |

### 2.2. Convention Trong `share-lib` (Domain Interface)
- Kiểm tra thực tế toàn bộ các interface trong `share-lib/src/interfaces/`:
  - [`ICourse`](file:///d:/Download/hk1_2027/project_do_an/share-lib/src/interfaces/course.interface.ts): Sử dụng `id: string` làm định danh chính (được map từ `_id` qua repository layer).
  - [`IUser`](file:///d:/Download/hk1_2027/project_do_an/share-lib/src/interfaces/user.interface.ts): Sử dụng `id: string`.
  - [`ISession`](file:///d:/Download/hk1_2027/project_do_an/share-lib/src/interfaces/session.interface.ts): Sử dụng `id: string`.
- **RÀNG BUỘC:** `ISection` trong `share-lib` **BẮT BUỘC** tuân thủ chuẩn `id: string` và khóa ngoại `courseId: string`. Tuyệt đối không dùng `_id` trong domain interface của `share-lib`.

### 2.3. Chiến Lược Indexing (MongoDB Indexes)
Dựa trên quyết định thống nhất:
- **Compound Query Index:**
  ```typescript
  SectionSchema.index({ courseId: 1, deletedAt: 1, order: 1 });
  ```
  - **Mục đích:** Tối ưu hóa truy vấn lấy danh sách các chương thuộc một khóa học theo đúng thứ tự (`sort({ order: 1 })`), đồng thời lọc bỏ các chương đã bị xóa mềm (`deletedAt: null`).
  - **Lý do không dùng Unique Index trên `order`:** Cho phép thao tác kéo thả, hoán đổi vị trí (drag-and-drop / reordering) diễn ra linh hoạt mà không bị lỗi duplicate key constraint tạm thời trong quá trình cập nhật hàng loạt.

---

## 3. Bản Thiết Kế Chi Tiết Từng File

### 3.1. Contract Interface trong `share-lib` (`share-lib/src/interfaces/section.interface.ts`)
```typescript
export interface ISection {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  order: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}
```
Và export tại `share-lib/src/index.ts`.

### 3.2. Mongoose Schema (`backend/src/modules/course/schemas/section.schema.ts`)
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
import { CourseEntity } from './course.schema.js';

export type SectionDocument = HydratedDocument<SectionEntity>;

@Schema({ timestamps: true, collection: 'sections' })
export class SectionEntity extends BaseAbstractDocument {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: CourseEntity.name,
    required: true,
    index: true,
  })
  courseId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: false, default: null, trim: true })
  description?: string | null;

  @Prop({
    type: Number,
    required: true,
    min: [0, 'Section order cannot be negative'],
  })
  order: number;
}

export const SectionSchema = SchemaFactory.createForClass(SectionEntity);

// Index tối ưu lấy danh sách Section theo Course và thứ tự order chưa bị xóa
SectionSchema.index({ courseId: 1, deletedAt: 1, order: 1 });
```

### 3.3. Đăng ký Model trong Module (`backend/src/modules/course/course.module.ts`)
```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseEntity.name, schema: CourseSchema },
      { name: SectionEntity.name, schema: SectionSchema },
    ]),
    UserModule,
  ],
  controllers: [CourseController],
  providers: [CourseRepository, CourseService],
  exports: [CourseRepository, CourseService],
})
export class CourseModule {}
```

---

## 4. Phân Công Tác Vụ Chi Tiết (Task Breakdown)

| Task ID | Tên Nhiệm Vụ | Agent Phụ Trách | Skill | Input → Output → Verification |
| :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | Tạo contract `ISection` trong `share-lib` | `backend-specialist` | `clean-code` | **IN**: Fields định nghĩa Section<br>**OUT**: `share-lib/src/interfaces/section.interface.ts` & export ở `share-lib/src/index.ts`<br>**VERIFY**: `pnpm --filter share-lib build` (Exit code: 0) |
| **TASK-02** | Tạo Mongoose Schema `SectionEntity` | `backend-specialist` | `database-design` | **IN**: Convention từ `CourseEntity` & `BaseAbstractDocument`<br>**OUT**: `backend/src/modules/course/schemas/section.schema.ts`<br>**VERIFY**: TypeScript compile check không lỗi syntax/type |
| **TASK-03** | Đăng ký `SectionEntity` vào `CourseModule` | `backend-specialist` | `clean-code` | **IN**: `SectionEntity`, `SectionSchema`<br>**OUT**: `backend/src/modules/course/course.module.ts`<br>**VERIFY**: MongooseModule nạp schema thành công |
| **TASK-04** | Đồng bộ Living Docs trong `a-agentic/features/course-management/` | `project-planner` | `documentation-templates` | **IN**: Thiết kế schema mới<br>**OUT**: Cập nhật `tech-spec.md` & `rules-and-flows.md`<br>**VERIFY**: Kiểm tra tính nhất quán tài liệu |
| **TASK-05** | Type check & Test regression toàn dự án | `backend-specialist` | `testing-patterns` | **IN**: Toàn bộ codebase hiện tại<br>**OUT**: Trạng thái build và test sạch<br>**VERIFY**: `pnpm --filter backend test` & `npx tsc --noEmit` pass 100% |

---

## 5. Kế Hoạch Nghiệm Thu & Kiểm Thử (Phase X: Verification)

- [x] **Build `share-lib`**: `pnpm --filter share-lib build` chạy thành công không có lỗi type.
- [x] **Type Check Backend**: `pnpm --filter backend exec npx tsc --noEmit` không có cảnh báo hay lỗi kiểu dữ liệu.
- [x] **Regression Tests**: `pnpm --filter backend test` tất cả các bài test (14 files, 107 tests) vượt qua 100%.
- [x] **Kiểm tra Indexing & Collection**: Schema định nghĩa chính xác collection `sections` và compound index `{ courseId: 1, deletedAt: 1, order: 1 }`.
- [x] **Quy tắc Clean Code & Ranh giới**:
  - Không sinh bất kỳ CRUD API nào (Controller, Service, DTO).
  - Không sửa đổi CourseEntity hay thêm field không cần thiết vào Course.
  - Không tạo frontend components.

## ✅ PHASE X COMPLETE
- Share-lib Build: ✅ Pass
- Typecheck Backend: ✅ Pass (0 errors)
- Unit & Integration Test Suite: ✅ 107/107 Pass (bao gồm 5 tests cho `SectionSchema`)
- Date: 2026-09-25
