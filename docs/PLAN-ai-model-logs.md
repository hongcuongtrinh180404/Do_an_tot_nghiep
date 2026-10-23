# Kế hoạch Triển khai: Chuẩn hóa & Ghi Log Tên Model AI Thực Tế (Summary, Mindmap, Quiz)

> **File:** `docs/PLAN-ai-model-logs.md`  
> **Trạng thái:** PROPOSED / READY FOR REVIEW  
> **Agent lập kế hoạch:** `project-planner`  
> **Chuyên gia thực hiện:** `backend-specialist` (Skills: `clean-code`, `api-patterns`)  
> **Phạm vi tác động:** `backend/src/modules/transcript-analysis/services/` (Summary, Mindmap, Quiz services)  

---

## 1. Mục tiêu (Objective)

Cập nhật toàn bộ các dòng log (Logger.log / Logger.debug) tại backend trong các dịch vụ:
- **Tóm tắt bài giảng (Summary)** (`SummaryGenerationService`)
- **Sơ đồ tư duy (Mindmap)** (`MindmapAnalysisService`)
- **Câu hỏi trắc nghiệm (Quiz)** (`QuizGenerationService`)

Đảm bảo log ghi nhận **chính xác 100% model AI thực tế đã sinh ra kết quả** (ví dụ: `riverai:Qwen/Qwen3.8-27B-FP8`, `riverai:deepseek-ai/DeepSeek-V4.1-Flash`, `gemini-3.8-flash`, hay `gemini-3.5-flash-lite`), cùng với thời gian thực thi (ms) và trạng thái (Primary / Fallback).

---

## 2. Hiện trạng & Điểm Cần Cải tiến

### 2.1. Hiện trạng
- `GeminiService.generateJson` trả về đối tượng `GeminiExecutionResult<T>` có sẵn trường `model`:
  - Khi dùng River AI: `model = "riverai:<RIVER_MODEL>"` (ví dụ: `riverai:Qwen/Qwen3.8-27B-FP8`).
  - Khi dùng Gemini: `model = "gemini-3.8-flash"` hoặc `gemini-3.5-flash-lite`.
- Tuy nhiên, trong các service nghiệp vụ `SummaryGenerationService`, `MindmapAnalysisService`, và `QuizGenerationService`:
  - Một số dòng log bắt đầu thực thi chưa thể hiện nhà cung cấp/model dự kiến.
  - Các dòng log khi hoàn thành hoặc lưu vào database (`saveDraft`, `upsertOfficial`) chỉ log chung chung:
    `Đã lưu bản tóm tắt chính thức cho bài học...` mà chưa ghi rõ model đã dùng.

### 2.2. Điểm Cần Cải tiến
- Bổ sung thông tin model vào cả 2 pha:
  1. **Pha sau khi nhận kết quả từ AI**: Log rõ tên model thực tế, thời gian phản hồi (ms) và số lượng token (nếu có).
  2. **Pha lưu dữ liệu**: Ghi nhận kèm model trong log lưu nháp hoặc lưu chính thức.

---

## 3. Chi tiết Thay đổi Dự kiến theo Từng Service

### 3.1. `SummaryGenerationService` ([summary-generation.service.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/transcript-analysis/services/summary-generation.service.ts))
- Sau khi gọi `generateJson`:
  ```typescript
  this.logger.log(
    `Sinh Summary thành công cho bài học ${trimmedLessonId} bằng model [${geminiResult.model}] trong ${geminiResult.executionTimeMs}ms${geminiResult.isFallback ? ' (Fallback)' : ''}.`,
  );
  ```
- Khi lưu bản nháp / chính thức:
  ```typescript
  this.logger.log(`Đã lưu bản tóm tắt chính thức cho bài học ${trimmedLessonId} (Model: ${geminiResult.model})`);
  ```

### 3.2. `MindmapAnalysisService` ([mindmap-analysis.service.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/transcript-analysis/services/mindmap-analysis.service.ts))
- Sau khi gọi `generateJson`:
  ```typescript
  this.logger.log(
    `Sinh Mindmap thành công cho bài học ${trimmedLessonId} bằng model [${geminiResult.model}] trong ${geminiResult.executionTimeMs}ms${geminiResult.isFallback ? ' (Fallback)' : ''}.`,
  );
  ```
- Khi lưu bản nháp / chính thức:
  ```typescript
  this.logger.log(`Đã lưu bản sơ đồ tư duy chính thức cho bài học ${trimmedLessonId} (Model: ${geminiResult.model})`);
  ```

### 3.3. `QuizGenerationService` ([quiz-generation.service.ts](file:///d:/Download/hk1_2027/project_do_an/backend/src/modules/transcript-analysis/services/quiz-generation.service.ts))
- Sau khi gọi `generateJson`:
  ```typescript
  this.logger.log(
    `Sinh Quiz thành công (${quizzes.length} câu) cho bài học ${trimmedLessonId} bằng model [${geminiResult.model}] trong ${geminiResult.executionTimeMs}ms${geminiResult.isFallback ? ' (Fallback)' : ''}.`,
  );
  ```
- Khi lưu bản nháp / chính thức:
  ```typescript
  this.logger.log(
    `Đã lưu và áp dụng trực tiếp ${quizzes.length} câu hỏi Quiz chính thức cho bài học ${trimmedLessonId} (Model: ${geminiResult.model})`,
  );
  ```

---

## 4. Kế hoạch Thực hiện (Phân bước)

- [ ] **Bước 1:** Cập nhật các câu lệnh log trong `summary-generation.service.ts`.
- [ ] **Bước 2:** Cập nhật các câu lệnh log trong `mindmap-analysis.service.ts`.
- [ ] **Bước 3:** Cập nhật các câu lệnh log trong `quiz-generation.service.ts`.
- [ ] **Bước 4:** Chạy toàn bộ test suite của `transcript-analysis` để đảm bảo không bị ảnh hưởng (75/75 tests pass).
  ```bash
  pnpm --filter backend test src/modules/transcript-analysis/
  ```

---

## 5. Tiêu chí Nghiệm thu (Acceptance Criteria)

1. Khi gọi API sinh Summary: Console hiển thị đúng model đang dùng (ví dụ: `[riverai:Qwen/Qwen3.8-27B-FP8]`).
2. Khi gọi API sinh Mindmap: Console hiển thị đúng model đang dùng.
3. Khi gọi API sinh Quiz: Console hiển thị đúng model đang dùng.
4. Trường hợp fallback: Nếu River AI lỗi và chuyển sang Gemini, log sẽ hiển thị rõ `[gemini-3.8-flash] (Fallback)`.
