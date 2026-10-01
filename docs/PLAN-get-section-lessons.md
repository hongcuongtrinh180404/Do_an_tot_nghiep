# PLAN: Triển Khai API Lấy Danh Sách Bài Học Theo Section (`GET /api/v1/sections/:sectionId/lessons`)

> **Mục tiêu:**
> 1. Thêm duy nhất endpoint `GET /api/v1/sections/:sectionId/lessons` vào `LessonController` để lấy danh sách bài học thuộc một chương học.
> 2. Tận dụng 100% tầng Service và Repository đã hoàn thành:
>    - `LessonController` → `LessonService.getLessonsBySectionId(sectionId)` → `LessonRepository.findBySectionId(sectionId)`.
>    - Tuyệt đối không viết lại bất kỳ business logic nào ở Controller hay truy cập Repository trực tiếp.
> 3. Tuân thủ chính xác convention hiện tại của codebase (khảo sát trực tiếp từ `GET :courseId/sections` trong `CourseController`):
>    - **Routing & Params:** `@Controller('sections')` kết hợp `@Get(':sectionId/lessons')` tạo thành URL `GET /api/v1/sections/:sectionId/lessons`.
>    - **Param Validation:** Sử dụng `ParseObjectIdPipe` để kiểm tra `sectionId` trên URL (ném lỗi `400 Bad Request` nếu không phải MongoDB ObjectId hợp lệ).
>    - **Authentication & RBAC:** Khảo sát cho thấy các tài nguyên đề cương/cấu trúc khóa học (`GET :courseId/sections`) là tài nguyên công khai cho phép học viên và khách vãng lai xem đề cương mà không cần đăng nhập. Do đó, áp dụng decorator `@Public()` đồng bộ convention.
>    - **Response Wrapper:** Bọc kết quả bằng `ApiResponse.success(lessons, 'Lấy danh sách bài học thành công')`.
>    - **Data Order & Soft-delete:** `LessonRepository.findBySectionId` đã đảm bảo sắp xếp `order ASC` và loại trừ bản ghi `deletedAt != null`, Controller giữ nguyên không thêm sort/filter thủ công.
> 4. Viết bổ sung các test cases toàn diện trong `backend/src/modules/course/tests/lesson.controller.spec.ts` kiểm thử đầy đủ các kịch bản:
>    - GET thành công trả về danh sách bài học.
>    - Truyền đúng `sectionId` vào `LessonService`.
>    - Trả về mảng rỗng `[]` khi Section chưa có bài học.
>    - Lan truyền `NotFoundException` khi Section không tồn tại hoặc đã bị xóa mềm.
>    - Kiểm tra decorator `@Public()` và route path metadata.
> 5. **Ranh giới nghiêm ngặt (Strict Scope Boundaries):**
>    - ✅ CHỈ làm: Thêm endpoint `GET` trong `LessonController` và bổ sung tests trong `lesson.controller.spec.ts`.
>    - ❌ TUYỆT ĐỐI KHÔNG làm: Frontend UI, Lesson List UI, Edit/Delete/Reorder bài học, Lesson Editor, Upload Video/File.
>    - ❌ KHÔNG sửa đổi: `LessonService`, `LessonRepository`, `LessonEntity`, `SectionEntity`, `CreateLessonDto`, hay endpoint Create Lesson hiện có.
>
> **Task Slug:** `get-section-lessons`  
> **Plan File:** `docs/PLAN-get-section-lessons.md`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`  
> **Project Type:** `BACKEND`

---

## 1. Khảo Sát Hiện Trạng & Ràng Buộc Kiến Trúc (Context Check)

### 1.1. Khảo Sát Permission & Authentication Convention Cho Resource Tương Tự

Khảo sát trực tiếp endpoint `GET :courseId/sections` tại [`backend/src/modules/course/course.controller.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/course.controller.ts#L80-L87):
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
- **Quy chuẩn áp dụng:**
  - Endpoint lấy cấu trúc chương học (`sections`) sử dụng decorator `@Public()` để cho phép người dùng xem cấu trúc curriculum/outline mà không bắt buộc phải có JWT token.
  - Tương tự, danh sách bài học trong một chương học (`GET /sections/:sectionId/lessons`) là một phần cấu trúc curriculum của khóa học. Do đó, áp dụng decorator `@Public()` đồng bộ 100% với `getSections`.

### 1.2. Khảo Sát `LessonService.getLessonsBySectionId`

Khảo sát [`backend/src/modules/course/services/lesson.service.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/services/lesson.service.ts#L65-L82):
```typescript
async getLessonsBySectionId(
  sectionId: string,
  session?: ClientSession,
): Promise<ILesson[]> {
  let section: ISection | null = null;
  try {
    section = await this.sectionRepository.findById(sectionId, session);
  } catch {
    throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
  }

  if (!section || section.deletedAt) {
    throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
  }

  return this.lessonRepository.findBySectionId(sectionId, session);
}
```
- **Đánh giá:**
  - Method đã hoàn chỉnh và đã vượt qua 100% unit tests tại Milestone 16.
  - Tự động ném `NotFoundException` nếu Section cha không tồn tại hoặc đã bị xóa mềm (`deletedAt != null`).
  - Gọi `LessonRepository.findBySectionId(sectionId, session)` trả về danh sách `ILesson[]` sắp xếp theo `order ASC` và loại bỏ soft-deleted.
  - Service **hoàn toàn sẵn sàng**, KHÔNG cần bất kỳ sửa đổi nào.

### 1.3. Khảo Sát `LessonController` Hiện Tại

Khảo sát [`backend/src/modules/course/lesson.controller.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/lesson.controller.ts):
- Đã được gắn `@Controller('sections')`.
- Đã inject `LessonService`.
- Chỉ cần bổ sung thêm method `@Get(':sectionId/lessons')`.

---

## 2. Thiết Kế Chi Tiết Kỹ Thuật

### 2.1. Cấu Trúc Endpoint Trong `LessonController`

File: `backend/src/modules/course/lesson.controller.ts`

```typescript
import {
  Controller,
  Get,
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
import { Public } from '../auth/decorators/public.decorator.js';
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

  @Get(':sectionId/lessons')
  @Public()
  async getLessons(
    @Param('sectionId', ParseObjectIdPipe) sectionId: string,
  ): Promise<ApiResponse<ILesson[]>> {
    const lessons = await this.lessonService.getLessonsBySectionId(sectionId);
    return ApiResponse.success(lessons, 'Lấy danh sách bài học thành công');
  }
}
```

### 2.2. Chi Tiết Contract Request & Response

- **Endpoint:** `GET /api/v1/sections/:sectionId/lessons`
- **Authentication:** Public (không yêu cầu Bearer token).
- **Route Param:**
  - `sectionId`: MongoDB ObjectId (24 hex characters). Validate qua `ParseObjectIdPipe` (ném 400 Bad Request nếu format sai).
- **Response Format (`ApiResponse<ILesson[]>`):**
  - **HTTP Status:** `200 OK`
  ```json
  {
    "success": true,
    "message": "Lấy danh sách bài học thành công",
    "data": [
      {
        "id": "607f1f77bcf86cd799439011",
        "sectionId": "607f1f77bcf86cd799439022",
        "title": "Bài học 1: Giới thiệu",
        "description": "Nội dung bài học",
        "order": 0,
        "createdAt": "2026-09-29T20:00:00.000Z",
        "updatedAt": "2026-09-29T20:00:00.000Z",
        "deletedAt": null,
        "createdById": "user_123",
        "updatedById": "user_123"
      }
    ]
  }
  ```
- **Trường hợp danh sách rỗng (Section chưa có bài học):**
  ```json
  {
    "success": true,
    "message": "Lấy danh sách bài học thành công",
    "data": []
  }
  ```
- **Trường hợp lỗi Section không tồn tại hoặc đã xóa mềm:**
  - **HTTP Status:** `404 Not Found`
  ```json
  {
    "statusCode": 404,
    "message": "Không tìm thấy chương học với ID '607f1f77bcf86cd799439022'",
    "error": "Not Found"
  }
  ```

---

## 3. Thiết Kế Unit Tests Cho `LessonController`

File: `backend/src/modules/course/tests/lesson.controller.spec.ts`

Bổ sung `describe('GET /sections/:sectionId/lessons - getLessons')` với các kịch bản:
1. **Happy Path:**
   - Gọi `controller.getLessons(sampleSectionId)`.
   - Ủy quyền đúng `lessonService.getLessonsBySectionId(sampleSectionId)`.
   - Trả về `ApiResponse` với `success: true`, message `'Lấy danh sách bài học thành công'`, và `data: [sampleLesson]`.
2. **Empty List:**
   - Khi Service trả về `[]`, Controller trả về `ApiResponse` với `data: []`.
3. **Section Không Tồn Tại (Error Propagation):**
   - Khi Service ném `NotFoundException`, Controller để ngoại lệ lan truyền tự nhiên (rethrow).
4. **Metadata & Public Decorator Reflection:**
   - Kiểm tra method `getLessons` có metadata `@Public()` thông qua `IS_PUBLIC_KEY` từ Reflector.
   - Kiểm tra method `getLessons` có route path là `':sectionId/lessons'`.

---

## 4. Kế Hoạch Triển Khai Chi Tiết (Task Breakdown)

### Phase 1: Cập Nhật `LessonController`
- **File:** `backend/src/modules/course/lesson.controller.ts`.
- **Thực hiện:** Import `Get` và `Public`, bổ sung method `getLessons`.
- **Verification:** Kiểm tra cú pháp và import.

### Phase 2: Bổ Sung Test Cases Cho `LessonController`
- **File:** `backend/src/modules/course/tests/lesson.controller.spec.ts`.
- **Thực hiện:** Import `IS_PUBLIC_KEY`, bổ sung suite test `GET /sections/:sectionId/lessons - getLessons`.
- **Verification:** Chạy `pnpm --filter backend test lesson.controller.spec.ts`.

### Phase 3: Kiểm Định Toàn Diện & Regression Check (Verification)
- **Action 1:** Typecheck: `pnpm --filter backend exec npx tsc --noEmit`.
- **Action 2:** Chạy toàn bộ test suite backend: `pnpm --filter backend test`.
- **Action 3:** Đồng bộ living docs: Cập nhật `dev-history.md` cho Milestone 19.

---

## 5. Scope Boundary Checkpoint

| Hạng Mục | Trạng Thái | Ghi Chú |
| :--- | :---: | :--- |
| `GET /api/v1/sections/:sectionId/lessons` | ✅ IN-SCOPE | Bổ sung endpoint vào `LessonController` |
| `lesson.controller.spec.ts` | ✅ IN-SCOPE | Bổ sung unit tests cho GET endpoint |
| `POST Create Lesson` | 🔒 UNCHANGED | Giữ nguyên 100%, không sửa đổi |
| `LessonService` | 🔒 UNCHANGED | Giữ nguyên 100%, method đã có sẵn |
| `LessonRepository` | 🔒 UNCHANGED | Giữ nguyên 100%, method đã có sẵn |
| `LessonEntity` / Schemas | 🔒 UNCHANGED | Giữ nguyên 100% |
| `CreateLessonDto` | 🔒 UNCHANGED | Giữ nguyên 100% |
| Frontend UI & Client | ❌ OUT-OF-SCOPE | Tuyệt đối không đụng đến `frontend/` |
| Edit / Delete / Reorder | ❌ OUT-OF-SCOPE | Tuyệt đối không làm |
| Video / File Upload | ❌ OUT-OF-SCOPE | Tuyệt đối không làm |
