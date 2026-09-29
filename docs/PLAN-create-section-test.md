# PLAN: Integration & E2E Test Cho API Tạo Section (`POST /courses/:courseId/sections`)

> **Mục tiêu:**
> 1. Thiết lập và xác nhận luồng kiểm thử tích hợp (Integration/E2E Test) cho API `POST /api/v1/courses/:courseId/sections`.
> 2. Đảm bảo request đi xuyên suốt các tầng kiến trúc: `CourseController` → `CourseService` → `SectionRepository` → MongoDB Collection `sections`.
> 3. Tái sử dụng 100% hạ tầng test hiện có (`vitest`, `supertest`, `AppModule`, isolated test database, `AuthTokenService`), không phát sinh cơ chế test database mới.
> 4. Kiểm thử Happy Path (HTTP 201) và 2 case phân quyền/lỗi (HTTP 403, HTTP 404).
> 5. Query trực tiếp MongoDB để xác nhận tính toàn vẹn dữ liệu (persistence) và audit fields.
>
> **Task Slug:** `create-section-test`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`, `security-auditor`  
> **Project Type:** `BACKEND`

---

## 1. Khảo Sát Hiện Trạng & Ràng Buộc Hạ Tầng Test (Context Check)

### 1.1. Hạ Tầng Test Database Hiện Có
- **Framework kiểm thử:** `vitest` phiên bản `^4.1.2`, cấu hình tại `backend/vitest.config.ts` (`include: ['**/*.spec.ts']`).
- **HTTP Integration Testing:** `supertest` kết hợp `@nestjs/testing` (`Test.createTestingModule({ imports: [AppModule] })`).
- **MongoDB Connection:** 
  - Khởi tạo thông qua NestJS `AppModule` kết nối tới MongoDB với database name cấu hình động qua biến môi trường `process.env.MONGODB_DB_NAME = 'thc_datn_create_section_e2e_test'`.
  - Tái sử dụng `connection = app.get<Connection>(getConnectionToken())` để thao tác trực tiếp trên MongoDB native driver collections (`users`, `courses`, `sections`, `sessions`).
- **Isolation & Cleanup:**
  - `beforeEach`: Dọn sạch các collections `sections`, `courses`, `users`, `sessions` bằng `deleteMany({})`.
  - `afterAll`: Gọi `connection.dropDatabase()` và `app.close()` để không để lại bất kỳ dữ liệu rác nào trong database.

### 1.2. Hạ Tầng Authentication & Authorization
- Hệ thống áp dụng `JwtAuthGuard` và `RolesGuard` toàn cục qua `APP_GUARD`.
- Tái sử dụng `AuthTokenService` lấy từ `app.get(AuthTokenService)` để sinh Bearer Access Token chuẩn:
  - Sinh token với đầy đủ claims: `sub`, `email`, `role: RoleEnum.INSTRUCTOR`.
  - Đính kèm header `Authorization: Bearer <accessToken>` trong mỗi request HTTP của `supertest`.

### 1.3. Pipeline Toàn Cục Cần Mirror
- Khớp 100% cấu hình production từ `backend/src/main.ts`:
  - `app.setGlobalPrefix('api/v1')`
  - `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`
  - `app.useGlobalInterceptors(new AuditContextInterceptor(clsService), new TransformInterceptor())`

---

## 2. Tiêu Chí Thành Công & Kịch Bản Kiểm Thử (Success Criteria)

### 2.1. Test Case 1: Happy Path (HTTP 201 Created)
- **Given:**
  - User Giảng viên (`RoleEnum.INSTRUCTOR`, `status: ACTIVE`) tồn tại trong collection `users`.
  - Giảng viên được cấp JWT access token hợp lệ qua `AuthTokenService`.
  - Khóa học hợp lệ tồn tại trong collection `courses` do chính giảng viên đó sở hữu (`instructorId === instructorMongoId`).
- **When:**
  - Gửi request `POST /api/v1/courses/:courseId/sections` kèm Bearer token và body:
    ```json
    {
      "title": "Java Core",
      "description": "Các kiến thức nền tảng về Java",
      "order": 0
    }
    ```
- **Then:**
  - HTTP Status: `201 Created`.
  - Response Body: Wrapped trong envelope chuẩn `ApiResponse`, `success: true`.
  - Data Response:
    - `title === "Java Core"`, `description === "Các kiến thức nền tảng về Java"`, `order === 0`.
    - `courseId === courseId`.
    - `id` là chuỗi 24 hex characters hợp lệ của MongoDB ObjectId (không phải stub ID).
    - `createdById === instructorId` và `updatedById === instructorId`.
    - `createdAt` và `updatedAt` tồn tại.
  - **Direct MongoDB Verification:**
    - Truy vấn trực tiếp `connection.collection('sections').findOne({ _id: new Types.ObjectId(sectionData.id) })`.
    - Xác nhận document tồn tại thật trong MongoDB, `_id`, `courseId`, `title`, `description`, `order`, `createdById`, `updatedById` khớp 100%, `deletedAt === null`, `createdAt` và `updatedAt` là kiểu `Date`.

### 2.2. Test Case 2: Authorization Violation (HTTP 403 Forbidden)
- **Given:**
  - Khóa học thuộc quyền sở hữu của Giảng viên A (`owner`).
  - Request được gửi bởi Giảng viên B (`stranger`) với access token của B.
- **When:**
  - Giảng viên B gửi `POST /api/v1/courses/:courseId/sections`.
- **Then:**
  - HTTP Status: `403 Forbidden`.
  - Kiểm tra MongoDB: `connection.collection('sections').countDocuments() === 0` (không có bản ghi nào bị ghi vào DB).

### 2.3. Test Case 3: Course Not Found (HTTP 404 Not Found)
- **Given:**
  - Giảng viên có token hợp lệ.
  - `courseId` là một ObjectId ngẫu nhiên không hề tồn tại trong collection `courses`.
- **When:**
  - Giảng viên gửi `POST /api/v1/courses/:nonExistentCourseId/sections`.
- **Then:**
  - HTTP Status: `404 Not Found`.
  - Kiểm tra MongoDB: `connection.collection('sections').countDocuments() === 0`.

---

## 3. Cấu Trúc File & Vị Trí Triển Khai

```text
backend/
├── src/
│   └── modules/
│       └── course/
│           ├── controllers/
│           │   └── course.controller.ts (Xử lý route POST :courseId/sections)
│           ├── services/
│           │   └── course.service.ts (Xử lý logic xác thực khóa học & gọi repository)
│           ├── repositories/
│           │   └── section.repository.ts (Tương tác MongoDB Mongoose model)
│           └── tests/
│               └── create-section.integration.spec.ts (File E2E/Integration test chính)
```

---

## 4. Phân Công Tác Vụ Chi Tiết (Task Breakdown)

| Task ID | Tên Nhiệm Vụ | Agent Phụ Trách | Skill | Input → Output → Verification |
| :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | Thiết lập hạ tầng test & context isolation | `backend-specialist` | `testing-patterns` | **IN**: `AppModule`, isolated DB name<br>**OUT**: Khối `beforeAll`, `afterAll`, `beforeEach` trong spec<br>**VERIFY**: Setup và dọn dẹp DB tự động không gây xung đột |
| **TASK-02** | Xây dựng Happy Path E2E Test Case | `backend-specialist` | `clean-code` | **IN**: Seed user, course, JWT token, payload chuẩn<br>**OUT**: Test case Happy Path gửi request qua `supertest`<br>**VERIFY**: HTTP 201, dữ liệu response đúng, query collection `sections` xác thực persistence |
| **TASK-03** | Xây dựng Negative Test Cases (403 & 404) | `security-auditor` | `testing-patterns` | **IN**: Stranger instructor token, non-existent courseId<br>**OUT**: 2 test cases kiểm tra mã lỗi và zero DB side-effects<br>**VERIFY**: HTTP 403, HTTP 404, `countDocuments() === 0` |
| **TASK-04** | Kiểm định toàn bộ test suite và Typecheck | `project-planner` | `clean-code` | **IN**: Mã nguồn backend<br>**OUT**: Báo cáo kết quả kiểm thử và biên dịch TypeScript<br>**VERIFY**: `pnpm --filter backend test` & `tsc --noEmit` pass 100% |

---

## 5. Ranh Giới Kỹ Thuật (Out of Scope)
- ❌ Không mở rộng sang các endpoint `GET /sections`, `PATCH`, `DELETE`, hoặc `reorder`.
- ❌ Không test logic liên quan tới `Lesson`.
- ❌ Không test nghiệp vụ chống trùng lặp thứ tự (`duplicate order`).
- ❌ Không sửa đổi bất kỳ logic sản xuất nào trừ khi phát hiện lỗi thực sự trong luồng xử lý.

---

## 6. Kế Hoạch Nghiệm Thu & Kiểm Thử (Phase X: Verification)

- [x] **File Test Location:** `backend/src/modules/course/tests/create-section.integration.spec.ts`
- [x] **Test Database & Auth Reuse:** Tái sử dụng `thc_datn_create_section_e2e_test`, `getConnectionToken()`, `AuthTokenService.generateTokens()`.
- [x] **Happy Path Verification:** HTTP 201, envelope `ApiResponse`, real ObjectId, audit fields `createdById`/`updatedById`, timestamps.
- [x] **MongoDB Direct Query:** Xác nhận document lưu thành công trong collection `sections`.
- [x] **Authorization Verification:** HTTP 403 khi instructor không sở hữu course, HTTP 404 khi course không tồn tại, 0 document được tạo.
- [x] **Full Backend Regression Tests:** `pnpm --filter backend test` (17/17 files, 138/138 tests passed).
- [x] **Backend Typecheck:** `pnpm --filter backend exec npx tsc --noEmit` (0 errors, 0 warnings).

## ✅ PHASE X COMPLETE
- File test: `backend/src/modules/course/tests/create-section.integration.spec.ts`
- Test suite: ✅ 17/17 files passed (138/138 tests)
- Typecheck: ✅ 0 errors
- Production Code Changes: 0 lines (Flow Controller → Service → Repository đã hoàn hảo)
- Date: 2026-09-26
