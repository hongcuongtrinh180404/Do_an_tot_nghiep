# PLAN: Thiết Kế & Triển Khai Mongoose Lesson Schema

> **Mục tiêu:**
> 1. Thiết kế và tạo schema `Lesson` (bài học bên trong một `Section` của khóa học) chuẩn Mongoose + NestJS trong MongoDB.
> 2. Đảm bảo tuân thủ tuyệt đối quy tắc kiến trúc dự án: kế thừa `BaseAbstractDocument` (timestamps, soft delete `deletedAt`, audit fields `createdById`, `updatedById`), cấu hình TypeScript chuẩn và Mongoose SchemaFactory.
> 3. Thiết lập mối quan hệ phân cấp: `Course` → `Section` → `Lesson` (`lesson.sectionId` reference đến `SectionEntity._id`).
> 4. Định nghĩa `ILesson` trong `share-lib` để làm Single Source of Truth cho toàn bộ monorepo (Backend & Frontend).
> 5. Đăng ký model `LessonEntity` và `LessonSchema` vào `CourseModule` (chưa tạo Repository hay Service).
> 6. Xây dựng bộ test toàn diện cho `LessonSchema` kiểm tra validation, constraint và compound index `{ sectionId: 1, deletedAt: 1, order: 1 }`.
> 7. **Ranh giới nghiêm ngặt (Out of Scope):** Tuyệt đối KHÔNG làm Repository, Service, Controller, API, DTO, CRUD, Reorder, Video/Material hay UI.
>
> **Task Slug:** `lesson-model`  
> **Plan File:** `docs/PLAN-lesson-model.md`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`, `database-architect`  
> **Project Type:** `BACKEND`

---

## 1. Khảo Sát Hiện Trạng & Ràng Buộc Kiến Trúc (Context Check)

### 1.1. Khảo Sát `SectionEntity` & `BaseAbstractDocument`
- **Section Schema hiện tại ([section.schema.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/schemas/section.schema.ts)):**
  - Collection: `sections`.
  - Kế thừa: `BaseAbstractDocument` (cung cấp sẵn `_id`, `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`).
  - Foreign key: `courseId: Types.ObjectId` với `ref: CourseEntity.name`, `required: true`, `index: true`.
  - Trường `title`: `string`, `required: true`, `trim: true`.
  - Trường `description`: `string | null`, `required: false`, `default: null`, `trim: true`.
  - Trường `order`: `number`, `required: true`, `min: [0, 'Section order cannot be negative']`.
  - Compound Index: `SectionSchema.index({ courseId: 1, deletedAt: 1, order: 1 })`.
- **Ràng buộc kiến trúc:** `LessonEntity` **tuyệt đối không khai báo lại** các trường từ `BaseAbstractDocument`. Chỉ khai báo 4 trường cốt lõi của Lesson.

### 1.2. Khảo Sát Interface Trong `share-lib`
- [share-lib/src/interfaces/section.interface.ts](file:///d:/Download/hk1_2027/project_do_an/share-lib/src/interfaces/section.interface.ts):
  - Định nghĩa `ISection`:
    - `id: string` (tương thích MongoDB `_id` đã được map to string ở domain layer).
    - `courseId: string`.
    - `title: string`.
    - `description?: string | null`.
    - `order: number`.
    - `createdAt: Date | string`, `updatedAt: Date | string`.
    - `deletedAt?: Date | string | null`.
    - `createdById?: string | null`, `updatedById?: string | null`.
- **Quy chuẩn:** `ILesson` trong `share-lib` bắt buộc dùng `id: string` và `sectionId: string`.

### 1.3. Khảo Sát Module Registration & Tests
- `CourseModule` ([course.module.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/course.module.ts)):
  - Hiện tại đăng ký qua `MongooseModule.forFeature([{ name: CourseEntity.name, schema: CourseSchema }, { name: SectionEntity.name, schema: SectionSchema }])`.
  - Cần thêm `{ name: LessonEntity.name, schema: LessonSchema }`.
- Test mẫu ([section.schema.spec.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/tests/section.schema.spec.ts)):
  - Khởi tạo `mongoose.createConnection('mongodb://localhost:27017/thc_datn_lesson_test')`.
  - Test constraints: `sectionId` required, `title` required & trimmed, `description` optional & default null, `order` min 0, compound index verification.

---

## 2. Thiết Kế Chi Tiết (Technical Specifications)

### 2.1. Cấu Trúc Fields Của `LessonEntity`

| Field | Kiểu Dữ Liệu Mongoose | Ràng Buộc & Options | Ý Nghĩa / Ràng Buộc |
| :--- | :--- | :--- | :--- |
| `sectionId` | `MongooseSchema.Types.ObjectId` | `type: MongooseSchema.Types.ObjectId`, `ref: SectionEntity.name`, `required: true`, `index: true` | Khóa ngoại tham chiếu `SectionEntity._id` (Quan hệ Section 1 → N Lesson) |
| `title` | `String` | `type: String`, `required: true`, `trim: true` | Tiêu đề bài học, tự động cắt khoảng trắng thừa |
| `description` | `String \| null` | `type: String`, `required: false`, `default: null`, `trim: true` | Mô tả bài học, mặc định `null` |
| `order` | `Number` | `type: Number`, `required: true`, `min: [0, 'Lesson order cannot be negative']` | Thứ tự bài học trong chương, số nguyên $\ge 0$ |

Các trường kế thừa từ `BaseAbstractDocument` (tự động có):
- `_id: Types.ObjectId`
- `createdAt: Date`, `updatedAt: Date` (quản lý bởi `@Schema({ timestamps: true })`)
- `deletedAt?: Date | null`
- `createdById?: string | null`
- `updatedById?: string | null`

### 2.2. Chiến Lược Index (Indexing Strategy)

```typescript
LessonSchema.index({ sectionId: 1, deletedAt: 1, order: 1 });
```

- **Mục đích:** Hỗ trợ truy vấn nhanh danh sách các bài học thuộc một Section theo thứ tự tăng dần (`order: 1`), đồng thời lọc bỏ các bản ghi đã xóa mềm (`deletedAt: null`).
- **Không đặt Unique Index trên `order`:** Cho phép linh hoạt thay đổi thứ tự, hoán đổi vị trí bài học (reorder) mà không bị conflict trùng lặp index tạm thời trong quá trình thực hiện transaction.

### 2.3. Hợp Đồng Domain Interface (`ILesson`)

Tạo file [share-lib/src/interfaces/lesson.interface.ts](file:///d:/Download/hk1_2027/project_do_an/share-lib/src/interfaces/lesson.interface.ts):

```typescript
export interface ILesson {
  id: string;
  sectionId: string;
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

Export qua [share-lib/src/index.ts](file:///d:/Download/hk1_2027/project_do_an/share-lib/src/index.ts):
```typescript
export * from './interfaces/lesson.interface.js';
```

---

## 3. Cấu Trúc File & Danh Mục Thay Đổi

| Phân Vùng | Đường Dẫn File | Thao Tác | Nội Dung & Trách Nhiệm |
| :--- | :--- | :---: | :--- |
| **share-lib** | `share-lib/src/interfaces/lesson.interface.ts` | **Tạo mới** | Khai báo interface `ILesson` |
| **share-lib** | `share-lib/src/index.ts` | Sửa | Re-export `lesson.interface.js` |
| **backend** | `backend/src/modules/course/schemas/lesson.schema.ts` | **Tạo mới** | Định nghĩa `LessonEntity`, `LessonDocument`, `LessonSchema`, index |
| **backend** | `backend/src/modules/course/course.module.ts` | Sửa | Đăng ký `LessonEntity` và `LessonSchema` vào `MongooseModule.forFeature` |
| **backend** | `backend/src/modules/course/tests/lesson.schema.spec.ts` | **Tạo mới** | Unit/Integration tests kiểm định toàn bộ ràng buộc và index của `LessonSchema` |

---

## 4. Chi Tiết Kế Hoạch Triển Khai (Task Breakdown)

### Task 1: Khai Báo Interface `ILesson` Trong `share-lib`
- **Mã Task:** `TASK-01-SHARELIB-LESSON`
- **Agent Phụ Trách:** `backend-specialist`
- **Skills:** `clean-code`
- **Priority:** P0 (Nền tảng)
- **Dependencies:** Không
- **Nội dung thực hiện:**
  1. Tạo file [share-lib/src/interfaces/lesson.interface.ts](file:///d:/Download/hk1_2027/project_do_an/share-lib/src/interfaces/lesson.interface.ts) với định nghĩa `ILesson`.
  2. Mở [share-lib/src/index.ts](file:///d:/Download/hk1_2027/project_do_an/share-lib/src/index.ts) và thêm `export * from './interfaces/lesson.interface.js';`.
  3. Thực thi build package: `pnpm --filter share-lib build`.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** Cấu trúc field chuẩn của Lesson.
  - **OUTPUT:** File `share-lib/dist/interfaces/lesson.interface.d.ts` được tạo.
  - **VERIFY:** `pnpm --filter share-lib build` kết thúc thành công với code 0.

---

### Task 2: Xây Dựng `LessonEntity` & `LessonSchema` Mongoose
- **Mã Task:** `TASK-02-LESSON-SCHEMA`
- **Agent Phụ Trách:** `database-architect`
- **Skills:** `clean-code`, `database-design`
- **Priority:** P1
- **Dependencies:** `TASK-01-SHARELIB-LESSON`
- **Nội dung thực hiện:**
  1. Tạo file [backend/src/modules/course/schemas/lesson.schema.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/schemas/lesson.schema.ts).
  2. Kế thừa `BaseAbstractDocument`.
  3. Sử dụng `@Schema({ timestamps: true, collection: 'lessons' })`.
  4. Khai báo 4 trường:
     - `sectionId`: `MongooseSchema.Types.ObjectId`, `ref: SectionEntity.name`, `required: true`, `index: true`.
     - `title`: `String`, `required: true`, `trim: true`.
     - `description`: `String`, `required: false`, `default: null`, `trim: true`.
     - `order`: `Number`, `required: true`, `min: [0, 'Lesson order cannot be negative']`.
  5. Cấu hình compound index: `LessonSchema.index({ sectionId: 1, deletedAt: 1, order: 1 });`.
  6. Export type `LessonDocument` và const `LessonSchema`.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** Quy chuẩn Schema Mongoose của dự án.
  - **OUTPUT:** File `lesson.schema.ts` hoàn chỉnh.
  - **VERIFY:** TypeScript check không có lỗi type.

---

### Task 3: Đăng Ký Lesson Vào `CourseModule`
- **Mã Task:** `TASK-03-COURSE-MODULE-REGISTRATION`
- **Agent Phụ Trách:** `backend-specialist`
- **Skills:** `clean-code`
- **Priority:** P1
- **Dependencies:** `TASK-02-LESSON-SCHEMA`
- **Nội dung thực hiện:**
  1. Mở [backend/src/modules/course/course.module.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/course.module.ts).
  2. Import `LessonEntity, LessonSchema` từ `./schemas/lesson.schema.js`.
  3. Bổ sung `{ name: LessonEntity.name, schema: LessonSchema }` vào `MongooseModule.forFeature([...])`.
  4. Giữ nguyên `controllers`, `providers`, `exports` (chưa đăng ký Lesson Repository/Service theo đúng yêu cầu phạm vi).
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** `CourseModule` hiện tại.
  - **OUTPUT:** `CourseModule` đăng ký thành công Mongoose model cho Lesson.
  - **VERIFY:** NestJS DI context khởi động bình thường không gặp lỗi thiếu model.

---

### Task 4: Xây Dựng Schema Tests Cho `LessonSchema`
- **Mã Task:** `TASK-04-LESSON-SCHEMA-TESTS`
- **Agent Phụ Trách:** `backend-specialist`
- **Skills:** `clean-code`, `testing-patterns`
- **Priority:** P1
- **Dependencies:** `TASK-02-LESSON-SCHEMA`
- **Nội dung thực hiện:**
  1. Tạo file [backend/src/modules/course/tests/lesson.schema.spec.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/tests/lesson.schema.spec.ts).
  2. Tái sử dụng cách thiết lập isolated database của `section.schema.spec.ts`:
     - Database URI: `mongodb://localhost:27017/thc_datn_lesson_test`.
     - `beforeAll`: Kết nối và gọi `syncIndexes()`.
     - `afterAll`: Drop database và đóng kết nối.
     - `beforeEach`: Xóa toàn bộ documents trong collection.
  3. Viết các test case bắt buộc:
     - **Test 1:** Tạo bài học với đầy đủ trường hợp lệ → Kế thừa đúng `_id`, `deletedAt: null`, `createdById: null`, `updatedById: null`, `createdAt`, `updatedAt`, `title` và `description` được tự động trim khoảng trắng thừa.
     - **Test 2:** Trường `description` là optional → Nhận giá trị mặc định `null` khi không truyền.
     - **Test 3:** Trường `sectionId` là bắt buộc → Ném lỗi khi thiếu `sectionId`.
     - **Test 4:** Trường `title` là bắt buộc → Ném lỗi khi thiếu `title`.
     - **Test 5:** Trường `order` là bắt buộc → Ném lỗi khi thiếu `order`.
     - **Test 6:** Trường `order` không được âm (`order < 0`) → Ném lỗi validation `/Lesson order cannot be negative/`.
     - **Test 7:** Kiểm tra `sectionId` có index đơn lẻ (`index: true`).
     - **Test 8:** Kiểm tra Compound Index `{ sectionId: 1, deletedAt: 1, order: 1 }` được cấu hình chính xác trên schema.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** `LessonEntity` và `LessonSchema`.
  - **OUTPUT:** File test `lesson.schema.spec.ts`.
  - **VERIFY:** Chạy `pnpm --filter backend test` tất cả test cases đều pass 100%.

---

## 5. Quy Chuẩn Đảm Bảo Chất Lượng & Ràng Buộc (Quality Gates & Constraints)

1. **Tuân thủ quy tắc Base Abstract Document:**
   - Tuyệt đối không tự ý khai báo lại các trường `_id`, `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById` trong `LessonEntity`.
2. **Strict Typing & Zero Any:**
   - 100% không dùng `any` trong toàn bộ code mới.
3. **Phạm vi nghiêm ngặt:**
   - Tuyệt đối không tạo file Repository, Service, Controller, DTO hay UI trong task này.
   - Không thêm các trường mở rộng (`videoUrl`, `duration`, `thumbnailUrl`, `content`, ...) trong task này.

---

## 6. Giai Đoạn Kiểm Thử & Nghiệm Thu (Phase X Verification)

- [x] **Build & Type Check:**
  - `pnpm --filter share-lib build`: ✅ Pass
  - `pnpm --filter backend exec npx tsc --noEmit`: ✅ Pass (0 errors)
- [x] **Chạy toàn bộ Backend Tests:**
  - `pnpm --filter backend test src/modules/course/tests/lesson.schema.spec.ts`: ✅ 7/7 tests pass
  - `pnpm --filter backend test`: ✅ 18/18 test files pass (161/161 tests, no regression)
- [x] **Living Docs Update:**
  - Cập nhật Milestone 14 vào `a-agentic/features/course-management/dev-history.md`: ✅ Đã hoàn tất

## ✅ PHASE X COMPLETE

- Schema & Validation: ✅ Pass
- Compound Index: ✅ Pass `{ sectionId: 1, deletedAt: 1, order: 1 }`
- Domain Contract: ✅ Pass `ILesson` exported from `share-lib`
- Module Registration: ✅ Pass in `CourseModule`
- Scope Boundary: ✅ 100% tuân thủ (không tạo Repository, Service, Controller hay UI)
- Date: 2026-09-29

