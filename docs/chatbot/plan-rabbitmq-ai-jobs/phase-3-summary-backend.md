# Giai Đoạn 3: Summary Backend Async

> **Thuộc kế hoạch:** [`docs/chatbot/plan-rabbitmq-ai-jobs/README.md`](./README.md)  
> **Trạng thái:** Sẵn sàng thực hiện  
> **Giai đoạn trước:** [`phase-2-job-management.md`](./phase-2-job-management.md)  
> **Mục tiêu:** Chuyển đổi tác vụ sinh tóm tắt bài học (Summary) từ xử lý đồng bộ HTTP sang xử lý bất đồng bộ qua hàng đợi RabbitMQ và Worker; đảm bảo tính toàn vẹn dữ liệu bằng Transaction ngắn và cơ chế chống ghi đè phiên bản (Revision Guard).

---

## 1. Mục Tiêu Giai Đoạn

1. **Loại Bỏ `await` AI Trong HTTP Request:** Endpoint `POST /lessons/:id/analysis/summary` chuyển sang tạo Job và trả về ngay lập tức HTTP `202 Accepted` kèm `jobId`.
2. **Tách Biệt Trách Nhiệm Của Service:** Tách `SummaryGenerationService` thành 2 phần độc lập:
   - Phần 1: Gọi AI và kiểm tra tính hợp lệ của dữ liệu (AI generation & validation - chạy ngoài transaction).
   - Phần 2: Lưu kết quả vào cơ sở dữ liệu có hỗ trợ MongoDB Session (`ClientSession`).
3. **Thực Thi Hoàn Tất Nguyên Tử (Atomic Completion):** Worker gọi AI xong sẽ mở một Transaction ngắn thực hiện đồng thời: kiểm tra `leaseToken`, lưu `LessonSummary`, cập nhật Job thành `completed` (`active: false`) và tăng `analysisOutputRevisions.summary`.
4. **Bảo Vệ Chống Ghi Đè (Revision Fencing):** Nếu giảng viên sửa nội dung bài học hoặc tóm tắt thủ công trong lúc AI đang chạy, Worker sẽ hủy commit và đánh dấu Job kết thúc với mã lỗi `INPUT_CHANGED` hoặc `TARGET_CHANGED`.
5. **Kiểm Soát Rollout Bằng Feature Flag:** Sử dụng biến môi trường `AI_ASYNC_TYPES=summary` để kích hoạt async cho riêng Summary trong khi Quiz và Mindmap vẫn giữ nguyên.

---

## 2. Thiết Kế Kỹ Thuật Chi Tiết

### 2.1. Cập Nhật Revision Trên Schema `Lesson`

Bổ sung các trường revision kỹ thuật vào `backend/src/modules/course/schemas/lesson.schema.ts`:

```typescript
// Các trường revision kiểm soát đồng thời
analysisInputRevision: { type: Number, default: 0 },
analysisOutputRevisions: {
  summary: { type: Number, default: 0 },
  quiz: { type: Number, default: 0 },
  mindmap: { type: Number, default: 0 }
}
```
- `analysisInputRevision`: Tăng lên mỗi khi transcript của bài học thay đổi.
- `analysisOutputRevisions.summary`: Tăng lên mỗi khi tóm tắt được tạo mới, cập nhật hoặc apply từ draft.

### 2.2. Tách Service `SummaryGenerationService`

```typescript
@Injectable()
export class SummaryGenerationService extends BaseService {
  // BƯỚC 1: Sinh và kiểm tra hợp lệ (Thuần túy tính toán + gọi mạng, không DB transaction)
  async generateSummaryContent(
    lessonId: string,
    options: SummaryGenerationOptions
  ): Promise<ValidatedSummaryContent> {
    // 1. Lấy transcript và validate trạng thái READY
    // 2. Chuẩn bị prompt và gọi Gemini / OpenAI qua facade
    // 3. Chạy qua SummaryValidator để đảm bảo cấu trúc JSON và timestamp
    // 4. Trả về kết quả đã validate
  }

  // BƯỚC 2: Lưu vào DB có session (Chạy trong transaction ngắn)
  async persistSummaryWithSession(
    lessonId: string,
    summaryData: ValidatedSummaryContent,
    options: {
      saveAsDraft: boolean;
      expectedRevision: number;
      session: ClientSession;
    }
  ): Promise<LessonSummaryDocument> {
    // 1. Kiểm tra expectedRevision với revision hiện tại của Lesson
    // 2. Lưu hoặc cập nhật LessonSummary / Draft
    // 3. Tăng analysisOutputRevisions.summary của Lesson
  }
}
```

### 2.3. Quy Trình Xử Lý Của Summary Processor Trong Worker

```text
Worker nhận Message từ RabbitMQ
    │
    ▼
1. Atomic Claim Job
   ├── Cập nhật status: 'processing', sinh leaseToken mới, gia hạn leaseExpiresAt
   └── Khởi động Heartbeat timer định kỳ (mỗi 15s)
    │
    ▼
2. Kiểm tra điều kiện tiên quyết
   ├── Lấy thông tin Lesson và Course
   ├── Kiểm tra trạng thái Course (nếu PENDING_APPROVAL -> Abort với REJECTED_STATUS)
   └── Kiểm tra inputRevision hiện tại khớp với inputRevision lúc tạo Job
    │
    ▼
3. Gọi AI Generator (Ngoại vi - KHÔNG MỞ TRANSACTION)
   ├── Gọi Gemini / OpenAI qua SummaryGenerationService.generateSummaryContent()
   ├── Áp dụng Timeout và AbortSignal
   └── Nhận kết quả đã validate
    │
    ▼
4. Transaction Ngắn (ClientSession - vài milliseconds):
   ├── Mở session: await connection.startSession()
   ├── withTransaction(async (session) => {
   │      a. Fencing check: Xác nhận Job vẫn mang leaseToken hiện tại và status = 'processing'
   │      b. Revision check: Xác nhận analysisOutputRevisions.summary không bị thay đổi
   │      c. Lưu LessonSummary (hoặc draft) bằng session
   │      d. Đánh dấu Job: status = 'completed', phase = 'completed', active = false, resultRef = summary._id
   │      e. Tăng Lesson.analysisOutputRevisions.summary lên 1
   │   })
    │
    ▼
5. Manual ACK Message về RabbitMQ
```

### 2.4. Phản Hồi Controller Khi Bật Flag `AI_ASYNC_TYPES`

```typescript
@Post(':id/analysis/summary')
async generateSummary(
  @Param('id') lessonId: string,
  @Body() dto: GenerateSummaryDto,
  @Headers('idempotency-key') idempotencyKey?: string,
): Promise<ApiResponse<any>> {
  if (this.isAsyncEnabled(JobType.SUMMARY)) {
    const job = await this.analysisJobService.enqueueSummaryJob({
      lessonId,
      dto,
      idempotencyKey,
    });
    return ApiResponse.accepted({
      jobId: job._id,
      lessonId: job.lessonId,
      type: job.type,
      status: job.status,
      phase: job.phase,
      statusUrl: `/api/v1/lessons/${lessonId}/analysis/jobs/${job._id}`
    }, 'Đã tiếp nhận yêu cầu tạo tóm tắt bài học');
  }

  // Fallback về đường đồng bộ cũ nếu flag chưa bật
  const result = await this.summaryService.generateSummarySync(lessonId, dto);
  return ApiResponse.success(result);
}
```

---

## 3. Ma Trận File Thay Đổi

| File | Hành động | Mục đích |
|---|---|---|
| `backend/src/modules/course/schemas/lesson.schema.ts` | Chỉnh sửa | Bổ sung `analysisInputRevision` và `analysisOutputRevisions` |
| `backend/src/modules/course/repositories/lesson.repository.ts` | Chỉnh sửa | Bổ sung method kiểm tra và tăng revision có điều kiện |
| `backend/src/modules/course/repositories/lesson-summary.repository.ts` | Chỉnh sửa | Thêm tham số `session?: ClientSession` vào các method save/update |
| `backend/src/modules/transcript-analysis/services/summary-generation.service.ts` | Chỉnh sửa | Tách thành 2 method: `generateSummaryContent` và `persistSummaryWithSession` |
| `backend/src/modules/transcript-analysis/processors/analysis-job.processor.ts` | **Tạo mới** | Consumer xử lý tác vụ `ai.summary` trong tiến trình Worker |
| `backend/src/modules/transcript-analysis/transcript-analysis.controller.ts` | Chỉnh sửa | Kiểm tra `AI_ASYNC_TYPES` và trả `202 Accepted` |
| `backend/src/modules/transcript-analysis/transcript-analysis.module.ts` | Chỉnh sửa | Đăng ký Processor và JobsModule |
| `backend/src/modules/transcript-analysis/tests/summary-job-processor.spec.ts` | **Tạo mới** | Unit test cho luồng async summary processor |

---

## 4. Danh Sách Nhiệm Vụ Cụ Thể (Checklist)

- [ ] Cập nhật schema `Lesson` với các trường revision và chạy migration/seed điều chỉnh nếu cần.
- [ ] Cập nhật `LessonSummaryRepository` để chấp nhận `ClientSession` trong các phương thức write.
- [ ] Refactor `SummaryGenerationService` chia tách rõ ràng giữa khâu gọi AI và khâu ghi cơ sở dữ liệu.
- [ ] Xây dựng `AnalysisJobProcessor` (chuyên trách xử lý tác vụ Summary) với:
  - Atomic claim và kiểm tra lease token.
  - Heartbeat định kỳ.
  - Xử lý lỗi phân loại: lỗi tạm thời (429, timeout) -> lên lịch retry; lỗi vĩnh viễn (key hỏng, transcript thiếu) -> đánh dấu `failed`.
  - Transaction ngắn lưu kết quả và đánh dấu Job hoàn tất.
  - Gửi Manual ACK cho RabbitMQ.
- [ ] Điều chỉnh `TranscriptAnalysisController`: Khi `AI_ASYNC_TYPES` chứa `summary`, trả về HTTP `202 Accepted`.
- [ ] Giữ nguyên API `GET /lessons/:id/analysis/summary` phục vụ việc đọc tóm tắt sau khi Job hoàn tất.
- [ ] Viết bộ unit test mô phỏng Worker chết trước commit và Worker chết sau commit trước ACK.

---

## 5. Kịch Bản Kiểm Thử & Nghiệm Thu (Verification)

1. **Happy Path Async Summary:** Gửi `POST /summary` -> nhận ngay HTTP 202 kèm `jobId`. Worker nhận việc, gọi AI thành công, lưu kết quả vào `lesson_summaries`. Gọi `GET /summary` nhận đúng nội dung tóm tắt.
2. **Crash Sau Commit Trước ACK:** Mô phỏng Worker crash ngay sau khi commit transaction thành công nhưng chưa kịp gửi ACK. Khi Worker khởi động lại và nhận lại message đó: Worker thấy Job đã `status: completed` nên thực hiện **ACK ngay và bỏ qua, không gọi lại AI lần 2**.
3. **Chống Ghi Đè Khi Giảng Viên Sửa Đổi (Revision Guard):** Giảng viên gửi yêu cầu tạo AI. Trong lúc Worker đang gọi AI, giảng viên chủ động sửa tóm tắt thủ công hoặc upload transcript mới. Khi Worker cố commit: phát hiện revision đã thay đổi -> Hủy bỏ commit, đánh dấu Job là `failed` với mã lỗi `TARGET_CHANGED` để bảo vệ bản sửa tay của giảng viên.
4. **Khóa Học Chờ Duyệt (PENDING_APPROVAL):** Khi khóa học chuyển sang `PENDING_APPROVAL` trong lúc Job đang chờ xử lý; Worker kiểm tra trạng thái bài học trước khi commit và từ chối cập nhật.
5. **AI Gặp Lỗi Quota (429):** Mô phỏng AI trả về lỗi Rate Limit; Job được chuyển về `status: queued`, `phase: waiting_retry`, tính toán `nextRunAt` dựa trên jitter backoff và được dispatcher gửi lại sau đó.

---

## 6. Tiêu Chí Nghiệm Thu (Exit Gate)

Giai đoạn 3 hoàn thành khi:
- [ ] Khi bật `AI_ASYNC_TYPES=summary`, không còn lời gọi AI Summary nào diễn ra đồng bộ trong tiến trình HTTP.
- [ ] Thời gian phản hồi của `POST /summary` giảm xuống dưới 1000ms (chỉ tốn thời gian insert Job vào MongoDB).
- [ ] Transaction lưu kết quả chỉ kéo dài dưới 100ms.
- [ ] 100% các ca redelivery không tạo ra dữ liệu trùng lặp hoặc gọi lại AI vô nghĩa.
- [ ] Toàn bộ unit tests và integration tests của Summary đạt 100% pass.

---

## 7. Kế Hoạch Rollback

Nếu Summary async gặp sự cố trong quá trình thử nghiệm:
1. Đặt biến môi trường `AI_ASYNC_TYPES=""` (hoặc loại bỏ `summary`).
2. Khởi động lại API Backend. Hệ thống sẽ tự động chuyển về cơ chế `await` đồng bộ cũ ngay lập tức mà không cần sửa code.
3. Chờ Worker xử lý nốt các Job Summary đang dang dở trong hàng đợi hoặc hủy chúng trong MongoDB.
