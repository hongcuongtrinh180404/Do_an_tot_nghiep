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



