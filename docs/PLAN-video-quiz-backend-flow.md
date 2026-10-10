# Kế hoạch Triển khai: Backend & Logic Nghiệp Vụ Bộ Câu Hỏi Video (Bảng Mới MongoDB & Luồng Tương Tác Dừng Video Làm Câu Hỏi)

> **File:** `docs/PLAN-video-quiz-backend-flow.md`  
> **Trạng thái:** DRAFT / PROPOSED (Đã bao gồm cả Backend API, Database, và Frontend Interactive Flow)  
> **Agent lập kế hoạch:** `project-planner`  
> **Chuyên gia phụ trách:** `backend-specialist` & `frontend-specialist` (Skills: `clean-code`, `database-design`, `api-patterns`, `react-best-practices`, `tailwind-patterns`)  
> **Giao diện mục tiêu:** `http://localhost:3000/instructor/courses/[id]/lessons/[lessonId]` & Trình phát video bài học  

---

## 1. Overview (Tổng quan Nghiệp Vụ & Yêu Cầu)

Theo yêu cầu từ người dùng:
1. **Backend Database (Bảng mới riêng biệt):**
   - Tạo mới một collection/bảng độc lập trong MongoDB: `lesson_quizzes` để lưu trữ tất cả các câu hỏi tương tác theo từng mốc thời gian của bài học (`lessonId`, `timestamp`, `order`, `question`, `questionType`, `options`, `explanation`).
   - Xây dựng tầng kiến trúc chuẩn NestJS: Schema kế thừa `BaseAbstractDocument`, Repository trừu tượng `ILessonQuizRepository`, Service kế thừa `BaseService`, Controller có phân quyền và DTOs validation chặt chẽ.
2. **Lưu trữ từ Giảng viên (Instructor Persistence):**
   - Kết nối `CreateQuizMarkerModal` với Backend API qua TanStack React Query Mutation. Khi giảng viên bấm *"Lưu / Cập nhật câu hỏi"*, dữ liệu được lưu vĩnh viễn vào MongoDB.
3. **Luồng tương tác Dừng Video & Prompt Hỏi Học Viên (Student In-Video Breakpoint Flow):**
   - Khi video đang phát chạm đến mốc thời gian có câu hỏi (`Math.floor(currentTime) === quiz.timestamp`):
     1. Video **tự động tạm dừng (pause)**.
     2. Hiển thị một **Prompt Overlay tinh gọn** ngay trên bề mặt video với 2 nút lựa chọn:
        - `[ Làm câu hỏi ]`
        - `[ Bỏ qua (Skip) ]` (tiếp tục phát video mà không bị ép buộc).
     3. Nếu chọn `[ Bỏ qua ]`: Tiếp tục phát video (`currentTime += 0.5; play()`).
     4. Nếu chọn `[ Làm câu hỏi ]`: Mở Modal câu hỏi lớn tương thích chuẩn kích thước container (`max-w-[calc(1440px-3rem)] aspect-video`).
4. **Trải nghiệm Trả lời & Phản hồi Trực quan (Instant Feedback & Explanation):**
   - Trong Modal làm câu hỏi của học viên:
     - Học viên chọn phương án và bấm nộp bài.
     - Lập tức hiển thị trạng thái **Đúng / Sai**: Phương án đúng đổi màu xanh lá (`emerald-500`), phương án chọn sai đổi màu đỏ (`destructive`).
     - Xuất hiện nút **`[ Xem giải thích đáp án ]`**: Khi bấm vào, mở khung hiển thị phần giải thích kiến thức củng cố.
     - Nút **`[ Tiếp tục xem video ]`**: Đóng modal và phát tiếp video mượt mà.

---

## 2. Kiến trúc Backend & Database Schema (`MongoDB / Mongoose`)

Tuân thủ nghiêm ngặt theo [`project-architecture.md`](file:///d:/Download/hk1_2027/project_do_an/.agent/rules/project-architecture.md):

### 2.1. Collection `lesson_quizzes` (`LessonQuizEntity`)
- **Tập tin:** `backend/src/modules/course/schemas/lesson-quiz.schema.ts`
- **Kế thừa:** `BaseAbstractDocument` (bao gồm `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`).
- **Cấu trúc trường:**
  ```typescript
  @Schema({ timestamps: true, collection: 'lesson_quizzes' })
  export class LessonQuizEntity extends BaseAbstractDocument {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'LessonEntity', required: true, index: true })
    lessonId: Types.ObjectId;

    @Prop({ type: Number, required: true, min: 0 })
    timestamp: number; // Mốc thời gian dừng video (tính bằng giây)

    @Prop({ type: Number, required: true, min: 1, default: 1 })
    order: number; // Thứ tự câu hỏi tại mốc này (Câu 1, 2, 3...)

    @Prop({ type: String, required: true, trim: true })
    question: string;

    @Prop({ type: String, enum: ['single', 'multiple'], default: 'single', required: true })
    questionType: 'single' | 'multiple';

    @Prop({
      type: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          text: { type: String, required: true, trim: true },
          isCorrect: { type: Boolean, required: true, default: false },
        },
      ],
      required: true,
      default: [],
    })
    options: Array<{
      id: string;
      label: string;
      text: string;
      isCorrect: boolean;
    }>;

    @Prop({ type: String, required: false, default: null, trim: true })
    explanation?: string | null;
  }
  ```
- **Indexes:**
  ```typescript
  LessonQuizSchema.index({ lessonId: 1, deletedAt: 1, timestamp: 1, order: 1 });
  ```

### 2.2. Hợp đồng dữ liệu `share-lib`
- **Tập tin:** `share-lib/src/interfaces/lesson-quiz.interface.ts` & `share-lib/src/dtos/lesson-quiz.dto.ts`
  - `ILessonQuiz`, `IQuizOption`, `QuizQuestionTypeEnum`.
  - `SyncLessonQuizzesAtTimestampDto`: Nhận mảng các câu hỏi kèm `timestamp` để lưu/cập nhật đồng loạt tại mốc video đó.

### 2.3. Repository & Service Layer
- **Tầng Repository:**
  - `ILessonQuizRepository` (Domain Abstract Repository).
  - `LessonQuizMongoRepository` kế thừa `BaseMongoRepository<LessonQuizEntity, string>`.
- **Tầng Service (`LessonQuizService`):**
  - Kế thừa `BaseService`.
  - `getQuizzesByLessonId(lessonId: string)`: Trả về danh sách câu hỏi đã sắp xếp theo `timestamp` và `order`.
  - `syncQuizzesAtTimestamp(lessonId: string, timestamp: number, dtos: QuizItemDto[])`: Sử dụng transaction hoặc atomic bulkWrite để thay thế/cập nhật danh sách câu hỏi tại mốc giây đó.
  - `deleteQuiz(quizId: string)`.

### 2.4. Tầng Controller & API Endpoints
- **Endpoints:**
  - `GET /api/v1/lessons/:lessonId/quizzes`: Lấy danh sách câu hỏi video (công khai cho học viên và giảng viên).
  - `PUT /api/v1/lessons/:lessonId/quizzes/sync`: Lưu/cập nhật toàn bộ câu hỏi tại một mốc thời gian (Quyền: `INSTRUCTOR`, `ADMIN`).
  - `DELETE /api/v1/lessons/quizzes/:quizId`: Xóa một câu hỏi.
- Bao bọc phản hồi trong `ApiResponse<T>`.

---

## 3. Kiến trúc Frontend & Luồng Tương Tác Dừng Video

```
[ Video đang phát ] 
        │
        ▼ (currentTime chạm mốc quiz.timestamp)
[ Video Tạm Dừng ]
        │
        ▼
[ Prompt Overlay trên Video ] ─── Bấm [ Bỏ qua (Skip) ] ───► [ Resume Video (+0.5s) ]
        │
        ▼ Bấm [ Làm câu hỏi ]
[ Student In-Video Quiz Modal (16:9, Chuẩn Container) ]
        │
        ├─► Học viên chọn phương án & Nộp bài
        ├─► Hiển thị Đúng / Sai (Xanh / Đỏ)
        ├─► Nút [ Xem giải thích ] ──► Hiển thị khung kiến thức
        │
        ▼ Bấm [ Tiếp tục xem video ]
[ Đóng Modal & Resume Video ]
```

### 3.1. Hook Điều Khiển Mốc Dừng (`use-video-quiz-trigger.ts`)
- Lắng nghe sự kiện `timeupdate` của player.
- Quản lý `handledTimestamps` (Set chứa các timestamp đã làm hoặc đã bỏ qua để tránh lặp vô tận).
- Trạng thái:
  - `pendingQuizPrompt`: Hiển thị Prompt Overlay với 2 nút `[Làm câu hỏi]` và `[Bỏ qua]`.
  - `activeQuizModal`: Mở Modal làm câu hỏi to theo container chung.

### 3.2. Prompt Overlay trên Video (`InVideoQuizPromptOverlay`)
- Xuất hiện nổi ngay trên bề mặt khung video 16:9 khi video vừa dừng.
- Thiết kế:
  - Nền mờ kính tối `bg-black/80 backdrop-blur-md rounded-2xl p-6 border border-zinc-700/60 text-center max-w-md mx-auto shadow-2xl`.
  - Icon câu hỏi sinh động kèm thông báo: *"Có câu hỏi kiểm tra kiến thức tại mốc [mm:ss]!"*.
  - 2 nút bấm nổi bật:
    - `[ Bỏ qua ]`: Nút viền mờ (`variant="outline"`), resume video ngay.
    - `[ Làm câu hỏi ]`: Nút màu cam hổ phách (`bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold`), mở Modal câu hỏi lớn.

### 3.3. Modal Trả Lời Câu Hỏi Của Học Viên (`StudentInVideoQuizModal`)
- Khung hình 16:9, kích thước căn theo container chung (`max-w-[calc(1440px-3rem)] aspect-video`).
- **Logic trả lời & phản hồi (Feedback & Explanation):**
  - Hiển thị danh sách câu hỏi tại mốc này (nếu có nhiều câu, có nút Next/Previous hoặc danh sách).
  - Khi học viên bấm chọn đáp án:
    - Đánh giá Đúng / Sai tức thì:
      - Đáp án đúng: Viền xanh lá `border-emerald-500 bg-emerald-500/10 text-emerald-600`, icon tick `✓`.
      - Đáp án học viên chọn sai: Viền đỏ `border-destructive bg-destructive/10 text-destructive`, icon `✕`.
    - Xuất hiện nút **`[ 💡 Xem giải thích đáp án ]`**:
      - Bấm vào mở hộp thoại/khung màu vàng nhạt hiển thị lý do giảng viên đã soạn.
    - Nút **`[ Tiếp tục xem video ]`** xuất hiện sau khi hoàn thành để quay lại bài giảng.

### 3.4. Ghép Nối API vào Modal Giảng Viên (`CreateQuizMarkerModal`)
- Thay thế hàm `handleMockSave` bằng React Query Mutation `useSyncLessonQuizzesMutation`.
- Khi giảng viên bấm *"Lưu / Cập nhật câu hỏi"*: Gửi mảng `questions` về API `PUT /api/v1/lessons/:id/quizzes/sync`.
- Cập nhật các chấm ghim marker trên timeline video từ dữ liệu thực tế trong DB.

---

## 4. File Structure & Changes

```
share-lib/
└── src/
    ├── interfaces/lesson-quiz.interface.ts          # [NEW] Interface ILessonQuiz, IQuizOption
    └── dtos/lesson-quiz.dto.ts                      # [NEW] DTOs validate dữ liệu câu hỏi

backend/src/modules/course/
├── schemas/lesson-quiz.schema.ts                    # [NEW] Schema LessonQuizEntity (Collection lesson_quizzes)
├── repositories/
│   ├── lesson-quiz.repository.interface.ts          # [NEW] ILessonQuizRepository
│   └── lesson-quiz.mongo.repository.ts              # [NEW] LessonQuizMongoRepository
├── services/lesson-quiz.service.ts                  # [NEW] LessonQuizService (Kế thừa BaseService)
├── controllers/lesson-quiz.controller.ts            # [NEW] API Routes cho Quizzes
├── course.module.ts                                 # [MODIFY] Đăng ký schema, repository, service, controller
└── tests/lesson-quiz.service.spec.ts                # [NEW] Unit test cho LessonQuizService (AAA pattern)

frontend/src/features/course/
├── api/lesson-quiz.api.ts                           # [NEW] React Query hooks (useLessonQuizzesQuery, useSyncQuizzes)
├── components/player/
│   ├── in-video-quiz-prompt-overlay.tsx             # [NEW] Overlay 2 nút [Làm câu hỏi / Bỏ qua] khi dừng video
│   ├── student-in-video-quiz-modal.tsx              # [NEW] Modal học viên làm bài 16:9 (Đúng/Sai + nút Xem giải thích)
│   ├── use-video-quiz-trigger.ts                    # [NEW] Hook theo dõi currentTime và kích hoạt breakpoint
│   ├── create-quiz-marker-modal.tsx                 # [MODIFY] Ghép mutation lưu API thật
│   └── lesson-video-screen.tsx                      # [MODIFY] Tích hợp Prompt Overlay & Student Quiz Modal
```

---

## 5. Task Breakdown (Chi tiết Công việc Thực hiện)

### Phase 1: Share-lib & Backend Database
- **Task 1.1:** Tạo interface & DTO trong `share-lib` (`ILessonQuiz`, `SyncLessonQuizzesDto`).
- **Task 1.2:** Tạo `LessonQuizSchema` kế thừa `BaseAbstractDocument` với index compound.
- **Task 1.3:** Triển khai `LessonQuizMongoRepository` kế thừa `BaseMongoRepository`.
- **Task 1.4:** Triển khai `LessonQuizService` kế thừa `BaseService` xử lý get và bulk sync.
- **Task 1.5:** Triển khai `LessonQuizController` với các routes `GET`, `PUT sync`, `DELETE`.
- **Task 1.6:** Viết unit test `lesson-quiz.service.spec.ts` (100% pass, AAA pattern).

### Phase 2: Frontend API Integration (Giảng viên)
- **Task 2.1:** Tạo api client & React Query hooks trong `features/course/api/lesson-quiz.api.ts`.
- **Task 2.2:** Kết nối `CreateQuizMarkerModal` để lưu dữ liệu thật vào MongoDB.
- **Task 2.3:** Hiển thị các chấm ghim câu hỏi trên timeline từ API thật.

### Phase 3: Frontend Student Interactive Flow (Dừng Video & Làm Bài)
- **Task 3.1:** Xây dựng hook `use-video-quiz-trigger` giám sát mốc thời gian và quản lý trạng thái dừng.
- **Task 3.2:** Xây dựng component `InVideoQuizPromptOverlay` (2 nút [Làm câu hỏi] / [Bỏ qua]).
- **Task 3.3:** Xây dựng modal `StudentInVideoQuizModal` (16:9 chuẩn container, phản hồi đúng/sai tức thì, nút Xem giải thích, nút Tiếp tục phát video).
- **Task 3.4:** Tích hợp trơn tru vào `LessonVideoScreen`.

---

## 6. Verification Checklist (Tiêu chí Kiểm tra)

- [ ] Collection `lesson_quizzes` được khởi tạo chuẩn xác trong MongoDB với index tối ưu.
- [ ] API `GET /api/v1/lessons/:id/quizzes` và `PUT /api/v1/lessons/:id/quizzes/sync` hoạt động trơn tru.
- [ ] Unit tests cho `LessonQuizService` đạt 100% pass theo chuẩn AAA.
- [ ] Giảng viên tạo câu hỏi trên modal -> bấm Lưu -> dữ liệu được lưu vĩnh viễn vào MongoDB (F5 không mất).
- [ ] Video đang phát chạm mốc câu hỏi -> Tự động dừng (`pause`) -> Hiện Prompt Overlay với 2 nút `[Làm câu hỏi]` và `[Bỏ qua]`.
- [ ] Bấm `[Bỏ qua]` -> Video tiếp tục phát bình thường không bị dừng lại ở mốc đó nữa.
- [ ] Bấm `[Làm câu hỏi]` -> Modal mở rộng 16:9 chuẩn container -> Học viên chọn đáp án -> Thấy phản hồi Đúng/Sai ngay.
- [ ] Xuất hiện nút `[Xem giải thích đáp án]` -> Bấm vào hiển thị lời giải thích rõ ràng.
- [ ] Bấm `[Tiếp tục xem video]` -> Đóng modal và phát tiếp video mượt mà.
