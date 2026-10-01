# PLAN: Triển Khai Lesson Repository (`LessonRepository`)

> **Mục tiêu:**
> 1. Xây dựng `LessonRepository` theo đúng architectural pattern của codebase (kế thừa `BaseMongoRepository<ILesson, LessonEntity>`).
> 2. Phục vụ 2 thao tác nền tảng:
>    - **Tạo Lesson:** Kế thừa phương thức `create(payload, session)` từ `BaseMongoRepository`, lưu document vào MongoDB và ánh xạ sang domain `ILesson`.
>    - **Lấy danh sách Lesson theo `sectionId`:** Phương thức `findBySectionId(sectionId, session)` lọc chính xác theo `sectionId`, loại trừ soft-deleted (`deletedAt: null`), sắp xếp tăng dần theo `order` (`order: 1, _id: 1`).
> 3. Cấu hình mapper `toDomain` trong constructor: Chuyển đổi an toàn `_id` thành `id: string` và `sectionId` (ObjectId) thành `string`.
> 4. Đăng ký `LessonRepository` vào `providers` và `exports` của `CourseModule` để sẵn sàng cho Dependency Injection.
> 5. Viết bộ unit tests toàn diện trong `lesson.repository.spec.ts` kiểm thử:
>    - Ánh xạ mapper `toDomain`.
>    - Thao tác `create` (gọi save kèm session và trả về domain model).
>    - Thao tác `findBySectionId` (lọc đúng sectionId, chỉ lấy bài học thuộc section đó, loại bỏ soft-deleted, sắp xếp `order ASC`, hỗ trợ ClientSession).
> 6. **Ranh giới nghiêm ngặt (Out of Scope):**
>    - ❌ TUYỆT ĐỐI KHÔNG làm Lesson Service, Lesson Controller, DTO, API, Frontend hay Lesson UI.
>    - ❌ Không sửa đổi `LessonEntity` hoặc `LessonSchema`.
>
> **Task Slug:** `lesson-repository`  
> **Plan File:** `docs/PLAN-lesson-repository.md`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`, `database-architect`  
> **Project Type:** `BACKEND`

---

## 1. Khảo Sát Hiện Trạng & Ràng Buộc Kiến Trúc (Context Check)

### 1.1. Hiện Trạng `SectionRepository` & `BaseMongoRepository`
- **Pattern tham chiếu trực tiếp ([section.repository.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/repositories/section.repository.ts)):**
  - Kế thừa: `BaseMongoRepository<ISection, SectionEntity>`.
  - Constructor: Inject model qua `@InjectModel(SectionEntity.name)` và truyền custom mapper vào `super(model, mapper)`.
  - Mapper chuyển đổi:
    ```typescript
    const rawId = plain._id;
    const id = typeof rawId === 'string' ? rawId : rawId?.toString?.();
    const rawSectionId = plain.sectionId;
    const sectionId = typeof rawSectionId === 'string' ? rawSectionId : rawSectionId?.toString?.();
    ```
  - Phương thức query:
    ```typescript
    const sectionObjectId = Types.ObjectId.isValid(sectionId)
      ? new Types.ObjectId(sectionId)
      : sectionId;

    const docs = await this.model
      .find({ sectionId: sectionObjectId, deletedAt: null })
      .sort({ order: 1, _id: 1 })
      .session(session ?? null)
      .exec();
    ```
- **Phương thức `create`:** Có sẵn từ [`BaseMongoRepository`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/base/repositories/base.mongo.repository.ts):
  ```typescript
  async create(payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel> {
    const createdDoc = new this.model(payload);
    await createdDoc.save({ session });
    return this.toDomain(createdDoc as unknown as HydratedDocument<DocumentType>);
  }
  ```

### 1.2. Hiện Trạng `CourseModule`
- File [course.module.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/course.module.ts) đã đăng ký `LessonEntity` & `LessonSchema` vào `MongooseModule.forFeature`.
- Cần bổ sung `LessonRepository` vào mảng `providers` và `exports`.

### 1.3. Hiện Trạng Tests
- File tham chiếu [section.repository.spec.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/tests/section.repository.spec.ts) sử dụng Vitest với Mock Model Mongoose, kiểm thử chi tiết Mapper, `create` và `findByCourseId`.

---

## 2. Thiết Kế Kỹ Thuật Chi Tiết (Technical Specifications)

### 2.1. Cấu Trúc Class `LessonRepository`

- **Đường dẫn:** `backend/src/modules/course/repositories/lesson.repository.ts`
- **Decorator:** `@Injectable()`
- **Kế thừa:** `BaseMongoRepository<ILesson, LessonEntity>`

```typescript
@Injectable()
export class LessonRepository extends BaseMongoRepository<ILesson, LessonEntity> {
  constructor(
    @InjectModel(LessonEntity.name)
    lessonModel: Model<LessonEntity>,
  ) {
    super(lessonModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.();
      const rawSectionId = plain.sectionId;
      const sectionId =
        typeof rawSectionId === 'string'
          ? rawSectionId
          : (rawSectionId as { toString?: () => string })?.toString?.();

      return {
        ...plain,
        id: id as string,
        sectionId: (sectionId ?? '') as string,
      } as unknown as ILesson;
    });
  }

  async findBySectionId(
    sectionId: string,
    session?: ClientSession,
  ): Promise<ILesson[]> {
    const sectionObjectId = Types.ObjectId.isValid(sectionId)
      ? new Types.ObjectId(sectionId)
      : sectionId;

    const docs = await this.model
      .find({
        sectionId: sectionObjectId,
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
}
```

### 2.2. Danh Sách Phương Thức Của `LessonRepository`

| Phương Thức | Input Parameters | Return Type | Mô Tả & Hành Vi |
| :--- | :--- | :--- | :--- |
| `create` | `payload: Partial<ILesson>`, `session?: ClientSession` | `Promise<ILesson>` | *(Kế thừa từ BaseMongoRepository)* Tạo mới document bài học, lưu vào collection `lessons` và trả về entity dạng `ILesson`. |
| `findBySectionId` | `sectionId: string`, `session?: ClientSession` | `Promise<ILesson[]>` | Tìm kiếm tất cả bài học thuộc `sectionId`, lọc `deletedAt: null`, sắp xếp tăng dần theo `{ order: 1, _id: 1 }`. |
| `findById` | `id: string`, `session?: ClientSession` | `Promise<ILesson \| null>` | *(Kế thừa từ BaseMongoRepository)* Tìm một bài học theo ID nếu cần. |

---

## 3. Cấu Trúc File & Danh Mục Thay Đổi

| Phân Vùng | Đường Dẫn File | Thao Tác | Nội Dung & Trách Nhiệm |
| :--- | :--- | :---: | :--- |
| **backend** | `backend/src/modules/course/repositories/lesson.repository.ts` | **Tạo mới** | Triển khai `LessonRepository` kế thừa `BaseMongoRepository` |
| **backend** | `backend/src/modules/course/course.module.ts` | Sửa | Đăng ký `LessonRepository` vào `providers` và `exports` |
| **backend** | `backend/src/modules/course/tests/lesson.repository.spec.ts` | **Tạo mới** | Unit tests cho `LessonRepository` (Mapper, Create, findBySectionId) |

---

## 4. Chi Tiết Kế Hoạch Triển Khai (Task Breakdown)

### Task 1: Tạo `LessonRepository`
- **Mã Task:** `TASK-01-LESSON-REPO`
- **Agent Phụ Trách:** `backend-specialist`
- **Skills:** `clean-code`, `database-design`
- **Priority:** P0 (Cốt lõi)
- **Dependencies:** Không
- **Nội dung thực hiện:**
  1. Tạo file [backend/src/modules/course/repositories/lesson.repository.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/repositories/lesson.repository.ts).
  2. Implement class `LessonRepository extends BaseMongoRepository<ILesson, LessonEntity>`.
  3. Xây dựng mapper `toDomain`: chuyển `_id` thành `id: string`, chuyển `sectionId` thành `string`.
  4. Triển khai method `findBySectionId(sectionId: string, session?: ClientSession): Promise<ILesson[]>`.
     - Tận dụng Compound Index `{ sectionId: 1, deletedAt: 1, order: 1 }`.
     - Chuyển `sectionId` sang `Types.ObjectId` nếu hợp lệ.
     - Lọc `deletedAt: null`.
     - Sắp xếp `{ order: 1, _id: 1 }`.
     - Map kết quả qua `this.toDomain(doc)`.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** `ILesson` từ `share-lib`, `LessonEntity` từ `schemas/lesson.schema.ts`.
  - **OUTPUT:** File `lesson.repository.ts` hoàn chỉnh.
  - **VERIFY:** TypeScript type check không có lỗi type.

---

### Task 2: Đăng Ký `LessonRepository` Vào `CourseModule`
- **Mã Task:** `TASK-02-MODULE-DI-REGISTRATION`
- **Agent Phụ Trách:** `backend-specialist`
- **Skills:** `clean-code`
- **Priority:** P1
- **Dependencies:** `TASK-01-LESSON-REPO`
- **Nội dung thực hiện:**
  1. Mở [backend/src/modules/course/course.module.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/course.module.ts).
  2. Import `LessonRepository` từ `./repositories/lesson.repository.js`.
  3. Thêm `LessonRepository` vào danh sách `providers` và `exports`.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** `CourseModule` hiện tại.
  - **OUTPUT:** `LessonRepository` được export từ `CourseModule`.
  - **VERIFY:** Chạy type check xác nhận không thiếu dependency.

---

### Task 3: Viết Unit Tests Toàn Diện Cho `LessonRepository`
- **Mã Task:** `TASK-03-REPO-TESTS`
- **Agent Phụ Trách:** `backend-specialist`
- **Skills:** `clean-code`, `testing-patterns`
- **Priority:** P1
- **Dependencies:** `TASK-01-LESSON-REPO`
- **Nội dung thực hiện:**
  1. Tạo file [backend/src/modules/course/tests/lesson.repository.spec.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/tests/lesson.repository.spec.ts).
  2. Tái sử dụng pattern test của `section.repository.spec.ts`.
  3. Các test suite cần có:
     - **Suite 1: Mapper (`toDomain`):**
       - Test 1: Chuyển đổi chính xác Mongo `_id` (ObjectId) sang `id` (string) và `sectionId` (ObjectId) sang `sectionId` (string).
       - Test 2: Xử lý plain object không có hàm `toObject`.
       - Test 3: Xử lý chuỗi string `_id` và string `sectionId` an toàn.
     - **Suite 2: `create`:**
       - Test 4: Khởi tạo model, lưu kèm ClientSession và trả về domain `ILesson`.
     - **Suite 3: `findBySectionId`:**
       - Test 5: Tìm lessons theo `sectionId` kèm `deletedAt: null`, sắp xếp theo `order ASC` (`{ order: 1, _id: 1 }`).
       - Test 6: Chỉ lấy bài học thuộc Section được yêu cầu (đúng filter `sectionId`).
       - Test 7: Loại trừ hoàn toàn các soft-deleted lessons (`deletedAt: null`).
       - Test 8: Trả về mảng rỗng `[]` khi Section không có bài học nào.
       - Test 9: Truyền ClientSession xuống câu truy vấn khi được cung cấp, hoặc `null` khi không có.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** `LessonRepository`.
  - **OUTPUT:** File `lesson.repository.spec.ts`.
  - **VERIFY:** Chạy `pnpm --filter backend test src/modules/course/tests/lesson.repository.spec.ts` pass 100%.

---

## 5. Quy Chuẩn Đảm Bảo Chất Lượng & Ràng Buộc (Quality Gates & Constraints)

1. **Tuân thủ quy chuẩn Repository:**
   - Kế thừa `BaseMongoRepository`, không inject raw `@InjectModel` lung tung ngoài Repository layer.
   - Luôn sử dụng mapper `toDomain` để trả về interface `ILesson`.
2. **Strict Typing & Zero Any:**
   - Tuyệt đối không dùng `any` trong production code (`lesson.repository.ts`).
3. **Phạm vi nghiêm ngặt:**
   - ❌ Tuyệt đối KHÔNG tạo `LessonService`, `LessonController`, DTO, API routes hay UI.
   - ❌ Không sửa đổi `LessonEntity` hoặc `LessonSchema`.

---

## 6. Giai Đoạn Kiểm Thử & Nghiệm Thu (Phase X Verification)

- [x] **Type Check:**
  - `pnpm --filter backend exec npx tsc --noEmit`: ✅ Pass (0 errors)
- [x] **Chạy Unit Tests cho LessonRepository:**
  - `pnpm --filter backend test src/modules/course/tests/lesson.repository.spec.ts`: ✅ 9/9 tests pass
- [x] **Chạy toàn bộ Backend Tests (Kiểm tra Regression):**
  - `pnpm --filter backend test`: ✅ 19/19 test files pass (170/170 tests pass, 0 regressions)
- [x] **Living Docs Update:**
  - Cập nhật Milestone 15 vào `a-agentic/features/course-management/dev-history.md`: ✅ Đã hoàn tất

## ✅ PHASE X COMPLETE

- LessonRepository Implementation: ✅ Pass
- Mapper `toDomain` (`_id` -> string, `sectionId` -> string): ✅ Pass
- Methods: `create`, `findBySectionId`: ✅ Pass
- Query Constraints (sectionId filter, deletedAt: null, order ASC): ✅ Pass
- Module Registration in CourseModule: ✅ Pass
- Scope Boundary: ✅ 100% tuân thủ (chưa làm Service/Controller/API/UI)
- Date: 2026-09-29

