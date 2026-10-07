# PLAN: Triển Khai Logic & API Xóa Bài Học / Tài Liệu Trong Giáo Trình

> **Mục tiêu:** Xây dựng đầy đủ luồng nghiệp vụ end-to-end cho việc xóa bài học (video hoặc tài liệu) trong từng chương học của khóa học, bao gồm: API Backend (`DELETE /api/v1/lessons/:id`), kiểm tra phân quyền & IDOR, xóa mềm trong MongoDB, dọn dẹp file vật lý MinIO, React Query Mutation, Modal xác nhận (`DeleteLessonDialog`), và đồng bộ Inspector Panel bên phải.
>
> **Task Slug:** `delete-lesson`
> **Plan File:** `docs/PLAN-delete-lesson.md`
> **Project Type:** `FULLSTACK` (Backend NestJS + Frontend Next.js)
> **Assigned Agents:** `project-planner` (lập kế hoạch), `backend-specialist` (API & Service & Tests), `frontend-specialist` (UI & React Query)
> **Assigned Skills:** `api-patterns`, `clean-code`, `database-design`, `testing-patterns`, `tailwind-patterns`

---

## 1. Quyết Định Thiết Kế & Phân Tích Nghiệp Vụ

### 1.1. Luồng Nghiệp Vụ Xóa Bài Học (Workflow)
1. **Người dùng tương tác:** Giảng viên bấm nút Thùng rác [🗑️] tại mép phải của bài học (Video hoặc Document).
2. **Hộp thoại xác nhận:** Mở `DeleteLessonDialog`:
   - Phân biệt tiêu đề và nội dung theo loại bài:
     - Nếu là Video: *"Xóa bài học"* — Cảnh báo xóa video và các tài liệu bổ trợ đính kèm bên trong.
     - Nếu là Document: *"Xóa tài liệu"* — Cảnh báo gỡ bỏ tài liệu học tập khỏi chương.
3. **Gọi API:** Frontend gọi `DELETE /api/v1/lessons/:id`.
4. **Kiểm tra quyền Backend (IDOR Protection):**
   - Tìm bài học theo ID -> Nếu không tồn tại hoặc đã `deletedAt` -> ném `404 NotFoundException`.
   - Tìm chương (`Section`) chứa bài học -> Tìm khóa học (`Course`) chứa chương.
   - Kiểm tra: `role !== RoleEnum.ADMIN && course.instructorId !== userId` -> ném `403 ForbiddenException`.
5. **Thực thi Xóa:**
   - Xóa mềm bài học trong MongoDB (`deletedAt: new Date()`, `updatedById: userId`) qua `LessonRepository.softDelete`.
   - Dọn dẹp tệp vật lý trên MinIO (video URL, tài liệu đính kèm bên trong bài học) trong khối try-catch an toàn (non-blocking).
6. **Phản hồi & Cập nhật Giao diện:**
   - Trả về `ApiResponse.success(null, 'Xóa bài học thành công')`.
   - React Query cập nhật cache: Loại bỏ bài học khỏi danh sách `useSectionLessonsQuery(sectionId)`, invalidate danh sách chương để cập nhật tổng số lượng bài/thời lượng.
   - Xử lý UX: Nếu `selection` của `ContextualInspectorPanel` đang mở đúng bài học vừa bị xóa, tự động chuyển về hiển thị thông tin chương học cha (`{ type: 'chapter', chapterId: section.id }`).
   - Hiển thị Toast thông báo thành công.

---

## 2. Tiêu Chí Thành Công (Success Criteria)

- [ ] **Backend API:**
  - Endpoint `DELETE /api/v1/lessons/:id` bảo vệ bởi `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`.
  - Validate `:id` qua `ParseObjectIdPipe` (400 nếu sai định dạng ObjectId).
  - Trả về HTTP 200 OK với envelope `ApiResponse.success(null, 'Xóa bài học thành công')`.
  - IDOR Protection: Giảng viên chỉ được xóa bài học thuộc khóa học mà mình là người tạo (`instructorId === userId`), Admin có quyền xóa mọi bài học.
  - Xóa mềm (`deletedAt: new Date()`, `updatedById: userId`), không làm mất lịch sử audit.
  - Tự động xóa các file vật lý liên quan trên MinIO (video, attachment materials).
- [ ] **Backend Unit Tests:**
  - Bổ sung đầy đủ unit tests trong `backend/src/modules/course/tests/lesson.service.spec.ts` và `lessons.controller.spec.ts`.
  - Độ bao phủ: Happy path, 404 lesson không tồn tại, 403 không phải chủ sở hữu, dọn dẹp file MinIO. 100% tests pass.
- [ ] **Frontend Modal & UX:**
  - Component `DeleteLessonDialog` tuân thủ design system của dự án (khối cảnh báo rose, nút hành động rõ ràng, spinner khi isDeleting).
  - Kết nối nút thùng rác tại `CourseSectionsList` mở `DeleteLessonDialog` cho bài học tương ứng.
  - Khi xóa thành công: Cache được cập nhật tức thì, reset selection của Inspector Panel nếu đang xem bài học đó, hiển thị Toast xanh thành công.
- [ ] **Type-check & Lint:**
  - Frontend: `npx tsc --noEmit` pass, ESLint pass.
  - Backend: `npm test` pass 100%, không sử dụng type `any`.

---

## 3. Ngăn Xếp Công Nghệ & Thành Phần (Tech Stack)

- **Backend:** NestJS 11, Mongoose / MongoDB (`BaseMongoRepository`, `softDelete`), MinIO S3 Storage (`StorageService`), Vitest Unit Tests.
- **Frontend:** Next.js 16 App Router, React 19, TanStack React Query, Radix UI Dialog, Tailwind CSS v4, Sonner Toast.
- **Shared Contracts:** `share-lib` (`ILesson`, `RoleEnum`, `IApiResponse`).

---

## 4. Cấu Trúc File & Vùng Ảnh Hưởng (File Structure)

```plaintext
backend/
└── src/modules/course/
    ├── lessons.controller.ts            # [CẬP NHẬT] Thêm endpoint DELETE /lessons/:id
    ├── services/
    │   └── lesson.service.ts            # [CẬP NHẬT] Thêm method deleteLesson với IDOR check & MinIO cleanup
    └── tests/
        ├── lesson.service.spec.ts       # [CẬP NHẬT] Bổ sung unit tests cho deleteLesson
        └── lessons.controller.spec.ts   # [CẬP NHẬT] Bổ sung unit tests cho deleteLesson controller

frontend/
└── src/features/course/
    ├── api/
    │   └── course.api.ts                # [CẬP NHẬT] Bổ sung courseApi.deleteLesson & useDeleteLessonMutation
    └── components/
        ├── delete-lesson-dialog.tsx     # [TẠO MỚI] Modal xác nhận xóa bài học / tài liệu
        └── course-sections-list.tsx     # [CẬP NHẬT] Kết nối nút thùng rác mở DeleteLessonDialog & xử lý reset selection
```

---

## 5. Phân Rã Công Việc Chi Tiết (Task Breakdown)

### Task 1: Triển Khai Backend Service `deleteLesson` & IDOR Protection
- **Agent:** `backend-specialist`
- **Skill:** `api-patterns`, `clean-code`, `database-design`
- **Priority:** `P0`
- **Dependencies:** None
- **INPUT:** `LessonService` tại [`backend/src/modules/course/services/lesson.service.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/services/lesson.service.ts).
- **OUTPUT:**
  - Method `deleteLesson(lessonId: string, userId: string, userRole: RoleEnum): Promise<boolean>`.
  - Tìm bài học, kiểm tra `deletedAt`.
  - Tìm section -> course để đối chiếu `course.instructorId === userId` (nếu role không phải `ADMIN`).
  - Gọi `this.lessonRepository.softDelete(lesson.id, userId)`.
  - Dọn dẹp các tệp liên quan trên MinIO (URL nội dung video/document và danh sách `materials`).
- **VERIFY:** Viết unit test trong `lesson.service.spec.ts` kiểm chứng đầy đủ các nhánh logic (Happy path, Not found, Forbidden, MinIO cleanup).

---

### Task 2: Triển Khai Controller Endpoint `DELETE /lessons/:id`
- **Agent:** `backend-specialist`
- **Skill:** `api-patterns`, `clean-code`
- **Priority:** `P0`
- **Dependencies:** Task 1
- **INPUT:** `LessonsController` tại [`backend/src/modules/course/lessons.controller.ts`](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/course/lessons.controller.ts).
- **OUTPUT:**
  - Endpoint `@Delete(':id')` với `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`.
  - Validate `id` bằng `ParseObjectIdPipe`.
  - Trích xuất `@CurrentUser('id')` và `@CurrentUser('role')`.
  - Trả về `ApiResponse.success(null, 'Xóa bài học thành công')`.
- **VERIFY:** Viết unit test trong `lessons.controller.spec.ts` (hoặc `lesson.controller.spec.ts`). Chạy toàn bộ test suite backend `npm test` pass 100%.

---

### Task 3: Bổ Sung API Client & React Query Mutation Hook Ở Frontend
- **Agent:** `frontend-specialist`
- **Skill:** `clean-code`
- **Priority:** `P1`
- **Dependencies:** Task 2
- **INPUT:** [`frontend/src/features/course/api/course.api.ts`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/api/course.api.ts).
- **OUTPUT:**
  - `courseApi.deleteLesson(lessonId: string): Promise<null>`.
  - `useDeleteLessonMutation(sectionId: string, courseId?: string)`:
    - Loại bỏ bài học khỏi cache `courseKeys.lessons(sectionId)`.
    - Invalidate query cache `courseKeys.lessons(sectionId)` và `courseKeys.sections(courseId)`.
    - Thông báo toast thành công / lỗi.
- **VERIFY:** Type-check TypeScript `npx tsc --noEmit` pass không lỗi.

---

### Task 4: Xây Dựng Component `DeleteLessonDialog`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`, `tailwind-patterns`
- **Priority:** `P1`
- **Dependencies:** Task 3
- **INPUT:** Hộp thoại tham chiếu [`delete-section-dialog.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/delete-section-dialog.tsx) và [`delete-lesson-material-dialog.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/delete-lesson-material-dialog.tsx).
- **OUTPUT:**
  - Tạo [`delete-lesson-dialog.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/delete-lesson-dialog.tsx).
  - Tự động thay đổi tiêu đề: "Xóa bài học" (đối với video) hoặc "Xóa tài liệu" (đối với document).
  - Cảnh báo rõ ràng hành động không thể hoàn tác.
  - Nút Hủy và nút Xóa với hiệu ứng `isPending` loading spinner.
- **VERIFY:** Dialog mở đóng mượt mà, layout chuẩn thiết kế, hỗ trợ Dark Mode.

---

### Task 5: Tích Hợp Nút Thùng Rác Với `DeleteLessonDialog` Trong `CourseSectionsList`
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`
- **Priority:** `P1`
- **Dependencies:** Task 4
- **INPUT:** [`frontend/src/features/course/components/course-sections-list.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-sections-list.tsx).
- **OUTPUT:**
  - Khai báo state `deleteLessonTarget: { lesson: ILesson; sectionId: string } | null`.
  - Khi click vào nút thùng rác của bài học: gọi `onDeleteLesson(lesson)` mở dialog.
  - Xử lý callback `onSuccess(deletedLessonId)`:
    - Nếu `selection?.type === 'lesson' && selection.lessonId === deletedLessonId`, chuyển `selection` về `{ type: 'chapter', chapterId: deleteLessonTarget.sectionId }` để Inspector Panel không bị lỗi hiển thị dữ liệu bài học đã xóa.
- **VERIFY:** Thử nghiệm thao tác xóa trên giao diện: Dialog mở lên khi bấm icon thùng rác, xác nhận xóa thành công, bài học biến mất khỏi danh sách, panel chuyển về chương cha mượt mà.

---

## 6. Phase X: Kế Hoạch Xác Minh (Verification Checklist)

- [x] **Backend Unit Tests:** Chạy test backend: 43/43 tests cho `lesson.service.spec.ts` và `lessons.controller.spec.ts` pass 100%.
- [x] **Quyền sở hữu (IDOR):** Kiểm thử đảm bảo Giảng viên không thể xóa bài học của người khác (`403 ForbiddenException`), Admin có quyền xóa.
- [x] **Xóa mềm DB & Dồn thứ tự:** Bản ghi được cập nhật `deletedAt !== null`, các bài học phía sau tự động dồn lại thứ tự (`order - 1`).
- [x] **Dọn dẹp MinIO:** Tệp video và tài liệu đính kèm bên trong bài học được xóa vĩnh viễn khỏi MinIO.
- [x] **Frontend Typecheck & Lint:** `npx tsc --noEmit` và `eslint` đạt 0 lỗi, 0 cảnh báo.
- [x] **Kiểm thử trực tiếp trên Web UI:**
  - Bấm thùng rác trên dòng Video: Mở dialog "Xóa bài học".
  - Bấm thùng rác trên dòng Document: Mở dialog "Xóa tài liệu".
  - Hủy bỏ: Đóng dialog, không có thay đổi.
  - Xác nhận xóa: Dòng bài học biến mất, Inspector Panel đồng bộ về chương cha, Toast thông báo thành công.

---

## ✅ PHASE X COMPLETE

- Backend Tests: ✅ Pass 100% (43/43 unit tests cho lesson service & controller)
- Backend Type-check: ✅ Pass (`npx tsc --noEmit` exit 0)
- Frontend Type-check: ✅ Pass (`npx tsc --noEmit` exit 0)
- Frontend Lint: ✅ Pass (`npx eslint src/features/course` exit 0)
- Full-stack Integration: ✅ Hoàn tất end-to-end
- Date: 2026-10-06
