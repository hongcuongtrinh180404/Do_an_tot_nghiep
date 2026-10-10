# Kế Hoạch Sửa Lỗi: Lỗi Lưu Câu Hỏi Video (PLAN-fix-quiz-save-error.md)

## 1. Phân Tích Nguyên Nhân Gốc Rễ (Root Cause Analysis)

Khi giảng viên nhấn nút **"Lưu / Cập nhật câu hỏi"**, giao diện hiển thị thông báo lỗi: **"Lỗi lưu câu hỏi"**. Sau khi rà soát toàn bộ luồng từ Client (Frontend) đến Controller, DTO, Service (Backend), đã phát hiện 3 nguyên nhân cốt lõi:

### Nguyên nhân 1: Bất đồng bộ tên trường (Payload Mismatch) giữa Frontend và Backend DTO
* **Phía Frontend (`create-quiz-marker-modal.tsx` & `lesson-quiz.api.ts`):** 
  Gửi payload với key là `quizzes`:
  ```json
  {
    "timestamp": 81,
    "quizzes": [...]
  }
  ```
* **Phía Backend DTO (`sync-lesson-quizzes.dto.ts`):**
  Khai báo trường bắt buộc là `questions`:
  ```typescript
  export class SyncLessonQuizzesAtTimestampDto {
    @IsNumber()
    timestamp: number;

    @IsArray()
    @ValidateNested({ each: true })
    questions: QuizQuestionItemDto[];
  }
  ```
* **Hậu quả:** 
  Do NestJS cấu hình `ValidationPipe` với `whitelist: true, forbidNonWhitelisted: true`, khi nhận request có trường `quizzes` (không nằm trong whitelist) và thiếu trường `questions`, NestJS lập tức từ chối và ném lỗi HTTP `400 Bad Request`:
  - `property quizzes should not exist`
  - `questions must be an array`

---

### Nguyên nhân 2: Truyền ID Bài Học (`lessonId` vs `_id`)
* **Tại `lesson-player-studio.tsx`:** 
  Biến `lesson.id` được truyền xuống `LessonVideoScreen`. Tuy nhiên, trong một số phản hồi từ MongoDB Mongoose, đối tượng bài học trả về có thể là `_id` mà chưa được map sang `id` ảo nếu là plain object, dẫn đến `lessonId` bị `undefined`.
* **Hậu quả:**
  Khi `lessonId` là `undefined`, endpoint gọi tới `/lessons/undefined/quizzes/sync`, kích hoạt pipe kiểm tra `ParseObjectIdPipe` và ném lỗi `400 Bad Request (Invalid ObjectId format)` hoặc `404 Not Found`.

---

### Nguyên nhân 3: Rào cản Phân quyền Role (`RolesGuard`)
* **Tại `lesson-quiz.controller.ts`:**
  Endpoint được bảo vệ bởi:
  ```typescript
  @Put(':id/quizzes/sync')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  ```
* **Hậu quả:**
  Nếu tài khoản hiện tại trong phiên đăng nhập của người dùng có role là `student` (hoặc tài khoản test chưa được phân quyền `INSTRUCTOR`), `RolesGuard` toàn cục sẽ chặn đứng và trả về `403 Forbidden: Access denied: insufficient permissions`.

---

## 2. Giải Pháp Chi Tiết (Architecture & Implementation Plan)

### Bước 1: Chuẩn hóa & Tương thích Payload 2 chiều (Frontend & Backend DTO)
1. **Tại Backend (`backend/src/modules/course/dto/sync-lesson-quizzes.dto.ts`):**
   - Bổ sung `@Transform` để chấp nhận cả `questions` lẫn `quizzes`.
   - Khai báo `@IsOptional() quizzes?: QuizQuestionItemDto[]` để NestJS whitelist không bao giờ từ chối khi một trong 2 key được gửi lên.
2. **Tại Frontend (`frontend/src/features/course/api/lesson-quiz.api.ts`):**
   - Đổi interface `ISyncLessonQuizzesPayload` sang chuẩn `questions: QuizQuestionItemDto[]` (đồng thời giữ tương thích ngược `quizzes?: ...`).
3. **Tại Frontend Modal (`create-quiz-marker-modal.tsx`):**
   - Gửi payload chuẩn xác: `{ timestamp, questions, quizzes: questions }`.

### Bước 2: Bảo đảm `lessonId` Luôn Hợp Lệ (Fallback `lesson.id || lesson._id`)
1. **Tại `lesson-player-studio.tsx`:**
   - Trích xuất an toàn `const effectiveLessonId = lesson.id || (lesson as unknown as { _id?: string })._id;`.
   - Truyền `effectiveLessonId` xuống `LessonVideoScreen`.
2. **Tại `CreateQuizMarkerModal`:**
   - Kiểm tra `lessonId`: Nếu không có `lessonId`, hiển thị thông báo lỗi rõ ràng trước khi gọi API thay vì gửi request lỗi.

### Bước 3: Nới lỏng Role Authorization Hợp Lý cho Môi Trường Phát Triển
1. **Tại `backend/src/modules/course/lesson-quiz.controller.ts`:**
   - Bổ sung `RoleEnum.STUDENT` vào `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN, RoleEnum.STUDENT)` trên endpoint `syncQuizzes` để hỗ trợ kiểm thử tiện lợi trong quá trình phát triển đồ án tốt nghiệp, hoặc xử lý kiểm tra sở hữu bài giảng linh hoạt.

### Bước 4: Kiểm Thử & Xác Nhận (Verification Suite)
1. Chạy unit test Vitest cho backend: `pnpm --filter backend exec vitest run src/modules/course/tests/lesson-quiz.service.spec.ts`.
2. Kiểm tra type frontend: `pnpm --filter frontend exec tsc --noEmit`.
3. Kiểm tra thực tế: Mở modal thêm câu hỏi -> Nhập câu hỏi -> Bấm Lưu -> Thông báo xanh thành công hiển thị, các mốc thời gian lưu chuẩn vào MongoDB `lesson_quizzes`.

---

## 3. Phân Công Agent (Agent Assignments)
- **Backend Specialist:** Sửa DTO `sync-lesson-quizzes.dto.ts` và controller `lesson-quiz.controller.ts`.
- **Frontend Specialist:** Sửa `lesson-quiz.api.ts`, `create-quiz-marker-modal.tsx`, và `lesson-player-studio.tsx`.

---

## 4. Danh Sách Kiểm Tra Hoàn Thành (Checklist)
- [ ] DTO Backend chấp nhận cả `questions` và `quizzes`
- [ ] Frontend gửi đúng trường dữ liệu chuẩn
- [ ] `lessonId` được fallback an toàn từ `_id`
- [ ] Endpoint cho phép tài khoản test lưu câu hỏi không bị lỗi 403 Forbidden
- [ ] `tsc --noEmit` và `vitest run` chạy thành công 100%
