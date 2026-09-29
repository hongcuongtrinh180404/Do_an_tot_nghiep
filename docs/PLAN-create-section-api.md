# PLAN: Thiết Kế HTTP Contract & Input DTO Cho API Tạo Section

> **Mục tiêu:**
> 1. Thiết kế và triển khai HTTP contract (Endpoint & DTO) cho API tạo Section thuộc Course: `POST /api/v1/courses/:courseId/sections`.
> 2. Khảo sát và tuân thủ tuyệt đối các convention của dự án về validation (`class-validator`, `class-transformer`), xử lý params, chuẩn hóa whitespace, và envelope `ApiResponse<T>`.
> 3. Tích hợp `ParseObjectIdPipe` để validate tham số `:courseId` trên URL (báo lỗi 400 Bad Request nếu không đúng chuẩn 24 hex MongoDB ObjectId).
> 4. Tích hợp endpoint vào `CourseController` và khai báo method stub trong `CourseService` (CỐ Ý chưa thực hiện business logic, check course tồn tại, repository hay database insert theo yêu cầu).
> 5. Viết unit tests kiểm thử toàn diện DTO validation và Controller delegation.
>
> **Task Slug:** `create-section-api`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`, `security-auditor`  

---

## 1. Khảo Sát Hiện Trạng & Ràng Buộc Kiến Trúc Codebase

### 1.1. Khảo Sát Các Convention Hiện Tại
- **Global Prefix & Routing:**
  - `main.ts` cấu hình prefix toàn cục là `api/v1`.
  - `CourseController` sử dụng `@Controller('courses')` → Mọi sub-route bắt đầu bằng `/api/v1/courses`.
  - Endpoint sẽ được định nghĩa là `@Post(':courseId/sections')` trong `CourseController`, tạo thành URL: `POST /api/v1/courses/:courseId/sections`.
- **Validation Pipe:**
  - `main.ts` kích hoạt `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
  - Mọi trường không khai báo trong DTO sẽ tự động bị từ chối với lỗi `400 Bad Request`.
- **Convention DTO (`backend/src/modules/course/dto/`):**
  - Sử dụng `@Transform` để `.trim()` các chuỗi ký tự.
  - Sử dụng `@Type(() => Number)` và `@IsInt` / `@Min(0)` cho các trường số nguyên không âm.
  - Thông báo lỗi tiếng Việt nhất quán, rõ ràng.
- **Convention Phân Quyền (RBAC):**
  - Sử dụng decorator `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)` đồng bộ với các endpoint quản lý khóa học.
  - Nhận diện người thực hiện qua `@CurrentUser('id')`.
- **Convention API Response Wrapper:**
  - Mọi phản hồi bọc qua `ApiResponse<T>` từ `backend/src/modules/base/index.js` (`ApiResponse.success(data, message)`).
- **Quy tắc Kiểm tra ObjectId URL Param:**
  - Sử dụng `ParseObjectIdPipe` kiểm tra `Types.ObjectId.isValid(value)` ngay tại Controller. Ném `BadRequestException` khi param không phải chuỗi 24 hex chars.

---

## 2. Thiết Kế Chi Tiết & Ràng Buộc Kỹ Thuật

### 2.1. Cấu Trúc `CreateSectionDto` (`backend/src/modules/course/dto/create-section.dto.ts`)

| Field | Kiểu Dữ Liệu | Ràng Buộc Validation | Decorators & Transformer |
| :--- | :--- | :--- | :--- |
| `title` | `string` | Bắt buộc, chuỗi, 1 - 200 ký tự | `@IsNotEmpty()`, `@Transform(trim)`, `@IsString()`, `@MinLength(1)`, `@MaxLength(200)` |
| `description` | `string \| undefined` | Tùy chọn (optional), tối đa 1000 ký tự | `@IsOptional()`, `@Transform(trim rỗng -> undefined)`, `@IsString()`, `@MaxLength(1000)` |
| `order` | `number` | Bắt buộc, số nguyên, >= 0 | `@IsNotEmpty()`, `@Type(() => Number)`, `@IsInt()`, `@Min(0)` |

### 2.2. Reusable `ParseObjectIdPipe` (`backend/src/modules/base/pipes/parse-object-id.pipe.ts`)
```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`ID '${value}' không phải là MongoDB ObjectId hợp lệ`);
    }
    return value;
  }
}
```

### 2.3. Endpoint Trong `CourseController` (`backend/src/modules/course/course.controller.ts`)
```typescript
@Post(':courseId/sections')
@HttpCode(HttpStatus.CREATED)
@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
async createSection(
  @Param('courseId', ParseObjectIdPipe) courseId: string,
  @Body() dto: CreateSectionDto,
  @CurrentUser('id') userId: string,
): Promise<ApiResponse<ISection>> {
  const section = await this.courseService.createSection(courseId, dto, userId);
  return ApiResponse.success(section, 'Tạo chương học thành công');
}
```

### 2.4. Service Stub Method (`backend/src/modules/course/services/course.service.ts`)
```typescript
async createSection(
  courseId: string,
  dto: CreateSectionDto,
  userId?: string,
): Promise<ISection> {
  // STUB: Chưa implement business logic, check Course tồn tại, hay database insert
  return {
    id: 'stub_section_id',
    courseId,
    title: dto.title,
    description: dto.description ?? null,
    order: dto.order,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: userId ?? null,
  };
}
```

---

## 3. Ranh Giới Kỹ Thuật (CỐ Ý CHƯA THỰC HIỆN)

Theo yêu cầu nghiêm ngặt của task:
1. ❌ **Không implement business logic** (chưa kiểm tra quyền sở hữu khóa học của giảng viên).
2. ❌ **Không implement repository method** cho Section.
3. ❌ **Không kiểm tra Course tồn tại** trong cơ sở dữ liệu.
4. ❌ **Không thực hiện database insert** vào collection `sections`.
5. ❌ **Không tạo các method GET, PATCH, DELETE hoặc reorder**.
6. ❌ **Không thay đổi schema của Course**.

---

## 4. Phân Công Tác Vụ Chi Tiết (Task Breakdown)

| Task ID | Tên Nhiệm Vụ | Agent Phụ Trách | Skill | Input → Output → Verification |
| :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | Tạo `ParseObjectIdPipe` trong `base/pipes/` | `backend-specialist` | `clean-code` | **IN**: Input string param<br>**OUT**: `parse-object-id.pipe.ts` & export trong `base/index.ts`<br>**VERIFY**: Unit test kiểm tra ném `BadRequestException` khi ID sai |
| **TASK-02** | Tạo `CreateSectionDto` | `backend-specialist` | `api-patterns` | **IN**: Ràng buộc title, description, order<br>**OUT**: `backend/src/modules/course/dto/create-section.dto.ts`<br>**VERIFY**: ValidationPipe transform & validate đúng theo spec |
| **TASK-03** | Khai báo method stub `createSection` trong `CourseService` | `backend-specialist` | `clean-code` | **IN**: Signature `(courseId, dto, userId)`<br>**OUT**: Stub method trong `CourseService`<br>**VERIFY**: Trả về dữ liệu kiểu `ISection` |
| **TASK-04** | Bổ sung route `@Post(':courseId/sections')` trong `CourseController` | `backend-specialist` | `clean-code` | **IN**: `CreateSectionDto`, `ParseObjectIdPipe`<br>**OUT**: Method `createSection` trong `CourseController`<br>**VERIFY**: NestJS routing nhận diện |
| **TASK-05** | Viết Unit Test cho Controller & DTO Validation | `backend-specialist` | `testing-patterns` | **IN**: Test cases thành công & thất bại<br>**OUT**: `backend/src/modules/course/tests/course.controller.spec.ts`<br>**VERIFY**: Chạy `pnpm --filter backend test` đạt 100% Pass |

---

## 5. Kế Hoạch Nghiệm Thu & Kiểm Thử (Phase X: Verification)

- [x] **Typecheck Backend**: `pnpm --filter backend exec npx tsc --noEmit` đạt 0 error.
- [x] **DTO Validation Tests**:
  - [x] Title rỗng hoặc chỉ có khoảng trắng → Lỗi 400.
  - [x] Title > 200 ký tự → Lỗi 400.
  - [x] Order thiếu hoặc âm → Lỗi 400.
  - [x] Order là số thực (float) hoặc chuỗi không thể parse thành int → Lỗi 400.
  - [x] Field lạ ngoài DTO → Lỗi 400 (do `forbidNonWhitelisted`).
- [x] **Route Param Validation**:
  - [x] `courseId` không đúng 24 hex characters → Ném `400 Bad Request` qua `ParseObjectIdPipe`.
- [x] **Monorepo Regression Test**: `pnpm --filter backend test` (15/15 files, 120/120 tests passed).

## ✅ PHASE X COMPLETE
- Typecheck: ✅ Pass (0 errors)
- Unit Tests: ✅ 120/120 Pass (bao gồm 3 tests cho `ParseObjectIdPipe` và 10 tests mới cho controller & DTO)
- Date: 2026-09-25

