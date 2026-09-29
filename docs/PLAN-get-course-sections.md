# PLAN: API Lấy Danh Sách Sections Của Một Course (`GET /api/v1/courses/:courseId/sections`)

> **Mục tiêu:**
> 1. Xây dựng API `GET /api/v1/courses/:courseId/sections` phục vụ hiển thị cấu trúc chương học (curriculum/outline) trên trang Course Detail.
> 2. Đảm bảo request đi đúng luồng kiến trúc: `CourseController` → `CourseService` → `SectionRepository` → MongoDB Collection `sections`.
> 3. Tối ưu hóa truy vấn: lọc chính xác `courseId`, bỏ qua bản ghi soft-deleted (`deletedAt: null`), sắp xếp tăng dần theo `{ order: 1, _id: 1 }` tận dụng triệt để Compound Index `{ courseId: 1, deletedAt: 1, order: 1 }`.
> 4. Tái sử dụng trọn vẹn convention của codebase: `BaseMongoRepository`, `ParseObjectIdPipe`, envelope `ApiResponse<T>`, cơ chế xử lý lỗi `NotFoundException`.
> 5. Viết bộ unit test toàn diện cho Repository, Service, Controller và Integration/E2E test với isolated database.
>
> **Task Slug:** `get-course-sections`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`, `security-auditor`  
> **Project Type:** `BACKEND`

---

## 1. Khảo Sát Hiện Trạng & Ràng Buộc Kiến Trúc (Context Check)

### 1.1. Schema & Compound Index
- `SectionEntity` ([section.schema.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/schemas/section.schema.ts)):
  - Khóa ngoại `courseId: Types.ObjectId` tham chiếu `CourseEntity`.
  - Có sẵn Compound Index: `{ courseId: 1, deletedAt: 1, order: 1 }`.
  - Có các trường `title`, `description`, `order`, kế thừa `BaseAbstractDocument` (`createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`).

### 1.2. Repository Layer
- `SectionRepository` ([section.repository.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/repositories/section.repository.ts)):
  - Kế thừa `BaseMongoRepository<ISection, SectionEntity>`.
  - Mapper `toDomain` đã có sẵn trong constructor: tự động chuyển `_id` thành `id: string` và `courseId` (ObjectId) thành `string`.
  - Hiện tại `BaseMongoRepository` chỉ có `findManyWithPagination` (kèm overhead tính `countDocuments` và cấu trúc phân trang). Do task yêu cầu lấy toàn bộ sections của khóa học không phân trang, cần thêm method chuyên biệt `findByCourseId(courseId, session)` trực tiếp gọi `this.model.find(...)`.

### 1.3. Service Layer
- `CourseService` ([course.service.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/services/course.service.ts)):
  - Đã inject sẵn `CourseRepository` và `SectionRepository`.
  - Pattern kiểm tra tồn tại của Course hiện có:
    ```typescript
    let course: ICourse | null = null;
    try {
      course = await this.courseRepository.findById(courseId, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }
    if (!course || course.deletedAt) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
    }
    ```
  - **Quyền truy cập (Authorization):** Theo yêu cầu task, API này phục vụ hiển thị cấu trúc Course ở trang Course Detail (outline/curriculum). Không kiểm tra ownership của Instructor như khi tạo/sửa.

### 1.4. Controller & Authentication Strategy
- `CourseController` ([course.controller.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/course.controller.ts)):
  - Prefix route: `/api/v1/courses`.
  - Global guards: `JwtAuthGuard` và `RolesGuard` được cấu hình toàn cục qua `APP_GUARD`.
  - **Quyết định về Authentication Decorator:**
    - Theo `tech-spec.md`, chi tiết khóa học và cấu trúc chương/bài là tài nguyên công khai (`Public`) để học viên/khách vãng lai xem trước đề cương khóa học.
    - Gắn `@Public()` trên `@Get(':courseId/sections')` cho phép cả người dùng chưa đăng nhập lẫn người dùng đã đăng nhập (học viên, giảng viên, admin) đều có thể xem cấu trúc khóa học.
    - Không cần gán `@Roles(...)` vì không hạn chế role.

---

## 2. Tiêu Chí Thành Công & Đặc Tả Kỹ Thuật (Success Criteria)

### 2.1. SectionRepository
Thêm method trong `SectionRepository`:
```typescript
async findByCourseId(
  courseId: string,
  session?: ClientSession,
): Promise<ISection[]> {
  const docs = await this.model
    .find({
      courseId: new Types.ObjectId(courseId),
      deletedAt: null,
    })
    .sort({
      order: 1,
      _id: 1,
    })
    .session(session ?? null)
    .exec();

  return docs.map((doc) => this.toDomain(doc));
}
```
- **Ràng buộc:**
  - `courseId` chuyển đổi qua `new Types.ObjectId(courseId)`.
  - `deletedAt: null` loại trừ các section đã xóa mềm.
  - Sort `{ order: 1, _id: 1 }` đảm bảo deterministic order.
  - Tái sử dụng `this.toDomain(doc)`.
  - Hỗ trợ truyền `session`.

### 2.2. CourseService
Thêm method trong `CourseService`:
```typescript
async getSectionsByCourseId(
  courseId: string,
  session?: ClientSession,
): Promise<ISection[]> {
  let course: ICourse | null = null;
  try {
    course = await this.courseRepository.findById(courseId, session);
  } catch {
    throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
  }

  if (!course || course.deletedAt) {
    throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
  }

  return this.sectionRepository.findByCourseId(courseId, session);
}
```
- **Ràng buộc:**
  - Bắt lỗi CastError hoặc không tìm thấy → ném `NotFoundException("Không tìm thấy khóa học với ID '${courseId}'")`.
  - Không ném lỗi khi khóa học chưa có section nào (trả về mảng rỗng `[]`).
  - Truyền `session` xuống cả `courseRepository` và `sectionRepository`.

### 2.3. CourseController
Thêm endpoint trong `CourseController`:
```typescript
@Get(':courseId/sections')
@Public()
async getSections(
  @Param('courseId', ParseObjectIdPipe) courseId: string,
): Promise<ApiResponse<ISection[]>> {
  const sections = await this.courseService.getSectionsByCourseId(courseId);
  return ApiResponse.success(sections, 'Lấy danh sách chương học thành công');
}
```
- **Ràng buộc:**
  - Validate `:courseId` qua `ParseObjectIdPipe` (lỗi 400 Bad Request nếu không phải 24 hex chars).
  - Bọc kết quả trong `ApiResponse.success(sections, 'Lấy danh sách chương học thành công')`.

---

## 3. Cấu Trúc File & Vị Trí Triển Khai

```text
backend/
├── src/
│   └── modules/
│       └── course/
│           ├── repositories/
│           │   └── section.repository.ts                (Thêm findByCourseId)
│           ├── services/
│           │   └── course.service.ts                    (Thêm getSectionsByCourseId)
│           ├── course.controller.ts                     (Thêm GET :courseId/sections)
│           └── tests/
│               ├── section.repository.spec.ts           (Bổ sung unit tests cho findByCourseId)
│               ├── course.service.spec.ts               (Bổ sung unit tests cho getSectionsByCourseId)
│               ├── course.controller.spec.ts            (Bổ sung unit tests cho getSections)
│               └── get-sections.integration.spec.ts     (File E2E/Integration test mới)
```

---

## 4. Phân Công Tác Vụ Chi Tiết (Task Breakdown)

| Task ID | Tên Nhiệm Vụ | Agent Phụ Trách | Skill | Input → Output → Verification |
| :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | Bổ sung `findByCourseId` trong `SectionRepository` | `backend-specialist` | `clean-code` | **IN**: `courseId: string`, `session?`<br>**OUT**: Method `findByCourseId` trong `section.repository.ts`<br>**VERIFY**: Query filter `{ courseId, deletedAt: null }` & sort `{ order: 1, _id: 1 }` |
| **TASK-02** | Unit Tests cho `SectionRepository.findByCourseId` | `backend-specialist` | `testing-patterns` | **IN**: Mock model với find/sort/session/exec<br>**OUT**: 4 test cases trong `section.repository.spec.ts`<br>**VERIFY**: Test nhiều section, soft deleted, empty array, session forwarding |
| **TASK-03** | Bổ sung `getSectionsByCourseId` trong `CourseService` | `backend-specialist` | `clean-code` | **IN**: `courseId: string`, `session?`<br>**OUT**: Method `getSectionsByCourseId` trong `course.service.ts`<br>**VERIFY**: Kiểm tra course tồn tại, ném `NotFoundException`, gọi `sectionRepository.findByCourseId` |
| **TASK-04** | Unit Tests cho `CourseService.getSectionsByCourseId` | `backend-specialist` | `testing-patterns` | **IN**: Mock `courseRepository` và `sectionRepository`<br>**OUT**: 4 test cases trong `course.service.spec.ts`<br>**VERIFY**: Course tồn tại, course không tồn tại, empty array, session forwarding |
| **TASK-05** | Bổ sung route `@Get(':courseId/sections')` trong `CourseController` | `backend-specialist` | `api-patterns` | **IN**: `@Param('courseId', ParseObjectIdPipe)`<br>**OUT**: Endpoint trong `course.controller.ts`<br>**VERIFY**: Trả về `ApiResponse.success(sections)` |
| **TASK-06** | Unit Tests cho `CourseController.getSections` | `backend-specialist` | `testing-patterns` | **IN**: Mock `courseService.getSectionsByCourseId`<br>**OUT**: Unit tests trong `course.controller.spec.ts`<br>**VERIFY**: Param truyền đúng, ApiResponse chuẩn, empty array trả 200 |
| **TASK-07** | Viết Integration/E2E Test | `backend-specialist` | `testing-patterns` | **IN**: Supertest + isolated database<br>**OUT**: `get-sections.integration.spec.ts`<br>**VERIFY**: Happy path sắp xếp đúng (0→1→2), bỏ qua deleted/other course, 404 khi course không tồn tại, 200 mảng rỗng |
| **TASK-08** | Kiểm định toàn bộ test suite và Typecheck | `project-planner` | `clean-code` | **IN**: Mã nguồn backend<br>**OUT**: Toàn bộ unit + integration test pass<br>**VERIFY**: `pnpm --filter backend test` & `pnpm --filter backend exec npx tsc --noEmit` pass 100% |

---

## 5. Ranh Giới Kỹ Thuật (Out of Scope - Tuyệt Đối Không Làm)
- ❌ Không tạo Section mới.
- ❌ Không sửa/cập nhật Section (`PATCH`).
- ❌ Không xóa Section (`DELETE`).
- ❌ Không thay đổi thứ tự Section (`reorder`).
- ❌ Không thêm phân trang (`pagination`).
- ❌ Không thêm bộ lọc/tìm kiếm (`filter`/`search`).
- ❌ Không thao tác với `Lesson`.
- ❌ Không chỉnh sửa giao diện Frontend hay Course Detail page.
- ❌ Không validate chống trùng order (`duplicate order`).

---

## 6. Kế Hoạch Nghiệm Thu & Kiểm Thử (Phase X: Verification)

- [x] `SectionRepository.findByCourseId()` lọc đúng `courseId`, `deletedAt: null`, sort `{ order: 1, _id: 1 }`.
- [x] `CourseService.getSectionsByCourseId()` ném `NotFoundException` khi Course không tồn tại hoặc đã soft-delete.
- [x] `CourseController` route `:courseId/sections` validate qua `ParseObjectIdPipe` và bọc `ApiResponse`.
- [x] Unit Tests:
  - [x] `section.repository.spec.ts` (4 new test cases pass).
  - [x] `course.service.spec.ts` (4 new test cases pass).
  - [x] `course.controller.spec.ts` (3 new test cases pass).
- [x] Integration/E2E Test:
  - [x] `create-section.integration.spec.ts` (Happy path sorted, soft delete excluded, 404 not found, empty array, invalid ObjectId).
- [x] Full Regression Test: `pnpm --filter backend test` đạt 100% Pass (17/17 files, 154/154 tests).
- [x] Typecheck: `pnpm --filter backend exec npx tsc --noEmit` đạt 0 error, 0 warning.

## ✅ PHASE X COMPLETE
- File test: `backend/src/modules/course/tests/create-section.integration.spec.ts`, `section.repository.spec.ts`, `course.service.spec.ts`, `course.controller.spec.ts`
- Test suite: ✅ 17/17 files passed (154/154 tests)
- Typecheck: ✅ 0 errors, 0 warnings
- Date: 2026-09-26
