# PLAN: Triển Khai Lesson Controller Cho API Tạo Bài Học (`LessonController`)

> **Mục tiêu:**
> 1. Xây dựng `LessonController` tại `backend/src/modules/course/controllers/lesson.controller.ts` (hoặc `backend/src/modules/course/lesson.controller.ts`).
> 2. Expose duy nhất một endpoint:
>    - `POST /api/v1/sections/:sectionId/lessons`
> 3. Tuân thủ tuyệt đối các convention hiện có của dự án (khảo sát trực tiếp từ `CourseController` và `UserController`):
>    - **Routing & Params:** Sử dụng `@Controller('sections')` và `@Post(':sectionId/lessons')`.
>    - **Param Validation:** Sử dụng `ParseObjectIdPipe` để kiểm tra `sectionId` trên URL (báo lỗi 400 Bad Request nếu không phải MongoDB ObjectId hợp lệ).
>    - **Body Validation:** Sử dụng `CreateLessonDto` đã hoàn thành ở Milestone 17.
>    - **Authentication & Authorization:** Bảo vệ bởi `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)` và trích xuất `userId` từ token thông qua decorator `@CurrentUser('id')`.
>    - **Response Wrapper:** Bọc kết quả qua `ApiResponse.success(lesson, 'Tạo bài học thành công')` kèm HTTP status 201 Created (`@HttpCode(HttpStatus.CREATED)`).
>    - **Dependency Delegation:** Controller chỉ delegate xuống `LessonService.createLesson(sectionId, { title: dto.title, description: dto.description, order: dto.order, userId })`, tuyệt đối không truy cập Repository hay Database trực tiếp.
>    - **Module Registration:** Đăng ký `LessonController` vào danh sách `controllers` của `CourseModule` (`backend/src/modules/course/course.module.ts`).
> 4. Viết bộ unit tests toàn diện cho Controller tại `backend/src/modules/course/tests/lesson.controller.spec.ts` kiểm thử đầy đủ các kịch bản ủy quyền, validation, và propagation lỗi từ Service.
> 5. **Ranh giới nghiêm ngặt (Strict Scope Boundaries):**
>    - ✅ CHỈ làm: `LessonController`, endpoint `POST /sections/:sectionId/lessons`, đăng ký `CourseModule`, và unit tests `lesson.controller.spec.ts`.
>    - ❌ TUYỆT ĐỐI KHÔNG làm: `GET /lessons`, danh sách bài học, sửa đổi hay bổ sung Frontend, Edit/Delete/Reorder bài học.
>    - ❌ KHÔNG sửa đổi: `LessonService`, `LessonRepository`, `CreateLessonDto`, hay `LessonEntity`/Schema.
>
> **Task Slug:** `create-lesson-controller`  
> **Plan File:** `docs/PLAN-create-lesson-controller.md`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`  
> **Project Type:** `BACKEND`

---

## 1. Khảo Sát Hiện Trạng & Ràng Buộc Kiến Trúc (Context Check)

### 1.1. Khảo Sát `CourseController` & Convention Controller Hiện Tại

Khảo sát trực tiếp file [`backend/src/modules/course/course.controller.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/course.controller.ts):

| Hạng Mục | Convention Đang Sử Dụng | Áp Dụng Cho `LessonController` |
| :--- | :--- | :--- |
| **Prefix & Route** | Global prefix `api/v1` (`main.ts`) | `@Controller('sections')` kết hợp `@Post(':sectionId/lessons')` -> URL: `POST /api/v1/sections/:sectionId/lessons` |
| **HTTP Status Code** | `@HttpCode(HttpStatus.CREATED)` cho POST | `@HttpCode(HttpStatus.CREATED)` |
| **Route Param Validation** | `@Param('courseId', ParseObjectIdPipe) courseId: string` | `@Param('sectionId', ParseObjectIdPipe) sectionId: string` |
| **Request Body** | `@Body() dto: CreateSectionDto` | `@Body() dto: CreateLessonDto` |
| **User Identity & RBAC** | `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`<br>`@CurrentUser('id') userId: string` | Giữ nguyên phân quyền: chỉ giảng viên hoặc admin mới được tạo bài học |
| **Response Format** | `ApiResponse.success(data, 'Message')` | `ApiResponse.success(lesson, 'Tạo bài học thành công')` |
| **Dependency Injection** | Inject `CourseService` vào constructor | Inject `LessonService` vào constructor |
| **Swagger Decorators** | Không sử dụng | Codebase không tích hợp Swagger, không dùng `@Api*` decorators |

### 1.2. Khảo Sát `LessonService` Đang Sẵn Sàng

Khảo sát [`LessonService.createLesson`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/services/lesson.service.ts):
```typescript
export interface CreateLessonInput {
  title: string;
  description?: string | null;
  order: number;
  userId?: string;
}

async createLesson(
  sectionId: string,
  input: CreateLessonInput,
  session?: ClientSession,
): Promise<ILesson>
```
- Khi Controller gọi:
  ```typescript
  const lesson = await this.lessonService.createLesson(sectionId, {
    title: dto.title,
    description: dto.description,
    order: dto.order,
    userId,
  });
  ```
- `LessonService` tự động kiểm tra Section tồn tại/soft-delete (ném `NotFoundException` nếu không hợp lệ), validate `order >= 0` (ném `BadRequestException` nếu âm), tự động trim dữ liệu và lưu audit `createdById`, `updatedById`.

### 1.3. Khảo Sát `CourseModule`

Khảo sát [`backend/src/modules/course/course.module.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/course.module.ts):
- Hiện tại: `controllers: [CourseController]`.
- Cần bổ sung: `controllers: [CourseController, LessonController]`.

---

## 2. Thiết Kế Chi Tiết Kỹ Thuật

### 2.1. Cấu Trúc `LessonController`

File: `backend/src/modules/course/lesson.controller.ts`

```typescript
import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ILesson, RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { LessonService } from './services/lesson.service.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';

@Controller('sections')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post(':sectionId/lessons')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async createLesson(
    @Param('sectionId', ParseObjectIdPipe) sectionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<ApiResponse<ILesson>> {
    const lesson = await this.lessonService.createLesson(sectionId, {
      title: dto.title,
      description: dto.description,
      order: dto.order,
      userId,
    });
    return ApiResponse.success(lesson, 'Tạo bài học thành công');
  }
}
```

### 2.2. Chi Tiết Request & Response Contract

- **Endpoint:** `POST /api/v1/sections/:sectionId/lessons`
- **Headers:** `Authorization: Bearer <jwt-token>`
- **Route Param:**
  - `sectionId`: MongoDB ObjectId (24 hex characters). Nếu sai format -> ném `400 Bad Request` qua `ParseObjectIdPipe`.
- **Request Body (`CreateLessonDto`):**
  ```json
  {
    "title": "Bài học 1: Giới thiệu",
    "description": "Nội dung tổng quan",
    "order": 0
  }
  ```
- **Response Body (`ApiResponse<ILesson>`):**
  - **HTTP Status:** `201 Created`
  ```json
  {
    "success": true,
    "message": "Tạo bài học thành công",
    "data": {
      "id": "607f1f77bcf86cd799439011",
      "sectionId": "607f1f77bcf86cd799439022",
      "title": "Bài học 1: Giới thiệu",
      "description": "Nội dung tổng quan",
      "order": 0,
      "createdAt": "2026-09-29T20:00:00.000Z",
      "updatedAt": "2026-09-29T20:00:00.000Z",
      "deletedAt": null,
      "createdById": "user_123",
      "updatedById": "user_123"
    }
  }
  ```

---

## 3. Thiết Kế Unit Tests Cho `LessonController`

File: `backend/src/modules/course/tests/lesson.controller.spec.ts`

### Các kịch bản kiểm thử:
1. **Happy Path:**
   - Gọi `controller.createLesson(validSectionId, userId, validDto)`:
     - Ủy quyền đúng xuống `lessonService.createLesson` với tham số `sectionId` và `{ title, description, order, userId }`.
     - Trả về đối tượng `ApiResponse` với `success: true`, message `'Tạo bài học thành công'`, và data chứa đối tượng `ILesson`.
2. **Metadata & Guards Reflection:**
   - Kiểm tra Controller được gắn decorator `@Controller('sections')`.
   - Kiểm tra method `createLesson` được gắn metadata `@Roles` chứa `RoleEnum.INSTRUCTOR` và `RoleEnum.ADMIN`.
   - Kiểm tra method `createLesson` có HTTP code là `HttpStatus.CREATED` (201).
3. **Param & Service Delegation:**
   - Đảm bảo `sectionId` truyền từ `@Param` được chuyển nguyên vẹn xuống `LessonService`.
   - Đảm bảo `userId` trích xuất từ `@CurrentUser` được gán vào `CreateLessonInput`.
4. **Service Error Propagation:**
   - Khi `LessonService.createLesson` ném `NotFoundException` (ví dụ Section không tồn tại hoặc đã xóa mềm) -> Controller để ngoại lệ lan truyền tự nhiên (rethrow) lên global exception filter.
   - Khi `LessonService.createLesson` ném `BadRequestException` (ví dụ `order < 0`) -> Controller rethrow ngoại lệ để trả về mã 400.

---

## 4. Kế Hoạch Triển Khai (Task Breakdown)

### Phase 1: Tạo `LessonController`
- **Action:** Tạo file `backend/src/modules/course/lesson.controller.ts`.
- **Nội dung:** Class `LessonController` với endpoint `@Post(':sectionId/lessons')` theo thiết kế mục 2.
- **Verification:** Import và typecheck không phát sinh lỗi.

### Phase 2: Đăng Ký Controller Vào `CourseModule`
- **Action:** Sửa `backend/src/modules/course/course.module.ts`.
- **Nội dung:** Thêm `LessonController` vào mảng `controllers: [CourseController, LessonController]`.
- **Verification:** Chạy `pnpm --filter backend exec npx tsc --noEmit`.

### Phase 3: Viết Unit Tests Cho Controller
- **Action:** Tạo file `backend/src/modules/course/tests/lesson.controller.spec.ts`.
- **Nội dung:** Mock `LessonService` và kiểm thử toàn bộ 4 kịch bản tại mục 3.
- **Verification:** Chạy `pnpm --filter backend test lesson.controller.spec.ts`.

### Phase 4: Kiểm Định Toàn Diện & Regression Check
- **Action 1:** Typecheck toàn bộ backend: `pnpm --filter backend exec npx tsc --noEmit`.
- **Action 2:** Chạy test suite đầy đủ: `pnpm --filter backend test`.
- **Action 3:** Đồng bộ living docs: Cập nhật `dev-history.md` cho Milestone 18.

---

## 5. Scope Boundary Checkpoint

| Hạng Mục | Trạng Thái | Ghi Chú |
| :--- | :---: | :--- |
| `LessonController` | ✅ IN-SCOPE | Tạo mới tại `course/lesson.controller.ts` |
| `POST /sections/:sectionId/lessons` | ✅ IN-SCOPE | Expose endpoint duy nhất này |
| `CourseModule` | ✅ IN-SCOPE | Đăng ký `LessonController` vào module |
| `lesson.controller.spec.ts` | ✅ IN-SCOPE | Tạo mới tại `course/tests/` |
| `GET /sections/:sectionId/lessons` | ❌ OUT-OF-SCOPE | Tuyệt đối không implement |
| Lesson List API | ❌ OUT-OF-SCOPE | Tuyệt đối không implement |
| Frontend UI/API client | ❌ OUT-OF-SCOPE | Tuyệt đối không đụng đến frontend |
| `LessonService` | ❌ OUT-OF-SCOPE | Giữ nguyên, không sửa |
| `LessonRepository` | ❌ OUT-OF-SCOPE | Giữ nguyên, không sửa |
| `CreateLessonDto` | ❌ OUT-OF-SCOPE | Giữ nguyên, đã hoàn thành |
| `LessonEntity` / Schemas | ❌ OUT-OF-SCOPE | Giữ nguyên, không sửa |
