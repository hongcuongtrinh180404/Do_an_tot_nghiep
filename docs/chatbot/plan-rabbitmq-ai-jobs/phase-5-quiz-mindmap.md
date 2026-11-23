# Giai Đoạn 5: Mở Rộng Queue Cho Quiz & Mindmap

> **Thuộc kế hoạch:** [`docs/chatbot/plan-rabbitmq-ai-jobs/README.md`](./README.md)  
> **Trạng thái:** Sẵn sàng thực hiện  
> **Giai đoạn trước:** [`phase-4-summary-frontend.md`](./phase-4-summary-frontend.md)  
> **Mục tiêu:** Mở rộng hệ thống hàng đợi RabbitMQ và tiến trình Worker để tiếp nhận hai tác vụ AI phức tạp còn lại: Bài tập trắc nghiệm (Quiz) và Sơ đồ tư duy (Mindmap); hoàn thiện việc kiểm soát giới hạn tài nguyên (`concurrency = 1`) cho toàn bộ tác vụ LLM.

---

## 1. Mục Tiêu Giai Đoạn

1. **Một Queue AI Dùng Chung:** Chuyển cả ba tác vụ LLM (Summary, Quiz, Mindmap) đi qua queue `mindly.ai.v1`, đảm bảo tại một thời điểm trên máy dev chỉ có tối đa 1 tác vụ AI được thực thi.
2. **Bảo Toàn Nghiệp Vụ Sinh Quiz:**
   - Hoàn tất trong một MongoDB transaction nguyên tử: thay thế bộ Quiz chính thức (`replaceAllQuizzesForLesson`), xóa bản nháp (`lesson_quiz_drafts`), tăng `analysisOutputRevisions.quiz`, và đánh dấu Job `completed`.
   - **Quy tắc an toàn 0 câu hỏi:** Nếu AI trả về 0 câu hỏi hợp lệ, giữ nguyên bộ quiz chính thức hiện có, không được xóa trắng dữ liệu.
   - **Quy tắc timestamp:** Câu hỏi mới tạo từ AI giữ `timestamp: null`, chỉ lưu `explanationTimestamp` do AI cung cấp; không tự động gán mốc xuất hiện trên timeline.
3. **Bảo Toàn Nghiệp Vụ Sinh Mindmap:**
   - Giữ nguyên cơ chế kiểm tra tính hợp lệ và sanitize tối đa 5 cấp độ phân cấp Markdown.
   - Giữ nguyên hành vi lưu bản nháp (`draft`) và bản chính thức (`official`), bao gồm logic `$setOnInsert` khi tạo nháp lần đầu.
4. **Bảo Vệ Chống Ghi Đè (Revision Fencing):** Khi giảng viên đang sửa câu hỏi, chỉnh timeline hay autosave Mindmap mà kết quả AI trả về muộn, hệ thống sẽ từ chối ghi đè dữ liệu.
5. **Đồng Bộ Giao Diện:** Áp dụng hook `useLessonAnalysisJob` vào `lesson-quiz-tab.tsx` và `lesson-mindmap-tab.tsx`.
6. **Mở Rộng Feature Flag:** Thiết lập `AI_ASYNC_TYPES=summary,quiz,mindmap`.

---

## 2. Thiết Kế Kỹ Thuật Chi Tiết

### 2.1. Quiz Processor Trong Worker (`AnalysisJobProcessor`)

```typescript
async processQuizJob(job: JobDocument, session: ClientSession): Promise<void> {
  // 1. Lấy dữ liệu transcript và options
  const lesson = await this.lessonRepo.findById(job.lessonId);
  const currentQuizRevision = lesson.analysisOutputRevisions?.quiz || 0;

  // 2. Gọi AI sinh Quiz (Ngoài transaction)
  const generatedQuizzes = await this.quizGenService.generateQuizContent(
    job.lessonId,
    job.parameters
  );

  // 3. Kiểm tra kết quả 0 câu hỏi (Quy tắc an toàn)
  if (!generatedQuizzes || generatedQuizzes.length === 0) {
    this.logger.warn(`AI trả về 0 câu hỏi cho lesson ${job.lessonId}. Giữ nguyên quiz hiện tại.`);
    // Hoàn tất job nhưng không thay đổi bộ quiz chính thức
    await this.jobService.completeJob(job._id, { emptyResult: true }, session);
    return;
  }

  // 4. Mở Transaction ngắn thực hiện commit
  await this.transactionRunner.run(async (session) => {
    // a. Fencing Check: Kiểm tra Job lease và revision
    const freshLesson = await this.lessonRepo.findById(job.lessonId, { session });
    if (freshLesson.analysisOutputRevisions?.quiz !== currentQuizRevision) {
      throw new ConflictException('TARGET_CHANGED: Giảng viên đã chỉnh sửa Quiz trong lúc AI đang sinh');
    }

    // b. Thay thế bộ quiz chính thức
    await this.lessonQuizRepo.replaceAllQuizzesForLesson(
      job.lessonId,
      generatedQuizzes.map(q => ({
        ...q,
        timestamp: null, // Bắt buộc null cho câu mới
      })),
      { session }
    );

    // c. Xóa bản nháp quiz cũ nếu có
    await this.lessonQuizDraftRepo.deleteDraftByLessonId(job.lessonId, { session });

    // d. Cập nhật revision và hoàn tất Job
    await this.lessonRepo.incrementOutputRevision(job.lessonId, 'quiz', { session });
    await this.jobService.completeJob(job._id, { count: generatedQuizzes.length }, session);
  });
}
```

### 2.2. Mindmap Processor Trong Worker

```typescript
async processMindmapJob(job: JobDocument): Promise<void> {
  const lesson = await this.lessonRepo.findById(job.lessonId);
  const currentMindmapRevision = lesson.analysisOutputRevisions?.mindmap || 0;

  // 1. Gọi AI sinh Markdown Mindmap và Sanitize tối đa 5 cấp (Ngoài transaction)
  const sanitizedMarkdown = await this.mindmapService.generateAndSanitizeMindmap(
    job.lessonId,
    job.parameters
  );

  // 2. Commit trong transaction ngắn
  await this.transactionRunner.run(async (session) => {
    const freshLesson = await this.lessonRepo.findById(job.lessonId, { session });
    if (freshLesson.analysisOutputRevisions?.mindmap !== currentMindmapRevision) {
      throw new ConflictException('TARGET_CHANGED: Giảng viên đã chỉnh sửa Mindmap trong lúc AI đang sinh');
    }

    // Lưu mindmap (xử lý draft/official theo parameters)
    await this.lessonMindmapRepo.saveMindmapWithSession(
      job.lessonId,
      sanitizedMarkdown,
      job.parameters.saveAsDraft,
      { session }
    );

    await this.lessonRepo.incrementOutputRevision(job.lessonId, 'mindmap', { session });
    await this.jobService.completeJob(job._id, { revision: currentMindmapRevision + 1 }, session);
  });
}
```

### 2.3. Cập Nhật Giao Diện Tabs Quiz & Mindmap

- **`lesson-quiz-tab.tsx`**:
  - Nhúng `useLessonAnalysisJob(lessonId, 'quiz')`.
  - Hiển thị banner tiến độ khi AI đang phân tích và tạo câu hỏi.
  - Sau khi Job `completed`: Tự động invalidate query `lesson-quizzes` và checklist phê duyệt khóa học (`course-approval-checklist`).
- **`lesson-mindmap-tab.tsx`**:
  - Nhúng `useLessonAnalysisJob(lessonId, 'mindmap')`.
  - Vô hiệu hóa tính năng autosave trong lúc Job sinh Mindmap đang ở trạng thái `processing`.
  - Sau khi Job `completed`: Invalidate query `lesson-mindmap`.

---

## 3. Ma Trận File Thay Đổi

| File | Hành động | Mục đích |
|---|---|---|
| `backend/src/modules/transcript-analysis/services/quiz-generation.service.ts` | Chỉnh sửa | Tách logic sinh AI và logic lưu DB; hỗ trợ `ClientSession` |
| `backend/src/modules/transcript-analysis/services/mindmap-analysis.service.ts` | Chỉnh sửa | Tách logic sinh/sanitize Markdown và lưu DB |
| `backend/src/modules/course/repositories/lesson-quiz.repository.ts` | Chỉnh sửa | Bổ sung `session` vào `replaceAllQuizzesForLesson` |
| `backend/src/modules/course/repositories/lesson-quiz-draft.repository.ts` | Chỉnh sửa | Bổ sung `session` vào `deleteDraftByLessonId` |
| `backend/src/modules/course/repositories/lesson-mindmap.repository.ts` | Chỉnh sửa | Bổ sung `session` vào các method lưu Mindmap |
| `backend/src/modules/course/services/lesson-quiz.service.ts` | Chỉnh sửa | Tăng `analysisOutputRevisions.quiz` khi giảng viên sửa câu hỏi thủ công |
| `backend/src/modules/transcript-analysis/processors/analysis-job.processor.ts` | Chỉnh sửa | Bổ sung handler cho `ai.quiz` và `ai.mindmap` |
| `backend/src/modules/transcript-analysis/transcript-analysis.controller.ts` | Chỉnh sửa | Cập nhật `POST /quiz` và `POST /mindmap` trả `202 Accepted` |
| `frontend/src/features/course/components/player/tabs/lesson-quiz-tab.tsx` | Chỉnh sửa | Tích hợp hook theo dõi Job Quiz |
| `frontend/src/features/course/components/player/tabs/lesson-mindmap-tab.tsx` | Chỉnh sửa | Tích hợp hook theo dõi Job Mindmap |

---

## 4. Danh Sách Nhiệm Vụ Cụ Thể (Checklist)

- [x] Cập nhật `LessonQuizRepository`, `LessonQuizDraftRepository` và `LessonMindmapRepository` nhận `ClientSession`.
- [x] Bổ sung cơ chế tự tăng revision trên `lesson-quiz.service.ts` khi giảng viên thực hiện CRUD câu hỏi thủ công.
- [x] Viết processor xử lý `JobType.QUIZ` với quy tắc an toàn 0 câu hỏi và `timestamp: null`.
- [x] Viết processor xử lý `JobType.MINDMAP` với quy tắc sanitize 5 cấp độ Markdown.
- [x] Cập nhật Controller trả về HTTP `202` khi `AI_ASYNC_TYPES` chứa `quiz` và `mindmap`.
- [x] Tích hợp `useLessonAnalysisJob` vào giao diện `lesson-quiz-tab.tsx` và `lesson-mindmap-tab.tsx`.
- [x] Cập nhật file `.env` bật đầy đủ: `AI_ASYNC_TYPES=summary,quiz,mindmap`.
- [x] Thực hiện kiểm tra hồi quy: Học viên làm bài tập trắc nghiệm trong khóa học, kiểm tra tiến độ học tập không bị ảnh hưởng.

---

## 5. Kịch Bản Kiểm Thử & Nghiệm Thu (Verification)

1. **Ba Tác Vụ Đồng Thời Trên Cùng Bài Học:** Giảng viên bấm tạo Summary, Quiz và Mindmap liên tiếp. Cả 3 request đều trả về `202` ngay lập tức. Worker xử lý tuần tự từng việc một (do `concurrency = 1`). Không có tác vụ nào bị timeout hay đè lên nhau.
2. **Quiz Trả Về 0 Câu Hỏi:** Giả lập prompt AI trả về mảng rỗng; hệ thống hoàn tất Job và không xóa bộ câu hỏi chính thức hiện có của bài học.
3. **Không Bị Reset ID Câu Hỏi Do Redelivery:** Giả lập giao lại message Quiz sau khi đã commit; Worker nhận diện Job đã completed và bỏ qua, ID của các câu hỏi trong database không bị xóa đi tạo lại.
4. **Autosave Mindmap Trong Lúc AI Chạy:** Giảng viên đang gõ sửa Mindmap thì kết quả AI về; hệ thống phát hiện revision đã tăng do autosave -> Báo lỗi xung đột `TARGET_CHANGED` và giữ nguyên nội dung của giảng viên.
5. **Checklist Phê Duyệt Khóa Học:** Sau khi Quiz được tạo qua Job, checklist phê duyệt khóa học (yêu cầu bài học phải có quiz) tự động cập nhật trạng thái đạt yêu cầu.

---

## 6. Tiêu Chí Nghiệm Thu (Exit Gate)

**Trạng thái:** ✅ Đã hoàn thành (PASSED)

Giai đoạn 5 hoàn thành khi:
- [x] Toàn bộ 3 tác vụ AI (Summary, Quiz, Mindmap) đều chạy qua hàng đợi RabbitMQ khi feature flag bật.
- [x] Tổng số tác vụ AI chạy đồng thời trên máy dev luôn luôn bằng 1.
- [x] Nghiệp vụ AI, nội dung prompt, cấu trúc validator và kết quả dữ liệu không có bất kỳ sai lệch nào so với trước khi chuyển đổi.
- [x] Không có hiện tượng reset ID Quiz làm ảnh hưởng đến tiến độ học tập của học viên.
- [x] 100% test cases của Quiz và Mindmap pass (197/197 backend tests, 14/14 frontend tests pass).

---

## 7. Kế Hoạch Rollback

Nếu Quiz hoặc Mindmap async gặp sự cố:
1. Giảm cấu hình `AI_ASYNC_TYPES=summary` (giữ lại Summary async, đưa Quiz và Mindmap về sync).
2. Chờ Worker xử lý hết các Job đang chờ trong hàng đợi.
3. Khởi động lại Backend API; Quiz và Mindmap sẽ quay về đường `await` trực tiếp cũ mà không cần chỉnh sửa mã nguồn.
