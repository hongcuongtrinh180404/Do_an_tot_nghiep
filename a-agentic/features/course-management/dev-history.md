# Course Management — Development History & Gotchas

> **Module:** Course Management

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `IN_PROGRESS` (Đã hoàn thành Course Domain Foundation v1 & Create Course API `POST /api/v1/courses`).
- **Kế hoạch triển khai:** Sprint 1 — Tiếp theo: Chapter/Lesson foundation & Course Detail / Update APIs.

---

## 2. Technical Notes & Gotchas

- **Slug Generation & Soft-delete Index**: Sử dụng Partial Unique Index `{ slug: 1 }` với `partialFilterExpression: { deletedAt: null }`. Đảm bảo slug chỉ duy nhất giữa các khóa học đang hoạt động và cho phép tái sử dụng slug nếu khóa học cũ đã bị xóa mềm.
- **Instructor Reference & Validation**: `instructorId` tham chiếu tới User. Khi tạo khóa học, `CourseService` kiểm tra người dùng phải tồn tại, chưa bị soft-delete, có `status === ACTIVE` và vai trò `role` là `INSTRUCTOR` hoặc `ADMIN`.
- **Global Guards & Zero-Trust Body**: `JwtAuthGuard` và `RolesGuard` được cấu hình toàn cục qua `APP_GUARD`, do đó controller không cần gắn `@UseGuards` dư thừa. Với `forbidNonWhitelisted: true`, `CreateCourseDto` không khai báo `instructorId` và `status`, giúp chặn hoàn toàn các payload gửi kèm trường này với lỗi `400 Bad Request`. `instructorId` được gán trực tiếp từ `@CurrentUser('id')`.
- **Nested Population Guard**: Không dùng cascading `.populate()` đa tầng từ Course -> Chapters -> Lessons. Thay vào đó dùng Aggregation Pipeline `$lookup` có `$project` tường minh các trường cần thiết để đảm bảo hiệu năng cao.
- **Frontend Milestone 1 (Course Management UI Foundation)**:
  - Khởi tạo route `/instructor/courses` (`frontend/src/app/instructor/courses/page.tsx`) theo vai trò `RoleEnum.INSTRUCTOR`, tách biệt với public catalog `/courses`.
  - Triển khai module `frontend/src/features/course/` với `CourseHeader`, `CourseEmptyState`, `CourseManagementContent`.
  - Tái sử dụng trọn vẹn Design Tokens và Primitives (`Button`, `Card`, `Icon`), tuân thủ triệt để Purple Ban (không màu tím) và cấm inline font classes.
- **Frontend Milestone 2 (Create Course Form UI)**:
  - Khởi tạo route `/instructor/courses/new` (`frontend/src/app/instructor/courses/new/page.tsx`) kèm SEO metadata chuẩn RSC.
  - Bổ sung UI Primitive `Textarea` (`frontend/src/components/ui/textarea.tsx`) đồng bộ với Design System và `Input`.
  - Xây dựng schema validation `create-course.schema.ts` dùng `zod` đồng bộ quy chuẩn với `CreateCourseDto` phía backend (whitespace trimming, lowercase slug, regex kebab-case, price >= 0, `CourseLevelEnum`).
  - Xây dựng tiện ích `slugify.ts` hỗ trợ tự động tạo slug tiếng Việt không dấu chuẩn SEO real-time khi gõ tiêu đề (ví dụ: *"Khóa học Next.js 16"* -> `khoa-hoc-nextjs-16`), ngưng ghi đè khi giảng viên đã chỉnh sửa slug thủ công và cho phép tạo lại từ tiêu đề bất kỳ lúc nào.
  - Component `CreateCourseForm`: sử dụng `react-hook-form` + `@hookform/resolvers/zod`, hiển thị dropdown `<select>` chọn 4 cấp độ, thông báo lỗi validation trực quan (`aria-invalid`), nút Hủy quay lại `/instructor/courses`, nút Tạo khóa học ở chế độ preview (hiển thị toast từ `sonner`, in `console.log`, không redirect, chưa gọi API).
  - Nối nút "Tạo khóa học" tại `CourseHeader` và `CourseEmptyState` trên trang `/instructor/courses` điều hướng sang `/instructor/courses/new`.
- **Frontend Milestone 3 (Connect Create Course Form with Backend API)**:
  - Khảo sát và mở rộng hợp đồng dữ liệu: Bổ sung interface `ICreateCoursePayload` vào `share-lib/src/interfaces/course.interface.ts` làm Single Source of Truth cho cả Backend DTO và Frontend API Client.
  - Xây dựng API Client `courseApi.createCourse` và React Query Mutation Hook `useCreateCourseMutation` (`frontend/src/features/course/api/course.api.ts`).
  - Xử lý xác thực và cơ chế Auto-refresh 401: `apiClient` Axios Response Interceptor tự động bắt 401 để refresh token via `/auth/refresh` và retry request trong suốt. Khi refresh thất bại hoặc không có token, xóa credentials, hiển thị Toast hết phiên và chuyển hướng về `/login`.
  - Xử lý lỗi 409 Conflict: Gắn lỗi trực tiếp vào input `slug` (`setError('slug')`) kết hợp Toast thông báo trùng slug.
  - Xử lý lỗi 403 Forbidden (yêu cầu quyền Giảng viên/Admin) và 400 Bad Request.
  - Tích hợp trạng thái Loading: Nút submit hiển thị spinner và label `"Đang tạo khóa học..."`, disable đồng thời nút Hủy và các trường input trong suốt quá trình mutation xử lý.
  - Kết nối thành công Happy Path: Tạo khóa học thành công -> Toast thông báo -> Invalidate query cache -> Tự động chuyển hướng về `/instructor/courses`.
  - Vượt qua toàn bộ kiểm tra: TypeScript (`tsc --noEmit`), ESLint (0 errors, 0 warnings), Next.js Build (prerendered static), và Monorepo Tests (90/90 vitest tests passed).
- **Milestone 5 (Instructor Course Detail View & IDOR Protection)**:
  - Backend: Bổ sung endpoint `GET /api/v1/courses/:id` trong `CourseController` với kiểm tra phân quyền `INSTRUCTOR` và `ADMIN`.
  - IDOR Protection: `CourseService.getCourseDetailForInstructor` kiểm tra quyền sở hữu cấp bản ghi. Nếu `currentUserRole !== ADMIN` và `course.instructorId !== currentUserId`, ném `403 ForbiddenException`. Nếu khóa học không tồn tại hoặc đã bị xóa mềm, ném `404 NotFoundException`. Bắt các lỗi chuyển đổi ID MongoDB (CastError) an toàn.
  - Backend Tests: Bổ sung 8 test cases toàn diện trong `course.service.spec.ts` và `course.controller.spec.ts` (102/102 vitest tests passed).
  - Frontend Clickable CourseCard: Chuyển `CourseCard` thành thẻ liên kết `<Link href={`/instructor/courses/${course.id}`}>` với hiệu ứng hover và chỉ dẫn "Chi tiết →".
  - Frontend API: Bổ sung `courseApi.getCourseById(id)` và hook `useCourseDetailQuery(id)` tại `course.api.ts`.
  - Frontend UI Detail View:
    - Route `frontend/src/app/instructor/courses/[id]/page.tsx` (RSC dynamic route).
    - `CourseDetailSkeleton`: Khung chờ loading với hiệu ứng pulse cho thanh điều hướng, card tổng quan và 2 khối mô tả.
    - `CourseDetailContent`: Hiển thị đầy đủ thông tin khóa học (`title`, `slug` dạng monospace badge, `shortDescription`, `description` nhiều dòng, `price` chuẩn hóa "Miễn phí" nếu = 0, `level`, `status`, `createdAt`). Xử lý placeholder xám nhạt (`Chưa có mô tả ngắn`, `Chưa có nội dung mô tả chi tiết`) khi dữ liệu rỗng. Nút "Quay lại danh sách khóa học" thuận tiện.
    - Xử lý Error State: Khối thông báo lỗi thân thiện phân biệt 403 Forbidden / 404 Not Found kèm nút quay lại và nút thử lại (`refetch`).
  - Kiểm định toàn diện: Monorepo Backend Tests (102/102 passed), Frontend Lint (0 errors, 0 warnings), Frontend Typecheck (`tsc --noEmit` passed), Frontend Build (Turbopack dynamic build passed).
- **Milestone 6 (Section Schema & Domain Interface)**:
  - Khảo sát và định nghĩa `ISection` trong `share-lib/src/interfaces/section.interface.ts`: Sử dụng `id: string` và khóa ngoại `courseId: string` đồng bộ 100% convention với `ICourse` và `IUser`.
  - Khởi tạo `SectionEntity` và `SectionSchema` tại `backend/src/modules/course/schemas/section.schema.ts`:
    - Kế thừa `BaseAbstractDocument` để tái sử dụng toàn bộ `_id`, `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById` mà không khai báo lặp lại.
    - Khai báo 4 trường cốt lõi: `courseId` (Types.ObjectId ref `CourseEntity.name`), `title` (string, required, trimmed), `description` (string, optional, default null, trimmed), `order` (number, required, min: 0).
    - Cấu hình Compound Index: `{ courseId: 1, deletedAt: 1, order: 1 }` để tối ưu truy vấn danh sách Section theo thứ tự và hỗ trợ soft-delete.
  - Đăng ký `SectionEntity` vào `CourseModule` (`backend/src/modules/course/course.module.ts`) thông qua `MongooseModule.forFeature`.
- **Milestone 7 (Create Section HTTP Contract & Input DTO)**:
  - Khởi tạo reusable `ParseObjectIdPipe` tại `backend/src/modules/base/pipes/parse-object-id.pipe.ts` và export qua `backend/src/modules/base/index.ts` để kiểm tra tính hợp lệ của MongoDB ObjectId (ném `400 Bad Request` nếu không phải 24 hex chars).
  - Xây dựng `CreateSectionDto` tại `backend/src/modules/course/dto/create-section.dto.ts` với đầy đủ validation theo convention:
    - `title`: required, trimmed, string, 1-200 ký tự.
    - `description`: optional, trimmed (rỗng -> undefined), string, tối đa 1000 ký tự.
    - `order`: required, integer, min 0.
  - Khai báo route `POST /api/v1/courses/:courseId/sections` trong `CourseController`:
    - Bảo vệ bởi `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)` và trích xuất `@CurrentUser('id') userId`.
    - Validate `:courseId` qua `ParseObjectIdPipe`.
    - Trả về `ApiResponse.success(section, 'Tạo chương học thành công')`.
  - Khai báo method stub `createSection(courseId, dto, userId)` trong `CourseService` (CỐ Ý chưa implement business logic, check course tồn tại, repository hay database insert).
  - Bổ sung toàn diện unit tests trong `parse-object-id.pipe.spec.ts` và `course.controller.spec.ts` (120/120 tests pass 100%).
- **Milestone 8 (Task 2.2 - Course Existence & Ownership Authorization for Section Creation)**:
  - Cập nhật `CourseController.createSection`: Trích xuất `@CurrentUser('role') role: RoleEnum` và truyền `(courseId, dto, userId, role)` xuống service.
  - Implement nghiệp vụ trong `CourseService.createSection`:
    - Tìm khóa học qua `courseRepository.findById(courseId, session)`.
    - Bắt `CastError` và kiểm tra `!course || course.deletedAt` -> Ném `NotFoundException` (HTTP 404).
    - Kiểm tra quyền sở hữu khóa học: `role !== RoleEnum.ADMIN && course.instructorId !== userId` -> Ném `ForbiddenException('Bạn không có quyền thêm chương học vào khóa học này')` (HTTP 403).
    - Stub return: Trả về object tuân thủ contract `ISection` (CỐ Ý chưa persistence MongoDB, chưa tạo SectionRepository).
  - Cập nhật và bổ sung 7 unit tests toàn diện trong `course.service.spec.ts` và `course.controller.spec.ts` (127/127 tests pass 100%).
- **Milestone 9 (Task 2.3 - Persistence cho Create Section)**:
  - Khởi tạo `SectionRepository` tại `backend/src/modules/course/repositories/section.repository.ts`:
    - Kế thừa `BaseMongoRepository<ISection, SectionEntity>`.
    - Không override `create()`. Tái sử dụng `super.create(payload, session)` (`new this.model(payload)` -> `save({ session })` -> `toDomain()`).
    - Mapper trong constructor map: `_id` (ObjectId) -> `id: string`, `courseId` (ObjectId) -> `string`, giữ nguyên toàn bộ các trường khác (`title`, `description`, `order`, `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`).
  - Đăng ký `SectionRepository` vào `providers` và `exports` của `CourseModule` (`backend/src/modules/course/course.module.ts`).
  - Inject `SectionRepository` vào constructor của `CourseService` (`backend/src/modules/course/services/course.service.ts`).
  - Thay thế stub trong `CourseService.createSection` bằng `this.sectionRepository.create(...)`:
    - Payload: `{ courseId: course.id, title: dto.title, description: dto.description ?? null, order: dto.order, createdById: userId, updatedById: userId }` kèm `session`.
    - Không tự tạo `createdAt`, `updatedAt`, `deletedAt` (Mongoose tự quản lý).
    - Không kiểm tra duplicate order theo đúng scope của Task 2.3.
  - Bổ sung unit tests cho `SectionRepository` (`section.repository.spec.ts`) và `CourseService` (`course.service.spec.ts`):
    - Đảm bảo kiểm thử: authorization pass -> gọi repository với đúng payload, `courseId` dùng `course.id`, `createdById === userId`, `updatedById === userId`, `description` absent -> `null`, `order` truyền đúng `dto.order`, `session` truyền xuống repository, và mapper ObjectId -> string.
    - Toàn bộ 135/135 tests pass 100%, typecheck TypeScript 0 errors.
- **Milestone 10 (Task 2.4 - Integration/E2E Test cho POST Create Section)**:
  - Khởi tạo integration test `backend/src/modules/course/tests/create-section.integration.spec.ts`:
    - Khởi động full application context thông qua `AppModule` với `supertest`.
    - Kết nối isolated test database (`thc_datn_create_section_e2e_test`), cleanup các collection `sections`, `courses`, `users`, `sessions` trước mỗi test và drop database sau khi hoàn tất.
    - Tái sử dụng production interceptors (`AuditContextInterceptor`, `TransformInterceptor`), global prefix (`api/v1`), và validation pipes (`ValidationPipe`).
    - Tái sử dụng `AuthTokenService` để sinh Bearer JWT hợp lệ cho instructor.
    - Test Happy Path: POST `/api/v1/courses/:courseId/sections` trả về HTTP 201 Created, envelope `ApiResponse`, `id` là ObjectId thực tế hợp lệ từ MongoDB (không phải stub), `createdById` và `updatedById` trùng khớp với instructor, query trực tiếp collection `sections` xác nhận bản ghi tồn tại với đầy đủ trường.
    - Test Authorization Negative Cases: 403 Forbidden khi instructor khác cố gắng thêm section vào khóa học không sở hữu; 404 Not Found khi `courseId` không tồn tại. Xác nhận MongoDB không lưu bất kỳ document nào trong các trường hợp lỗi.
    - Không cần sửa bất kỳ production code nào; toàn bộ 138/138 tests pass 100%, typecheck 0 errors.
- **Milestone 11 (Task 2.6 - API Lấy danh sách Sections: GET /api/v1/courses/:courseId/sections)**:
  - `SectionRepository.findByCourseId(courseId, session)`:
    - Tìm kiếm theo `{ courseId: Types.ObjectId.isValid(courseId) ? new Types.ObjectId(courseId) : courseId, deletedAt: null }`.
    - Sắp xếp tăng dần theo `{ order: 1, _id: 1 }` tận dụng Compound Index `{ courseId: 1, deletedAt: 1, order: 1 }`.
    - Tái sử dụng mapper `toDomain(doc)`.
  - `CourseService.getSectionsByCourseId(courseId, session)`:
    - Kiểm tra Course tồn tại và chưa bị soft-delete qua `courseRepository.findById(courseId, session)`.
    - Bắt lỗi CastError hoặc không tìm thấy -> ném `NotFoundException("Không tìm thấy khóa học với ID '${courseId}'")`.
    - Trả về danh sách `ISection[]` từ `sectionRepository.findByCourseId(courseId, session)` (rỗng -> `[]`).
    - Không kiểm tra Instructor ownership để phục vụ việc xem outline/curriculum công khai của khóa học.
  - `CourseController.getSections`:
    - Endpoint `@Get(':courseId/sections')` với decorator `@Public()` và `@Param('courseId', ParseObjectIdPipe)`.
    - Bọc kết quả trong `ApiResponse.success(sections, 'Lấy danh sách chương học thành công')`.
  - Kiểm thử & Tích hợp:
    - 4 test cases cho `SectionRepository.findByCourseId` trong `section.repository.spec.ts`.
    - 4 test cases cho `CourseService.getSectionsByCourseId` trong `course.service.spec.ts`.
    - 3 test cases cho `CourseController.getSections` trong `course.controller.spec.ts`.
    - 5 integration test cases trong `create-section.integration.spec.ts` (Happy path sorted 0->1->2, soft delete filter, 404 course not found, 404 soft-deleted course, 200 empty array, 400 invalid param).
    - Toàn bộ 17 test files (154/154 tests) pass 100%, typecheck TypeScript 0 errors.
- **Milestone 12 (Task 2.7 - Frontend: Hiển thị danh sách Sections trong Course Detail)**:
  - Tái sử dụng Interface `ISection` từ `share-lib` re-export qua `course.types.ts`.
  - Mở rộng `courseApi.getSections(courseId)` và hook `useCourseSectionsQuery(courseId)` trong `course.api.ts` với query key `['courses', 'detail', courseId, 'sections']`.
  - Xây dựng component `CourseSectionsList` (`course-sections-list.tsx`):
    - Đầy đủ 4 trạng thái: Loading (Skeleton pulse), Error (Alert box có nút thử lại không làm crash trang), Empty ("Khóa học chưa có chương học nào."), và Success (danh sách chương học).
    - Hiển thị thứ tự thân thiện dạng `01`, `02`, ... giữ nguyên thứ tự server trả về, hiển thị tiêu đề và mô tả (nếu có).
    - Tuân thủ nghiêm ngặt Purple Ban và quy chuẩn design token.
  - Tích hợp vào `CourseDetailContent` (`course-detail-content.tsx`) và bổ sung placeholder skeleton vào `CourseDetailSkeleton` (`course-detail-skeleton.tsx`).
  - Kiểm thử & Chất lượng:
    - TypeScript: 0 errors trên toàn monorepo (`tsc --noEmit`).
    - ESLint: 0 errors, 0 warnings trên `frontend/src`.
    - Production build: Next.js 16.3.5 Turbopack build thành công (toàn bộ 8 routes tĩnh và động).
    - Regression test: 17 test files (154/154 tests) backend pass 100%.
- **Milestone 13 (Task 2.8 - Frontend: Giao diện Tạo Section trong Course Detail)**:
  - Khảo sát và bổ sung contract `ICreateSectionPayload` vào `share-lib/src/interfaces/section.interface.ts` và export qua `share-lib/src/index.ts`.
  - Xây dựng schema validation `create-section.schema.ts` dùng Zod: `title` (required, 1-200 ký tự, whitespace trimmed), `description` (optional, max 1000 ký tự, whitespace trimmed), `order` (required integer >= 0).
  - Bổ sung `courseApi.createSection` và React Query Mutation Hook `useCreateSectionMutation(courseId)` trong `course.api.ts`:
    - Xử lý cache invalidation: Gọi `queryClient.invalidateQueries({ queryKey: courseKeys.sections(courseId) })` giúp danh sách tự động cập nhật ngay lập tức mà không cần reload trang.
    - Xử lý toast phản hồi qua `sonner`: Thông báo thành công và xử lý chi tiết các mã lỗi HTTP (400, 401, 403, 404, 500).
  - Xây dựng component `CreateSectionDialog` (`create-section-dialog.tsx`) kế thừa hệ thống modal từ `@/components/ui/dialog`:
    - Form tích hợp `react-hook-form` + `@hookform/resolvers/zod`.
    - Tự động gợi ý thứ tự `defaultOrder = sections.length` khi mở modal, cho phép giảng viên tùy chỉnh linh hoạt.
    - Hiệu ứng pending: Nút submit chuyển sang icon xoay `lucide:loader-2` và label `"Đang thêm..."`, disable các nút thao tác chống duplicate submit.
  - Tích hợp vào `CourseSectionsList` (`course-sections-list.tsx`):
    - Bổ sung nút "Thêm chương" trên `CardHeader`.
    - Bổ sung nút "Thêm chương học đầu tiên" trong khối `Empty State`.
  - Xuất bản đầy đủ qua `frontend/src/features/course/index.ts`.
  - Kiểm định toàn diện:
    - TypeScript: 0 errors trên toàn bộ `share-lib`, `frontend`, và `backend` (`tsc --noEmit`).
    - ESLint: 0 errors, 0 warnings trên `frontend/src`.
- **Milestone 14 (Task 3.1 - Lesson Schema & Domain Interface)**:
  - Khởi tạo contract `ILesson` trong `share-lib/src/interfaces/lesson.interface.ts` và re-export qua `share-lib/src/index.ts` (`id`, `sectionId`, `title`, `description?`, `order`, timestamps, soft-delete, audit). Rebuild `share-lib` thành công.
  - Thiết kế `LessonEntity` và `LessonSchema` tại `backend/src/modules/course/schemas/lesson.schema.ts`:
    - Kế thừa `BaseAbstractDocument` (tự động có `_id`, timestamps, `deletedAt`, `createdById`, `updatedById`).
    - Khai báo 4 trường tối thiểu: `sectionId` (Types.ObjectId ref `SectionEntity.name`, required, indexed), `title` (string, required, trimmed), `description` (string, optional, default null, trimmed), `order` (number, required, min: 0).
    - Cấu hình Compound Index: `{ sectionId: 1, deletedAt: 1, order: 1 }` để tối ưu truy vấn danh sách Lesson theo Section theo thứ tự, đồng thời lọc bỏ soft-deleted. Không đặt unique index trên `order` để hỗ trợ reordering an toàn trong transaction.
  - Đăng ký `LessonEntity` và `LessonSchema` vào `CourseModule` (`backend/src/modules/course/course.module.ts`) qua `MongooseModule.forFeature`.
  - Khởi tạo schema tests toàn diện trong `backend/src/modules/course/tests/lesson.schema.spec.ts` kiểm thử đầy đủ các ràng buộc (required, default null, min 0, trim, single index trên `sectionId`, compound index).
  - Toàn bộ 18 test files (161/161 tests) backend pass 100%, typecheck TypeScript 0 errors.
- **Milestone 15 (Task 3.2 - Lesson Repository: LessonRepository)**:
  - Triển khai `LessonRepository` tại `backend/src/modules/course/repositories/lesson.repository.ts` kế thừa `BaseMongoRepository<ILesson, LessonEntity>`.
  - Cấu hình custom mapper trong constructor chuyển đổi an toàn MongoDB `_id` sang `id: string` và `sectionId` sang `string`.
  - Kế thừa phương thức `create(payload, session)` từ `BaseMongoRepository` để khởi tạo, lưu và ánh xạ `ILesson`.
  - Triển khai phương thức `findBySectionId(sectionId, session)` lọc chính xác theo `sectionId` (hỗ trợ cả ObjectId và string), loại trừ bản ghi đã xóa mềm (`deletedAt: null`), sắp xếp tăng dần theo `{ order: 1, _id: 1 }` tận dụng Compound Index và hỗ trợ ClientSession.
  - Đăng ký `LessonRepository` vào `providers` và `exports` của `CourseModule` (`backend/src/modules/course/course.module.ts`).
  - Viết bộ unit tests toàn diện trong `backend/src/modules/course/tests/lesson.repository.spec.ts` (9 test cases) bao quát mapper, create, findBySectionId, lọc đúng section, loại trừ soft-deleted, mảng rỗng và session.
  - Toàn bộ 19 test files (170/170 tests) backend pass 100%, typecheck TypeScript 0 errors.
- **Milestone 16 (Task 3.3 - Lesson Service: LessonService)**:
  - Triển khai `LessonService` tại `backend/src/modules/course/services/lesson.service.ts` kế thừa `BaseService<ILesson, string>`, inject `LessonRepository`, `SectionRepository`, và `ClsService`.
  - Triển khai `createLesson(sectionId, input, session)`:
    - Kiểm tra Section cha tồn tại và chưa bị soft-delete qua `sectionRepository.findById`. Ném `NotFoundException` nếu Section không tồn tại, đã xóa mềm hoặc ID lỗi.
    - Validate `order >= 0`, ném `BadRequestException` nếu `< 0`.
    - Chuẩn hóa khoảng trắng (`title.trim()`, `description?.trim() || null`).
    - Audit capture: tự động gắn `createdById` và `updatedById` từ input hoặc CLS context.
    - Gọi `lessonRepository.create` truyền `session`.
  - Triển khai `getLessonsBySectionId(sectionId, session)`:
    - Kiểm tra Section cha tồn tại qua `sectionRepository.findById`. Ném `NotFoundException` nếu không tìm thấy hoặc đã bị xóa mềm.
    - Gọi `lessonRepository.findBySectionId(sectionId, session)`, trả về danh sách bài học giữ nguyên thứ tự `order ASC`.
  - Đăng ký `LessonService` vào `providers` và `exports` của `CourseModule` (`backend/src/modules/course/course.module.ts`).
  - Viết bộ unit tests toàn diện trong `backend/src/modules/course/tests/lesson.service.spec.ts` (16 test cases) bao quát đầy đủ kịch bản thành công và ngoại lệ.
  - **Milestone 17 (Task 3.4 - CreateLessonDto Input Contract & Unit Tests)**:
  - Khảo sát và đồng bộ hoàn toàn convention từ `CreateSectionDto`:
    - `CreateLessonDto` tại `backend/src/modules/course/dto/create-lesson.dto.ts`.
    - `title`: required, trimmed, string, 1-200 ký tự. Chuỗi toàn khoảng trắng bị `@Transform` trim và `@MinLength(1)` chặn lại.
    - `description`: optional, trimmed (rỗng -> `undefined`), string, tối đa 1000 ký tự.
    - `order`: required, integer, min 0, chuyển đổi kiểu số qua `@Type(() => Number)`.
    - Không chứa bất kỳ trường nội bộ nào (`sectionId`, `createdById`, `updatedById`).
  - Viết bộ unit tests độc lập tại `backend/src/modules/course/tests/create-lesson.dto.spec.ts` (15 test cases) bao quát toàn bộ happy path, transformations (trim, undefined conversion, numeric coercion), và negative validation cases.
  - Tuân thủ nghiêm ngặt ranh giới: Chưa tạo Controller, API route hay đụng chạm Frontend/Service.
  - **Milestone 18 (Task 3.5 - LessonController: Create Lesson Endpoint & Registration)**:
  - Khởi tạo `LessonController` tại `backend/src/modules/course/lesson.controller.ts` kế thừa trọn vẹn convention của `CourseController`:
    - Prefix route `@Controller('sections')`, endpoint `@Post(':sectionId/lessons')` -> URL hoàn chỉnh `POST /api/v1/sections/:sectionId/lessons`.
    - Validate route param `sectionId` bằng `ParseObjectIdPipe` (ném 400 Bad Request nếu không phải ObjectId hợp lệ).
    - Phân quyền nghiêm ngặt với `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)` và trích xuất `@CurrentUser('id') userId`.
    - Body input sử dụng `CreateLessonDto`.
    - Gắn `@HttpCode(HttpStatus.CREATED)` (201) và bọc kết quả trả về trong `ApiResponse.success(lesson, 'Tạo bài học thành công')`.
    - Ủy quyền trực tiếp xuống `LessonService.createLesson(sectionId, { title, description, order, userId })`, tuyệt đối không truy cập database trực tiếp.
  - Đăng ký `LessonController` vào mảng `controllers` của `CourseModule` (`backend/src/modules/course/course.module.ts`).
  - Viết bộ unit tests toàn diện tại `backend/src/modules/course/tests/lesson.controller.spec.ts` (13 test cases) bao quát: delegation happy path, param/user binding, metadata reflection (route, roles, http code 201), propagation của NotFoundException / BadRequestException, và validation error qua ValidationPipe (missing title, whitespace title, negative order, non-whitelisted fields).
  - Tuân thủ nghiêm ngặt ranh giới: Chưa implement GET List lessons, UI/Frontend hay các thao tác Edit/Delete/Reorder.
  - **Milestone 19 (Task 3.6 - LessonController: GET Lesson List Endpoint)**:
  - Bổ sung endpoint `@Get(':sectionId/lessons')` vào `LessonController` (`backend/src/modules/course/lesson.controller.ts`) tạo thành route `GET /api/v1/sections/:sectionId/lessons`.
  - Validate route param `sectionId` bằng `ParseObjectIdPipe` (ném 400 Bad Request nếu không đúng format ObjectId).
  - Áp dụng decorator `@Public()` đồng bộ 100% convention với `GET :courseId/sections` của `CourseController`, phục vụ xem cấu trúc bài giảng/đề cương công khai không cần JWT token.
  - Tái sử dụng trọn vẹn `LessonService.getLessonsBySectionId(sectionId)` và `LessonRepository.findBySectionId(sectionId)` (đã kiểm tra Section tồn tại/soft-delete, sắp xếp `order ASC` và loại bỏ bài học soft-deleted).
  - Bọc dữ liệu trả về bằng `ApiResponse.success(lessons, 'Lấy danh sách bài học thành công')`.
  - Bổ sung 4 unit test cases trong `backend/src/modules/course/tests/lesson.controller.spec.ts` (nâng tổng số lên 17 test cases) kiểm thử: Happy path trả về `ILesson[]`, trả về mảng rỗng `[]` khi chưa có bài học, lan truyền `NotFoundException` khi Section không tồn tại hoặc đã xóa mềm, và reflection metadata `@Public()` cùng route path.
  - Tuân thủ nghiêm ngặt ranh giới: Chưa implement Frontend UI/Client hay các tính năng Edit/Delete/Reorder.
  - **Milestone 20 (Task 3.7 - Frontend: Hiển Thị Danh Sách Bài Học (Lessons) Trong Mỗi Section)**:
  - Khảo sát và re-export interface `ILesson` từ `share-lib` qua `frontend/src/features/course/types/course.types.ts`.
  - Mở rộng API client tại `frontend/src/features/course/api/course.api.ts`:
    - Bổ sung query key `courseKeys.lessons(sectionId)`.
    - Thêm method `courseApi.getLessons(sectionId)` gọi `GET /sections/:sectionId/lessons`.
    - Xây dựng React Query hook `useSectionLessonsQuery(sectionId)`.
  - Xây dựng component `SectionLessonsList` (`frontend/src/features/course/components/section-lessons-list.tsx`):
    - Đầy đủ 4 trạng thái: Loading (khung xương pulse 2 hàng), Error (thông báo lỗi kèm nút thử lại `refetch`), Empty ("Chưa có bài học nào trong chương này"), và Success (danh sách bài học sắp xếp `order ASC`, icon play, số thứ tự `01.`, `02.`, tiêu đề `lesson.title`).
    - Bố cục phân cấp cây trực quan với đường kẻ nhánh `border-l-2 border-border/40 ml-2 pl-4`.
    - Tuân thủ triệt để Purple Ban và Design Token.
  - Tích hợp `SectionLessonsList` vào `CourseSectionsList` (`course-sections-list.tsx`) và xuất bản qua `frontend/src/features/course/index.ts`.
  - Tuân thủ nghiêm ngặt ranh giới: Chưa thêm nút "Add Lesson", chưa tạo/sửa/xóa/reorder bài học, không sửa backend API.
  - Kiểm định toàn diện:
    - Frontend TypeScript Typecheck: 0 errors (`tsc --noEmit`).
    - Frontend ESLint: 0 errors, 0 warnings (`eslint src/`).
    - Backend Regression Test: 22/22 test files (218/218 tests pass 100%).
  - **Milestone 21 (Task: Lesson Create UI - Modal Dialog Thêm Bài Học Trong Section)**:
  - Xây dựng schema validation `createLessonSchema` (`frontend/src/features/course/schemas/create-lesson.schema.ts`) bằng Zod:
    - `title`: Bắt buộc, 1–200 ký tự, tự động trim khoảng trắng.
    - `description`: Không bắt buộc, tối đa 1000 ký tự, tự động trim.
    - `order`: Bắt buộc, số nguyên $\ge 0$.
    - `contentFile`: Custom file type, giữ đối tượng `File` trong state, hỗ trợ MP4, WebM, MOV, PDF, DOC, DOCX.
    - `isPreview`: Boolean toggle "Cho phép học thử miễn phí", mặc định `false`.
  - Xây dựng component `SectionLessonCreateForm` (`frontend/src/features/course/components/section-lesson-create-form.tsx`):
    - Modal Dialog tuân thủ `@/components/ui/dialog` và Design System của dự án.
    - Nhận `sectionId` từ props và gắn vào form ngầm định (không cho phép người dùng nhập).
    - Tự động gợi ý `defaultOrder` dựa trên số lượng bài học hiện có trong Section thông qua `useSectionLessonsQuery(sectionId)`.
    - File picker dropzone trang nhã với native `<label htmlFor="lesson-file-input">` (chuẩn Accessibility, 100% tuân thủ React 19 ESLint không dùng ref dư thừa).
    - Hiển thị thông tin file: Tên file, dung lượng format (MB/KB), icon phân biệt video vs document, nút xóa file.
    - Checkbox / Toggle "Cho phép học thử miễn phí" với chú thích chi tiết.
    - Nút "Hủy": Đóng form và reset toàn bộ state về ban đầu.
    - Nút "Thêm bài học": Validate toàn diện qua `handleSubmit(onFormSubmit)` và bàn giao payload ra ngoài qua callback `onSubmit`.
  - Tích hợp vào `CourseSectionsList` (`frontend/src/features/course/components/course-sections-list.tsx`):
    - Bổ sung nút **"+ Thêm bài học"** trên Header của từng Section.
    - Quản lý state mở modal `createLessonTarget` theo Section ID và tên Section.
    - Xử lý callback `onSubmit` hiển thị toast thông báo nhận payload và đóng form.
  - Xuất bản qua `frontend/src/features/course/index.ts`.
  - **Tuân thủ nghiêm ngặt ranh giới**: Tuyệt đối không gọi API tạo Lesson, không upload Cloudinary/storage, không sửa backend, không tạo mutation hay invalidate React Query.
  - **Kiểm định chất lượng**:
    - Frontend TypeScript Typecheck: 0 errors (`pnpm --filter frontend exec tsc --noEmit`).
    - Frontend ESLint: 0 errors, 0 warnings (`pnpm --filter frontend run lint`).
    - Backend Regression Test: 22/22 test files, 218/218 tests pass 100%.
  - **Milestone 22 (Task: Lesson Data Model & API Contract - Backend & Share-Lib)**:
  - Khai báo enum `LessonContentTypeEnum` (`video`, `document`) và interface `ILessonContent` trong `share-lib/src/interfaces/lesson.interface.ts`.
  - Cập nhật interface `ILesson` bổ sung `content?: ILessonContent | null;` và `isPreview: boolean;`. Re-export từ `share-lib/src/index.ts` và `frontend/src/features/course/types/course.types.ts`.
  - Thiết kế và triển khai Mongoose Subdocument Schema:
    - Định nghĩa `LessonContentEntity` (`@Schema({ _id: false })`) và `LessonContentSchema`.
    - Thêm `content: LessonContentSchema` (default: null, required: false) và `isPreview: boolean` (default: false) vào `LessonEntity` (`backend/src/modules/course/schemas/lesson.schema.ts`).
    - Cập nhật `toDomain` trong `LessonRepository` mapping tường minh `content` và `isPreview`.
  - Thiết kế DTO và API Contract:
    - Xây dựng `LessonContentDto` validate: `type` (enum `video`/`document`), `url` (valid URL), `publicId`, `fileName`, `fileSize` (int >= 0), `mimeType`, `duration` (number >= 0).
    - Cập nhật `CreateLessonDto`: Thêm `@ValidateNested() content?: LessonContentDto | null` và `@IsBoolean() isPreview?: boolean`.
    - **4 nguyên tắc kiến trúc nghiêm ngặt**:
      1. `content` khi không có file: Bắt buộc là `null` hoặc `undefined`, tuyệt đối cấm object rỗng `{}` (DTO sẽ reject 400).
      2. `sectionId`: Chỉ lấy từ route param URL (`POST /sections/:sectionId/lessons`), cấm đưa vào body (`whitelist: true, forbidNonWhitelisted: true` sẽ từ chối).
      3. Tách biệt upload file và Create Lesson: 2 operations riêng, chưa implement upload.
      4. Tách biệt RabbitMQ / AI pipeline: Hoãn sang milestone chuyên biệt sau.
  - Cập nhật `LessonService` và `LessonController` tiếp nhận và chuyển tiếp `content`, `isPreview` vào repository.
  - Bổ sung 10 unit test cases trong `create-lesson.dto.spec.ts` (nâng tổng số lên 25 tests) và cập nhật `lesson.service.spec.ts`, `lesson.controller.spec.ts`.
  - **Kiểm định chất lượng**:
    - Backend Unit Tests: 22/22 test files, 228/228 tests pass 100%.
    - Backend TypeScript Typecheck: 0 errors (`pnpm --filter backend exec tsc --noEmit`).
  - **Milestone 23 (Task: Connect Lesson Create UI với Create Lesson API)**:
    - **Hợp đồng dữ liệu (`share-lib`)**:
      - Bổ sung interface `ICreateLessonPayload` trong `share-lib/src/interfaces/lesson.interface.ts` ({ title: string; description?: string | null; order: number; content?: ILessonContent | null; isPreview?: boolean; }).
      - Build lại gói `share-lib` (`pnpm --filter share-lib build`).
    - **API Client & React Query Mutation Hook (`frontend/src/features/course/api/course.api.ts`)**:
      - Thêm phương thức `courseApi.createLesson(sectionId: string, payload: ICreateLessonPayload): Promise<ILesson>` gọi `POST /api/v1/sections/:sectionId/lessons`. `sectionId` nằm hoàn toàn trên URL parameter, không gửi trong body.
      - Xây dựng custom hook `useCreateLessonMutation(sectionId: string)`:
        - Tự động gọi `queryClient.invalidateQueries({ queryKey: courseKeys.lessons(sectionId) })` khi thành công, giúp danh sách bài học cập nhật tức thì (no page reload).
        - Hiển thị toast thông báo thành công qua `sonner`: `toast.success('Thêm bài học thành công!')`.
        - Bắt mã lỗi HTTP chuẩn (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Error) và hiển thị `toast.error`.
    - **Tích hợp UI Form (`frontend/src/features/course/components/section-lesson-create-form.tsx`)**:
      - Nhúng `useCreateLessonMutation(sectionId)`.
      - **Guard `contentFile`**: Nếu người dùng đã chọn file, chặn submit và hiển thị `toast.warning('Chức năng upload file đang phát triển', { description: 'Upload file sẽ được kết nối ở bước tiếp theo...' })`. Không âm thầm bỏ qua file và tuyệt đối không gửi request API.
      - **Happy Path Payload**: Gửi `{ title, description, order, content: null, isPreview }`.
      - **Loading State**: Khi `isPending` (`isSubmitting || mutation.isPending`), disable toàn bộ input fields, textarea, order input, dropzone, nút hủy và checkbox `isPreview`. Nút submit hiển thị spinner `loader-2` và nhãn `"Đang thêm..."`. Chặn đóng dialog khi đang gọi API.
      - **Success Flow**: Khi mutation hoàn tất thành công, tự động đóng modal `handleClose()` và reset form.
      - **Error Flow**: Khi mutation gặp lỗi, giữ nguyên modal mở, bảo toàn toàn bộ dữ liệu người dùng đã nhập để có thể chỉnh sửa và gửi lại.
    - **Dọn dẹp `course-sections-list.tsx`**:
      - Loại bỏ dummy toast callback `(Frontend state)` trong thẻ `<SectionLessonCreateForm />` vì form đã tự quản lý mutation và hiển thị toast từ API thật.
    - **Ranh giới nghiêm ngặt**:
      - Tuyệt đối chưa triển khai file upload (Cloudinary/multipart), upload API, video/document processing, RabbitMQ, hay AI pipeline.
      - Không sửa backend vì API hiện tại đã đáp ứng hoàn hảo contract.
    - **Kiểm định chất lượng**:
      - Frontend TypeScript Typecheck: 0 errors (`pnpm --filter frontend exec tsc --noEmit`).
      - Frontend ESLint: 0 errors, 0 warnings (`pnpm --filter frontend lint`).
      - Backend Regression Test: 22/22 test files, 228/228 tests pass 100% (`pnpm --filter backend test`).
  - **Milestone 24 (Task: Build Lesson Content Upload Foundation)**:
    - **Tách Cloudinary thành Shared Module (`backend/src/modules/cloudinary/`)**:
      - Tạo `CloudinaryModule` và `CloudinaryService` dùng chung toàn hệ thống, cung cấp phương thức `uploadImage` (avatar người dùng với face crop) và `uploadLessonMedia` (video với duration, document với `resource_type: 'raw'`).
      - Cập nhật `backend/src/modules/user/services/cloudinary.service.ts` re-export từ shared module để duy trì 100% tương thích ngược và bảo toàn các bài test hiện có.
      - Đăng ký `CloudinaryModule` vào `AppModule`, `UserModule` và `CourseModule`.
    - **Validation Pipe (`backend/src/modules/course/pipes/lesson-file-validation.pipe.ts`)**:
      - Kiểm tra file tồn tại và có buffer (`BadRequestException`).
      - Giới hạn MIME types:
        - Video: `video/mp4`, `video/webm`, `video/quicktime` (Tối đa 900MB).
        - Document: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX) (Tối đa 50MB).
      - Từ chối các định dạng không hỗ trợ (bao gồm file `.doc` cũ, executable, zip, v.v.).
      - Khử trùng (sanitize) `file.originalname` tránh các lỗ hổng path traversal (`..`, ký tự lạ).
    - **API Endpoint (`backend/src/modules/course/lesson-content.controller.ts`)**:
      - Thiết kế controller `POST /api/v1/lesson-content/upload` với `@UseInterceptors(FileInterceptor('file'))`.
      - Phân quyền bảo mật: `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)` kết hợp `JwtAuthGuard` toàn cục.
      - Trả về envelope chuẩn `ApiResponse<ILessonContent>` với metadata `{ type, url, publicId, fileName, fileSize, mimeType, duration }`.
    - **Frontend API Client & Hook (`frontend/src/features/course/api/lesson-content.api.ts`)**:
      - Cung cấp `lessonContentApi.upload(file: File)` truyền multipart `FormData`.
      - Cung cấp hook React Query `useUploadLessonContentMutation` phơi bày `{ isPending, mutateAsync, error }` và toast thông báo tương ứng.
      - Re-export qua `frontend/src/features/course/index.ts`.
    - **Tuân thủ nghiêm ngặt ranh giới**:
      - Tuyệt đối chưa tạo Lesson hay gọi API Create Lesson.
      - Không sửa Create Lesson API, không đụng database Lesson.
      - Chưa có RabbitMQ / AI video pipeline.
    - **Kiểm định chất lượng**:
      - Backend Unit & Regression Tests: 25/25 test files, 249/249 tests pass 100% (`pnpm --filter backend test`).
      - Backend TypeScript Typecheck: 0 errors (`pnpm --filter backend exec tsc --noEmit`).
      - Backend Linter: 0 errors (`pnpm --filter backend lint`).
      - Frontend TypeScript Typecheck: 0 errors (`pnpm --filter frontend exec tsc --noEmit`).
      - Frontend Linter: 0 errors (`pnpm --filter frontend lint`).
      - Share-lib build: Success (`pnpm --filter share-lib build`).
  - **Milestone 25 (Task: Integrate Lesson Content Upload với Create Lesson)**:
    - **Frontend Schema & Validation (`create-lesson.schema.ts`)**:
      - Cập nhật `ACCEPTED_LESSON_FILE_EXTENSIONS = '.mp4,.webm,.mov,.pdf,.docx'`, loại bỏ hoàn toàn `.doc` cũ theo thống nhất kiến trúc.
      - Bổ sung hằng số `MAX_VIDEO_FILE_SIZE = 900MB`, `MAX_DOCUMENT_FILE_SIZE = 50MB` và helper functions `isVideoFile`, `isDocumentFile` phục vụ validation client-side trước khi upload.
    - **Tích hợp State Machine trong `SectionLessonCreateForm` (`section-lesson-create-form.tsx`)**:
      - Tách biệt rõ ràng 5 trạng thái chính: `IDLE` → `UPLOADING` → `UPLOADED` → `CREATING` → `SUCCESS` và 2 trạng thái ngoại lệ: `UPLOAD_ERROR`, `CREATE_ERROR`.
      - **Nguyên tắc Upload file ≠ Create Lesson**:
        - Chọn file: Kích hoạt upload lên Cloudinary qua `uploadMutation.mutateAsync(file)`, nhận và lưu `uploadedContent: ILessonContent`.
        - Bấm "Thêm bài học": Gọi `createLessonMutation.mutateAsync(...)` gửi payload kèm `content: uploadedContent` (hoặc `content: null` nếu không có file).
        - Nếu Create Lesson gặp lỗi: Giữ nguyên modal, bảo toàn form inputs và giữ nguyên `uploadedContent`. Retry submit không gọi lại Cloudinary upload!
      - **Chống Silently Ignore & Race Condition**:
        - Khi gặp `UPLOAD_ERROR`: Disable nút "Thêm bài học" cho đến khi user bấm `[Thử lại]` thành công hoặc bấm `[Xóa file]`.
        - Khi đã `UPLOADED`: Khóa chọn đè file; yêu cầu người dùng bấm nút thùng rác "Xóa file" để đưa form về `IDLE` trước khi chọn file mới.
      - **Bảo vệ đóng Dialog & Cảnh báo an toàn**:
        - Chặn tuyệt đối việc đóng dialog khi đang `UPLOADING` hoặc `CREATING`.
        - Nếu file đã `UPLOADED` mà người dùng bấm Hủy hoặc thoát: Kích hoạt confirmation `Dialog` cảnh báo file đã tải lên nhưng chưa được lưu vào bài học trước khi cho phép xác nhận hủy.
    - **Kiểm định chất lượng**:
      - Backend Unit & Regression Tests: 25/25 test files, 249/249 tests pass 100% (`pnpm --filter backend test`).
      - Backend TypeScript Typecheck: 0 errors (`pnpm --filter backend exec tsc --noEmit`).
      - Backend Linter: 0 errors (`pnpm --filter backend lint`).
      - Frontend TypeScript Typecheck: 0 errors (`pnpm --filter frontend exec tsc --noEmit`).
      - Frontend Linter: 0 errors (`pnpm --filter frontend lint`).
      - Share-lib build: Success (`pnpm --filter share-lib build`).
  - **Milestone 26 (Task: Lesson Detail + Content Viewer)**:
    - **Backend Architecture & Endpoints**:
      - Tạo `LessonsController` (`backend/src/modules/course/lessons.controller.ts`) gắn `@Controller('lessons')` và endpoint `GET /api/v1/lessons/:id`.
      - Sử dụng `ParseObjectIdPipe` xác thực Mongo ObjectId (trả về 400 Bad Request nếu chuỗi ID không hợp lệ).
      - Decorator `@Public()` cho phép truy cập theo quy chuẩn mở của milestone hiện tại.
      - Bổ sung `getLessonById(id: string)` trong `LessonService` (`backend/src/modules/course/services/lesson.service.ts`), ném `NotFoundException` (404) nếu bài học không tồn tại hoặc đã bị xóa mềm (`deletedAt`).
      - Đăng ký `LessonsController` vào `CourseModule`.
    - **Backend Unit Tests**:
      - Tạo mới `backend/src/modules/course/tests/lessons.controller.spec.ts` (7/7 tests pass) kiểm thử 200 OK, 404 NotFound, 400 BadRequest khi ID sai, và phản chiếu metadata decorator `@Public()`.
      - Mở rộng `backend/src/modules/course/tests/lesson.service.spec.ts` với suite `getLessonById` (5/5 new tests pass, tổng 21 tests).
      - Toàn bộ backend test suite: 26/26 test files, 261/261 tests pass 100%.
    - **Frontend API & Routing**:
      - Bổ sung query key `courseKeys.lessonDetail(id)`, API call `courseApi.getLessonById(id)` và React Query hook `useLessonDetailQuery(id)` tại `frontend/src/features/course/api/course.api.ts`.
      - Tạo các route:
        - `/instructor/courses/[id]/lessons/[lessonId]/page.tsx` cho ngữ cảnh Giảng viên.
        - `/courses/[courseId]/lessons/[lessonId]/page.tsx` cho ngữ cảnh tổng quát / học viên.
      - Cập nhật `SectionLessonsList` (`section-lessons-list.tsx`): hiển thị link chuyển trang và nút "Xem bài học" điều hướng tới trang chi tiết bài học.
      - Cập nhật `CourseSectionsList` (`course-sections-list.tsx`): truyền `courseId` xuống `SectionLessonsList`.
    - **Frontend UI & Viewers (`lesson-detail-content.tsx` & `lesson-detail-skeleton.tsx`)**:
      - `LessonDetailSkeleton`: Khung chờ loading với hiệu ứng pulse.
      - Xử lý 404 / Error State thân thiện với nút "Thử lại" và nút "Quay lại khóa học".
      - Xử lý 3 nhánh nội dung:
        - **Video**: Thẻ HTML5 `<video controls>` phát qua `lesson.content.url`, kèm dải metadata (tên file, thời lượng mm:ss, dung lượng MB, định dạng MIME).
        - **Document**: Document Info Card hiển thị thông tin file đính kèm + nút "Mở tài liệu" mở tab mới an toàn (`rel="noopener noreferrer"`).
        - **Empty State**: Khung thông báo rõ ràng "Bài học chưa có nội dung" khi `lesson.content === null`.
      - Tuân thủ nghiêm ngặt: Không dùng màu tím (Purple Ban), không dùng inline font classes, 100% strict TypeScript không dùng `any`.
    - **Kiểm định chất lượng**:
      - Share-lib build: 0 errors (`pnpm --filter share-lib build`).
      - Backend test: 26/26 files, 261/261 tests pass (`pnpm --filter backend test`).
  - **Milestone 27 (Task: Curriculum Master - Detail Split View)**:
    - **Layout Split View (68% / 32%)**:
      - Mở rộng container `CourseDetailContent` (`frontend/src/features/course/components/course-detail-content.tsx`) từ `max-w-5xl` sang `max-w-7xl` để tạo không gian thoáng đãng cho giao diện 2 cột.
      - Tái cấu trúc `CourseSectionsList` (`course-sections-list.tsx`) thành 2 cột:
        - Cột trái (`w-full lg:w-[68%]`): Cấu trúc khóa học trực quan, đánh dấu trạng thái Active bằng viền sáng `ring-2 ring-sky-500/20 border-sky-500/50 bg-sky-500/[0.02]`.
        - Cột phải (`lg:w-[32%]`): Bảng Inspector Panel cố định `sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto` với thanh cuộn tinh tế.
    - **Bộ Thành Phần Inspector Panel (`frontend/src/features/course/components/inspector/`)**:
      - `InspectorEmptyState`: Minh họa thư mục mở (`lucide:folder-open`) kèm thông báo lịch sự khi chưa chọn mục nào.
      - `ChapterInspector`: Tông màu dịu mắt (sky/slate), huy hiệu `CHƯƠNG XX`, tiêu đề in hoa đậm nét, nút icon bút chì (`lucide:pencil`), 2 Quick Metric Cards (Số bài học thực tế, Tổng thời lượng tính toán tự động từ `useSectionLessonsQuery`), Mục tiêu & Tóm tắt kiến thức.
      - `LessonInspector`: Tông màu công nghệ (emerald/cyan), slide animation nhẹ nhàng, breadcrumb `Chương X > Bài học Y`, badge trạng thái Học thử (Preview) hoặc Đã khóa (Locked), Thumbnail Preview video với nút Play chuyển hướng sang `/instructor/courses/[id]/lessons/[lessonId]`, dòng thời lượng `Thời lượng: X phút Y giây` kèm kích thước tệp.
      - `CurriculumInspector`: Bộ điều phối trạng thái hiển thị (Empty, Chapter, Lesson).
      - `InspectorMobileDrawer`: Drawer ngăn kéo trượt mượt mà trên màn hình nhỏ (`< 1024px`), đóng mở tự động khi tương tác trên thiết bị di động.
    - **Modal `EditSectionDialog`**:
      - `frontend/src/features/course/components/edit-section-dialog.tsx`: Hộp thoại chỉnh sửa tiêu đề, mô tả và thứ tự chương với Zod validation và cập nhật giao diện mượt mà.
    - **Cập nhật `SectionLessonsList`**:
      - Bổ sung props `selectedLessonId` và `onSelectLesson`, kích hoạt trạng thái chọn bài học và highlight active rõ nét.
    - **Kiểm định chất lượng**:
      - Frontend Lint: `eslint src/` pass 0 errors, 0 warnings.
      - TypeScript: `tsc --noEmit` pass không có bất kỳ lỗi nào.
      - Frontend Build: `next build` Turbopack production compile thành công 100%.
      - Tuân thủ tuyệt đối: Purple Ban (0 mã màu tím), không dùng `any`, không inline font classes.
  - **Milestone 28 (Task: Simplify Curriculum UI & Modern Section Cards)**:
    - **Loại bỏ Inspector Panel & Drawer**:
      - Hủy bỏ hoàn toàn cấu trúc 2 cột Master - Detail và slide drawer trên mobile theo yêu cầu tinh gọn giao diện.
      - Xóa bỏ thư mục `frontend/src/features/course/components/inspector/` và gỡ bỏ export trong `index.ts`.
      - Điều chỉnh container `CourseDetailContent` về `max-w-5xl` liền mạch, thoáng mắt cho layout 1 cột.
    - **Nâng cấp Thẻ Card Chương học (`SectionCardItem`)**:
      - Áp dụng class theo đúng phong cách hiện đại:
        `rounded-xl border border-border/60 bg-card/70 shadow-sm backdrop-blur-xs transition-all duration-300 overflow-hidden hover:border-border/90`.
      - Tích hợp Badge thông số trực tiếp trên Header mỗi chương: Gọi hook `useSectionLessonsQuery(section.id)` để hiển thị real-time số lượng bài học và tổng thời lượng (`X bài học · Y giờ Z phút`).
      - Tích hợp nút cây bút chì (`lucide:pencil`) mở `EditSectionDialog` trực tiếp tại Header chương.
      - Nút "+ Thêm bài học" mở modal thêm bài học nhanh vào chương tương ứng.
    - **Tinh giản `SectionLessonsList`**:
      - Bỏ click selection trên dòng bài học; chỉ có liên kết "Xem bài học" ở bên phải điều hướng sang trang bài giảng (`/instructor/courses/[id]/lessons/[lessonId]`).
    - **Kiểm định chất lượng**:
      - TypeScript: `tsc --noEmit` pass 100%.
      - Linter: `eslint src/` pass 0 errors, 0 warnings.
      - Next.js Build: Turbopack compile thành công 100%.
      - Tuân thủ nghiêm ngặt Purple Ban (0 mã màu tím), không dùng `any`.
  - **Milestone 29 (Task: Course Studio Tree Hierarchy & Contextual Inspector)**:
    - **Thanh Thông Số Tổng Quan (Top Metric Bar)**:
      - Tạo component `CourseOverviewMetrics` (`frontend/src/features/course/components/course-overview-metrics.tsx`): 3 thẻ thống kê bo tròn `rounded-2xl` hiển thị tổng số chương, tổng bài giảng và thời lượng học.
    - **Cột Trái Cây Phân Cấp (Master Tree - `lg:col-span-7`)**:
      - Tái cấu trúc `CourseSectionsList` (`course-sections-list.tsx`): Cây phả hệ gồm Khóa học → Chương/Module → Bài học/Lecture.
      - Nút chevron đóng/mở nhánh với hiệu ứng xoay 90 độ mượt mà. Mặc định: Thu gọn tất cả (All Collapsed) theo đúng yêu cầu người dùng.
      - Hiển thị badge số lượng bài giảng và thời lượng trực tiếp trên từng chương (`X bài • Y phút/giờ`).
      - Nhấp chọn chương: Kích hoạt viền active (`border-sky-500 ring-2 ring-sky-500/15`).
      - Nhấp chọn bài học: Kích hoạt highlight viền trái (`bg-sky-500/10 border-l-4 border-sky-500`).
      - Nút "+ Thêm bài" và nút bút chì (`lucide:pencil`) mở `EditSectionDialog`.
    - **Cột Phải Contextual Inspector Panel (`lg:col-span-5 sticky top-20`)**:
      - Tạo component `ContextualInspectorPanel` (`contextual-inspector-panel.tsx`):
        - Khi chọn Chương: Badge "Tổng quan chương", tiêu đề & mô tả, 2 thẻ số liệu ("Số bài giảng thực tế", "Tổng thời lượng"), tài liệu chung của chương.
        - Khi chọn Bài học: Badge "Chi tiết bài học", breadcrumb chương, tiêu đề & mô tả, khung Media Banner với nút "Xem trước bài giảng" chuyển trang `/instructor/courses/[id]/lessons/[lessonId]`, tài liệu riêng của bài học.
        - Khi chưa chọn gì: Icon chỉ tay lịch sự + lời nhắc chọn chương hoặc bài học.
    - **Kiểm định chất lượng**:
      - TypeScript: `tsc --noEmit` pass 100%.
      - Linter: `eslint src/` pass 0 errors, 0 warnings.
      - Next.js Build: Turbopack compile thành công 100%.
      - Tuân thủ nghiêm ngặt Purple Ban (0 mã màu tím), không dùng `any`.
- **Milestone 30 (Drag & Drop Chapter Reordering & Auto-Indexing)**:
  - **Mục tiêu**: Loại bỏ trường nhập thủ công "Thứ tự hiển thị" tại modal thêm/sửa chương, thay bằng tính năng Kéo - Thả (Drag & Drop) trực quan trên cây chương và tự động đánh số thứ tự liên tục.
  - **Hợp đồng dữ liệu & DTOs**:
    - `share-lib`: Khai báo `IReorderSectionsPayload` (`sectionIds: string[]`) và đổi `order?: number` trong `ICreateSectionPayload`.
    - `ReorderSectionsDto`: Validate `sectionIds` là mảng không rỗng của các ObjectId hợp lệ (`@IsArray`, `@ArrayMinSize(1)`, `@IsMongoId({ each: true })`).
    - `CreateSectionDto`: Đổi `order` thành `@IsOptional()`.
  - **Backend Layer**:
    - `SectionRepository.reorderSections`: Sử dụng MongoDB `bulkWrite` cập nhật `$set: { order: index, updatedById: userId }` trong `ClientSession` transaction.
    - `CourseService.createSection`: Tự động tính toán `order = existingSections.length` khi `dto.order` là undefined/null.
    - `CourseService.reorderSections`: Kiểm tra quyền sở hữu khóa học (`course.instructorId === userId` hoặc `ADMIN`), kiểm tra trùng lặp ID và xác thực tất cả ID phải thuộc về đúng khóa học trước khi cập nhật.
    - `CourseController`: Thêm route `@Put(':courseId/sections/reorder')` với `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`.
    - Unit tests: Bổ sung comprehensive test cases trong `section.repository.spec.ts`, `course.service.spec.ts`, và `course.controller.spec.ts` (100% pass 284/284 backend tests).
  - **Frontend Layer**:
    - `CreateSectionDialog` & `EditSectionDialog`: Xóa bỏ hoàn toàn trường nhập "Thứ tự hiển thị" khỏi UI và form state; `create-section.schema.ts` cho phép `order` là optional.
    - `courseApi.reorderSections` & `useReorderSectionsMutation`: Tích hợp Silent Optimistic UI (cập nhật cache ngay tức thì, không spam toast thông báo) kèm rollback tự động và toast thông báo lỗi khi API thất bại.
    - Custom Hook `useChapterDnd`: Xử lý HTML5 Drag and Drop thuần, cung cấp drag handlers (`handleDragStart`, `handleDragOver`, `handleDragLeave`, `handleDrop`, `handleDragEnd`) và states (`draggedIndex`, `dragOverIndex`) với 0 external dependencies, tương thích tuyệt đối với React 19.2 và Next.js 16.
    - `ChapterTreeItem`: Tích hợp icon tay nắm kéo (`lucide:grip-vertical` với con trỏ `cursor-grab active:cursor-grabbing`), badge đánh số thứ tự động `CHƯƠNG 01`, `CHƯƠNG 02`... cập nhật tức thì theo vị trí, hiệu ứng mờ nhẹ khi kéo (`opacity-40`) và viền nét đứt (`border-2 border-dashed border-sky-500 bg-sky-500/5`) tại vị trí đích.
  - **Kiểm định chất lượng**:
    - Backend Unit Tests: 284/284 tests passed (100%).
    - Backend Lint: 0 errors.
    - Backend Build: `nest build` thành công 100%.
    - Frontend Lint: 0 errors, 0 warnings.
    - Frontend Build: `next build` biên dịch production tĩnh/động thành công 100%.
- **Milestone 31 (Lesson Modal UX Enhancement: Auto-Order, Content Type Dropdown & Interactive Toggle Card)**:
  - **Mục tiêu**: Tối ưu hóa trải nghiệm giảng viên khi thêm bài học mới tại modal `SectionLessonCreateForm`:
    1. Loại bỏ ô nhập "Thứ tự hiển thị" thủ công, tự động định vị bài học ở cuối chương (`calculatedOrder = existingLessons.length`).
    2. Bổ sung Dropdown chọn loại nội dung (Video bài giảng vs Tài liệu học tập) với cơ chế tự động lọc định dạng file qua thuộc tính `accept` và icon tương ứng, tự động khóa dropdown khi đã có file để tránh bất nhất dữ liệu.
    3. Nâng cấp mục "Cho phép học thử miễn phí" thành Interactive Toggle Card trực quan với hiệu ứng màu sắc xanh ngọc (`emerald`), huy hiệu "Mở phễu" và icon khóa/mở khóa linh hoạt.
  - **Kỹ thuật & Giải pháp**:
    - `create-lesson.schema.ts`: Bổ sung `contentType: z.enum(['video', 'document'])`, `ACCEPTED_VIDEO_FILE_EXTENSIONS`, `ACCEPTED_DOCUMENT_FILE_EXTENSIONS`.
    - `SectionLessonCreateForm`:
      - Gỡ bỏ ô nhập "Thứ tự hiển thị" khỏi UI; giá trị `order` vẫn được tính tự động từ `calculatedOrder` và truyền ngầm vào mutation payload.
      - Tích hợp Dropdown `<select>` được quản lý trực tiếp qua `register('contentType')` và `useWatch`, tự động điều chỉnh thuộc tính `accept` của `<input type="file">` (`video/*` vs `.pdf,.docx`), thay đổi icon hiển thị (`lucide:video` vs `lucide:file-text`) và tooltip hướng dẫn. Khóa dropdown khi `selectedFile` tồn tại.
      - Chuyển đổi checkbox `isPreview` thành thẻ Card bo góc sang trọng (`rounded-xl border p-3.5`), chuyển đổi giữa trạng thái khóa xám nhạt (`lucide:lock`) và trạng thái mở phễu xanh ngọc (`lucide:lock-open`, `bg-emerald-50/60`, `border-emerald-300`, badge "Mở phễu") kèm Switch toggle chuẩn accessibility.
  - **Gotchas & Bài học kinh nghiệm**:
    - *React 19 & ESLint `react-hooks/set-state-in-effect`*: Không sử dụng `useState` độc lập rồi gọi `setState` bên trong `useEffect` để reset `contentType` khi modal mở. Thay vào đó, đưa `contentType` vào thẳng `useForm` để `reset()` quản lý đồng bộ toàn bộ form state.
    - *Zod Resolver Type Symmetry*: Tránh sử dụng `.default(...)` trên trường `contentType` trong `zod.object({...})` vì Zod sẽ tạo ra kiểu `input` (optional/undefined) và `output` (required) bất đối xứng, dẫn đến lỗi TS2322 với `zodResolver`. Thay vào đó, định nghĩa kiểu chặt chẽ `z.enum(['video', 'document'])` và truyền giá trị mặc định qua `defaultValues` của `useForm`.
  - **Kiểm định chất lượng**:
    - Frontend Typecheck: `tsc --noEmit` đạt 100% 0 lỗi.
    - Frontend ESLint: `eslint src/` đạt 100% 0 lỗi, 0 cảnh báo.
    - Backend Unit Tests: 38/38 tests cho `lesson.service.spec.ts` và `lesson.controller.spec.ts` pass 100%.
- **Milestone 32 (Document Management & Access Status Icons on Contextual Inspector Panel)**:
  - **Mục tiêu**: Nâng cấp cột bên phải (`ContextualInspectorPanel`) phục vụ quản lý tài liệu và gắn nhãn trạng thái truy cập trực quan:
    1. Chỉ lọc và hiển thị tài liệu văn bản/bài đọc (`content.type === LessonContentTypeEnum.DOCUMENT`), không để lẫn file video.
    2. Liên thông hiển thị toàn bộ tài liệu của chương tại mục "Tài liệu chung của chương" khi chọn Chương.
    3. Hiển thị nhãn và Icon Khóa / Mở (Access Status Icons) trực quan ở góc phải mỗi tài liệu (Học thử 🔓 vs Đã khóa 🔒).
    4. Phân tách rõ ràng bài học video và bài học tài liệu tại "Tài liệu riêng của bài" khi chọn Bài học.
  - **Kỹ thuật & Giải pháp**:
    - `contextual-inspector-panel.tsx`:
      - Xây dựng component `DocumentItemWithStatus` hiển thị đồng bộ: icon tài liệu (`lucide:file-text`), tên file & dung lượng, link "Mở tệp" trong tab mới (`target="_blank" rel="noopener noreferrer"`), và huy hiệu trạng thái truy cập dạng Read-only badge.
      - 🔓 Trạng thái Học thử: Icon mở khóa `lucide:lock-open` + nhãn "Học thử" (`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20`).
      - 🔒 Trạng thái Đã khóa: Icon ổ khóa `lucide:lock` + nhãn "Đã khóa" (`bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20`).
      - `ChapterInspectorView`: Lọc danh sách bài học có `content.type === LessonContentTypeEnum.DOCUMENT`, hiển thị huy hiệu tổng số tệp và danh sách tài liệu với thanh cuộn tự động khi nhiều file.
      - `LessonInspectorView`: Kiểm tra `isDocLesson` (`content.type === LessonContentTypeEnum.DOCUMENT`), chỉ hiển thị tài liệu nếu bài học thực sự có tài liệu đính kèm; nếu là bài học video, hiển thị thông báo "Không có tài liệu riêng cho bài học này".
  - **Gotchas & Bài học kinh nghiệm**:
    - *TypeScript TS2367 Comparison Narrowing*: Khi trường `content.type` được định kiểu bằng `LessonContentTypeEnum`, không so sánh `l.content.type === LessonContentTypeEnum.DOCUMENT || l.content.type === 'document'` vì TypeScript coi nhánh thứ hai là unreachable narrowing và ném lỗi TS2367. Chỉ so sánh duy nhất với enum member `LessonContentTypeEnum.DOCUMENT`.
  - **Kiểm định chất lượng**:
    - Frontend Typecheck: `tsc --noEmit` đạt 100% 0 lỗi.
    - Frontend ESLint: `eslint src/...` đạt 100% 0 lỗi, 0 cảnh báo.
    - Backend Unit Tests: 38/38 tests cho `lesson.service.spec.ts` và `lesson.controller.spec.ts` pass 100%.
    - Tuân thủ nghiêm ngặt Purple Ban (0 mã màu tím), không sử dụng inline font classes.
- **Milestone 33 (Curriculum View Mode Switcher / Segmented Control & Mindmap Placeholder)**:
  - **Mục tiêu**: Bổ sung bộ điều khiển chuyển đổi chế độ xem (View Mode Switcher / Segmented Control) dạng viên thuốc (pill-shaped) cho đề cương khóa học:
    1. Vị trí chính xác: Căn giữa (`mx-auto` / `justify-center`) trong khoảng whitespace ngay bên dưới 3 thẻ thống kê (`CourseOverviewMetrics`) và bên trên tiêu đề "Cấu trúc giáo trình".
    2. Hai lựa chọn chuyển đổi: "Dạng Cây" (`viewMode: 'tree'`, mặc định) và "Sơ Đồ Tư Duy" (`viewMode: 'mindmap'`).
    3. Thiết kế chuẩn UI/UX:
       - Container ngoài: `inline-flex`, nền xám nhạt (`#f1f5f9` / `bg-slate-100`), bo tròn dạng viên thuốc (`rounded-full`), padding mỏng `4px - 6px`, viền nhẹ `border border-slate-200/80 shadow-xs`.
       - Nút Active ("Dạng Cây"): Nền trắng (`#ffffff`), chữ xanh tím Indigo nổi bật (`text-indigo-600`), đổ bóng nhẹ (`shadow-xs`), bo góc tròn ôm khít (`rounded-full`), icon `lucide:folder-tree`.
       - Nút Inactive ("Sơ Đồ Tư Duy"): Nền trong suốt (`bg-transparent`), chữ xám nhạt (`text-slate-600`), hover sáng nhẹ (`hover:text-slate-900 hover:bg-slate-200/50`), icon `lucide:network`.
    4. Quản lý trạng thái & URL Sync: Đồng bộ trạng thái `?view=mindmap` hoặc `?view=tree` qua URL search params của Next.js, duy trì trạng thái khi reload (F5) hoặc chia sẻ đường dẫn.
    5. Khung Placeholder cho Sơ Đồ Tư Duy: Khi chọn "Sơ Đồ Tư Duy", hiển thị giao diện placeholder trực quan, sẵn sàng kết nối pipeline AI Markmap tiếp theo.
  - **Kỹ thuật & Giải pháp**:
    - `course-view-mode-switcher.tsx`: Xây dựng component Segmented Control chuẩn accessible (`role="tablist"`, `role="tab"`, `aria-selected`), zero-dependency với Tailwind CSS v4 và Iconify.
    - `course-mindmap-placeholder.tsx`: Xây dựng khung card placeholder hiện đại với visual illustration, badge trạng thái "Sắp ra mắt" và nút hành động nhanh "Quay lại Dạng Cây".
    - `course-sections-list.tsx`: Bọc `CourseSectionsList` trong `<React.Suspense>` boundary để tương thích SSR Next.js 15+ khi dùng `useSearchParams()`, tích hợp hook chuyển đổi query param mượt mà không scroll (`router.replace(..., { scroll: false })`).
  - **Kiểm định chất lượng**:
    - Frontend ESLint: `pnpm --filter frontend lint` đạt 100% 0 lỗi, 0 cảnh báo.
    - Strict Typing: Hoàn toàn không dùng kiểu `any`, type union chặt chẽ `CourseViewMode = 'tree' | 'mindmap'`.
- **Milestone 34 (Fix UTF-8 / Latin-1 Mojibake Encoding Bug on Document & Lesson File Names)**:
  - **Nguyên nhân gốc rễ (Root Cause Analysis)**:
    - Khi người dùng tải lên tệp có tên tiếng Việt có dấu (ví dụ: `Các chủ đề tiểu luận.docx`), trình duyệt gửi header `Content-Disposition: form-data; name="file"; filename="Các chủ đề tiểu luận.docx"` mã hóa UTF-8.
    - Bộ phân tích HTTP multipart của Node.js (`multer` / `busboy`) theo chuẩn RFC lịch sử đã giải mã các byte UTF-8 này bằng bảng mã `ISO-8859-1` (Latin-1/binary).
    - Chuỗi byte UTF-8 đa byte bị phân tách thành các ký tự Latin-1 riêng rẽ (`0xC3 0xA1` -> `Ã¡`, `0xE1 0xBB 0xA7` -> `á»§`, `0xC4 0x91` -> `Ä\x91`, v.v.), sinh ra chuỗi lỗi font Mojibake: `CÃ¡c chá»§ Ä‘á»  tiá» u luáº­n.docx`.
    - Dữ liệu này được lưu vào MongoDB và khi frontend render lên panel thanh tra ("Tài liệu chung của chương" / "Chi tiết bài học"), các ký tự điều khiển không in được hiển thị thành ô vuông `[]` gây lỗi font.
  - **Kỹ thuật & Giải pháp toàn diện (Frontend + Backend + Share-Lib)**:
    - **`share-lib` (Shared Utility)**:
      - Tạo hàm `decodeUtf8FileName(fileName?: string | null): string` tại [`share-lib/src/utils/file.util.ts`](file:///d:/Download/hk1_2027/project_do_an/share-lib/src/utils/file.util.ts).
      - Cơ chế: Kiểm tra nếu chuỗi chỉ gồm các mã ký tự `<= 255` (Latin-1 byte stream), chuyển đổi sang `Uint8Array` và giải mã an toàn bằng `new TextDecoder('utf-8', { fatal: true }).decode(bytes)`. Nếu chuỗi đã là tiếng Việt Unicode chuẩn hoặc tiếng Anh không dấu, hàm tự động trả về nguyên bản một cách an toàn mà không làm hỏng chuỗi.
    - **Backend (Chuẩn hóa tự động khi tải lên)**:
      - `LessonFileValidationPipe`: Tự động khôi phục UTF-8 cho `file.originalname` trước khi thực hiện khử trùng ký tự lạ.
      - `StorageService.uploadLessonMedia`: Khôi phục `originalName` thành UTF-8 chuẩn trước khi trả về `ILessonContent`.
      - `CreateLessonDto`: Gắn `@Transform` với `decodeUtf8FileName` trên trường `LessonContentDto.fileName` đảm bảo dữ liệu gửi từ client luôn được chuẩn hóa trước khi lưu vào MongoDB.
      - Unit Tests: Bổ sung test cases tự động trong `lesson-file-validation.pipe.spec.ts` và `create-lesson.dto.spec.ts` (100% pass 286/286 tests).
    - **Frontend (Khắc phục ngay các tệp cũ đã lưu)**:
      - `ContextualInspectorPanel`: Bọc `decodeUtf8FileName` cho `fileName` và `lessonTitle` tại `DocumentItemWithStatus`, giúp toàn bộ tài liệu cũ đã lưu trong DB lập tức hiển thị tiếng Việt mượt mà không còn ô vuông hay ký tự lạ.
      - `LessonDetailContent`: Giải mã `lesson.content.fileName` tại cả Video Metadata Strip và Document Viewer Card.
      - `LessonContentApi`: Giải mã tên file trong thông báo Toast thành công.
  - **Kiểm định chất lượng**:
    - Backend Unit Tests: 286/286 tests passed (100%).
    - Frontend ESLint: 0 errors, 0 warnings.
    - Share-lib TypeScript Build: `tsc` biên dịch thành công 100%.

- **Frontend Milestone (Curriculum Master-Detail 70/30 Layout Ratio)**:
  - **Mục tiêu**: Điều chỉnh tỉ lệ bố cục Split View tại giao diện chi tiết khóa học của giảng viên (`/instructor/courses/[id]`) theo yêu cầu: Cột bên trái (Cấu trúc giáo trình) chiếm 70% và Cột bên phải (Tổng quan thông tin) chiếm 30%.
  - **Kỹ thuật & Giải pháp**:
    - `course-sections-list.tsx`: Chuyển đổi hệ thống Grid từ `grid-cols-12` sang `grid-cols-10`:
      - Cột trái: `lg:col-span-7 min-w-0 space-y-4` (chiếm đúng 7/10 = 70% bề ngang).
      - Cột phải: `lg:col-span-3 min-w-0 sticky top-20` (chiếm đúng 3/10 = 30% bề ngang).
      - Thêm `min-w-0` để ngăn ngừa hiện tượng grid blowout khi có tiêu đề hoặc văn bản dài.
      - Trên màn hình nhỏ (`< lg`), tự động xếp dọc (100% full-width).
    - `contextual-inspector-panel.tsx`:
      - Tinh chỉnh padding thẻ Card từ `p-5` thành `p-4 sm:p-4.5` để tăng diện tích hiển thị hữu ích.
      - Thẻ Quick Stats: Đổi padding thành `p-2.5`, chữ tiêu đề `text-[10px] leading-tight`, số lượng `text-sm font-bold` giúp các nhãn "Số bài giảng thực tế", "Tổng thời lượng" không bị ngắt dòng chật chội.
      - `DocumentItemWithStatus`: Giảm padding thành `p-2 gap-1.5`, nút "Mở" rút gọn `text-[10px]`, nhãn trạng thái `text-[9.5px]` và `truncate max-w-[90px]` cho tên bài giảng, đảm bảo danh sách tài liệu hiển thị sắc nét trong không gian 30% mà không bị tràn viền hay che khuất nút bấm.
  - **Kiểm định**:
    - ESLint: 0 errors, 0 warnings.
    - UI: Đã cập nhật tỉ lệ 7:3 chuẩn xác trên live dev server.
- **Milestone 35 (Lesson Key Points Dynamic Input & Pastel Color Cycling)**:
  - **Mục tiêu**:
    1. Thay thế ô `<textarea>` "Mô tả bài học" truyền thống tại modal thêm bài học (`SectionLessonCreateForm`) bằng danh sách nhập liệu động các **Ý cốt lõi của bài học** (Lesson Key Points).
    2. Mỗi ý cốt lõi khi thêm mới tự động mang một màu nền pastel dịu mắt xoay vòng (color cycling 5 màu) ở tầng UI:
       - 1. Vàng kem ấm: `#FFF8E6` (viền `#F3E0B5`, dot `#C49B3E`)
       - 2. Hồng cam pastel: `#FFE2DE` (viền `#F0C4BF`, dot `#D97368`)
       - 3. Lam xám dịu: `#ADB2C5` (viền `#9297AC`, dot `#5F677D`)
       - 4. Xanh xám nhạt: `#B5CFD1` (viền `#9BB7B9`, dot `#4E7A7D`)
       - 5. Xanh sương mù: `#D9E4E6` (viền `#C1D0D3`, dot `#6E888C`)
       - Chu kỳ lặp lại bằng phép toán `index % 5`. Tuân thủ triệt để Purple Ban (0 mã màu tím).
       - Thay vì hiển thị số `#1, #2`, mỗi dòng được đánh dấu bằng một dấu chấm tròn (bullet dot) bo tròn tinh tế mang màu sắc phối hợp hài hòa.
    3. Trải nghiệm bàn phím (Keyboard UX): Bấm `Enter` tại bất kỳ ô input nào sẽ tự động tạo một dòng ý mới ngay bên dưới và focus con trỏ vào ô mới. Hỗ trợ `Backspace` khi ô rỗng và phím mũi tên lên/xuống để điều hướng.
    4. Cấu trúc dữ liệu lưu trữ: Chuỗi JSON array thuần túy của `string[]` (không lưu mã màu), serialize qua trường `description` hiện tại để duy trì 100% tương thích ngược với MongoDB schema và backend DTO.
    5. Đồng bộ hiển thị: Hiển thị các thẻ ý cốt lõi mang màu pastel tương ứng tại trang xem chi tiết bài học (`LessonDetailContent`) và bảng thông tin ngữ cảnh (`ContextualInspectorPanel`).
  - **Kỹ thuật & Giải pháp**:
    - `frontend/src/features/course/utils/lesson-key-points.util.ts`:
      - Cung cấp palette 5 màu pastel `PASTEL_KEY_POINT_PALETTE` và hàm `getKeyPointColor(index)`.
      - Cung cấp danh sách placeholder gợi ý `getKeyPointPlaceholder(index)`.
      - Cung cấp hàm `serializeKeyPoints(points)` (loại bỏ dòng rỗng, trim khoảng trắng, serialize thành JSON) và `deserializeKeyPoints(desc)` (parse JSON mảng hoặc tách dòng legacy fallback).
    - `frontend/src/features/course/components/lesson-key-points-input.tsx`:
      - Component độc lập, tái sử dụng cao, quản lý ref input động và tự động focus khi thêm dòng mới.
      - Nút bấm thêm nhanh `+ Thêm ý` bo tròn tinh tế cùng hàng với tiêu đề ở góc phải.
      - Nút xóa `×` hover hiệu ứng đỏ nổi bật.
    - `frontend/src/features/course/schemas/create-lesson.schema.ts`:
      - Bổ sung validation cho `keyPoints`: mảng chuỗi, bắt buộc tối thiểu 1 ý, mỗi ý tối đa 200 ký tự, tổng độ dài serialized không quá 1000 ký tự (chống lỗi `@MaxLength(1000)` từ backend).
    - `frontend/src/features/course/components/section-lesson-create-form.tsx`:
      - Tích hợp `LessonKeyPointsInput` qua `Controller`, serialize payload khi gọi mutation.
    - `frontend/src/features/course/components/lesson-detail-content.tsx` & `contextual-inspector-panel.tsx`:
      - Giải mã `lesson.description` và hiển thị các thẻ/badge pastel xoay vòng sinh động.
  - **Gotchas & Bài học kinh nghiệm**:
    - *Zod Resolver Input/Output Asymmetry*: Khi dùng `z.array(...).default([''])`, Zod sinh kiểu input là `string[] | undefined` nhưng output là `string[]`, làm `zodResolver` báo lỗi TypeScript TS2322 với `useForm`. Giải pháp: bỏ `.default(...)` trong Zod schema, dùng `.min(1)` và định nghĩa `defaultValues: { keyPoints: [''] }` trong `useForm`.
  - **Kiểm định chất lượng**:
    - Unit Tests: 12/12 unit tests pass 100% tại `frontend/src/features/course/tests/lesson-key-points.spec.ts`.
    - Backend Unit Tests: 286/286 tests pass 100%.
    - Frontend Typecheck: `tsc --noEmit` đạt 0 errors.
    - Frontend Lint: `eslint src/` đạt 0 errors, 0 warnings.

- **Milestone 36 (Lesson Key Points Unique UUID v4 Identification)**:
  - **Mục tiêu**:
    1. Lưu trữ ID riêng biệt cho từng ý cốt lõi của bài học (`ILessonKeyPoint = { id: string; text: string }`), chuẩn hóa theo định dạng **UUID v4** (`crypto.randomUUID()`).
    2. Cung cấp nền tảng định danh bền vững cho sơ đồ Mindmap (Markmap / React Flow nodes), tracking tiến độ học tập và đồng bộ React DOM (`key={point.id}`).
    3. Tương thích ngược 100% (zero backend schema breaking changes): Serialize mảng `[{ id, text }]` thành chuỗi JSON qua trường `description`.
    4. Tự động chuyển đổi dữ liệu legacy (auto-migration): Tự động cấp phát UUID v4 khi đọc dữ liệu cũ dạng mảng chuỗi `string[]` hoặc plain text nhiều dòng.
  - **Kỹ thuật & Giải pháp**:
    - `frontend/src/features/course/utils/lesson-key-points.util.ts`:
      - Khai báo interface `ILessonKeyPoint { id: string; text: string }`.
      - Hàm `generateKeyPointId()`: Sử dụng `crypto.randomUUID()` với fallback regex chuẩn UUID v4.
      - Hàm `serializeKeyPoints()`: Lọc các ý có nội dung, sinh ID nếu thiếu, serialize thành chuỗi JSON mảng đối tượng.
      - Hàm `deserializeKeyPoints()`: Nhận diện mảng đối tượng `{ id, text }`, tự động sinh ID cho mảng chuỗi cũ hoặc plain text.
    - `frontend/src/features/course/schemas/create-lesson.schema.ts`:
      - Cập nhật `keyPoints`: validate mảng đối tượng `z.object({ id: z.string().min(1), text: z.string().max(200) })`.
      - Kiểm tra tối thiểu 1 ý có text không rỗng và tổng độ dài serialize $\le 1000$ ký tự.
    - `frontend/src/features/course/components/lesson-key-points-input.tsx`:
      - Props `value?: ILessonKeyPoint[]`, `onChange: (points: ILessonKeyPoint[]) => void`.
      - Sử dụng `key={point.id}` trên DOM, phím Enter tạo mới object `{ id: generateKeyPointId(), text: '' }`.
      - Hiển thị dấu chấm tròn (bullet dot) màu tương ứng ở vị trí ngoài cùng bên phải thay cho số thứ tự `#1, #2`.
    - `frontend/src/features/course/components/section-lesson-create-form.tsx`:
      - Khởi tạo giá trị mặc định `[{ id: generateKeyPointId(), text: '' }]`, submit serialize JSON.
    - `frontend/src/features/course/components/lesson-detail-content.tsx` & `contextual-inspector-panel.tsx`:
      - Render thẻ pastel và badge với `key={point.id}` và hiển thị `point.text`.
    - `frontend/src/features/course/tests/lesson-key-points.spec.ts`:
      - Bổ sung 14/14 unit tests kiểm tra UUID format, serialization, auto-migration, và schema validation.
  - **Kiểm định chất lượng**:
    - Frontend Unit Tests: 14/14 unit tests pass 100%.
    - Backend Unit Tests: 286/286 unit tests pass 100%.
    - Frontend Typecheck: `tsc --noEmit` 0 errors.
    - Frontend Lint: `eslint src/` 0 errors, 0 warnings.

- **Frontend Quick Stat Cards Typography Refinement**:
  - Tăng kích thước phông chữ của nhãn *"Số bài giảng thực tế"* và *"Tổng thời lượng"* tại `ChapterInspectorView` (`contextual-inspector-panel.tsx`) lên 140% (từ `text-[10px]` lên `text-[14px]` kèm `leading-snug`).
  - Đồng thời nâng giá trị số liệu từ `text-sm font-bold` lên `text-base font-bold` và `space-y-1` để duy trì tỷ lệ tương quan thị giác hài hòa, rõ nét và dễ đọc.
  - ESLint: 0 errors, 0 warnings.

- **Relax Maximum Upload File Size Limits (Global)**:
  - **Mục tiêu & Yêu cầu**: Gỡ bỏ rào cản dung lượng tối đa nhằm hỗ trợ tải lên các tệp bài giảng video độ phân giải cao và tài liệu chuyên sâu, đồng thời duy trì trần bảo vệ chống tràn bộ nhớ (OOM).
  - **Backend Updates**:
    - `backend/src/modules/storage/storage.constants.ts`: Nâng `MAX_VIDEO_SIZE_BYTES` từ 900MB lên 5GB (`5 * 1024 * 1024 * 1024`), `MAX_DOCUMENT_SIZE_BYTES` từ 50MB lên 500MB (`500 * 1024 * 1024`), định nghĩa `MAX_AVATAR_SIZE_BYTES = 50MB` (`50 * 1024 * 1024`).
    - `backend/src/modules/course/pipes/lesson-file-validation.pipe.ts`: Cập nhật thông báo lỗi dung lượng tương ứng (5GB cho video, 500MB cho tài liệu).
    - `backend/src/modules/user/user.controller.ts`: Nâng giới hạn `MaxFileSizeValidator` cho upload avatar từ 5MB lên 50MB.
    - `backend/src/modules/course/tests/lesson-file-validation.pipe.spec.ts`: Cập nhật test cases kiểm thử dung lượng 5GB/500MB.
  - **Frontend Updates**:
    - `frontend/src/features/course/schemas/create-lesson.schema.ts`: Nâng `MAX_VIDEO_FILE_SIZE = 5GB`, `MAX_DOCUMENT_FILE_SIZE = 500MB`.
    - `frontend/src/features/course/components/section-lesson-create-form.tsx`: Cập nhật validation client, toast thông báo lỗi và text hướng dẫn (`Hỗ trợ Video (MP4, WebM, MOV ≤ 5GB)` & `Hỗ trợ Tài liệu (PDF, Word .docx ≤ 500MB)`).
    - `frontend/src/features/profile/components/avatar-uploader.tsx`: Cập nhật `maxSize = 50MB`, toast và text hướng dẫn avatar 50MB.
  - **Kiểm định chất lượng**:
    - Backend Unit Tests: 286/286 unit tests pass 100%.
    - Frontend Lint: `eslint src/` pass 0 errors, 0 warnings.

---

## 2026-10-02 - Milestone 29: Thiết kế CSDL & API Lưu Trữ Sơ Đồ Tư Duy (`course_mindmaps`)

- **Bối cảnh & Động lực**:
  - Giao diện sơ đồ tư duy (Mindmap) phân cấp 4 cấp độ (Khóa học -> Chương -> Bài học -> Các ý cốt lõi) nếu phải query JOIN / `$lookup` qua 4 collection độc lập thì sẽ chậm và tốn tài nguyên DB khi số lượng chương/bài lớn.
  - Cần một bảng/collection chuyên dụng `course_mindmaps` đóng vai trò Materialized Document Store: Lưu trữ toàn bộ chuỗi JSON phân cấp dưới dạng pre-computed document theo `courseId`.
  - Giảng viên click "Cập nhật Mindmap" -> Backend UPSERT ghi đè hoàn toàn. Học viên xem Mindmap -> Query trực tiếp `courseId` siêu nhẹ nhàng, trả về JSON trong vài mili-giây.

- **Các thay đổi đã thực hiện**:
  1. **Tầng Shared Domain (`share-lib`)**:
     - Tạo interface `ICourseMindmap` và `ICourseMindmapNode` trong `share-lib/src/interfaces/course-mindmap.interface.ts`.
     - Export interface mới qua `share-lib/src/index.ts` và build thành công.
  2. **Tầng CSDL & Schema Mongoose (`backend/src/modules/course/schemas`)**:
     - Tạo `CourseMindmapEntity` kế thừa `BaseAbstractDocument`, collection `course_mindmaps`.
     - Khóa chính `courseId: Types.ObjectId` tham chiếu `CourseEntity`.
     - Trường `mindmapData: Record<string, unknown>` (kiểu `Schema.Types.Mixed`).
     - Partial Unique Index: `{ courseId: 1 }` với `{ unique: true, partialFilterExpression: { deletedAt: null } }`.
  3. **Tầng Repository (`backend/src/modules/course/repositories`)**:
     - Tạo `CourseMindmapRepository` kế thừa `BaseMongoRepository<ICourseMindmap, CourseMindmapEntity>`.
     - Triển khai `findByCourseId(courseId)` và `upsertByCourseId(courseId, mindmapData, userId)`.
  4. **Tầng DTO & Service (`backend/src/modules/course`)**:
     - `UpsertCourseMindmapDto`: validate `@IsNotEmpty`, `@IsObject`.
     - `CourseMindmapService` kế thừa `BaseService`, inject `CourseMindmapRepository`, `CourseRepository`, `ClsService`. Kiểm tra quyền sở hữu của Giảng viên (`isOwner`) hoặc `ADMIN`.
  5. **Tầng Controller (`backend/src/modules/course/course-mindmap.controller.ts`)**:
     - `GET /api/v1/courses/:courseId/mindmap`: `@Public()`, trả về `mindmapData` hoặc `null`.
     - `PUT /api/v1/courses/:courseId/mindmap`: `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`, thực hiện upsert ghi đè an toàn.
  6. **Đăng ký Module (`backend/src/modules/course/course.module.ts`)**:
     - Đăng ký `CourseMindmapEntity` vào `MongooseModule.forFeature`, đăng ký Controller, Providers và Exports.
  7. **Kiểm thử chất lượng (Unit & Integration Tests)**:
     - `course-mindmap.service.spec.ts`: 10/10 tests pass (NotFound, Forbidden, Instructor Upsert, Admin Bypass, Get Mindmap).
     - `course-mindmap.controller.spec.ts`: 3/3 tests pass (GET, PUT delegation & ApiResponse formatting).
     - `course-mindmap.schema.spec.ts`: 5/5 tests pass (Schema defaults, required fields, partial unique index).
     - Toàn bộ 18/18 tests mindmap và 230/230 tests course module pass 100%. Type checking `tsc --noEmit` pass 100%.

---

## 2026-10-04 - Milestone 30: MinIO Folder Structure & API Upload Thumbnail & Trailer cho Khóa Học

- **Bối cảnh & Động lực**:
  - Khóa học cần lưu trữ riêng biệt ảnh bìa (thumbnail) và video trailer trong MinIO tại các thư mục cùng cấp với bài học (`courses/lessons/`):
    - `courses/thumbnail/`: Ảnh bìa khóa học (1280x720 WebP, nén tối ưu qua Sharp).
    - `courses/trailer/`: Video giới thiệu / trailer khóa học (MP4, WebM, QuickTime, tối đa 2GB).
  - Tự động xóa file cũ trên MinIO khi người dùng upload file mới (fire-and-forget, không làm gián đoạn transaction).
  - Phân quyền chặt chẽ: Chỉ Giảng viên sở hữu khóa học (`INSTRUCTOR`) hoặc Quản trị viên (`ADMIN`) mới có quyền upload.

- **Các thay đổi đã thực hiện**:
  1. **Tầng Shared Domain (`share-lib`)**:
     - Thêm trường `trailerUrl?: string | null` vào interface `ICourse` (`share-lib/src/interfaces/course.interface.ts`).
     - Build thành công `pnpm --filter share-lib build`.
  2. **Tầng CSDL & Schema Mongoose (`backend/src/modules/course/schemas`)**:
     - Cập nhật `CourseEntity` trong `course.schema.ts` với `@Prop({ type: String, required: false, default: null, trim: true }) trailerUrl?: string | null`.
  3. **Tầng Storage Constants (`backend/src/modules/storage/storage.constants.ts`)**:
     - Thêm `ALLOWED_THUMBNAIL_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']`.
     - Thêm `MAX_THUMBNAIL_SIZE_BYTES = 10 * 1024 * 1024` (10MB).
     - Thêm `MAX_TRAILER_SIZE_BYTES = 2 * 1024 * 1024 * 1024` (2GB).
  4. **Pipes Validation (`backend/src/modules/course/pipes/`)**:
     - Tạo `CourseImageValidationPipe`: Validate ảnh hợp lệ (MIME, size ≤ 10MB).
     - Tạo `CourseTrailerValidationPipe`: Validate video hợp lệ (MIME video, size ≤ 2GB) và chuẩn hóa tên file UTF-8.
  5. **Tầng Service (`backend/src/modules/course/services/course.service.ts`)**:
     - Inject `StorageService` vào `CourseService`.
     - Thêm `updateCourseThumbnail(courseId, userId, role, file)`: Upload ảnh vào `courses/thumbnail/`, dọn dẹp file cũ nếu có, cập nhật DB qua `this.updateOrFail`.
     - Thêm `updateCourseTrailer(courseId, userId, role, file)`: Upload video vào `courses/trailer/`, dọn dẹp file cũ nếu có, cập nhật DB qua `this.updateOrFail`.
  6. **Tầng Controller (`backend/src/modules/course/course.controller.ts`)**:
     - `PATCH /api/v1/courses/:courseId/thumbnail`: `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`, `FileInterceptor('file')`.
     - `PATCH /api/v1/courses/:courseId/trailer`: `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`, `FileInterceptor('file')`.
  7. **Kiểm thử chất lượng (Unit Tests & Quality Assurance)**:
     - Tạo `backend/src/modules/course/tests/course.service.media.spec.ts`: 16/16 test cases pass (Upload thumbnail, upload trailer, dọn dẹp file cũ, check quyền Giảng viên/Admin, reject Forbidden/NotFound, validation pipes).
     - Chạy toàn bộ 19 test files của module course: 251/251 tests pass 100%.
     - Kiểm tra kiểu dữ liệu `pnpm --filter backend exec npx tsc --noEmit`: 0 errors.

---

## [2026-10-04] - Triển Khai Hoàn Chỉnh Logic End-to-End Cho Course Thumbnail & Trailer Upload

- **Mục tiêu**:
  - Triển khai toàn bộ logic thực tế cho việc upload/thay đổi Course Thumbnail và Course Trailer Video trên giao diện Course Detail (`/instructor/courses/[id]`).
  - Nâng giới hạn trailer lên 600MB (đồng bộ Backend & Frontend), ẩn text dung lượng trên UI theo đúng chỉ đạo.
  - Hỗ trợ xem trước tương tác (Click-to-Preview): Modal Lightbox phóng to ảnh bìa sắc nét và Modal Video Player phát video trailer trực tiếp.
  - Upload file ngay lập tức khi người dùng chọn file kèm thanh tiến trình trực quan.

- **Các thay đổi đã thực hiện**:
  1. **Tầng Backend Storage & Pipe**:
     - Cập nhật `MAX_TRAILER_SIZE_BYTES = 600 * 1024 * 1024` (600MB) trong `backend/src/modules/storage/storage.constants.ts`.
     - Cập nhật thông báo lỗi trong `CourseTrailerValidationPipe` và test case trong `course.service.media.spec.ts`.
     - Vitest kiểm thử: 16/16 tests pass, 19/19 files pass (251/251 tests pass 100%).
  2. **Tầng Frontend API Client & Mutations (`frontend/src/features/course/api/course.api.ts`)**:
     - Thêm `uploadThumbnail` và `uploadTrailer` vào `courseApi` (hỗ trợ `FormData`, `onUploadProgress`, override timeout để hỗ trợ video dung lượng lớn).
     - Thêm React Query hooks: `useUploadCourseThumbnailMutation(courseId)` và `useUploadCourseTrailerMutation(courseId)` với cache invalidation cho `courseKeys.detail(courseId)` và thông báo toast Sonner.
  3. **Tầng Frontend Component (`frontend/src/features/course/components/course-media-preview.tsx`)**:
     - Cập nhật nhận props `courseId`, `thumbnailUrl`, `trailerUrl`, `readOnly`.
     - Tạo input file ẩn kích hoạt ngay khi người dùng chọn file hoặc nhấn nút [ 📷 Thay ảnh bìa ] / [ 🎬 Thay video trailer ].
     - Validation client-side: Thumbnail <= 10MB (ảnh JPEG/PNG/WebP/GIF), Trailer <= 600MB (video MP4/WebM/MOV).
     - Giao diện Trailer tuân thủ nghiêm ngặt quy tắc: **Không hiển thị text giới hạn dung lượng lên UI**.
     - Trạng thái Uploading: Overlay spinner kèm thanh progress hiển thị % upload trực quan, disable các nút bấm chống spam.
     - Tích hợp Lightbox Modal phóng to ảnh và Video Player Modal phát trailer với controls chuẩn HTML5.
  4. **Tích hợp vào Trang Chi tiết Khóa học (`course-detail-content.tsx`)**:
     - Truyền `courseId={course.id}`, `thumbnailUrl={course.thumbnailUrl}`, `trailerUrl={course.trailerUrl}` vào `<CourseMediaPreview />`.
     - Export `CourseMediaPreview` trong `features/course/index.ts`.
  5. **Kiểm tra chất lượng**:
     - Frontend TypeScript check: `pnpm --filter frontend exec npx tsc --noEmit` -> 0 lỗi.
     - Backend TypeScript check: `pnpm --filter backend exec npx tsc --noEmit` -> 0 lỗi.
     - Backend Vitest: 251/251 tests pass 100%.

---

## [2026-10-04] - Tích Hợp Rich Text Editor Cho Trường Mô Tả Khóa Học (Tiptap v2 + Tailwind Typography + DOMPurify)

- **Mục tiêu**:
  - Thay thế thẻ `<textarea id="description">` tại trang Tạo mới khóa học (`/instructor/courses/new`) bằng Rich Text Editor chuyên nghiệp, hiện đại, thân thiện với giảng viên.
  - Cung cấp thanh công cụ soạn thảo tối ưu với chiều cao tối thiểu 250px - 350px, hỗ trợ đầy đủ các định dạng: Bold, Italic, Heading 2, Heading 3, Bullet List, Numbered List, Link, Code/Codeblock cùng cặp nút Undo/Redo.
  - Lưu trữ nội dung dưới định dạng HTML string chuẩn ngữ nghĩa vào MongoDB (thông qua `CreateCourseDto` và schema hiện có).
  - Khử khuẩn HTML tự động bằng `DOMPurify` (`isomorphic-dompurify`) trước khi render qua `dangerouslySetInnerHTML` để phòng chống triệt để lỗ hổng Stored XSS.
  - Kết hợp plugin `@tailwindcss/typography` với class `prose prose-slate dark:prose-invert max-w-none` để hiển thị văn bản đẹp mắt, chuẩn tỉ lệ căn chỉnh.

- **Các thay đổi đã thực hiện**:
  1. **Dependencies & Cấu hình Styling**:
     - Cài đặt `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tailwindcss/typography`, `isomorphic-dompurify`.
     - Cấu hình `@plugin "@tailwindcss/typography";` trong `frontend/src/app/globals.css`.
     - Bổ sung style cơ bản cho Tiptap editor contenteditable (`.tiptap`) trong `globals.css` (headings, lists, code, pre, focus outline).
  2. **Tạo Reusable Component `RichTextEditor` (`frontend/src/components/ui/rich-text-editor.tsx`)**:
     - Xây dựng component Tiptap chuẩn React 19 + Next.js 16 (`immediatelyRender: false` chống lỗi hydration SSR).
     - Thiết kế thanh công cụ Toolbar đồng bộ Design System (Shadcn + Lucide icon từ `@iconify/react`), tuân thủ Purple Ban.
     - Chiều cao tối thiểu 280px, tự động cuộn nội dung, đồng bộ hai chiều `value`/`onChange`.
  3. **Tích hợp vào Form Tạo Khóa Học (`create-course-form.tsx`)**:
     - Tích hợp `RichTextEditor` qua `<Controller control={control} name="description" />`.
     - Cập nhật `create-course.schema.ts` với helper biến đổi các thẻ HTML rỗng (như `<p></p>`, `<p><br></p>`) thành chuỗi rỗng để tránh lưu dữ liệu rác vào cơ sở dữ liệu.
  4. **Hiển thị An toàn tại Trang Chi Tiết Khóa Học (`course-detail-content.tsx`)**:
     - Sử dụng `DOMPurify.sanitize(course.description)` để khử sạch mọi mã độc/script/event handlers độc hại.
     - Render nội dung qua thẻ có lớp `prose prose-slate dark:prose-invert max-w-none`.
  5. **Kiểm tra chất lượng (Quality Assurance)**:
     - Tạo unit test suite `frontend/src/features/course/tests/course-rich-editor.spec.ts`: 7/7 test cases pass (Validation chuỗi HTML, lọc thẻ rỗng, khử khuẩn XSS của DOMPurify).
     - Toàn bộ unit tests frontend pass (21/21 tests pass 100%).
     - TypeScript check: `pnpm --filter frontend exec tsc --noEmit` -> 0 lỗi.
     - ESLint: `pnpm --filter frontend lint` -> 0 lỗi, 0 cảnh báo.



---

## [2026-10-04] - Triển Khai Chức Năng Inline Edit Chi Tiết Khóa Học (Course Inline Editing & Auto Unique Slug)

- **Mục tiêu**:
  - Triển khai chức năng chỉnh sửa trực tiếp (Inline Editing) tại trang http://localhost:3000/instructor/courses/:id cho các trường: Tiêu đề khóa học, Học phí, Cấp độ, Mô tả ngắn gọn và Nội dung mô tả chi tiết.
  - Tự động sinh slug tiếng Việt không dấu chuẩn SEO khi đổi tên khóa học, tự động đánh số thứ tự -1, -2, ... nếu phát hiện trùng lặp với khóa học khác.
  - Hỗ trợ chọn Miễn phí hoặc Có phí (kèm Giá gốc và Giá khuyến mãi, tự động gạch ngang giá cũ 500.000 đ -> 299.000 đ).
  - Dropdown chọn Cấp độ tại chỗ (ALL_LEVELS, BEGINNER, INTERMEDIATE, ADVANCED).
  - Card Mô tả ngắn gọn mở rộng Textarea 3 dòng với bộ đếm ký tự 0/200.
  - Card Nội dung mô tả chi tiết chuyển đổi sang trình soạn thảo RichTextEditor (Tiptap) tại chỗ.

- **Các thay đổi đã thực hiện**:
  1. **Shared Library (share-lib)**:
     - Bổ sung originalPrice?: number | null; và IUpdateCoursePayload vào course.interface.ts.
     - Tạo tiện ích dùng chung slugify tiếng Việt tại share-lib/src/utils/slug.util.ts.
  2. **Backend Core API (NestJS + MongoDB)**:
     - course.schema.ts: Thêm trường originalPrice vào CourseEntity.
     - update-course.dto.ts: Tạo DTO với validation và whitespace normalization.
     - course.repository.ts: Bổ sung findConflictingSlugs tìm regex các slug có hậu tố số.
     - course.service.ts: Xây dựng generateUniqueSlug tự động tăng số thứ tự và updateCourse với audit context và validation giá (price <= originalPrice).
     - course.controller.ts: Endpoint PATCH /courses/:id bảo vệ bằng RolesGuard và kiểm tra quyền sở hữu.
     - Tests: Bổ sung 12 test cases mới trong course.service.spec.ts và course.controller.spec.ts (toàn bộ 337/337 tests backend pass).
  3. **Frontend Components & Inline Editing (Next.js 16 + React 19)**:
     - popover.tsx: Popover component chuẩn Shadcn dựa trên @base-ui/react.
     - course-title-inline-edit.tsx: Sửa tiêu đề, hover hiển thị icon bút chì, tự lưu khi Enter hoặc bấm Tick xanh, hủy khi bấm Esc hoặc blur ra ngoài (phương án A), hiển thị badge slug dự kiến.
     - course-price-inline-popover.tsx: Popover chuyển đổi Miễn phí / Có phí, nhập Giá gốc và Giá khuyến mãi, hiển thị giá gạch ngang.
     - course-level-inline-select.tsx: Dropdown select cấp độ tại chỗ với phản hồi tức thời.
     - course-short-desc-inline-card.tsx: Card chuyển thành Textarea 3 dòng, giới hạn 200 ký tự với bộ đếm ký tự 0/200 đổi màu cảnh báo khi > 180 ký tự.
     - course-desc-inline-card.tsx: Card chuyển sang trình soạn thảo RichTextEditor (Tiptap) để chỉnh sửa định dạng HTML trực tiếp.
     - Tích hợp toàn diện vào course-detail-content.tsx.
  4. **Kiểm tra chất lượng (Quality Assurance)**:
     - Frontend Unit Tests: 10/10 test cases pass trong course-inline-edit.spec.ts.
     - Backend Vitest: 337/337 tests pass 100%.
     - Frontend TypeScript: npx tsc --noEmit -> 0 lỗi.
     - Frontend ESLint: eslint src/ -> 0 lỗi, 0 cảnh báo.

- **Milestone 25 (Interactive Course Mindmap Canvas Integration & Hybrid Rendering Paradigm)**:
  - Thiết kế và triển khai thành công Mindmap Canvas tương tác (`CourseMindmapView`) thay thế placeholder trong `CourseSectionsList` (`frontend/src/features/course/components/course-sections-list.tsx`).
  - Áp dụng mô hình lai HTML/DOM + SVG:
    - HTML Nodes: Sử dụng thẻ `div` kết hợp Tailwind CSS để tự động bẻ dòng chữ (text-wrap), hiển thị icon loại bài giảng, badge "Học thử", và nút thu/bung (+/−) nhánh.
    - SVG Background: Vẽ đường nối Cubic Bézier Curves (`SmoothBezierEdge`) bằng thẻ `<svg><path>` mượt mà tự nhiên với 2 điểm điều khiển P1, P2.
    - Infinite Canvas: Tích hợp `@xyflow/react` v12, hỗ trợ Pan/Zoom 60fps, Minimap góc dưới, và chế độ toàn màn hình (Fullscreen).
  - Thuật toán bố cục tự động (Tree Layout Engine):
    - Tích hợp `@dagrejs/dagre` căn chỉnh cây phân cấp từ trái sang phải (`LR`), tính toán bounding box chính xác cho từng loại node (`courseRoot`, `section`, `lesson`, `keypoint`), giữ khoảng đệm AABB an toàn (`ranksep: 80`, `nodesep: 24`) chống đè lấn khối.
  - Tích hợp dữ liệu hai chiều:
    - Tiện ích `mindmap-converter.util.ts`: Tự động trích xuất và chuyển đổi dữ liệu Khóa học -> Chương mục -> Bài học -> Ý chính (`ILessonKeyPoint[]`) thành cấu trúc nodes & edges.
    - Tiện ích `course-mindmap.api.ts` & hook `useCourseMindmap`: Tải snapshot cấu trúc đã lưu từ backend (`GET /courses/:courseId/mindmap`) hoặc tự động sinh mới từ Curriculum; Giảng viên có thể bấm "Lưu sơ đồ" để snapshot lưu lên MongoDB (`PUT /courses/:courseId/mindmap`).
  - Kiến trúc Context Event-Driven (`CourseMindmapContext`):
    - Tách biệt logic toggle nhánh (+/−) ra khỏi dữ liệu node, loại bỏ hoàn toàn các closure callback mutable trong `node.data`, tuân thủ triệt để React Compiler và ESLint (0 errors, 0 warnings).
  - Kiểm định toàn diện:
    - TypeScript: `pnpm --filter frontend exec tsc --noEmit` -> 100% clean (0 errors).
    - ESLint: `pnpm --filter frontend run lint` -> 100% clean (0 errors, 0 warnings).
    - Share-lib build: `pnpm --filter share-lib build` -> Pass.
    - Backend build & test: 337/337 vitest tests pass 100%.

- **Milestone 26 (Modern Course Level Custom Select Redesign & Visual Indicator Bars)**:
  - Thiết kế và triển khai `CourseLevelSelect` (`frontend/src/features/course/components/course-level-select.tsx`) thay thế hoàn toàn thẻ `<select>` native mặc định trong form tạo khóa học (`create-course-form.tsx`) và cập nhật đồng bộ component chọn trình độ tại trang chi tiết khóa học (`frontend/src/features/course/components/inline/course-level-inline-select.tsx`).
  - Giao diện SaaS hiện đại, tối giản, sạch sẽ:
    - Đồng bộ kích thước tuyệt đối 1:1 với ô "Học phí (VND)": cùng chiều cao `h-8` (32px), cùng bán kính bo góc `rounded-xl`, cùng nền trong suốt/dark input, cùng border và focus ring chuẩn token (`ring-ring/50`).
    - Tại trang chi tiết khóa học (`/instructor/courses/[id]`), ô Trình độ hiển thị icon indicator đồng bộ với tiêu đề card, click vào mở popup custom select thanh lịch thay thế thẻ select native cũ.
  - Thanh chỉ số trực quan (LevelIndicator):
    - `ALL_LEVELS` ("Tất cả cấp độ"): Biểu tượng phân tầng `lucide:layers` thanh lịch.
    - `BEGINNER` ("Cơ bản"): 1 vạch kích hoạt (`1/3`).
    - `INTERMEDIATE` ("Trung cấp"): 2 vạch kích hoạt (`2/3`).
    - `ADVANCED` ("Nâng cao"): 3 vạch kích hoạt (`3/3`).
    - Các vạch mini được bo góc (`rounded-full`), tự động đổi màu theo trạng thái (`bg-current` khi active / `bg-muted-foreground/30` khi inactive).
  - Quy chuẩn thẩm mỹ:
    - Tuyệt đối không emoji, không có subtitle hay văn bản giải thích phụ, checkmark (`lucide:check`) chỉ xuất hiện tại option đang chọn.
    - Chevron xoay 180 độ khi mở menu với transition mượt mà.
    - Floating panel có z-index `z-50`, đổ bóng `shadow-lg`, mở/đóng nhẹ nhàng với hiệu ứng `fade-in-0 zoom-in-95`.
  - Tương tác & Khả năng tiếp cận (Accessibility):
    - Hỗ trợ click-outside đóng dropdown, phím Escape, phím mũi tên lên/xuống và phím Enter/Space để chọn.
    - Khai báo đầy đủ các thuộc tính ARIA: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-haspopup="listbox"`, `aria-selected` giúp hỗ trợ screen-readers và pass 100% ESLint jsx-a11y.
  - Tích hợp Form & Inline Update:
    - Tích hợp với `react-hook-form` qua `<Controller />` trong form tạo khóa học.
    - Tích hợp trực tiếp với `useUpdateCourseMutation` trong `CourseLevelInlineSelect` tại trang chi tiết để cập nhật tức thời kèm trạng thái pending loading spinner.
  - Gotchas & Khắc phục lỗi che khuất danh sách (Clipping by Card overflow-hidden):
    - *Vấn đề*: Thẻ cha `Card` mặc định có thuộc tính CSS `overflow-hidden`. Khi `CourseLevelInlineSelect` dùng dropdown absolute thông thường nằm ở hàng cuối cùng của card Hero Overview, danh sách sổ xuống bị cắt ngắn và bị khối card "Mô tả ngắn gọn" bên dưới che khuất.
    - *Giải pháp*:
      1. Tái cấu trúc `CourseLevelInlineSelect` sử dụng `Popover`, `PopoverTrigger`, và `PopoverContent` (kế thừa `PopoverPortal` đưa portal ra khỏi stacking context của Card gắn vào `document.body` với `z-50`).
      2. Thêm class `overflow-visible` cho Hero Overview `Card` tại `course-detail-content.tsx`.
      3. Cập nhật `components/ui/popover.tsx` sử dụng `cn` từ `@/lib/utils` (kết hợp `twMerge`) để cho phép ghi đè độ rộng `w-[210px]` và padding `p-1.5` một cách chuẩn xác.
- **Milestone 26 (Tự Động Đồng Bộ Thumbnail Làm Poster Cho Video Trailer Khóa Học)**:
  - Yêu cầu nghiệp vụ: Tự động sử dụng ảnh bìa khóa học (`thumbnailUrl`) làm poster cho video trailer (`trailerUrl`) trên giao diện chi tiết khóa học, hỗ trợ đầy đủ 4 trường hợp (upload thumbnail trước, upload trailer trước, upload thumbnail sau trailer, thay đổi thumbnail).
  - Kiến trúc Single Source of Truth: Không tạo thêm trường `posterUrl` dư thừa trong database. Poster được tính toán động (derived state) từ `activeThumbnail = localThumbnailUrl || thumbnailUrl`.
  - Giải pháp React Remounting: Để khắc phục đặc tính của thẻ HTML5 `<video>` trên các trình duyệt hiện đại (không tự động vẽ lại poster khi thuộc tính poster thay đổi trên thẻ đã nạp metadata), gán React key phụ thuộc `key={`trailer_card_${activeTrailer}_${activePoster}`}` giúp remount tức thì khi poster hoặc trailer thay đổi.
  - Tối ưu hóa tải tài nguyên: Sử dụng `preload={activePoster ? 'none' : 'metadata'}` để hiển thị poster ảnh sắc nét khi đã có thumbnail mà không bị frame 0 ghi đè; tự động fallback lấy frame đầu tiên qua `preload="metadata"` khi chưa có thumbnail.
  - Đồng bộ Modal Player: Thẻ `<video>` trong Video Dialog Modal cũng nhận `poster={activePoster}` và `key={trailerModalKey}` để poster hiển thị đồng nhất.
  - Quản lý bộ nhớ ObjectURL: Thêm `useEffect` dọn dẹp `URL.revokeObjectURL()` khi unmount và giải phóng object URL trong `onSuccess`/`onError` của mutation để chống rò rỉ bộ nhớ.
- **Milestone 27 (Tinh Chỉnh Thẩm Mỹ Khung Trailer Preview: Giảm Thêm 30% Dark Overlay, Poster Sắc Nét 100%, Tối Giản Nút Play)**:
  - Yêu cầu UI/UX: Làm sáng và trong trẻo hình ảnh poster video trailer tối đa, xóa nhãn văn bản rườm rà, tập trung thị giác vào nút Play tròn trung tâm.
  - Tối ưu Dark Overlay: Tiếp tục giảm thêm 30% độ tối kênh alpha từ `bg-black/10 group-hover:bg-black/20` xuống `bg-black/[0.07] group-hover:bg-black/[0.14]`, giúp ảnh nền poster sáng rõ, trung thực và sắc nét tối đa.
  - Tối đa độ sắc nét Poster: Đưa độ hiển thị của thẻ `<video>` lên tuyệt đối `opacity-100` (không hạ mờ ở bất kỳ trạng thái nào).
  - Tối giản hóa Layout: Xóa bỏ thẻ `<span>Nhấn để phát video trailer</span>`, đưa container overlay về `flex items-center justify-center` với duy nhất nút tròn Play glassmorphism phóng to khi hover (`group-hover:scale-110 group-hover:bg-primary`).





- **Milestone 28 (Mindmap Canvas Initial 2-Level Default Collapse)**:
  - Thiết kế và triển khai cơ chế thu gọn mặc định cho sơ đồ tư duy: Khi người dùng chuyển sang tab "Sơ Đồ Tư Duy", canvas luôn reset và hiển thị đúng 2 cấp độ đầu tiên (Level 1: Gốc Khóa học, Level 2: Các Chương mục).
  - Thuật toán thu gọn:
    - Bổ sung hàm tiện ích `generateDefaultCollapsedIds(rawData)` trong `mindmap-converter.util.ts`, tự động gom toàn bộ `section.id` và `lesson.id` vào `Set<string>`.
    - Level 3 (Bài học) và Level 4 (Ý chính) được đưa sẵn vào danh sách thu gọn ngay từ bước khởi tạo `initialElements`.
    - Khi Giảng viên nhấn nút `+` trên từng Chương, chỉ các Bài học của chương đó được mở ra (các Ý chính của bài học vẫn giữ trạng thái đóng cho đến khi click `+` của bài học), hỗ trợ khám phá đa nhánh (`Multi-branch`).
    - Thao tác "Làm mới cây" (`handleSyncFromCurriculum`) cũng khôi phục về trạng thái 2 cấp độ mặc định và tự động căn vừa màn hình (`fitView`).
  - Kiểm tra chất lượng:
    - TypeScript: `pnpm --filter frontend exec tsc --noEmit` -> 100% clean (0 errors).
    - ESLint: `pnpm --filter frontend run lint` -> 100% clean (0 errors, 0 warnings).
- **Milestone 29 (Tối Ưu Hóa Mindmap 90fps - 120fps+ & Triển Khai Huy Hiệu Thu Gọn +Count Badge)**:
  - Tối ưu hóa hiệu năng 90fps - 120fps+ (High Refresh Rate / ProMotion Ready):
    - Bật `onlyRenderVisibleElements={true}` trong React Flow (`course-mindmap-view.tsx`) để viewport virtualization culling các node/edge nằm ngoài tầm nhìn.
    - Bổ sung `will-change: transform`, `transform: translateZ(0)` và `backface-visibility: hidden` cho `.react-flow__viewport` trong `globals.css`, ép trình duyệt đẩy các thao tác pan/zoom lên GPU Compositor riêng biệt.
    - Thêm `contain: layout style` cho `.react-flow__node` và `[contain:paint]` cho container canvas.
    - Loại bỏ lớp `backdrop-blur-xs` trên wrapper canvas để triệt tiêu tải GPU fillrate khi rê chuột với tốc độ cao.
    - Rút ngắn thời lượng animation căn chỉnh sơ đồ (`fitView`) xuống `300ms` với chu kỳ mượt mà.
  - Triển khai Huy hiệu thu gọn (+Count Badge) neo mép phải Node:
    - Tạo component `CollapseCountBadge` (`nodes/collapse-count-badge.tsx`):
      - Vị trí neo: `absolute top-1/2 -right-3 -translate-y-1/2` (khoảng `-11px` đến `-12px`), nhô nửa hình khối ra ngoài khung tại đúng cổng ra của đường cong Bézier.
      - Trạng thái Thu gọn (`isCollapsed = true`): Hiển thị huy hiệu viên thuốc bo tròn `+{count}` (ví dụ `+4`, `+12`), nền cùng tông cấp độ (`bg-sky-600` cho Chương, `bg-emerald-600` cho Bài học), viền nổi `border-2 border-background`, đổ bóng `shadow-xs hover:shadow-md`, hiệu ứng hover phóng to nhẹ `scale-110`.
      - Trạng thái Mở rộng (`isCollapsed = false`): Nút đổi thành biểu tượng dấu trừ `−` (`lucide:minus`), bao bọc hoặc kết hợp với cổng xuất `Handle type="source"` để các đường cong Cubic Bézier tuôn ra tự nhiên từ mép ngoài nút bấm.
      - Tinh gọn nội dung thân thẻ: Xóa bỏ nút `+ / −` cũ nằm bên trong card ở `SectionNode` và `LessonNode`, giải phóng không gian giúp tiêu đề và thông tin bài học hiển thị thoáng đãng, không bị ép dòng sớm.
  - Kiểm tra chất lượng:
    - TypeScript: `pnpm --filter frontend exec tsc --noEmit` -> 100% clean (0 errors).
    - ESLint: `pnpm --filter frontend lint` -> 100% clean (0 errors, 0 warnings).
    - Frontend Tests: `pnpm --filter frontend test` -> 100% pass (31/31 passed).
- **Milestone 30 (Unified Course Media Preview Card - Hợp Nhất Media 16:9 & State Machine)**:
  - Tái cấu trúc component `CourseMediaPreview` từ bố cục 2 cột (Thumbnail riêng, Trailer riêng) thành **một khối Card duy nhất** với khung hiển thị 16:9 thích ứng thông minh theo 4 trạng thái dữ liệu (State Machine), đi kèm 2 nút bấm độc lập ở chân thẻ (`Tải/Thay ảnh bìa` và `Tải/Thay trailer`).
  - Triển khai State Machine 4 trạng thái:
    - 1. *Chưa có gì (Empty State):* Khung nét đứt 16:9 (`w-full max-w-4xl mx-auto aspect-video`), icon đôi camera & film, click vùng trống ưu tiên kích hoạt chọn Ảnh bìa; 2 nút `[+ Tải lên ảnh bìa]` và `[+ Tải lên trailer]`.
    - 2. *Chỉ có Ảnh:* Hiển thị ảnh tĩnh sắc nét, click mở Lightbox Modal phóng to ảnh, huy hiệu `[🏷️ Ảnh bìa khóa học]`; nút `[📷 Thay ảnh bìa]` và `[+ Tải lên trailer]`.
    - 3. *Chỉ có Trailer:* Khung video lấy frame đầu làm bìa (`preload="metadata"`), nút Play tròn ở tâm, click mở Video Modal Dialog, huy hiệu `[🎬 Video trailer (Chưa có ảnh bìa)]`; nút `[+ Tải lên ảnh bìa]` và `[🎬 Thay trailer]`.
    - 4. *Có cả 2 (Chuẩn nhất):* Video player dùng Thumbnail làm poster (sắc nét 100%), nút Play tròn ở tâm, click mở Video Modal Dialog, cả 2 huy hiệu ở 2 góc; nút `[📷 Thay ảnh bìa]` và `[🎬 Thay trailer]`.
  - Cơ chế Reactive Poster: Đang có trailer mà upload ảnh bìa mới thì poster video lập tức đổi sang ảnh mới thông qua React remount key (`trailerPreviewKey = \`trailer_card_${activeTrailer}_${activePoster}\``) mà không cần upload lại video.
  - Tối ưu hóa thẩm mỹ: Khung 16:9 giới hạn `max-w-4xl mx-auto` không bị kéo dãn quá cao trên desktop lớn; Dark Overlay nhẹ nhàng `bg-black/[0.07] hover:bg-black/[0.14]`, nút Play tròn glassmorphism tinh tế ở tâm; thanh tiến trình upload MinIO hiển thị mượt mà.
  - Kiểm tra chất lượng:
    - TypeScript: `pnpm --filter frontend exec tsc --noEmit` -> 100% clean (0 errors).
    - Tuân thủ nghiêm ngặt Purple Ban (0 mã màu tím), không sử dụng inline font classes, không dùng kiểu `any`.
- **Milestone 31 (Inline Trailer Video Playback at 16:9 Frame & Complete Modal Dialog Elimination)**:
  - Thay thế trải nghiệm mở Video Modal Dialog khi nhấp phát trailer bằng Inline Video Playback trực tiếp tại khung hình 16:9 của `CourseMediaPreview`.
  - Cơ chế điều khiển Inline:
    - Khởi chạy video trực tiếp (`videoRef.current?.play()`) và bật thanh điều khiển trình duyệt mặc định (`controls = true`, `autoPlay = true`).
    - Tự động ẩn hoàn toàn nút Play tròn ở tâm và các badge góc dưới (`[🏷️ Ảnh bìa (Poster)]`, `[🎬 Video trailer]`) khi đang phát, giúp giao diện xem video trọn vẹn và không che khuất thanh tua/âm lượng.
    - Quản lý trạng thái thông minh không gây cascading renders (`prevThumbnail` & `prevTrailer` pattern): Tự động reset `isPlayingInline = false`, tạm dừng phát video (`pause()`) ngay khi giảng viên thay đổi ảnh bìa hoặc trailer mới, đảm bảo video trailer tuyệt đối KHÔNG tự động phát khi người dùng chọn thumbnail mới mà hiển thị đúng poster tĩnh cùng nút Play.
  - Loại bỏ Modal Dialog:
    - Gỡ bỏ hoàn toàn Video Modal Dialog và Lightbox Modal phóng to ảnh bìa.
    - Dọn dẹp các component `<Dialog>` và state liên quan, giảm hơn 80 dòng mã dư thừa.
    - Trạng thái chỉ có ảnh hiển thị sạch sẽ, trang nhã, không còn overlay "Nhấn để xem ảnh phóng to".
  - Kiểm tra chất lượng:
    - TypeScript: `pnpm --filter frontend exec tsc --noEmit` -> 100% clean (0 errors).
    - ESLint: `pnpm --filter frontend lint` -> 100% clean (0 errors, 0 warnings).
    - Tuân thủ nghiêm ngặt Purple Ban (0 mã màu tím), không sử dụng inline font classes, không dùng kiểu `any`.
- **Milestone 32 (Tối Ưu Hóa Animation Thu Gọn & Mở Rộng Mindmap Xuống Thang Điểm 8/10 Mượt Mà)**:
  - Vấn đề: Khi người dùng nhấp vào huy hiệu `+Count` hoặc nút `−` để đóng/mở nhánh, các node con xuất hiện/biến mất và các node anh em nhảy tọa độ tức thời (tốc độ 10/10), gây cảm giác giật cục và mắt người khó theo dõi sự dịch chuyển của các nhánh sơ đồ.
  - Giải pháp & Kiến trúc:
    - Xây dựng tiện ích `mindmap-animation.util.ts`:
      - Triển khai thuật toán Frame-by-frame Tweening qua `requestAnimationFrame` kết hợp hàm gia tốc `easeOutCubic(progress) = 1 - (1 - progress)^3`.
      - Điều chỉnh tốc độ từ 10/10 (tức thì 0ms) xuống đúng mức **8/10** (chu kỳ **400ms** mượt mà, thanh thoát).
      - Xử lý mở rộng (Expand): Các node con mới xuất phát từ vị trí node cha và nở dần sang tọa độ mục tiêu đồng thời tăng độ hiển thị từ `0 -> 1` (fade in).
      - Xử lý thu gọn (Collapse): Các node con trượt nhẹ về phía node cha và giảm độ hiển thị từ `1 -> 0` (fade out) trước khi được gỡ bỏ hoàn toàn khỏi DOM.
      - Xử lý dịch chuyển (Glide): Các node anh em (sibling branches) trượt êm ái về vị trí Dagre layout mới, các đường cong Cubic Bézier tự động uốn lượn bám sát tọa độ node liên tục trong từng frame.
      - Chống ngắt quãng (Interrupt-safe): Hỗ trợ hủy và chuyển hướng mượt mà nếu người dùng click liên tục nhiều nhánh.
    - Cập nhật `CollapseCountBadge` (`nodes/collapse-count-badge.tsx`):
      - Nâng thời lượng chuyển đổi trạng thái nút bấm từ `duration-150` lên `duration-300` với hiệu ứng xoay và fade icon êm dịu.
    - Tích hợp `animateToLayout` vào `course-mindmap-view.tsx` cho toàn bộ các thao tác đóng/mở nhánh, căn chỉnh lại (`handleRelayout`), và làm mới cây (`handleSyncFromCurriculum`).
    - Tuân thủ quy tắc React 19 / ESLint compiler: đồng bộ `nodesRef` và `edgesRef` bên trong `useEffect`, không truy cập gán ref trực tiếp trong quá trình render.
    - Tinh chỉnh tốc độ lên thang điểm **9.5/10 (220ms)**: Đáp ứng yêu cầu thao tác cực kỳ nhanh, dứt khoát, phản hồi tức thời nhưng vẫn giữ trọn hiệu ứng tweening mượt mà, không bị giật cục. Đồng thời rút ngắn transition nút `CollapseCountBadge` về `duration-200`.
- **Milestone 33 (Khắc Phục Triệt Để Hiện Tượng Các Bài Học Anh Em Tác Động Qua Lại Lẫn Nhau Khi Đóng/Mở)**:
  - Vấn đề: Tại Chương 1, khi người dùng bấm mở/thu gọn bài "con cá đi câu", các ý con của bài "con meo di hia" (đang mở) tự nhiên cũng bị chớp tắt, nhảy vị trí hoặc bị animation ảnh hưởng như thể đang bị tác động chung.
  - Root Cause (Nguyên nhân gốc rễ):
    1. *Unstable Keypoint Node IDs:* Trong `convertCurriculumToFlowElements`, ID của node ý chính được đặt là `kp-${lesson.id}-${kp.id || kpIdx}`. Khi `deserializeKeyPoints(lesson.description)` chạy trên các mô tả bài học dạng mảng string hoặc plaintext, hàm fallback gọi `generateKeyPointId()` sinh chuỗi ngẫu nhiên UUID v4 mới trên mỗi lần giải mã.
    2. *Xung đột Tweening Animation:* Khi người dùng nhấp mở bài "con cá đi câu", toàn bộ cây được chuyển đổi lại. Bài "con meo di hia" bị sinh lại tập hợp UUID mới $\rightarrow$ React Flow coi toàn bộ các node ý con cũ của "con meo di hia" là đã bị xóa (`closingNodes`) và các node mang UUID mới là vừa được tạo (`animatingTargetNodes`). Do đó, các ý con của "con meo di hia" đồng thời chạy animation lướt về rồi nở ra, gây hiện tượng chớp tắt và giật hình dù người dùng chỉ click bài bên dưới.
  - Giải pháp khắc phục:
    1. Chuẩn hóa ID cố định trong `mindmap-converter.util.ts`: Đổi ID thành `const kpNodeId = \`kp-${lesson.id}-${kpIdx}\``. ID này 100% deterministic, bất biến và duy nhất theo cặp `(lesson.id, index)`, không bao giờ bị thay đổi ngẫu nhiên giữa các lần render.
    2. Chuẩn hóa Fallback ID trong `lesson-key-points.util.ts`: Hàm `deserializeKeyPoints` sử dụng fallback `kp-${index}` thay vì sinh UUID ngẫu nhiên khi parse dữ liệu văn bản.
    3. Kết quả: Khi click đóng/mở bài "con cá đi câu", toàn bộ node và edge của bài "con meo di hia" giữ nguyên ID ổn định, không bị kích hoạt animation đóng/mở sai, chỉ trượt nhẹ theo trục Y tự nhiên của Dagre layout mà không ảnh hưởng lẫn nhau.
  - Kiểm tra chất lượng:
- **Milestone 34 (Modal Chỉnh Sửa Chương Học, Endpoint PATCH Section & Cơ Chế Snapshot "Lưu Sơ Đồ" Mindmap)**:
  - Yêu cầu & Bối cảnh:
    1. Cập nhật tiêu đề và mô tả của chương học trực tiếp từ Modal `EditSectionDialog` trên trang chi tiết khóa học. Tên mới phải phản ánh ngay lập tức lên danh sách/cây chương và bảng Inspector mà không cần reload trang.
    2. Quy tắc cốt lõi (Golden Rule): Khi Thêm / Sửa / Xóa (Chương, Bài học, Ý chính), Backend chỉ tập trung ghi và cập nhật đúng bảng/collection nghiệp vụ tương ứng (`sections`, `lessons`, v.v.). Tuyệt đối KHÔNG can thiệp hay tự động sửa đổi bản ghi trong `course_mindmaps`.
    3. Cơ chế "Lưu sơ đồ": Chỉ khi Giảng viên bấm nút "Lưu sơ đồ" trên Canvas Mindmap, hệ thống mới trích xuất toàn bộ cấu trúc cây mới nhất của khóa học (Course $\rightarrow$ Sections $\rightarrow$ Lessons $\rightarrow$ Points), đóng gói thành bản snapshot JSON hoàn chỉnh, gửi request lên Backend ghi đè (UPSERT) bản ghi `course_mindmaps`, và canvas render lại dữ liệu mới nhất ở trạng thái thu gọn mặc định 2 cấp độ (Khóa học + Các chương).
  - Triển khai:
    - `share-lib`: Thêm interface `IUpdateSectionPayload` (hợp đồng dữ liệu chung giữa Backend và Frontend).
    - Backend:
      - Tạo DTO `UpdateSectionDto` (`backend/src/modules/course/dto/update-section.dto.ts`) với validation class-validator & class-transformer: whitespace trimming, `@IsOptional()`, `title` (1-200 chars), `description` (tối đa 1000 chars), `order` (min 0).
      - Bổ sung method `CourseService.updateSection(...)`: Kiểm tra khóa học tồn tại (chưa soft-delete), IDOR check (`course.instructorId === userId || role === ADMIN`), kiểm tra section tồn tại và thuộc khóa học, cập nhật thông qua `SectionRepository.update(...)`. Tuyệt đối không import hoặc gọi `CourseMindmapRepository`.
      - Bổ sung route `PATCH /api/v1/courses/:courseId/sections/:sectionId` trong `CourseController`, bảo vệ bằng `@Roles(INSTRUCTOR, ADMIN)` và `ParseObjectIdPipe` cho cả 2 params.
      - Unit Tests: Bổ sung bộ test cases toàn diện trong `course.service.spec.ts` (7 tests) và `course.controller.spec.ts` (5 tests) tuân thủ AAA pattern, 100% tests pass (104 tests cho 2 suite).
    - Frontend:
      - Bổ sung `courseApi.updateSection` và hook `useUpdateSectionMutation(courseId)` trong `frontend/src/features/course/api/course.api.ts`. Cập nhật tức thì dữ liệu trong cache thông qua `queryClient.setQueryData` và invalidate `courseKeys.sections(courseId)` để cây danh sách chương và bảng Inspector đổi tên ngay lập tức.
      - Nối `EditSectionDialog` với `useUpdateSectionMutation`, hiển thị spinner `isPending`, disable inputs khi đang lưu, thông báo toast kết quả.
    - Cập nhật logic `CourseMindmapView`: Tắt cơ chế tự sinh từ Cây giáo trình khi hiển thị. Canvas chỉ hiển thị đúng theo bản ghi trong bảng `course_mindmaps`:
      - Nếu chưa có bản ghi trong DB (`savedMindmapData === null`): Hiển thị màn hình thông báo Empty State *"Chưa có sơ đồ tư duy"* kèm nút *"Khởi tạo sơ đồ từ giáo trình"*.
      - Khi bấm *"Khởi tạo sơ đồ từ giáo trình"* hoặc *"Lưu sơ đồ"*: Trích xuất cấu trúc cây mới nhất (`rawData`), áp dụng thu gọn mặc định 2 cấp độ (`generateDefaultCollapsedIds`), tính toán layout Dagre LR (`getLayoutedElements`), đóng gói snapshot JSON và gọi `upsertMutation.mutateAsync` để ghi đè `course_mindmaps` trong DB.
      - Canvas khởi tạo `nodes`, `edges` và `collapsedIds` trực tiếp từ dữ liệu DB, đồng thời áp dụng pattern React Key (`key={`${courseId}_${savedData.updatedAt}}``) để remount mượt mà, loại bỏ hoàn toàn cảnh báo cascading `setState` trong `useEffect`.
  - Kiểm tra chất lượng:
    - `pnpm --filter share-lib build` -> 100% pass (code 0).
    - `pnpm --filter backend exec tsc --noEmit` -> 100% clean (0 errors).
    - Backend Unit Tests: 275/275 vitest tests pass 100% (19 test files).
    - Frontend Typecheck: `pnpm --filter frontend exec tsc --noEmit` -> 100% clean (0 errors).
    - Frontend Lint: `pnpm --filter frontend lint` -> 100% clean (0 errors, 0 warnings).
    - Tuân thủ nghiêm ngặt Purple Ban (0 mã màu tím), không sử dụng inline font classes, không dùng kiểu `any`.







