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


