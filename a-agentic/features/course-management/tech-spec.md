# Course Management — Technical Specifications

> **Module:** Data Models, Schemas, DTOs, and REST API Endpoints for Course Management.

---

## 1. Mongoose Schema & Domain Models

### A. Course Schema (`courses`)
- `title`: string (required, trimmed, index)
- `slug`: string (unique index, auto-generated from title)
- `description`: string
- `thumbnailUrl`: string (optional, default: null, MinIO path: `courses/thumbnail/`)
- `trailerUrl`: string (optional, default: null, MinIO path: `courses/trailer/`)
- `price`: number (min: 0, default: 0)
- `instructorId`: Types.ObjectId (ref: `User`, required, index)
- `isPublished`: boolean (default: false, index)
- `status`: CourseStatusEnum (`draft`, `pending_approval`, `published`, `archived`)
- `approvalRequestedAt`: Date (optional, default: null)
- `rejectionReason`: string (optional, default: null, 10-500 chars)
- `reviewedAt`: Date (optional, default: null)
- `reviewedById`: Types.ObjectId (ref: `User`, optional, default: null)
- Inherits `BaseAbstractDocument` (`createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`).
- Compound Indexes: `{ status: 1, approvalRequestedAt: -1, deletedAt: 1 }`.

### B. Section Schema (`sections`)
- `courseId`: Types.ObjectId (ref: `CourseEntity`, required, index)
- `title`: string (required, trimmed)
- `description`: string (optional, default: null, trimmed)
- `order`: number (required, min: 0)
- Inherits `BaseAbstractDocument` (`createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`).
- Compound Index: `{ courseId: 1, deletedAt: 1, order: 1 }`.

### C. Lesson Schema (`lessons`)
- `courseId`: Types.ObjectId (ref: `Course`, required, index)
- `chapterId`: Types.ObjectId (ref: `Chapter`, required, index)
- `title`: string (required, trimmed)
- `orderIndex`: number (required, default: 0)
- `videoUrl`: string
- `durationSeconds`: number (default: 0)
- `isFreePreview`: boolean (default: false)
- `videoStatus`: Enum (`UPLOADED`, `QUEUED`, `PROCESSING`, `READY`, `FAILED`)
- `mindmapMarkdown`: string (AI generated markdown for Markmap)
- `inVideoQuizzes`: Array of Embedded Quiz Objects:
  - `timestamp`: number (in seconds)
  - `question`: string
  - `options`: string[]
  - `correctIndex`: number
  - `explanation`: string
- Inherits `BaseAbstractDocument`.

### D. Course Mindmap Schema (`course_mindmaps`)
- `courseId`: Types.ObjectId (ref: `CourseEntity`, required, unique partial index `{ courseId: 1, deletedAt: null }`)
- `mindmapData`: Record<string, unknown> (type `Mixed`, required - lưu trữ chuỗi JSON phân cấp Khóa học -> Chương -> Bài học -> Các ý cốt lõi cùng UI metadata)
- Inherits `BaseAbstractDocument` (`createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`).

### E. Learning Progress Schema (`learning_progress`)
- `userId`: Types.ObjectId (ref: `User`, required, index)
- `courseId`: Types.ObjectId (ref: `Course`, required, index)
- `watchedMs`: number (thời gian thực tế tích lũy tính bằng mili-giây, default: 0, min: 0)
- `lastLessonId`: Types.ObjectId | null (bài học xem dở gần nhất)
- `lastMediaUrl`: string | null (URL video bài học xem dở)
- `lastPositionSeconds`: number (vị trí dừng trong video tính bằng giây, default: 0)
- `sessionId`: string | null (UUID định danh phiên phát video hiện tại)
- `sessionLessonId`: Types.ObjectId | null (bài học của phiên hiện tại)
- `sessionMediaUrl`: string | null (URL media của phiên hiện tại)
- `sessionExpiresAt`: Date | null (thời điểm hết hạn lease phiên, mặc định `now + 45s`)
- `lastHeartbeatAt`: Date | null (thời điểm nhận heartbeat gần nhất)
- `sessionWatchedMs`: number (thời gian tích lũy riêng của phiên hiện tại)
- `lastSequence`: number (con trỏ sequence chống lặp / out-of-order)
- `sessionClosed`: boolean (đánh dấu phiên đã kết thúc chủ động)
- `revision`: number (số phiên bản optimistic concurrency control, tự động `$inc: 1`)
- Unique Compound Index: `{ userId: 1, courseId: 1 }`
- Inherits `BaseAbstractDocument` (`createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`).

---

## 2. API Endpoints

| Method | Endpoint | Description | Auth & Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/courses` | Danh sách khóa học có phân trang & lọc | Public |
| `GET` | `/api/v1/courses/admin` | Quản trị viên lấy danh sách khóa học kiểm duyệt (phân trang, search, status, category, instructor) | `ADMIN` |
| `GET` | `/api/v1/courses/my-courses` | Danh sách khóa học của giảng viên hiện tại (chưa xóa mềm) | `INSTRUCTOR`, `ADMIN` |
| `GET` | `/api/v1/courses/:slug` | Chi tiết khóa học và cấu trúc chương/bài | Public |
| `POST` | `/api/v1/courses` | Tạo khóa học mới | `INSTRUCTOR`, `ADMIN` |
| `POST` | `/api/v1/courses/:id/request-approval` | Giảng viên gửi yêu cầu duyệt khóa học (reset `rejectionReason: null`) | `INSTRUCTOR` (Owner), `ADMIN` |
| `POST` | `/api/v1/courses/:id/approve` | Quản trị viên duyệt xuất bản khóa học (`PENDING_APPROVAL` -> `PUBLISHED`) | `ADMIN` |
| `POST` | `/api/v1/courses/:id/reject` | Quản trị viên yêu cầu chỉnh sửa (`PENDING_APPROVAL` -> `DRAFT`, lưu `rejectionReason`) | `ADMIN` |
| `PATCH` | `/api/v1/courses/:id` | Cập nhật thông tin khóa học (chặn nếu `PENDING_APPROVAL`) | `INSTRUCTOR` (Owner), `ADMIN` |
| `POST` | `/api/v1/courses/:id/cancel-approval` | Giảng viên hủy/rút yêu cầu duyệt (`PENDING_APPROVAL` -> `DRAFT`) | `INSTRUCTOR` (Owner), `ADMIN` |
| `POST` | `/api/v1/courses/:id/withdraw-approval` | Alias của route hủy/rút yêu cầu duyệt | `INSTRUCTOR` (Owner), `ADMIN` |
| `POST` | `/api/v1/courses/:id/archive` | Ngừng bán khóa học (`PUBLISHED` -> `ARCHIVED`, giữ quyền học) | `INSTRUCTOR` (Owner), `ADMIN` |
| `POST` | `/api/v1/courses/:id/unarchive` | Mở bán lại khóa học (`ARCHIVED` -> `PUBLISHED`) | `INSTRUCTOR` (Owner), `ADMIN` |
| `DELETE` | `/api/v1/courses/:id` | Xóa khóa học (chặn nếu `PENDING_APPROVAL` hoặc `studentsCount > 0`, cascade soft-delete & MinIO cleanup) | `INSTRUCTOR` (Owner), `ADMIN` |
| `POST` | `/api/v1/courses/:id/chapters` | Thêm chương học mới (tự động gán thứ tự nếu không truyền order) | `INSTRUCTOR` (Owner), `ADMIN` |
| `PUT` | `/api/v1/courses/:id/sections/reorder` | Sắp xếp lại thứ tự các chương học hàng loạt bằng transaction | `INSTRUCTOR` (Owner), `ADMIN` |
| `GET` | `/api/v1/courses/:courseId/mindmap` | Lấy dữ liệu sơ đồ tư duy khóa học siêu tốc (không cần JOIN) | Public |
| `PUT` | `/api/v1/courses/:courseId/mindmap` | Upsert ghi đè toàn bộ dữ liệu Mindmap khóa học | `INSTRUCTOR` (Owner), `ADMIN` |
| `PATCH` | `/api/v1/courses/:courseId/thumbnail` | Upload ảnh bìa khóa học lên `courses/thumbnail/` | `INSTRUCTOR` (Owner), `ADMIN` |
| `PATCH` | `/api/v1/courses/:courseId/trailer` | Upload video trailer khóa học lên `courses/trailer/` | `INSTRUCTOR` (Owner), `ADMIN` |
| `POST` | `/api/v1/sections/:sectionId/lessons` | Thêm bài học mới vào section | `INSTRUCTOR` (Owner), `ADMIN` (Guarded by `LessonManagementGuard`) |
| `GET` | `/api/v1/sections/:sectionId/lessons` | Lấy danh sách bài học theo section | Public |
| `GET` | `/api/v1/lessons/:id` | Xem chi tiết bài học & content | Public (Tự giải mã token nếu có) |
| `POST` | `/api/v1/lessons/:id/materials` | Upload tài liệu bài giảng | `INSTRUCTOR` (Owner), `ADMIN` (`LessonManagementGuard`) |
| `DELETE` | `/api/v1/lessons/:id/materials/:materialId` | Xóa tài liệu bài giảng | `INSTRUCTOR` (Owner), `ADMIN` (`LessonManagementGuard`) |
| `DELETE` | `/api/v1/lessons/:id` | Xóa mềm bài học | `INSTRUCTOR` (Owner), `ADMIN` (`LessonManagementGuard`) |
| `POST` | `/api/v1/lessons/:id/transcript/retry` | Thử lại xử lý phiên âm video | `INSTRUCTOR` (Owner), `ADMIN` (`LessonManagementGuard`) |
| `GET` | `/api/v1/lessons/:id/quizzes` | Danh sách câu hỏi chính thức, sắp xếp theo timestamp, order và ID | Public |
| `POST` | `/api/v1/lessons/:id/quizzes` | Thêm một câu hỏi, không thay thế các câu cùng mốc | `INSTRUCTOR` (Owner), `ADMIN` (`LessonManagementGuard`) |
| `PUT` | `/api/v1/lessons/quizzes/:quizId` | Thay thế nội dung/mốc thời gian của một câu hỏi, giữ nguyên ID | `INSTRUCTOR` (Owner), `ADMIN` (`LessonManagementGuard`) |
| `PUT` | `/api/v1/lessons/:id/quizzes/sync` | Đồng bộ danh sách câu hỏi tại timestamp | `INSTRUCTOR` (Owner), `ADMIN` (`LessonManagementGuard`) |
| `PUT` | `/api/v1/lessons/:id/quizzes/move-merge` | Di chuyển/gộp cụm quiz sang mốc thời gian mới | `INSTRUCTOR` (Owner), `ADMIN` (`LessonManagementGuard`) |
| `DELETE` | `/api/v1/lessons/quizzes/:quizId` | Xóa một câu hỏi trắc nghiệm | `INSTRUCTOR` (Owner), `ADMIN` (`LessonManagementGuard`) |
| `DELETE` | `/api/v1/lessons/:id/quizzes/timestamp/:timestamp` | Xóa tất cả câu hỏi tại một timestamp | `INSTRUCTOR` (Owner), `ADMIN` (`LessonManagementGuard`) |
| `POST/PUT` | `/api/v1/lessons/:id/analysis/*` | Tạo/Cập nhật/Áp dụng Mindmap, Quiz, Summary AI | `INSTRUCTOR` (Owner), `ADMIN` (`LessonManagementGuard`) |
| `GET` | `/api/v1/learning-progress/my-courses` | Lấy danh sách tiến độ toàn bộ khóa học đã mua của học viên | `STUDENT`, `INSTRUCTOR`, `ADMIN` |
| `GET` | `/api/v1/learning-progress/courses/:courseId` | Lấy chi tiết tiến độ học tập khóa học cụ thể | `STUDENT`, `INSTRUCTOR`, `ADMIN` |
| `POST` | `/api/v1/learning-progress/courses/:courseId/sessions` | Bắt đầu phiên phát video bài học mới (Lease 45s, chặn multi-tab) | `STUDENT`, `INSTRUCTOR`, `ADMIN` |
| `POST` | `/api/v1/learning-progress/courses/:courseId/heartbeat` | Gửi nhịp tim định kỳ tích lũy thời gian xem thực tế | `STUDENT`, `INSTRUCTOR`, `ADMIN` |
| `POST` | `/api/v1/learning-progress/courses/:courseId/end` | Kết thúc phiên phát video, giải phóng lease ngay lập tức | `STUDENT`, `INSTRUCTOR`, `ADMIN` |

---

## 3. Frontend Components & Viewers (Milestone 26)

### Quản lý câu hỏi trắc nghiệm theo từng bài học

- `LessonQuizTab`: nút thêm câu hỏi thủ công, sửa/xóa từng câu, số câu thực tế và điều hướng đến mốc video; chỉ mở trong `canEditCourseContent`.
- `LessonQuizQuestionDialog`: dùng lại `DialogLayout`, `TimestampPickerInput`, React Hook Form/Controller và Zod; vùng form cuộn độc lập, footer lưu/hủy luôn hiển thị. Cảnh báo khi bỏ nội dung chưa lưu và giữ form khi API lỗi.
- `QuizQuestionFields`: nội dung, hình thức một/nhiều đáp án đúng, phương án trả lời và giải thích dùng chung cho dialog từng câu và `CreateQuizMarkerModal`.
- Payload dùng chung: `ISaveLessonQuizPayload` (`timestamp`, `question`, `questionType`, `options`, `explanation?`). `lessonId`, `id`, `order` và audit fields không nhận từ payload của thao tác từng câu.
- `SaveLessonQuizDto` kế thừa `QuizQuestionContentDto`, dùng lại DTO options của API sync. Timestamp là số giây nguyên không âm; không vượt `lesson.content.duration` nếu có. Nội dung/đáp án trim, tối thiểu 2 phương án, mã/nhãn duy nhất; `single` đúng 1 đáp án, `multiple` ít nhất 1 đáp án.
- Tạo và chuyển mốc chỉ ghi một document; order được nối sau câu cuối ở timestamp đích. Sửa tại cùng mốc giữ order. Dùng CRUD của `BaseService`/`BaseMongoRepository` để giữ audit và soft-delete; không cần collection hay migration mới.
- Cache `lessonQuizKeys.byLesson` cập nhật và invalidate sau thao tác, đồng bộ danh sách với marker. Không dùng `/quizzes/sync` hoặc `/move-merge` để sửa/di chuyển một câu.
- Tạo lại quiz AI cần xác nhận trước khi thay thế toàn bộ danh sách. Cơ chế gom marker gần nhau (±2 giây) và editor cụm cũ giữ nguyên.

- **Routes**:
  - `/courses/:courseId`: Chi tiết khóa học công khai / giao diện học tập. Khi có `?mode=edit` chuyển sang chế độ quản lý nội dung (`CourseDetailContent`).
  - `/courses/:courseId/lessons/:lessonId`: Giao diện phát bài học chuẩn cinema (Master Studio). Khi có `?mode=edit` kích hoạt quyền biên tập (`LessonPlayerStudio`).
- **Component `LessonDetailContent`**:
  - Tải dữ liệu qua hook `useLessonDetailQuery(lessonId)`.
  - Nhận prop `mode: CourseViewMode` ('learn' | 'edit') từ `searchParams.mode`.
  - Hiển thị badge: `Bài {order}`, `Học thử` (`isPreview`), badge loại nội dung (`Video`, `Tài liệu`, `Chưa có nội dung`).
  - **Video Viewer**: Thẻ HTML5 `<video controls>` phát trực tiếp `lesson.content.url`, kèm dải metadata (thời lượng, dung lượng file, định dạng MIME).
  - **Document Viewer**: Card thông tin tài liệu (tên file, định dạng, dung lượng) + nút "Mở tài liệu" mở URL trong tab mới.
  - **Empty State**: Hiển thị khi `lesson.content === null`.
  - **Loading & Error**: `LessonDetailSkeleton` và Card báo lỗi thân thiện với nút "Thử lại" và "Quay lại khóa học".

### Theo dõi tiến độ học tập thực tế (Learning Progress Tracking)
- **Hợp đồng dữ liệu `ICourseLearningProgress`**:
  - `courseId`: string
  - `revision`: number (phiên bản ghi tăng đơn điệu, bảo vệ cache khỏi late responses)
  - `watchedMs`: number (thời gian xem thực tế tích lũy, không bị giới hạn bởi thời lượng hiện tại)
  - `totalDurationMs`: number | null (tổng thời lượng video toàn khóa từ aggregation; `null` nếu thiếu duration)
  - `progressPercent`: number | null (`null` nếu `totalDurationMs === null`; sàn 2 chữ số thập phân `Math.floor(... * 10000) / 100`)
  - `status`: LearningStatusEnum (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` suy diễn động)
  - `lastLessonId`: string | null (bài học dừng gần nhất; `null` nếu video bị gỡ/thay đổi)
  - `lastPositionSeconds`: number (vị trí giây dừng trong video, kẹp trong `[0, duration]`)
  - `updatedAt`: Date | string | null
- **Thành phần UI & Tích hợp**:
  - `LearningProgressSummary`: Card hiển thị trạng thái học, thanh progress bar accessibility (`role="progressbar"`), tỷ lệ % hoàn thành, thời gian học đã xem/tổng thời lượng, save state realtime và nút "Tiếp tục học".
  - Trang `/my-courses`: Hiển thị tiến độ và đổi nút "Vào học" thành "Tiếp tục học" trỏ tới `lastLessonId`.
  - Trang `/courses/:courseId`: Hiển thị `LearningProgressSummary` khi học viên đã đăng ký (`isEnrolled === true`).
  - Studio Player (`LessonPlayerStudio`): Gắn `useLessonLearningProgress` trong `mode === 'learn'`, theo dõi nhịp tim 15s và flush an toàn bằng `fetch(..., { keepalive: true })`.
- **Đồng bộ Cache & Tuần tự hóa Phiên**:
  - `cacheLearningProgress`: So sánh xác định `progress.revision >= old.revision` thay cho timestamp.
  - Client queue: Promise maps `pendingReleases` và `pendingStarts` theo `${userId}:${courseId}` tuần tự hóa lệnh đóng và mở phiên khi chuyển bài nhanh.

---

## 4. Bảo Mật & Phân Định Quyền Hạn Dual-Mode (Milestone 41)

### A. Guard Xác Thực Ngược Phân Cấp (`LessonManagementGuard`)
- **Vị trí**: `backend/src/modules/course/guards/lesson-management.guard.ts`
- **Mục đích**: Chống giả mạo tham số (ID parameter tampering) và ngăn chặn rò rỉ quyền hạn từ client.
- **Quy trình truy vết**:
  ```
  [Route Params: quizId?] 
          ↓ (LessonQuizRepository)
  [Route Params: id / lessonId]
          ↓ (LessonRepository)
  [sectionId]
          ↓ (SectionRepository)
  [courseId]
          ↓ (CourseRepository)
  [Kiểm tra: course.instructorId === user.id OR user.role === ADMIN]
  [Kiểm tra: course.status !== PENDING_APPROVAL]
  ```
- **Xử lý ngoại lệ**:
  - Chưa đăng nhập: `401 UnauthorizedException`
  - Sai role hoặc không sở hữu khóa học: `403 ForbiddenException`
  - Không tìm thấy entity hoặc đã bị xóa mềm (`deletedAt`): `404 NotFoundException`
  - Khóa học đang ở trạng thái chờ duyệt: `409 ConflictException`

### B. Hợp Đồng Chế Độ Hiển Thị Frontend (`CourseViewMode`)
- **Vị trí**: `frontend/src/features/course/utils/course-view-mode.util.ts` & `course-access.util.ts`
- **Định nghĩa**:
  ```typescript
  export type CourseViewMode = 'learn' | 'edit';
  export function parseCourseViewMode(value: unknown): CourseViewMode;
  export function canEditCourseContent(user: FlexibleUser, course: FlexibleCourse, mode?: CourseViewMode): boolean;
  ```
- **Nguyên tắc Fail-Closed**:
  - `canEditCourseContent` chỉ trả về `true` khi `mode === 'edit'` VÀ khóa học không ở trạng thái `PENDING_APPROVAL` VÀ người dùng là giảng viên sở hữu hoặc admin.
  - Khi xem ở chế độ học viên (`mode === 'learn'`), hàm luôn trả về `false` mà không cần quan tâm đến role tài khoản.
