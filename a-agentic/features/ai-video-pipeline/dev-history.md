# AI Video Pipeline — Development History & Gotchas

> **Module:** AI Video Pipeline

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `IN_PROGRESS` — Đã hoàn thành tầng lưu trữ MinIO Object Storage, Tích hợp AssemblyAI SDK và Tự động trích xuất Transcript video bài học lưu Database.
- **Kế hoạch triển khai:** Tiếp tục triển khai RabbitMQ worker quy mô lớn và tích hợp Google Gemini API để sinh Mindmap Markdown & In-video Quiz từ transcript đã lưu.

---

## 2. Dev History: MinIO Storage Migration & Cloudinary Decommission (2026-10-01)

- **Bối cảnh & Động lực**:
  - Cloudinary giới hạn băng thông và dung lượng lưu trữ free-tier (video bài giảng lên đến 900MB/file), không cho phép chạy cục bộ/offline.
  - Chuyển đổi 100% sang MinIO S3 Object Storage chạy qua Docker Compose (`docker compose up -d`).
- **Các thay đổi cốt lõi**:
  - `docker-compose.yml`: Cấu hình MinIO Server (`minio/minio:latest`) + Init Container (`minio/mc:latest`) tự động tạo bucket `thc-datn-media` và set anonymous download policy cho `/avatars` và `/thumbnails`.
  - Khử bỏ hoàn toàn Cloudinary: Gỡ bỏ package `cloudinary`, xóa module `CloudinaryModule`, xóa toàn bộ biến `CLOUDINARY_*`, làm sạch domain whitelist trên frontend.
  - Xây dựng `StorageModule` dùng `@aws-sdk/client-s3` và `@aws-sdk/s3-request-presigner`.
  - Tích hợp `sharp` nén và crop avatar 500x500 WebP chuẩn hóa trước khi đẩy lên MinIO.
  - Bổ sung cơ chế phục vụ video Hybrid: Public Direct URL cho bài học preview và Presigned Stream URL có hạn dùng cho bài học chính thức.
  - Cập nhật toàn bộ consumer (`UserService`, `LessonContentController`, `AppModule`, `UserModule`, `CourseModule`) và 100% unit tests.
- **Technical Notes & Gotchas**:
  - **MinIO Force Path Style**: Cần cấu hình `forcePathStyle: true` trong AWS S3 Client SDK để client gửi request theo dạng `http://endpoint/bucket/key` thay vì virtual-host subdomain `http://bucket.endpoint/key` (dễ gây lỗi DNS resolve cục bộ).
  - **Healthcheck & Init Container**: Sử dụng vòng lặp `while ! mc alias set ...; do sleep 1; done` trong init container để đảm bảo container mc chỉ thực hiện tạo bucket khi server MinIO đã sẵn sàng chấp nhận kết nối HTTP.
  - **Presigned URL Expiry**: Mặc định đặt thời hạn 2 giờ (7200 giây) để học viên xem bài học không bị ngắt quãng giữa chừng.

---

## 3. Dev History: AssemblyAI Official SDK Integration (2026-10-07)

- **Bối cảnh & Động lực**:
  - Chuẩn bị pipeline Speech-to-Text cho video bài giảng để trích xuất transcript, word-level timestamps và phụ đề SRT/VTT phục vụ sinh Mindmap và Quiz với Gemini.
- **Các thay đổi cốt lõi**:
  - Cài đặt package chính thức `assemblyai` (`v4.41.5`) vào workspace `backend`.
  - Khởi tạo `AssemblyAiModule` và `AssemblyAiService` trong `backend/src/modules/assemblyai/` bọc AssemblyAI Client.
  - Cấu hình mặc định nhận diện tiếng Việt (`language_code: 'vi'`), hỗ trợ truyền đè tùy chọn nếu cần.
  - Bổ sung validation schema cho `ASSEMBLYAI_API_KEY` trong `backend/src/config/env.validation.ts` và `.env.example`.
  - Đăng ký `AssemblyAiModule` vào `AppModule`.
  - Viết 100% unit tests (`assemblyai.service.spec.ts`) kiểm thử khởi tạo client, xử lý thiếu API key, cấu hình tiếng Việt mặc định, ánh xạ dữ liệu transcript & word timestamps, xử lý lỗi và lấy phụ đề SRT.
- **Technical Notes & Gotchas**:
  - **Type import**: Import `TranscribeParams` thay vì `TranscriptParams` từ `assemblyai` vì `TranscriptParams` là kiểu query param cho danh sách transcript, trong khi `TranscribeParams` chứa thuộc tính `audio` (nhận URL công khai hoặc local file).
  - **Vitest Mocking Constructor**: Khi mock class `AssemblyAI` trong Vitest, cần mock bằng function chuẩn hoặc class (`function MockAssemblyAI() {}`) thay vì arrow function để tương thích toán tử `new`.

---

## 4. Dev History: MinIO Video Stream & Auto Background Transcription to Database (2026-10-07)

- **Bối cảnh & Động lực**:
  - Khi giảng viên upload video bài học lên hệ thống, sau khi file video đã lưu trữ thành công trên MinIO S3, hệ thống cần tự động trích xuất transcript (tiếng Việt `vi`) qua AssemblyAI và lưu vào database của bài học.
  - Phải tuân thủ Rule 7 (Non-blocking HTTP): Tuyệt đối không để request tạo bài học bị nghẽn chờ AssemblyAI. Phản hồi HTTP ngay cho client, xử lý trích xuất ngầm.
- **Các thay đổi cốt lõi**:
  - **`share-lib`**:
    - Thêm `LessonTranscriptionStatusEnum` (`IDLE`, `QUEUED`, `TRANSCRIBING`, `READY`, `FAILED`).
    - Thêm interfaces `ILessonTranscript` và `ITranscribedWord`.
    - Bổ sung trường `transcriptionStatus` vào `ILesson`.
  - **`StorageService`**:
    - Bổ sung method `getObjectStream(fileKeyOrUrl: string): Promise<Readable>` sử dụng `GetObjectCommand` của AWS S3 SDK.
  - **`AssemblyAiService`**:
    - Bổ sung method `transcribeStream(audioStream: Readable, options?)`: Sử dụng `client.files.upload(audioStream)` để tải stream video lên AssemblyAI Staging Storage an toàn trước khi kích hoạt `client.transcripts.transcribe(...)`.
  - **Database & Architecture**:
    - Thiết kế Mongoose collection riêng `lesson_transcripts` (`LessonTranscriptEntity`), kế thừa `BaseAbstractDocument`, đánh chỉ mục duy nhất `lessonId: 1`.
    - Cài đặt `LessonTranscriptRepository` triển khai `BaseMongoRepository`.
    - Cài đặt `LessonTranscriptService` (`BaseService`): quản lý trạng thái, tải stream từ MinIO, gọi AssemblyAI, lưu transcript & subtitles SRT vào DB và cập nhật `Lesson.transcriptionStatus`.
    - Tự động hook trong `LessonService.createLesson`: Khi bài học có kiểu `VIDEO` và có `videoUrl`, tự động khởi chạy tác vụ ngầm `lessonTranscriptService.triggerTranscription(...)` với `transcriptionStatus = QUEUED`.
    - Bổ sung endpoints trên `LessonsController`: `GET /api/v1/lessons/:id/transcript` và `POST /api/v1/lessons/:id/transcript/retry`.
  - **Testing**:
    - Viết 100% unit tests theo mẫu AAA cho `StorageService.getObjectStream`, `AssemblyAiService.transcribeStream`, `LessonTranscriptService`, `LessonsController` và `LessonService`. Toàn bộ 405 tests pass.
- **Technical Notes & Gotchas**:
  - **MinIO Localhost vs Cloud AI**: MinIO chạy cục bộ tại `localhost:9000` không thể public URL cho cloud worker của AssemblyAI. Phương pháp stream bytes trực tiếp qua `client.files.upload` giải quyết hoàn toàn sự phụ thuộc vào public IP hay tunnel (ngrok).
  - **Mongoose 9 Generic Overload**: Khi query document theo `lessonId` trong Mongoose model kế thừa BaseAbstractDocument, cần ép kiểu bộ lọc qua `as Record<string, unknown>` để tránh lỗi TypeScript type overload mismatch.
  - **Tách riêng Collection**: Tách `lesson_transcripts` khỏi `Lesson` là quyết định thiết kế tối quan trọng nhằm ngăn chặn Document Bloat (transcript với mảng hàng nghìn từ có thể vượt quá giới hạn hoặc làm chậm query danh sách bài học).

---

## 5. Dev History: Sentence-Level Transcription via AssemblyAI Sentences API & Data Stripping (2026-10-08)

- **Bối cảnh & Động lực**:
  - Nhằm tối ưu dung lượng MongoDB và cấu trúc dữ liệu cho học tập, hệ thống cần trích xuất transcript theo từng câu thay vì lưu hàng nghìn từ lẻ tẻ (`words`).
  - Toàn bộ trường `confidence` và danh sách từ `words` được loại bỏ khỏi database để giữ kích thước document gọn nhẹ tối đa (chỉ lưu `rawTranscript` và `sentences`).
- **Các thay đổi cốt lõi**:
  - **`share-lib`**:
    - Định nghĩa interface `ITranscribedSentence`: `{ text: string, start: number, end: number }`.
    - Cập nhật `ILessonTranscript`: thay `words` bằng `sentences: ITranscribedSentence[]`.
    - Build thành công `pnpm --filter share-lib build`.
  - **`AssemblyAiService`**:
    - Sau khi hoàn thành transcript, gọi `client.transcripts.sentences(transcript.id)`.
    - Chuẩn hóa và làm sạch chuỗi câu (`text.trim()`, `start`, `end`), loại bỏ `confidence`.
    - Cập nhật kết quả `AssemblyAiTranscriptionResult`: trả về mảng `sentences: TranscribedSentence[]`.
  - **`LessonTranscriptSchema` & Service**:
    - Loại bỏ `TranscribedWordEntity` và thuộc tính `confidence`.
    - Bổ sung subdocument `TranscribedSentenceEntity` (`_id: false`) gồm 3 trường sạch: `text`, `start`, `end`.
    - `LessonTranscriptService.processTranscriptionTask` lưu `sentences` vào MongoDB collection `lesson_transcripts`.
  - **Testing**:
    - Cập nhật 100% unit tests cho `AssemblyAiService` và `LessonTranscriptService`. Toàn bộ 33 test files (405 tests) pass hoàn toàn.
- **Technical Notes & Gotchas**:
  - **Sentences API Format**: AssemblyAI trả về `SentencesResponse` chứa mảng `TranscriptSentence[]`. Mỗi phần tử có `text`, `start` và `end` tính bằng mili-giây, rất thuận tiện để frontend hiển thị highlight đồng bộ với video player theo từng câu.
  - **Data Sanitization**: Luôn áp dụng `.trim()` cho `text` của từng câu để đảm bảo không bị thừa khoảng trắng ở đầu/cuối chuỗi câu do AssemblyAI trả về.

---

## 6. Dev History: Core Gemini AI Infrastructure & Key Rotation Manager (2026-10-11)

- **Bối cảnh & Động lực**:
  - Chuẩn bị nền tảng AI phân tích transcript video bài giảng sang Mindmap, In-video Quiz và Summary.
  - Quản lý 6 API key thuộc 6 Google AI Studio project riêng biệt trên backend mà không làm lộ key ra frontend hoặc console log.
  - Xử lý thông minh các trường hợp Rate Limit (429), Dead Key (400/403) và Fail-fast đối với lỗi request tham số sai (400 Invalid Argument) hoặc model không tồn tại (404).
- **Các thay đổi cốt lõi**:
  - **`backend/src/config/env.validation.ts` & `.env.example`**:
    - Bổ sung validation schema cho `GEMINI_MODEL` (mặc định: `gemini-2.5-flash`), `GEMINI_API_KEY`, và `GEMINI_API_KEY_1` đến `GEMINI_API_KEY_6`.
  - **`backend/src/modules/gemini/`**:
    - `gemini.errors.ts`: Hệ thống phân cấp exception kế thừa `HttpException`: `GeminiRateLimitException` (429), `GeminiAuthException` (401), `GeminiInvalidRequestException` (400), `GeminiModelNotFoundException` (404), `GeminiServiceUnavailableException` (503), `GeminiResponseParsingException` (422), `GeminiAllKeysExhaustedException` (429).
    - `gemini-key.manager.ts` (`GeminiKeyManager`): Quản lý 6 key bằng thuật toán Round-Robin có kiểm tra sức khỏe; hỗ trợ Cooldown tăng dần theo cấp số nhân (30s -> 60s -> 120s -> max 5 phút) khi gặp 429; tự động phục hồi key khi hết hạn cooldown; đánh dấu `DEAD` khi key sai/bị thu hồi; mask key `AIzaSy...4aB2` an toàn cho logging.
    - `gemini.service.ts` (`GeminiService`): Gọi SDK `@google/genai` với cache client per key; hỗ trợ `generateContent` và `generateJson<T>`; làm sạch markdown code fence ````json ... ````; retry tối đa 3 lần xoay vòng key khi gặp rate limit/service unavailable; fail-fast ngay lập tức đối với lỗi prompt/model.
    - `gemini.module.ts`: Đăng ký provider và export vào `AppModule`.
  - **Testing**:
    - Viết 19 unit tests bao phủ 100% case cho `GeminiKeyManager` và `GeminiService`. Toàn bộ 36 test files (441 tests) của backend pass thành công.
- **Technical Notes & Gotchas**:
  - **Vitest Mocking Constructor**: Giống như AssemblyAI SDK, mock class `GoogleGenAI` trong Vitest bắt buộc phải dùng syntax `class MockGoogleGenAI {}` hoặc `function MockGoogleGenAI() {}` thay vì arrow function để tương thích với toán tử `new GoogleGenAI({ apiKey })`.
  - **Fail-Fast vs Rotate Key**: Không phải lỗi nào cũng được đổi key. Lỗi 400 `INVALID_ARGUMENT` (prompt quá dài hoặc schema lỗi) và 404 (sai tên model) là lỗi do request/cấu hình, đổi key khác cũng sẽ gặp lỗi tương tự nên bắt buộc phải dừng ngay lập tức (fail-fast) để tránh lãng phí quota của các key còn lại.

---

## 7. Dev History: Lesson Mindmap Analysis via Gemini & Draft Management (2026-10-11)

- **Bối cảnh & Động lực**:
  - Triển khai thí điểm tính năng sinh sơ đồ tư duy (Mindmap) bài giảng từ transcript video có sẵn trong MongoDB.
  - Cấu trúc cây JSON tối đa 3 cấp từ root, mỗi node bắt buộc có `id`, `title`, và `timestamp` (giây) bám sát timeline transcript để người học click vào node thì video nhảy đến thời điểm tương ứng.
  - Hỗ trợ lưu bản nháp (`draftMindmap`) để giảng viên thử nghiệm prompt mà không ghi đè dữ liệu chính thức của học viên.
- **Các thay đổi cốt lõi**:
  - **`share-lib`**:
    - Định nghĩa `ILessonMindmapNode`, `ILessonMindmapData`, `ILessonMindmap`.
    - Build thành công `share-lib` distribution.
  - **`backend/src/modules/course/`**:
    - `LessonMindmapEntity` (`lesson_mindmaps` collection), kế thừa `BaseAbstractDocument`, index unique `{ lessonId: 1 }`.
    - `LessonMindmapRepository` (`BaseMongoRepository`): `findByLessonId`, `saveDraftByLessonId`, `applyDraftByLessonId`, `upsertOfficialByLessonId`.
    - Đăng ký và export qua `CourseModule`.
  - **`backend/src/modules/transcript-analysis/`**:
    - `MindmapValidator`: Kiểm tra đệ quy cấu trúc cây (đúng node root, không vượt quá 3 cấp, timestamp trong `[0, durationSeconds]`).
    - `MindmapAnalysisService`: Đổi timestamp mili-giây từ transcript thành `[mm:ss - Xs]`, dựng prompt tiếng Việt chuyên biệt, gọi `geminiService.generateJson<ILessonMindmapData>`, validate và lưu nháp.
    - `TranscriptAnalysisController`:
      - `POST /api/v1/lessons/:id/analysis/mindmap` (`INSTRUCTOR`, `ADMIN`): Sinh Mindmap mới.
      - `GET /api/v1/lessons/:id/analysis/mindmap` (`Public`): Xem sơ đồ bài học.
      - `POST /api/v1/lessons/:id/analysis/mindmap/apply` (`INSTRUCTOR`, `ADMIN`): Áp dụng bản nháp thành chính thức.
    - Đăng ký `TranscriptAnalysisModule` vào `AppModule`.
  - **Testing**:
    - Viết 21 unit tests bao phủ `MindmapValidator`, `MindmapAnalysisService` và `TranscriptAnalysisController`.
    - Toàn bộ 39 test files (462 tests) của backend pass 100%. Linter hoàn tất với 0 errors.
- **Technical Notes & Gotchas**:
  - **AssemblyAI Milliseconds vs Video Player Seconds**: Dữ liệu sentences trong MongoDB lưu theo mili-giây (`start: 75000`), cần convert sang giây (`75s`) khi đưa vào prompt để Gemini trả về số nguyên `timestamp: 75` đồng bộ với video player `currentTime`.
  - **Depth Boundary Enforcement**: Node tại Level 3 (nhánh lá cuối cùng) tuyệt đối không được chứa mảng `children` có phần tử, đảm bảo sơ đồ không bị phình to làm vỡ layout giao diện.

---

## 8. Dev History: In-Video Quiz & Lesson Summary Integration via Gemini (2026-10-11)

- **Bối cảnh & Động lực**:
  - Hoàn thiện Giai đoạn 3 trong pipeline phân tích transcript bài học: Sinh 10 câu trắc nghiệm (Quiz) và Bản tóm tắt bài giảng (Summary) từ transcript video trong MongoDB.
  - Mỗi câu hỏi trắc nghiệm có đúng 4 lựa chọn (A, B, C, D), đúng 1 đáp án `isCorrect: true`, có mốc `timestamp` dừng video và phần `explanation` sư phạm.
  - Bản tóm tắt gồm `title`, `overview`, `keyPoints` (mỗi ý chính gắn mốc giây tương ứng) và `conclusion`.
  - Cơ chế Lưu nháp (`draft`) và Xem trước (`preview`) độc lập, cho phép giảng viên test prompt thoải mái mà không ghi đè dữ liệu đang phục vụ học viên cho đến khi bấm "Áp dụng".
- **Các thay đổi cốt lõi**:
  - **`share-lib`**:
    - Mở rộng `lesson-quiz.interface.ts`: `IGeneratedQuizOption`, `IGeneratedQuizItem`, `ILessonQuizDraft`.
    - Tạo mới `lesson-summary.interface.ts`: `ILessonSummaryKeyPoint`, `ILessonSummaryData`, `ILessonSummary`.
    - Re-export và build thành công `pnpm --filter share-lib build`.
  - **Database & Persistence**:
    - `LessonSummaryEntity` (`lesson_summaries`) & `LessonSummaryRepository` (`findByLessonId`, `saveDraftByLessonId`, `applyDraftByLessonId`, `upsertOfficialByLessonId`).
    - `LessonQuizDraftEntity` (`lesson_quiz_drafts`) & `LessonQuizDraftRepository` (`findByLessonId`, `saveDraftByLessonId`, `clearDraftByLessonId`).
    - Bổ sung `replaceAllQuizzesForLesson` vào `LessonQuizRepository` phục vụ thao tác Apply ghi đè toàn bộ quiz của bài học theo MongoDB atomic session.
    - Đăng ký đầy đủ các Schemas và Repositories vào `CourseModule`.
  - **Validation & Business Logic**:
    - `QuizValidator`: Xác thực nghiêm ngặt đúng 10 câu hỏi, mỗi câu 4 options, đúng 1 option `isCorrect = true`, timestamp trong `[0, durationSeconds + 5]`.
    - `SummaryValidator`: Xác thực đầy đủ `title`, `overview`, `keyPoints` (mỗi ý có title, content, timestamp), `conclusion`.
    - `QuizGenerationService`: Dựng prompt sinh 10 câu trắc nghiệm bám sát timeline, gọi `geminiService.generateJson<{ quizzes: IGeneratedQuizItem[] }>`, validate và lưu nháp.
    - `SummaryGenerationService`: Dựng prompt tóm tắt sư phạm, gọi `geminiService.generateJson<ILessonSummaryData>`, validate và lưu nháp.
  - **Endpoints API**:
    - `POST /api/v1/lessons/:id/analysis/quiz` & `GET /api/v1/lessons/:id/analysis/quiz` (lấy draft) & `POST /api/v1/lessons/:id/analysis/quiz/apply`.
    - `POST /api/v1/lessons/:id/analysis/summary` & `GET /api/v1/lessons/:id/analysis/summary` (Public) & `POST /api/v1/lessons/:id/analysis/summary/apply`.
    - Đăng ký vào `TranscriptAnalysisController` và `TranscriptAnalysisModule`.
  - **Testing & Quality Assurance**:
    - Viết 37 unit tests mới cho `quiz.validator.spec.ts`, `summary.validator.spec.ts`, `quiz-generation.service.spec.ts`, `summary-generation.service.spec.ts`, và mở rộng `transcript-analysis.controller.spec.ts`.
    - Toàn bộ backend test suite: **43 test files, 499 tests pass 100%**. Linter sạch 0 errors.
- **Technical Notes & Gotchas**:
  - **Quiz Draft Isolation**: Lưu bản nháp quiz tại collection riêng `lesson_quiz_drafts` thay vì chèn trực tiếp vào `lesson_quizzes` với cờ draft để tránh xung đột với API lấy bài tập video của học viên (`GET /lessons/:id/quizzes`). Khi bấm Apply, hệ thống thực hiện soft-delete các quiz cũ và chèn mới trong 1 lượt ghi để đảm bảo tính nhất quán.
  - **Summary KeyPoints Timestamps**: Các ý chính của tóm tắt cũng được gắn mốc giây tương ứng, cho phép học viên click vào từng ý chính trên tab tóm tắt để tua video tới phân đoạn kiến thức đó.

---

## 9. Dev History: Frontend Studio UI Integration for Mindmap, Quiz & Summary Tabs (2026-10-11)

- **Bối cảnh & Động lực**:
  - Triển khai Giai đoạn 4: Hoàn thiện giao diện người dùng tương tác trong Video Player Studio (`LessonTabsContainer`) cho cả 3 chế độ: Sơ đồ tư duy (Mindmap), Câu hỏi trắc nghiệm (Quizz), và Tóm tắt bài học (Summary).
  - Tích hợp 3 nút "Test AI" độc lập trên tab bar để Giảng viên có thể thử nghiệm từng prompt phân tích riêng biệt theo nhu cầu.
  - Hỗ trợ cơ chế "Xem trước bản nháp" (Draft Preview Banner) và nút "Áp dụng vào bài học" (Apply) để chỉ cập nhật kết quả chính thức cho học viên khi giảng viên xác nhận hài lòng.
  - Đồng bộ mốc giây tương tác: người học nhấp vào bất kỳ node sơ đồ, câu trắc nghiệm hay ý chính nào, video player sẽ tua ngay tới thời điểm tương ứng (`currentTime`).
- **Các thay đổi cốt lõi**:
  - **`frontend/src/features/course/api/transcript-analysis.api.ts`**:
    - Xây dựng React Query queries & mutations: `useLessonMindmapAnalysisQuery`, `useGenerateMindmapMutation`, `useApplyMindmapDraftMutation`, `useLessonQuizDraftQuery`, `useGenerateQuizMutation`, `useApplyQuizDraftMutation`, `useLessonSummaryQuery`, `useGenerateSummaryMutation`, `useApplySummaryDraftMutation`.
    - Tự động invalidate query keys và hiển thị toasts thông báo thành công hoặc lỗi chi tiết.
  - **`frontend/src/features/course/components/player/tabs/`**:
    - `lesson-mindmap-tab.tsx`: Hiển thị cây phân cấp tương tác (Root, Chủ đề cấp 1, Ý chi tiết cấp 2, Từ khóa cấp 3), nút tua video `[mm:ss]`, banner bản nháp màu hổ phách, nút chuyển đổi xem bản chính thức / bản nháp, nút "Áp dụng vào bài học", và nút "Sinh Mindmap bằng AI".
    - `lesson-quiz-tab.tsx`: Hiển thị danh sách 10 câu hỏi trắc nghiệm bám sát timeline video, thẻ câu hỏi, 4 lựa chọn (A/B/C/D) với icon check và border xanh lục (emerald) cho đáp án đúng, khung giải thích chi tiết (explanation), banner bản nháp, và nút "Áp dụng làm chính thức".
    - `lesson-summary-tab.tsx`: Hiển thị tổng quan (Overview), danh sách các ý chính (Key Points) kèm thẻ tua video `[mm:ss]`, khung kết luận sư phạm (Conclusion), banner bản nháp, và nút "Áp dụng làm chính thức".
    - `index.ts`: Re-export toàn bộ components tabs.
  - **`frontend/src/features/course/components/player/lesson-tabs-container.tsx`**:
    - Nhúng 3 tab con hoàn chỉnh vào horizontal tab bar.
    - Gắn sự kiện `handleTestAi` cho 3 nút "Test AI" trên tab bar, tự động kích hoạt mutation tương ứng và chuyển tab.
  - **`frontend/src/features/course/components/player/lesson-player-studio.tsx`**:
    - Kết nối `LessonTabsContainer` với `player.currentTime`, `player.duration`, và `player.seek` để đồng bộ thời gian thực khi người dùng click vào các timestamp.
- **Testing & Quality Assurance**:
  - `pnpm --filter frontend exec tsc --noEmit`: 100% Type-check thành công (0 errors).
  - `pnpm --filter frontend lint`: 100% Lint passed (0 errors, 0 warnings).

---

## 10. Dev History: Fix Mindmap Prompt Template String Syntax Errors (2026-10-17)

- **Bối cảnh & Triệu chứng**:
  - Backend gặp lỗi biên dịch TypeScript (`nest build` thất bại với 25 lỗi cú pháp `TS1005: ';' expected`, `TS2304: Cannot find name 'start'`, `TS1443`).
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Trong phương thức `buildMindmapPrompt` của [mindmap-analysis.service.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/transcript-analysis/services/mindmap-analysis.service.ts), chuỗi prompt sử dụng template literal (bọc bằng dấu backtick \`...\`). Bên trong nội dung prompt tại các dòng mô tả quy tắc cấu trúc cây (mục III, IV) lại chứa các ký tự backtick không được escape (\`start\`, \`end\`, \`sentences\`, \`title\`, \`startTime\`).
  - Dấu backtick này làm đóng chuỗi template literal sớm, khiến trình biên dịch TypeScript hiểu nhầm phần văn bản phía sau là mã TypeScript dẫn đến hàng loạt lỗi cú pháp.
- **Giải pháp**:
  - Chuyển toàn bộ các ký tự backtick bên trong chuỗi template literal sang dấu nháy kép chuẩn (`"start"`, `"end"`, `"sentences"`, `"title"`, `"timestamp"`).
  - Chuẩn hóa tên trường trong quy tắc IV thành `"timestamp"` (đơn vị: giây) để đồng bộ hoàn toàn với cấu trúc dữ liệu `ILessonMindmapNode.timestamp` và `MindmapValidator`.
- **Kiểm thử & Xác minh**:
  - `pnpm --filter backend build`: Thành công 100% (0 errors).
  - `pnpm --filter backend test`: 43 test files (499 unit/integration tests) pass 100%.

---

## 11. Dev History: Fix In-Video Quiz Generation Schema Case Sensitivity & Robust Sanitization (2026-10-17)

- **Bối cảnh & Triệu chứng**:
  - Khi người dùng/giảng viên bấm sinh câu hỏi Quiz bằng AI (`POST /api/v1/lessons/:id/analysis/quiz`), hệ thống phản hồi lỗi `422 Unprocessable Entity`:
    `"Danh sách câu hỏi trắc nghiệm không hợp lệ: Câu hỏi số 1 có questionType không hợp lệ (yêu cầu "single").; ..."`
  - Toàn bộ 10 câu hỏi sinh ra đều bị reject khiến bản nháp Quiz không được lưu và hiển thị trên giao diện.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Trong `buildQuizPrompt` ([quiz-generation.service.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/transcript-analysis/services/quiz-generation.service.ts)), prompt hướng dẫn và mẫu JSON yêu cầu Gemini trả về `"questionType": "SINGLE"` (viết hoa).
  - Tuy nhiên, trong `share-lib` định nghĩa `QuizQuestionTypeEnum.SINGLE = 'single'` (viết thường).
  - Trong `QuizValidator` ([quiz.validator.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/transcript-analysis/validators/quiz.validator.ts)), logic kiểm tra so sánh nghiêm ngặt `item.questionType !== QuizQuestionTypeEnum.SINGLE`, dẫn đến `'SINGLE' !== 'single'` và từ chối toàn bộ danh sách câu hỏi.
- **Giải pháp**:
  - **Prompt Fix**: Cập nhật `buildQuizPrompt` yêu cầu rõ ràng `"questionType": "single"` khớp chính xác với `QuizQuestionTypeEnum.SINGLE`.
  - **Case-Insensitive Validation**: Cập nhật `QuizValidator.validate` chuẩn hóa `(item.questionType || '').toLowerCase()` để chấp nhận linh hoạt cả `'SINGLE'`, `'single'`, đồng thời hỗ trợ `isCorrect` dạng chuỗi boolean (`'true'`).
  - **Dữ liệu AI Robust Sanitizer**: Bổ sung hàm `sanitizeAndNormalizeQuizzes` trong `QuizGenerationService`:
    - Xử lý các biến thể đầu ra của Gemini: dạng mảng thuần `[...]` hoặc bọc trong `{ quizzes: [...] }`, `{ data: [...] }`, `{ questions: [...] }`.
    - Tự động chuẩn hóa `timestamp` thành số nguyên làm tròn, clamp trong khoảng `[0, durationSeconds]`.
    - Sinh fallback `id` cho từng option nếu thiếu: `opt-${order}-${label}`.
    - Cắt gọn về đúng số lượng câu hỏi yêu cầu (`count`) nếu Gemini sinh thừa.
- **Kiểm thử & Xác minh**:
  - Mở rộng unit tests trong `quiz.validator.spec.ts` và `quiz-generation.service.spec.ts` bao phủ các trường hợp chữ hoa `'SINGLE'`, chuỗi boolean `'true'`, và hàm sanitizer.
  - Chạy `pnpm --filter backend test`: 43 test files (**502 tests**) pass 100%.
  - Gửi request thực tế tới backend live server: `POST /api/v1/lessons/6ad3918c7126d0485865d90b/analysis/quiz` phản hồi thành công `200 OK`, sinh đủ 10 câu hỏi chuẩn xác bám sát timeline bài học lịch sử.

---

## 12. Dev History: Lesson Summary Flow Redesign & Direct Inline Editing (2026-10-18)

- **Bối cảnh & Động lực**:
  - Chuyển đổi luồng hoạt động của tab Tóm tắt bài học (Summary): Bỏ bước trung gian "Chờ áp dụng" (loại bỏ banner màu hổ phách `Bản tóm tắt bài học mới từ AI đang chờ áp dụng` kèm 2 nút áp dụng / xem bản nháp).
  - Khi AI sinh dữ liệu hoặc khi tải trang, tóm tắt tự động trở thành bản chính thức của bài học.
  - Loại bỏ hoàn toàn khu vực "Kết luận & điểm ghi nhớ cốt lõi" (`conclusion`).
  - Hỗ trợ Giảng viên chỉnh sửa trực tiếp (Inline Editing):
    - Biểu tượng cây bút chì (`lucide:pencil`) trên từng card để sửa tiêu đề, mốc thời gian, nội dung.
    - Biểu tượng dấu `+` (`lucide:plus`) trên thanh tiêu đề ý chính để thêm card mới (mặc định mốc `00:00`).
    - Nút xóa (`lucide:trash-2`) trên từng card ý chính.
- **Các thay đổi cốt lõi**:
  - **`share-lib`**:
    - `lesson-summary.interface.ts`: Chuyển `conclusion?: string` thành optional. Thêm interface `IUpdateLessonSummaryPayload`. Re-build `share-lib`.
  - **`backend`**:
    - `generate-summary.dto.ts`: Chuyển default `saveAsDraft` từ `true` sang `false` để tự động lưu chính thức.
    - `update-summary.dto.ts`: Tạo mới `UpdateLessonSummaryDto` & `LessonSummaryKeyPointDto` với validation `class-validator` và whitespace trim.
    - `summary.validator.ts`: Đổi kiểm tra `conclusion` thành optional (chỉ kiểm tra nếu có giá trị).
    - `summary-generation.service.ts`:
      - `buildSummaryPrompt`: Bỏ yêu cầu sinh `conclusion` để tập trung chất lượng trích xuất các ý chính then chốt.
      - `generateSummary`: Mặc định lưu trực tiếp bản chính thức qua `lessonSummaryRepo.upsertOfficialByLessonId`.
      - `updateSummary`: Cung cấp hàm cập nhật tóm tắt chính thức trực tiếp từ DTO của giảng viên.
    - `transcript-analysis.controller.ts`: Bổ sung `@Put(':id/analysis/summary')` phân quyền `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`.
  - **`frontend`**:
    - `transcript-analysis.api.ts`: Thêm method `updateSummary` và React Query hook `useUpdateSummaryMutation`. Đổi mặc định `generateSummary` thành `{ saveAsDraft: false }`.
    - `lesson-summary-tab.tsx`:
      - Loại bỏ banner hổ phách chờ áp dụng, nút chuyển đổi draft/official, và box kết luận.
      - Chế độ Inline Edit cho Card Tổng quan (Title & Overview) với nút Lưu/Hủy riêng biệt.
      - Nút `+ Thêm ý chính` trên header Key Points, khởi tạo mốc 00:00 và mở form nhập liệu ngay.
      - Chế độ Inline Edit cho từng card ý chính với các trường Tiêu đề, Mốc thời gian (có nút tiện ích "Hiện tại" lấy timestamp video), Nội dung chi tiết.
      - Nút xóa ý chính với validation giữ lại ít nhất 1 ý.
      - Thêm tùy chọn "Soạn thủ công" ở trạng thái chưa có dữ liệu.
- **Kiểm thử & Xác minh**:
  - Backend tests: Toàn bộ unit tests cho `summary.validator.spec.ts` (9 tests), `summary-generation.service.spec.ts` (11 tests), `transcript-analysis.controller.spec.ts` (10 tests) pass 100%.
  - Backend compile: `nest build` thành công 100% (0 errors).
  - Frontend compile: `next build` thành công 100% (0 errors).

---

## 13. Dev History: In-Video Quiz Quality Prompt & Flexible Ceiling Generation (2026-10-19)

- **Bối cảnh & Động lực**:
  - Trước đây, prompt AI và validator ép cứng sinh **ĐÚNG** 10 câu hỏi (`quizzes.length !== 10` sẽ bị lỗi 422). Điều này dẫn đến việc Gemini phải chia nhỏ gượng ép các ý vụn vặt hoặc lặp lại kiến thức để cho đủ 10 câu khi bài giảng ngắn.
  - Người dùng yêu cầu chuyển đổi tư duy sư phạm: **"Chất lượng hơn số lượng"** - Đặt trần tối đa 10 câu hỏi (hoặc theo mức trần giảng viên chọn), AI tự đánh giá nội dung transcript để quyết định số lượng câu hỏi phù hợp (ví dụ 4, 6, 8 câu). Nếu transcript quá ngắn hoặc không đủ kiến thức chất lượng thì sinh ít hơn, thậm chí trả về 0 câu (`[]`).
- **Các thay đổi cốt lõi**:
  - **`backend`**:
    - `quiz.validator.ts`:
      - Đổi kiểm tra số lượng từ ép cứng `quizzes.length !== expectedCount` sang giới hạn trần `quizzes.length > maxCount`.
      - Hỗ trợ linh hoạt từ 0 đến `maxCount` (mặc định 10 câu). Cho phép `quizzes.length === 0` hợp lệ mà không báo lỗi.
    - `quiz-generation.service.ts`:
      - `buildQuizPrompt`: Cập nhật prompt sư phạm chuyên sâu với các nguyên tắc: "Đánh giá trước - Quyết định sau", chỉ tạo câu hỏi khi có kiến thức quan trọng/giá trị học tập, không chia nhỏ gượng ép, không tạo câu hỏi vụn vặt/chào hỏi, không bịa ngoài transcript, trả về `{ quizzes: [] }` nếu không đủ dữ kiện.
      - `sanitizeAndNormalizeQuizzes`: Tự động cắt gọn về trần `maxCount`, tính fallback timestamp theo số lượng câu hỏi thực tế (`list.length`).
      - `generateQuiz`: Ghi log linh hoạt số lượng câu hỏi được tạo và lưu draft rỗng an toàn khi AI trả về 0 câu.
    - Unit tests:
      - Cập nhật `quiz.validator.spec.ts` và `quiz-generation.service.spec.ts` bổ sung test case cho 0 câu, 4 câu, 10 câu, và vượt quá 10 câu. Toàn bộ 74 tests pass 100%.
  - **`frontend`**:
    - `transcript-analysis.api.ts`:
      - Trong `useGenerateQuizMutation`: Thêm nhánh kiểm tra `res.quizzes.length === 0` để hiển thị `toast.info` nhẹ nhàng thay vì nhầm lẫn là lỗi.
    - `lesson-quiz-tab.tsx`:
      - Bổ sung bộ chọn trần số lượng câu hỏi `Select` (3, 5, 8, 10, 15, 20 câu, mặc định 10 câu).
      - Đổi nhãn nút từ `"Sinh 10 câu hỏi bằng AI"` thành `"Sinh câu hỏi bằng AI"` / `"Sinh lại câu hỏi AI"`.
      - Trạng thái loading: `"Đang phân tích & tạo câu hỏi..."`.
      - Hiển thị banner thông tin màu xanh dịu khi AI phân tích và trả về 0 câu hỏi do transcript quá ngắn.
      - Đồng bộ nút bấm và mô tả trong empty state với mốc trần `maxQuestions`.
- **Kiểm thử & Xác minh**:
  - Backend tests: `pnpm --filter backend test src/modules/transcript-analysis` chạy 7 files, 74 tests pass 100%.
  - Frontend TypeScript: `pnpm --filter frontend exec tsc --noEmit` pass 100% (0 errors).
  - Web preview: Trang chi tiết bài học `http://localhost:3000/instructor/courses/.../lessons/...` phản hồi 200 OK mượt mà.

---

## 14. Dev History: Streamlined Quiz Flow — Direct Official Persistence & Ceiling Fixed to 10 (2026-10-19)

- **Bối cảnh & Động lực**:
  - Sau khi trải nghiệm, người dùng nhận thấy việc có dropdown chọn trần câu hỏi và banner màu vàng chờ phê duyệt ("Bộ câu hỏi từ AI đang chờ duyệt") gây rườm rà không cần thiết.
  - Người dùng yêu cầu:
    1. Cố định mặc định trần là 10 câu hỏi (bỏ dropdown chọn trần).
    2. Loại bỏ hoàn toàn banner màu vàng chờ duyệt và các nút chuyển đổi bản nháp/chính thức.
    3. Khi AI sinh câu hỏi, kết quả tự động được lưu và áp dụng trực tiếp thành câu hỏi chính thức của bài học (tương tự như luồng Tóm tắt Summary).
- **Các thay đổi cốt lõi**:
  - **`backend`**:
    - `generate-quiz.dto.ts`: Cập nhật `saveAsDraft?: boolean = false` làm mặc định, `count?: number = 10`.
    - `quiz-generation.service.ts`:
      - Khi `saveAsDraft: false` (mặc định): Tự động chuyển đổi `IGeneratedQuizItem` sang format thực thể và gọi `lessonQuizRepo.replaceAllQuizzesForLesson`, đồng thời gọi `lessonQuizDraftRepo.clearDraftByLessonId` dọn sạch bản nháp cũ.
      - Bảo vệ dữ liệu: Nếu AI sinh ra 0 câu do transcript quá ngắn, không ghi đè danh sách rỗng lên câu hỏi chính thức hiện có.
    - `quiz-generation.service.spec.ts`: Bổ sung unit test xác nhận luồng lưu trực tiếp `replaceAllQuizzesForLesson` khi `saveAsDraft: false`. 12 tests pass 100%.
  - **`frontend`**:
    - `transcript-analysis.api.ts`:
      - Cập nhật mặc định `generateQuiz` với payload `{ count: 10, saveAsDraft: false }`.
      - Invalidate cache `lessonQuizKeys.byLesson(lessonId)` trong `useGenerateQuizMutation` để cập nhật bảng câu hỏi chính thức tức thì.
    - `lesson-quiz-tab.tsx`:
      - Loại bỏ component `Select`, state `maxQuestions`, state `viewMode`.
      - Loại bỏ hoàn toàn banner màu vàng chờ duyệt (`Instructor Draft Banner`) và các hook liên quan đến draft.
      - Danh sách hiển thị trực tiếp lấy từ `officialQuizzes`.
      - Nút hành động đơn giản, tinh tế: `[Sinh câu hỏi bằng AI]` / `[Sinh lại câu hỏi AI]`.
- **Kiểm thử & Xác minh**:
  - Backend tests: `pnpm --filter backend test src/modules/transcript-analysis` chạy 7 files, 75 tests pass 100%.
  - Frontend TypeScript: `pnpm --filter frontend exec tsc --noEmit` pass 100% (0 errors).
  - Web preview: Trang chi tiết bài học phản hồi HTTP 200, giao diện sạch sẽ, liền mạch.

---

## 15. Dev History: Instant Temporary Fallback Model on 503 UNAVAILABLE (2026-10-20)

- **Bối cảnh & Động lực**:
  - Khi gửi yêu cầu phân tích video (Summary, Mindmap, Quiz) lên Google Gemini API trong giờ cao điểm, hạ tầng Google đôi khi phản hồi `503 UNAVAILABLE: The model is overloaded. Please try again later.`.
  - Bản chất lỗi 503 là sự quá tải cụm máy chủ tạm thời của model cụ thể trên hạ tầng Google, hoàn toàn không phải do hết hạn mức quota API key (429 RESOURCE_EXHAUSTED).
  - Trước đây, `GeminiService` đưa key vào cooldown và thử key khác với cùng model `gemini-3.8-flash`, khiến các key khác cũng bị 503 và bị phạt cooldown oan.
  - Người dùng yêu cầu: Luôn ưu tiên dùng model 3.8 trước, nhưng khi một request gặp lỗi 503 UNAVAILABLE thì chuyển tạm thời ngay request đó sang model dự phòng `gemini-3.5-flash-lite`.
- **Các thay đổi cốt lõi**:
  - **`Config & Environment`**:
    - `env.validation.ts`: Bổ sung `GEMINI_FALLBACK_MODEL: Joi.string().default('gemini-3.5-flash-lite')`.
    - `.env` & `.env.example`: Cấu hình `GEMINI_MODEL=gemini-3.8-flash` và `GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite`.
  - **`Gemini Interfaces & Errors`**:
    - `gemini.interface.ts`: Bổ sung `isFallback?: boolean` vào `GeminiExecutionResult<T>`.
    - `gemini.errors.ts`: Thêm `GeminiModelUnavailableException` (kế thừa `GeminiServiceUnavailableException` với `requiresKeyRotation = false` và `isOverloaded = true`).
  - **`GeminiService`**:
    - Constructor nạp cả `configuredModel` (`gemini-3.8-flash`) và `fallbackModel` (`gemini-3.5-flash-lite`).
    - Trong `generateContent`:
      - Mỗi request bắt đầu bằng `usedModel = this.configuredModel` (luôn ưu tiên 3.8 trước).
      - Bắt lỗi SDK: nếu `usedModel === this.configuredModel` và gặp `GeminiModelUnavailableException` (503 UNAVAILABLE / model overloaded):
        - Ghi log WARN cảnh báo quá tải model.
        - Không phạt cooldown hay dead cho API key hiện tại.
        - Ngay lập tức chuyển tạm thời `usedModel = this.fallbackModel`, `isFallback = true` và thử lại ngay trên chính key hiện tại.
      - Trả về `model: usedModel` và `isFallback: boolean`.
      - Request mới tiếp theo tự động thử lại với `gemini-3.8-flash` trước (tính tạm thời).
  - **`Testing`**:
    - Cập nhật `gemini.service.spec.ts` với 12 test cases bao phủ toàn diện:
      1. Happy path với model chính 3.8 (`isFallback: false`).
      2. 503 UNAVAILABLE tự động chuyển tạm thời sang 3.5 (`isFallback: true`) mà không phạt cooldown key.
      3. Request tiếp theo tự động thử lại 3.8 trước.
      4. Rate limit 429 vẫn cooldown key và xoay key đúng chuẩn.
      5. Dual outage (cả 3.8 và 3.5 đều lỗi) ném ra `GeminiServiceUnavailableException`.
    - Toàn bộ 22 tests của `src/modules/gemini` và 75 tests của `src/modules/transcript-analysis` đều PASS 100%.
- **Technical Notes & Gotchas**:
---

## 16. Dev History: FFmpeg Audio Extraction & Speech-to-Text MP3 Optimization (2026-10-20)

- **Bối cảnh & Động lực**:
  - Ban đầu, `LessonTranscriptService.processTranscriptionTask` lấy stream video MP4 gốc trực tiếp từ MinIO qua `getObjectStream` và tải toàn bộ stream này lên AssemblyAI.
  - Video MP4 thường có kích thước rất lớn (vài trăm MB đến hơn 1GB) vì chứa luồng hình ảnh 1080p/720p, gây lãng phí băng thông nghiêm trọng, độ trễ upload cao và dễ timeout mạng.
  - Người dùng yêu cầu tối ưu hóa luồng: Dùng FFmpeg tách luồng âm thanh từ video MinIO sang file MP3 tạm với các tham số tối ưu chuyên biệt cho AI Speech-to-Text (`-vn`, `-ac 1`, `-ar 16000`, `-c:a libmp3lame`, `-b:a 64k`, `-y`), gửi file MP3 lên AssemblyAI, và tự động dọn dẹp xóa file tạm sau khi nhận transcript (hoặc khi gặp lỗi).
- **Các thay đổi cốt lõi**:
  - **`Package & Dynamic Binary Resolution`**:
    - Cài đặt `ffmpeg-static` và `@types/ffmpeg-static`, đồng thời cấu hình `allowBuilds` và `onlyBuiltDependencies` trong `pnpm-workspace.yaml`.
    - Bổ sung cấu hình `FFMPEG_PATH` trong `.env`, `.env.example` và `env.validation.ts`.
    - Thứ tự ưu tiên phân giải binary: `FFMPEG_PATH` -> `ffmpeg-static` -> `ffmpeg` hệ thống.
  - **`AudioExtractorService`**:
    - Tạo `backend/src/modules/course/services/audio-extractor.service.ts` chịu trách nhiệm duy nhất là điều phối FFmpeg.
    - Thực thi FFmpeg thông qua `promisify(execFile)` với timeout 10 phút và đầy đủ tham số tối ưu cho ASR.
    - Cung cấp method `cleanupTempFile` dọn dẹp file tạm an toàn tại `os.tmpdir()`.
  - **`AssemblyAiService`**:
    - Mở rộng interface `IAssemblyAiService` và `AssemblyAiService` với phương thức `transcribeFile(filePath, options)`.
    - Đọc file qua `fs.createReadStream` và upload trực tiếp lên AssemblyAI staging storage.
  - **`LessonTranscriptService`**:
    - Cập nhật `processTranscriptionTask`:
      1. Tạo presigned download URL từ MinIO qua `storageService.getPresignedStreamUrl(videoKeyOrUrl, 3600)`.
      2. Kích hoạt `audioExtractorService.extractMp3FromVideo` trích xuất file tạm MP3.
      3. Gọi `assemblyAiService.transcribeFile(tempAudioPath, { languageCode: 'vi' })`.
      4. Bọc toàn bộ trong khối `try ... finally` để luôn gọi `audioExtractorService.cleanupTempFile(tempAudioPath)` bảo đảm không rò rỉ dung lượng ổ đĩa máy chủ.
  - **`Testing & Quality Assurance`**:
    - Viết unit tests mới trong `audio-extractor.service.spec.ts` (10 tests).
    - Cập nhật unit tests trong `lesson-transcript.service.spec.ts` (12 tests).
    - Cập nhật unit tests trong `assemblyai.service.spec.ts` (16 tests).
    - Toàn bộ 534 tests của backend đều PASS 100%. Linter và `nest build` hoàn toàn sạch lỗi.
- **Technical Notes & Gotchas**:
  - **Range Request Streaming**: Truyền presigned URL trực tiếp vào FFmpeg `-i <url>` giúp FFmpeg chỉ đọc phần audio metadata và audio packets qua HTTP Range Requests, hoàn toàn không phải tốn I/O tải hàng trăm MB video MP4 về đĩa local.
  - **Guaranteed Cleanup**: Luôn đặt việc xóa file tạm trong khối `finally` để tránh rủi ro đĩa bị đầy khi AssemblyAI gặp sự cố mạng hoặc MongoDB ném ngoại lệ.

---

## 19. Dev History: River AI Integration as Level 3 Fallback Provider via OpenAI SDK (2026-10-23)

- **Bối cảnh & Động lực**:
  - Hệ thống hiện dùng Google Gemini (6 rotating API keys + fallback 3.5-flash-lite khi 503).
  - Để đảm bảo tính sẵn sàng cao (High Availability), người dùng yêu cầu tích hợp thêm nhà cung cấp dự phòng bên ngoài: **River AI** (`river.ai`) với giao thức tương thích OpenAI chuẩn (`https://api.river.ai/v1`).
  - Định hướng: Tận dụng 100% luồng nghiệp vụ hiện có của Gemini (`GeminiService`), không sửa đổi các service nghiệp vụ (`SummaryGenerationService`, `MindmapAnalysisService`, `QuizGenerationService`), không viết lại logic parse JSON / Markdown fences.
- **Các thay đổi cốt lõi**:
  - **`Package & Dependencies`**:
    - Cài đặt package `openai` (`^7.41.0`) cho `backend`.
  - **`Environment Configuration`**:
    - Cập nhật `.env.example` và `backend/src/config/env.validation.ts`: `RIVER_API_KEY`, `RIVER_BASE_URL` (default: `https://api.river.ai/v1`), `RIVER_MODEL` (default: `deepseek-ai/DeepSeek-V3`), `RIVER_TIMEOUT_MS` (default: `60000`).
  - **`GeminiService`**:
    - Khởi tạo client `OpenAI` với `baseURL: this.riverBaseUrl`.
    - Tách luồng `generateContent`: bọc lời gọi `executeGeminiWithRetry` trong khối `try ... catch`.
    - Khi cụm Gemini cạn quota (429) hoặc sập toàn bộ (503/network) sau 3 lần thử, nếu có cấu hình `RIVER_API_KEY`, tự động kích hoạt `callRiverAiFallback`.
    - Chuẩn hóa kết quả trả về tương thích `GeminiExecutionResult<string>` với `model: 'riverai:deepseek-ai/DeepSeek-V3'`, `isFallback: true`.
    - Hàm `generateJson<T>` tự động tái sử dụng bóc tách Markdown code fences và parse JSON an toàn từ River AI mà không cần viết lại.
  - **`Testing & Quality Assurance`**:
    - Bổ sung mock `openai` và 4 test cases cho River AI Fallback trong `gemini.service.spec.ts`.
    - 16/16 test cases của `gemini` và 75/75 test cases của `transcript-analysis` đều PASS 100%. Linter 0 lỗi.
- **Cập nhật Điều phối Ưu tiên (Provider Priority Switching)**:
  - Bổ sung cấu hình `AI_PRIMARY_PROVIDER` (`'RIVER' | 'GEMINI'`, mặc định `'RIVER'`).
  - Cập nhật model mặc định sang `deepseek-ai/DeepSeek-V4.1-Flash`.

---

## 20. Dev History: Auto-Sync Transcript Timeline & Smart Polling Backoff (2026-10-23)

- **Bối cảnh & Động lực**:
  - Khi tải video bài giảng lên MinIO, hệ thống kích hoạt trích xuất AssemblyAI ngầm (Asynchronous background task) theo Rule 7.
  - Tuy nhiên, trên giao diện người dùng (`LessonPlayerStudio`), tab Timeline bị kẹt ở trạng thái xoay vòng (`lucide:loader-2 animate-spin`) vô thời hạn, chỉ khi F5 / reload lại toàn bộ trang thì danh sách câu nói mới xuất hiện.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - **Missing Polling**: Hook `useLessonTranscriptQuery` trong `frontend/src/features/course/api/course.api.ts` chỉ fetch 1 lần lúc component mount, có `staleTime: 60s` và hoàn toàn không cấu hình `refetchInterval`.
  - **404 Stoppage**: Khi vào bài học ngay tức thì khi record DB chưa tạo xong, backend trả về 404 và frontend có logic `if (status === 404) return false;` khiến query dừng retry vĩnh viễn.
  - **Unsynchronized Duration & Status**: Khi transcript hoàn tất (`READY`), thời lượng video và trạng thái bài học cập nhật trong MongoDB nhưng player frontend không nhận được tín hiệu invalidate cache.
- **Các thay đổi cốt lõi**:
  - **`Backend (LessonTranscriptService)`**:
    - Trong `getTranscriptByLessonId(lessonId)`: Nếu bản ghi transcript chưa tạo kịp trong `lesson_transcripts`, service kiểm tra `lessonRepo`. Nếu bài học tồn tại và đang có `transcriptionStatus` là `TRANSCRIBING` hoặc `QUEUED`, trả về đối tượng transcript tiến trình (transient status: `{ status: lesson.transcriptionStatus, sentences: [] }`) thay vì ném ngoại lệ 404 làm ngắt mạch client.
    - Bổ sung unit tests kiểm thử trường hợp transient status và case 404 thực sự khi không tìm thấy bài học (13/13 unit tests PASS).
  - **`Frontend API (course.api.ts)`**:
    - Nâng cấp `useLessonTranscriptQuery(lessonId, currentLessonStatus)` tích hợp **Smart Polling với Exponential Backoff**:
      - 5 lần thăm dò đầu tiên (~15s): Thăm dò mỗi 3 giây (`3000ms`).
      - 5 lần thăm dò tiếp theo (~25s): Thăm dò mỗi 5 giây (`5000ms`).
      - Các lần thăm dò sau đó (tối đa 5 phút): Thăm dò mỗi 10 giây (`10000ms`).
      - Dừng polling tự động ngay khi `status === READY` hoặc `FAILED` hoặc quá 5 phút timeout.
      - Cho phép retry nếu gặp 404 tạm thời trong khi lesson đang `TRANSCRIBING`.
  - **`Frontend UI & State Sync (LessonPlayerStudio & LessonTimelineTab)`**:
    - `LessonPlayerStudio`: Nhận diện sự kiện chuyển giao trạng thái từ `TRANSCRIBING/QUEUED` sang `READY`, âm thầm invalidate `useLessonDetailQuery` và `courseKeys.sections` để cập nhật thời lượng video chuẩn và danh sách bài học mà không bật popup phiền toái.
    - `LessonTimelineTab`: Hỗ trợ hiển thị cả trạng thái `QUEUED` và `TRANSCRIBING` kèm badge "Tự động cập nhật" (pulsing animation) và nút "Kiểm tra lại" thủ công (`onRefreshTranscription`).
- **Technical Notes & Gotchas**:
  - **React Query Dynamic staleTime**: Cần đặt `staleTime: 0` khi query đang ở trạng thái `TRANSCRIBING` để React Query luôn chấp nhận phản hồi mới nhất từ server thay vì giữ dữ liệu cũ trong 60 giây.

---

## 21. Dev History: River AI Multi-Key Rotation & Dual Model Fallback Pipeline (2026-10-23)

- **Bối cảnh & Động lực**:
  - Người dùng bổ sung thêm 2 API key của River AI (tổng 3 key) và yêu cầu cơ chế xoay API key tự động tương tự Google Gemini (`ACTIVE`, `COOLDOWN`, `DEAD`, Round-Robin).
  - Bổ sung cơ chế xoay Model tức thời: Nếu model chính (`RIVER_MODEL_1`, ví dụ: DeepSeek V4.1 Flash) không phản hồi, bị timeout mạng hoặc lỗi máy chủ 500/503, hệ thống sẽ tự động chuyển sang model dự phòng (`RIVER_MODEL_2`, ví dụ: DeepSeek V3) với key tiếp theo ngay lập tức.
- **Các thay đổi cốt lõi**:
  - **`Environment Configuration`**:
    - `backend/.env.example`: Cung cấp cấu hình mẫu cho `RIVER_MODEL_1`, `RIVER_MODEL_2`, `RIVER_API_KEY_1`, `RIVER_API_KEY_2`, `RIVER_API_KEY_3` (vẫn duy trì biến đơn `RIVER_MODEL`, `RIVER_API_KEY` để tương thích ngược).
    - `backend/src/config/env.validation.ts`: Bổ sung Joi schema validation cho các biến River AI mới.
  - **`RiverKeyManager` (`src/modules/gemini/river-key.manager.ts`)**:
    - Quản lý 3 API key River theo thuật toán Round-Robin.
    - Che giấu API key an toàn trong logs theo chuẩn PII (`maskKey`).
    - Xử lý trạng thái sức khỏe: Phục hồi sau Cooldown, Cooldown 30s với Exponential Backoff khi gặp 429, đánh dấu Dead khi gặp 401/403.
    - Caching OpenAI client SDK instance theo từng key và base URL.
  - **`GeminiService` (`src/modules/gemini/gemini.service.ts`)**:
    - Inject `RiverKeyManager` (hỗ trợ `@Optional()` để tương thích ngược tuyệt đối).
    - Tích hợp vòng lặp retry 3 lần: khi `RIVER_MODEL_1` gặp sự cố (timeout, 5xx, không phản hồi), tự động đổi sang `RIVER_MODEL_2` với key tiếp theo.
    - Nếu toàn bộ các key và model của River AI đều cạn kiệt, tự động chuyển tiếp sang cụm Google Gemini 6 key.
  - **`Testing & CLI Tool`**:
    - `backend/scripts/test-river.ts`: Script CLI độc lập kiểm tra kết nối, độ trễ và tính sẵn sàng của từng key cũng như model River AI (`pnpm test:river`).
    - `backend/src/modules/gemini/tests/river-key.manager.spec.ts`: 12 test cases cho `RiverKeyManager`.
    - `backend/src/modules/gemini/tests/gemini.service.spec.ts`: Bổ sung test cases cho xoay key và xoay model của River AI.
    - 555/555 backend tests PASS 100%, linter 0 lỗi.
- **Technical Notes & Gotchas**:
  - **Phân biệt loại lỗi cho Cooldown**: Timeout mạng hoặc lỗi server 500/503 tạm thời không phạt Cooldown cho key (để có thể tái sử dụng ngay cho Model 2 hoặc request tiếp theo); chỉ đưa key vào Cooldown khi nhận đúng mã lỗi 429 Rate Limit.
  - **Constructor Backward Compatibility**: Khi thêm dependency mới vào Service, sử dụng `@Optional()` và fallback `riverKeyManager ?? new RiverKeyManager(configService)` trong constructor để không làm hỏng các test suite khởi tạo thủ công trước đó.










