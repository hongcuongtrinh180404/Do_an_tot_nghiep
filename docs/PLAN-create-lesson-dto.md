# PLAN: Khởi Tạo Input DTO Cho API Tạo Bài Học (`CreateLessonDto`)

> **Mục tiêu:**
> 1. Thiết kế và triển khai `CreateLessonDto` tại `backend/src/modules/course/dto/create-lesson.dto.ts` chuẩn bị cho `LessonController`.
> 2. Tuân thủ tuyệt đối các convention hiện hành của dự án (khảo sát từ `CreateSectionDto` và `CreateCourseDto`):
>    - Thư viện validation: `class-validator`, `class-transformer`.
>    - Chuẩn hóa whitespace (`@Transform` trim chuỗi, chuỗi rỗng chuyển về `undefined` đối với optional).
>    - Không sử dụng Swagger decorators (dự án không tích hợp `@nestjs/swagger`).
>    - Thông báo lỗi tiếng Việt nhất quán, thân thiện.
> 3. Đảm bảo dữ liệu tối thiểu cho bài học (Lesson): `title`, `description?`, `order`.
>    - Tuyệt đối không đưa các trường nội bộ (`sectionId`, `createdById`, `updatedById`, audit fields) vào request body. `sectionId` sẽ được truyền qua route param và audit do Service/Controller xử lý.
> 4. Xây dựng bộ unit tests toàn diện độc lập cho DTO tại `backend/src/modules/course/tests/create-lesson.dto.spec.ts` sử dụng `plainToInstance` và `validate` để kiểm thử toàn bộ các ràng buộc (happy path, edge cases, whitespace trimming, negative order).
> 5. **Ranh giới nghiêm ngặt (Strict Scope Boundaries):**
>    - ✅ CHỈ làm: `CreateLessonDto` và `create-lesson.dto.spec.ts`.
>    - ❌ TUYỆT ĐỐI KHÔNG làm: `LessonController`, API routes/endpoints, Frontend UI/Client, sửa đổi `LessonService`, sửa đổi `LessonRepository`, sửa đổi `LessonEntity`/Schema, hay các DTO khác (Edit, Delete, Reorder).
>
> **Task Slug:** `create-lesson-dto`  
> **Plan File:** `docs/PLAN-create-lesson-dto.md`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`  
> **Project Type:** `BACKEND`

---

## 1. Khảo Sát Hiện Trạng & Ràng Buộc Kiến Trúc (Context Check)

### 1.1. Khảo Sát Convention DTO Hiện Tại

Khảo sát trực tiếp hai DTO mẫu của module Course:
- [`create-section.dto.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/dto/create-section.dto.ts)
- [`create-course.dto.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/dto/create-course.dto.ts)

| Tiêu Chí | Quy Chuẩn Đang Áp Dụng | Chi Tiết Áp Dụng Vào `CreateLessonDto` |
| :--- | :--- | :--- |
| **Class Naming** | PascalCase, hậu tố `Dto` | `CreateLessonDto` |
| **File Naming** | kebab-case, hậu tố `.dto.ts` | `backend/src/modules/course/dto/create-lesson.dto.ts` |
| **Validation Decorators** | `class-validator` | `@IsNotEmpty`, `@IsString`, `@MinLength`, `@MaxLength`, `@IsOptional`, `@IsInt`, `@Min` |
| **Transform Decorators** | `class-transformer` | `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)` và `@Type(() => Number)` |
| **Optional Handling** | `@IsOptional()` kết hợp `@Transform` | Chuỗi rỗng `""` được trim và convert thành `undefined` |
| **Swagger Decorators** | Không sử dụng | Codebase không cài đặt `@nestjs/swagger`, tuyệt đối không dùng `@ApiProperty` |
| **Error Messages** | Tiếng Việt rõ ràng | "Tiêu đề bài học không được để trống", "Thứ tự bài học phải là số nguyên", ... |

### 1.2. Khảo Sát Tương Thích Với `LessonService`

- Khảo sát [`LessonService.createLesson`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/services/lesson.service.ts):
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
- **Đánh giá tương thích:**
  - `CreateLessonDto` cung cấp chính xác `{ title, description?, order }`.
  - `sectionId` là route parameter (`/sections/:sectionId/lessons`).
  - `userId` được trích xuất từ `@CurrentUser('id')` tại Controller khi implement sau này.
  - **Kết luận:** `LessonService` hiện tại đã hoàn toàn sẵn sàng và tương thích 100%, **KHÔNG** cần bất kỳ sửa đổi nào ở Service layer.

---

## 2. Thiết Kế Chi Tiết & Ràng Buộc Dữ Liệu

### 2.1. Cấu Trúc Chi Tiết Của `CreateLessonDto`

File: `backend/src/modules/course/dto/create-lesson.dto.ts`

```typescript
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateLessonDto {
  @IsNotEmpty({ message: 'Tiêu đề bài học không được để trống' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Tiêu đề bài học phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tiêu đề bài học không được để trống' })
  @MaxLength(200, { message: 'Tiêu đề bài học không được vượt quá 200 ký tự' })
  title: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString({ message: 'Mô tả bài học phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'Mô tả bài học không được vượt quá 1000 ký tự' })
  description?: string;

  @IsNotEmpty({ message: 'Thứ tự bài học không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'Thứ tự bài học phải là số nguyên' })
  @Min(0, { message: 'Thứ tự bài học phải lớn hơn hoặc bằng 0' })
  order: number;
}
```

### 2.2. Chi Tiết Ràng Buộc Validation Từng Field

| Field | Kiểu Dữ Liệu | Ràng Buộc | Hành Vi Xử Lý & Lỗi Phản Hồi |
| :--- | :--- | :--- | :--- |
| `title` | `string` | Bắt buộc, 1 - 200 ký tự, tự động trim khoảng trắng thừa | - Bị thiếu / rỗng -> Báo lỗi `Tiêu đề bài học không được để trống`<br>- Không phải string -> Báo lỗi `Tiêu đề bài học phải là chuỗi ký tự`<br>- Toàn khoảng trắng (`"   "`) -> Trim về `""` -> MinLength(1) chặn lại<br>- Quá 200 ký tự -> Báo lỗi `Tiêu đề bài học không được vượt quá 200 ký tự` |
| `description` | `string \| undefined` | Tùy chọn (optional), tối đa 1000 ký tự | - Không truyền / `undefined` -> Hợp lệ<br>- Chuỗi toàn khoảng trắng -> Trim về rỗng -> Chuyển thành `undefined`<br>- Không phải string -> Báo lỗi `Mô tả bài học phải là chuỗi ký tự`<br>- Quá 1000 ký tự -> Báo lỗi `Mô tả bài học không được vượt quá 1000 ký tự` |
| `order` | `number` | Bắt buộc, số nguyên, >= 0 | - Bị thiếu -> Báo lỗi `Thứ tự bài học không được để trống`<br>- Không phải số nguyên (số thập phân, string không parse được) -> Báo lỗi `Thứ tự bài học phải là số nguyên`<br>- Nhỏ hơn 0 (ví dụ: `-1`) -> Báo lỗi `Thứ tự bài học phải lớn hơn hoặc bằng 0`<br>- Hỗ trợ string số nguyên từ query/body (ví dụ `"0"`, `"2"`) nhờ `@Type(() => Number)` |

---

## 3. Thiết Kế Unit Test Cho DTO (`create-lesson.dto.spec.ts`)

File: `backend/src/modules/course/tests/create-lesson.dto.spec.ts`

### Danh sách các test cases:
1. **Happy Path:**
   - Payload đầy đủ: `{ title: 'Bài học 1: Giới thiệu', description: 'Mô tả bài học', order: 0 }` -> Không có lỗi validation.
   - Payload tối thiểu (không có `description`): `{ title: 'Bài học 1: Giới thiệu', order: 1 }` -> Không có lỗi validation.
   - Payload có `description` là chuỗi rỗng hoặc chỉ có khoảng trắng: `{ title: 'Bài học 1', description: '   ', order: 0 }` -> Transform về `undefined`, không có lỗi.
2. **Validation `title`:**
   - Thiếu `title` -> Báo lỗi validation.
   - `title` rỗng `""` hoặc toàn khoảng trắng `"   "` -> Báo lỗi validation.
   - `title` không phải chuỗi (số, object, boolean) -> Báo lỗi validation.
   - `title` vượt quá 200 ký tự -> Báo lỗi validation.
3. **Validation `description`:**
   - `description` không phải chuỗi -> Báo lỗi validation.
   - `description` vượt quá 1000 ký tự -> Báo lỗi validation.
4. **Validation `order`:**
   - Thiếu `order` -> Báo lỗi validation.
   - `order` là số âm (`-1`) -> Báo lỗi validation.
   - `order` là số thập phân (`1.5`) -> Báo lỗi validation (yêu cầu số nguyên).
   - `order` truyền dạng string số hợp lệ (`"2"`) -> `@Type(() => Number)` chuyển đổi thành số nguyên `2` hợp lệ.

---

## 4. Kế Hoạch Triển Khai Chi Tiết (Task Breakdown)

### Phase 1: Tạo DTO (`CreateLessonDto`)
- **Action:** Tạo file `backend/src/modules/course/dto/create-lesson.dto.ts`.
- **Nội dung:** Khai báo class `CreateLessonDto` với đầy đủ decorators như thiết kế tại mục 2.
- **Verification:** Kiểm tra cú pháp và import `class-validator`, `class-transformer`.

### Phase 2: Viết Unit Test DTO (`create-lesson.dto.spec.ts`)
- **Action:** Tạo file `backend/src/modules/course/tests/create-lesson.dto.spec.ts`.
- **Nội dung:** Sử dụng `plainToInstance` và `validate` để bao quát toàn bộ 11+ kịch bản test tại mục 3.
- **Verification:** Chạy test đơn lẻ `pnpm --filter backend test create-lesson.dto.spec.ts`.

### Phase 3: Kiểm Định Toàn Diện & Regression Check (Verification)
- **Action 1 - Typecheck:**
  ```bash
  pnpm --filter backend exec npx tsc --noEmit
  ```
- **Action 2 - Regression Test:**
  ```bash
  pnpm --filter backend test
  ```
- **Tiêu chí hoàn thành:**
  - `tsc --noEmit` thoát với mã 0 (0 error).
  - 100% test cases trong `create-lesson.dto.spec.ts` pass.
  - Toàn bộ test suite backend hiện có (20 test files, 186+ tests) tiếp tục pass 100%.

---

## 5. Scope Boundary Checkpoint

| Hạng Mục | Trạng Thái | Ghi Chú |
| :--- | :---: | :--- |
| `CreateLessonDto` | ✅ IN-SCOPE | Tạo mới tại `dto/create-lesson.dto.ts` |
| `create-lesson.dto.spec.ts` | ✅ IN-SCOPE | Tạo mới tại `tests/create-lesson.dto.spec.ts` |
| `LessonController` | ❌ OUT-OF-SCOPE | Tuyệt đối không tạo hay sửa |
| API Endpoints | ❌ OUT-OF-SCOPE | Tuyệt đối không tạo route `POST /sections/:sectionId/lessons` |
| Frontend UI / Client | ❌ OUT-OF-SCOPE | Không đụng đến `frontend/` |
| `LessonService` | ❌ OUT-OF-SCOPE | Không sửa đổi (đã tương thích 100%) |
| `LessonRepository` | ❌ OUT-OF-SCOPE | Không sửa đổi |
| `LessonEntity` / Schemas | ❌ OUT-OF-SCOPE | Không sửa đổi |
| Edit/Delete/Reorder DTO | ❌ OUT-OF-SCOPE | Không mở rộng scope |
