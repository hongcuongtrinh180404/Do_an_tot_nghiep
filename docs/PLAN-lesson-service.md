# PLAN: Triển Khai Lesson Service (`LessonService`)

> **Mục tiêu:**
> 1. Xây dựng `LessonService` kế thừa `BaseService<ILesson, string>` tuân thủ chặt chẽ pattern kiến trúc của codebase (CLS context, automated logging, audit capture).
> 2. Triển khai 2 use cases nền tảng:
>    - **Create Lesson (`createLesson`):**
>      - Kiểm tra sự tồn tại và tính hợp lệ của entity cha `Section` thông qua `SectionRepository.findById(sectionId, session)`.
>      - Nếu Section không tồn tại, đã bị xóa mềm (`deletedAt != null`), hoặc `findById` ném lỗi -> Ném `NotFoundException`.
>      - Ràng buộc thứ tự `order >= 0` (nếu `< 0` -> Ném `BadRequestException`).
>      - Chuẩn hóa khoảng trắng: `title.trim()`, `description?.trim() || null`.
>      - Gọi `LessonRepository.create(...)` với `sectionId: section.id`, audit fields (`createdById`, `updatedById` từ input hoặc CLS `getCurrentUserId()`), truyền `session`.
>    - **List Lessons by Section (`getLessonsBySectionId`):**
>      - Kiểm tra sự tồn tại của Section cha (ném `NotFoundException` nếu không tìm thấy hoặc đã bị xóa mềm).
>      - Gọi `LessonRepository.findBySectionId(sectionId, session)`.
>      - Trả về danh sách `ILesson[]` giữ nguyên thứ tự `order ASC` do Repository cung cấp.
> 3. Tuyệt đối không truy cập database/Mongoose trực tiếp và không chứa bất kỳ logic HTTP nào.
> 4. Đăng ký `LessonService` vào `providers` và `exports` của `CourseModule` để sẵn sàng cho Dependency Injection.
> 5. Viết bộ unit tests toàn diện trong `lesson.service.spec.ts` kiểm thử đầy đủ các kịch bản thành công và xử lý ngoại lệ.
> 6. **Ranh giới nghiêm ngặt (Out of Scope):**
>    - ❌ TUYỆT ĐỐI KHÔNG làm `LessonController`, DTO, API routes hay UI/Frontend.
>    - ❌ Không sửa đổi `LessonEntity`, `LessonSchema`, hay `LessonRepository`.
>
> **Task Slug:** `lesson-service`  
> **Plan File:** `docs/PLAN-lesson-service.md`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`  
> **Project Type:** `BACKEND`

---

## 1. Khảo Sát Hiện Trạng & Ràng Buộc Kiến Trúc (Context Check)

### 1.1. Hiện Trạng `CourseService` & `BaseService`
- **Pattern tham chiếu ([course.service.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/services/course.service.ts)):**
  - Kế thừa: `BaseService<DomainModel, string>`.
  - Inject Repositories:
    ```typescript
    constructor(
      protected readonly lessonRepository: LessonRepository,
      protected readonly sectionRepository: SectionRepository,
      cls: ClsService,
    ) {
      super(lessonRepository, cls, LessonService.name);
    }
    ```
  - Kiểm tra entity cha tồn tại (Pattern trong `createSection` và `getSectionsByCourseId`):
    ```typescript
    let section: ISection | null = null;
    try {
      section = await this.sectionRepository.findById(sectionId, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }

    if (!section || section.deletedAt) {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }
    ```
- **Xử lý audit fields & CLS:**
  - `this.getCurrentUserId()` lấy `userId` từ `ClsService` (mặc định `'SYSTEM'` nếu không có request context).
  - Có thể nhận `userId` tường minh từ tham số hoặc fallback về `this.getCurrentUserId()`.

### 1.2. Hiện Trạng `LessonRepository`
- `LessonRepository` ([lesson.repository.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/repositories/lesson.repository.ts)) cung cấp:
  - `create(payload: Partial<ILesson>, session?: ClientSession): Promise<ILesson>`
  - `findBySectionId(sectionId: string, session?: ClientSession): Promise<ILesson[]>`

### 1.3. Hiện Trạng `CourseModule`
- `CourseModule` ([course.module.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/course.module.ts)) hiện đã import và export `LessonRepository`. Cần đăng ký thêm `LessonService` vào `providers` và `exports`.

---

## 2. Thiết Kế Kỹ Thuật Chi Tiết (Technical Specifications)

### 2.1. Cấu Trúc Class `LessonService`

- **Đường dẫn:** `backend/src/modules/course/services/lesson.service.ts`
- **Decorator:** `@Injectable()`
- **Kế thừa:** `BaseService<ILesson, string>`

```typescript
export interface CreateLessonInput {
  title: string;
  description?: string | null;
  order: number;
  userId?: string;
}

@Injectable()
export class LessonService extends BaseService<ILesson, string> {
  constructor(
    protected readonly lessonRepository: LessonRepository,
    protected readonly sectionRepository: SectionRepository,
    cls: ClsService,
  ) {
    super(lessonRepository, cls, LessonService.name);
  }

  async createLesson(
    sectionId: string,
    input: CreateLessonInput,
    session?: ClientSession,
  ): Promise<ILesson> {
    let section: ISection | null = null;
    try {
      section = await this.sectionRepository.findById(sectionId, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }

    if (!section || section.deletedAt) {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }

    if (input.order !== undefined && input.order < 0) {
      throw new BadRequestException('Thứ tự bài học không được nhỏ hơn 0');
    }

    const userId = input.userId ?? this.getCurrentUserId();

    return this.lessonRepository.create(
      {
        sectionId: section.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        order: input.order,
        createdById: userId,
        updatedById: userId,
      },
      session,
    );
  }

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
}
```

### 2.2. Danh Sách Phương Thức Của `LessonService`

| Phương Thức | Input Parameters | Return Type | Mô Tả & Xử Lý Ngoại Lệ |
| :--- | :--- | :--- | :--- |
| `createLesson` | `sectionId: string`, `input: CreateLessonInput`, `session?: ClientSession` | `Promise<ILesson>` | • Kiểm tra Section tồn tại (ném `NotFoundException` nếu không có hoặc đã bị xóa mềm).<br>• Kiểm tra `order >= 0` (ném `BadRequestException` nếu `< 0`).<br>• Gọi `lessonRepository.create(...)`. |
| `getLessonsBySectionId` | `sectionId: string`, `session?: ClientSession` | `Promise<ILesson[]>` | • Kiểm tra Section tồn tại (ném `NotFoundException` nếu không có hoặc đã bị xóa mềm).<br>• Gọi `lessonRepository.findBySectionId(...)` trả về mảng `ILesson[]` sắp xếp `order ASC`. |

---

## 3. Cấu Trúc File & Danh Mục Thay Đổi

| Phân Vùng | Đường Dẫn File | Thao Tác | Nội Dung & Trách Nhiệm |
| :--- | :--- | :---: | :--- |
| **backend** | `backend/src/modules/course/services/lesson.service.ts` | **Tạo mới** | Triển khai `LessonService` kế thừa `BaseService` |
| **backend** | `backend/src/modules/course/course.module.ts` | Sửa | Đăng ký `LessonService` vào `providers` và `exports` |
| **backend** | `backend/src/modules/course/tests/lesson.service.spec.ts` | **Tạo mới** | Unit tests cho `LessonService` (mock repositories, kiểm thử 2 use cases) |

---

## 4. Chi Tiết Kế Hoạch Triển Khai (Task Breakdown)

### Task 1: Tạo `LessonService`
- **Mã Task:** `TASK-01-LESSON-SERVICE`
- **Agent Phụ Trách:** `backend-specialist`
- **Skills:** `clean-code`
- **Priority:** P0 (Cốt lõi)
- **Dependencies:** Không
- **Nội dung thực hiện:**
  1. Tạo file [backend/src/modules/course/services/lesson.service.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/services/lesson.service.ts).
  2. Định nghĩa interface `CreateLessonInput`.
  3. Implement class `LessonService extends BaseService<ILesson, string>`.
  4. Triển khai method `createLesson`:
     - Tra cứu Section cha qua `sectionRepository.findById`.
     - Ném `NotFoundException` nếu Section không tồn tại hoặc đã bị xóa mềm.
     - Validate `order >= 0`, ném `BadRequestException` nếu vi phạm.
     - Chuẩn hóa `title.trim()`, `description?.trim() || null`.
     - Gọi `lessonRepository.create(...)` kèm audit fields và session.
  5. Triển khai method `getLessonsBySectionId`:
     - Tra cứu Section cha qua `sectionRepository.findById`.
     - Ném `NotFoundException` nếu Section không tồn tại hoặc đã bị xóa mềm.
     - Gọi `lessonRepository.findBySectionId(...)` và trả về kết quả.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** `LessonRepository`, `SectionRepository`, `ClsService`, `ILesson`.
  - **OUTPUT:** File `lesson.service.ts` hoàn chỉnh.
  - **VERIFY:** TypeScript check không có lỗi type.

---

### Task 2: Đăng Ký `LessonService` Vào `CourseModule`
- **Mã Task:** `TASK-02-MODULE-DI-REGISTRATION`
- **Agent Phụ Trách:** `backend-specialist`
- **Skills:** `clean-code`
- **Priority:** P1
- **Dependencies:** `TASK-01-LESSON-SERVICE`
- **Nội dung thực hiện:**
  1. Mở [backend/src/modules/course/course.module.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/course.module.ts).
  2. Import `LessonService` từ `./services/lesson.service.js`.
  3. Thêm `LessonService` vào mảng `providers` và `exports`.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** `CourseModule` hiện tại.
  - **OUTPUT:** `LessonService` được export để sẵn sàng cho DI.
  - **VERIFY:** Type check biên dịch sạch sẽ.

---

### Task 3: Viết Unit Tests Toàn Diện Cho `LessonService`
- **Mã Task:** `TASK-03-SERVICE-TESTS`
- **Agent Phụ Trách:** `backend-specialist`
- **Skills:** `clean-code`, `testing-patterns`
- **Priority:** P1
- **Dependencies:** `TASK-01-LESSON-SERVICE`
- **Nội dung thực hiện:**
  1. Tạo file [backend/src/modules/course/tests/lesson.service.spec.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/tests/lesson.service.spec.ts).
  2. Mock `LessonRepository`, `SectionRepository`, và `ClsService`.
  3. Viết các test suites:
     - **Suite 1: `createLesson`:**
       - Test 1: Tạo Lesson thành công khi Section tồn tại, gọi `lessonRepository.create` với dữ liệu chính xác (trimmed title, description null nếu rỗng, order, audit fields).
       - Test 2: Ném `NotFoundException` khi Section không tồn tại (`null`).
       - Test 3: Ném `NotFoundException` khi Section đã bị xóa mềm (`deletedAt != null`).
       - Test 4: Ném `NotFoundException` khi `sectionRepository.findById` ném lỗi (CastError / DB glitch).
       - Test 5: Ném `BadRequestException` khi `order < 0`.
       - Test 6: Truyền `session` xuống `sectionRepository.findById` và `lessonRepository.create`.
       - Test 7: Lan truyền lỗi Repository khi `lessonRepository.create` ném ngoại lệ.
     - **Suite 2: `getLessonsBySectionId`:**
       - Test 8: Trả về danh sách Lesson thành công khi Section tồn tại.
       - Test 9: Trả về mảng rỗng `[]` khi Section tồn tại nhưng chưa có bài học.
       - Test 10: Ném `NotFoundException` khi Section không tồn tại hoặc đã bị xóa mềm.
       - Test 11: Truyền `session` xuống `sectionRepository.findById` và `lessonRepository.findBySectionId`.
       - Test 12: Lan truyền lỗi Repository khi `lessonRepository.findBySectionId` ném ngoại lệ.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** `LessonService`.
  - **OUTPUT:** File `lesson.service.spec.ts`.
  - **VERIFY:** Chạy `pnpm --filter backend test src/modules/course/tests/lesson.service.spec.ts` pass 100%.

---

## 5. Quy Chuẩn Đảm Bảo Chất Lượng & Ràng Buộc (Quality Gates & Constraints)

1. **Tuân thủ quy chuẩn Service & Repository:**
   - Kế thừa `BaseService`, sử dụng DI của NestJS.
   - Tuyệt đối không import Mongoose Model hay query MongoDB trực tiếp trong Service.
2. **Strict Typing & Zero Any:**
   - 100% không dùng `any` trong production code (`lesson.service.ts`).
3. **Phạm vi nghiêm ngặt:**
   - ❌ Tuyệt đối KHÔNG tạo Controller, DTO, API endpoints hay UI trong task này.
   - ❌ Không sửa đổi `LessonEntity`, `LessonSchema`, hay `LessonRepository`.

---

## 6. Giai Đoạn Kiểm Thử & Nghiệm Thu (Phase X Verification)

- [x] **Type Check:**
  - `pnpm --filter backend exec npx tsc --noEmit`: ✅ Pass (0 errors)
- [x] **Chạy Unit Tests cho LessonService:**
  - `pnpm --filter backend test src/modules/course/tests/lesson.service.spec.ts`: ✅ 16/16 tests pass
- [x] **Chạy toàn bộ Backend Tests (Kiểm tra Regression):**
  - `pnpm --filter backend test`: ✅ 20/20 test files pass (186/186 tests pass, 0 regressions)
- [x] **Living Docs Update:**
  - Cập nhật Milestone 16 vào `a-agentic/features/course-management/dev-history.md`: ✅ Đã hoàn tất

## ✅ PHASE X COMPLETE

- LessonService Implementation: ✅ Pass
- Injected Repositories: `LessonRepository`, `SectionRepository`, `ClsService` ✅ Pass
- Methods: `createLesson`, `getLessonsBySectionId`: ✅ Pass
- Parent Entity Validation: `sectionRepository.findById` (NotFoundException): ✅ Pass
- Order Validation: `order >= 0` (BadRequestException): ✅ Pass
- Module Registration in CourseModule: ✅ Pass
- Scope Boundary: ✅ 100% tuân thủ (chưa làm Controller/API/Frontend)
- Date: 2026-09-29

