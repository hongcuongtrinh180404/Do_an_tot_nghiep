# Kế hoạch Triển khai: Trích xuất & Lưu Sentences từ AssemblyAI (Loại bỏ Confidence)

> **File:** `docs/PLAN-transcript-sentences.md`  
> **Trạng thái:** DRAFT / PROPOSED  
> **Người thực hiện đề xuất:** `project-planner`  
> **Liên quan:** `share-lib`, `backend/src/modules/assemblyai`, `backend/src/modules/course`, `a-agentic/features/ai-video-pipeline/`

---

## 1. Bối cảnh & Yêu cầu Kỹ thuật

### Yêu cầu người dùng
1. Sau khi trích xuất transcript, gọi API của AssemblyAI SDK:
   ```typescript
   const { sentences } = await client.transcripts.sentences(transcript.id);
   ```
2. Làm sạch dữ liệu câu (Sentence-level transcript):
   ```typescript
   sentences: sentences.map(({ text, start, end }) => ({
     text: text.trim(),
     start,
     end,
   }))
   ```
3. **Loại bỏ hoàn toàn trường `confidence`** khi lưu trữ xuống MongoDB (`lesson_transcripts` collection) để tối ưu kích thước dữ liệu và chỉ giữ các trường cần thiết phục vụ học tập, hiển thị highlight và AI prompting.

---

## 2. Phân tích Rủi ro & Tác động (Impact Analysis)

| Thành phần | Mức độ ảnh hưởng | Chi tiết tác động |
| :--- | :---: | :--- |
| `share-lib` | **Trung bình** | Thêm interface `ITranscribedSentence`, cập nhật `ILessonTranscript`, loại bỏ `confidence` |
| `AssemblyAiService` | **Thấp** | Thêm lệnh gọi `client.transcripts.sentences(...)`, làm sạch dữ liệu, cập nhật result DTO |
| `LessonTranscriptSchema` | **Thấp** | Bổ sung subdocument `TranscribedSentenceEntity`, xóa `confidence` |
| `LessonTranscriptService` | **Thấp** | Lưu trường `sentences` vào MongoDB qua repository |
| Unit Tests | **Trung bình** | Cập nhật mock `sentences` trong `assemblyai.service.spec.ts` & `lesson-transcript.service.spec.ts` |

---

## 3. Kế hoạch Triển khai Chi tiết (Task Breakdown)

### Phase 1: Shared Library (`share-lib`)
- [ ] **1.1.** Tạo interface `ITranscribedSentence`:
  ```typescript
  export interface ITranscribedSentence {
    text: string;
    start: number; // millisecond
    end: number;   // millisecond
  }
  ```
- [ ] **1.2.** Cập nhật `ILessonTranscript`:
  - Thêm trường `sentences: ITranscribedSentence[];`
  - Loại bỏ trường `confidence` khỏi `ITranscribedWord` (hoặc chuyển thành optional nếu cần backward compat, nhưng loại bỏ khỏi DB).
- [ ] **1.3.** Export `ITranscribedSentence` trong `share-lib/src/index.ts` và chạy `pnpm --filter share-lib build`.

---

### Phase 2: AssemblyAI Module (`backend/src/modules/assemblyai`)
- [ ] **2.1.** Cập nhật `AssemblyAiTranscriptionResult` trong `assemblyai.interface.ts`:
  - Thêm `sentences: TranscribedSentence[];`
  - Bỏ trường `confidence?: number`.
- [ ] **2.2.** Mở rộng `AssemblyAiService`:
  - Trong hàm thực thi transcription (sau khi transcript status = `completed`), gọi:
    ```typescript
    const { sentences = [] } = await client.transcripts.sentences(transcript.id);
    const cleanedSentences = sentences.map(({ text, start, end }) => ({
      text: text.trim(),
      start,
      end,
    }));
    ```
  - Trả về `sentences: cleanedSentences` trong kết quả trích xuất.
- [ ] **2.3.** Cập nhật mock và test cases trong `assemblyai.service.spec.ts`:
  - Bổ sung mock cho `client.transcripts.sentences`.
  - Kiểm thử làm sạch text (trim whitespace) và kiểm thử không chứa `confidence`.

---

### Phase 3: Course Module & Mongoose Schema (`backend/src/modules/course`)
- [ ] **3.1.** Cập nhật `lesson-transcript.schema.ts`:
  - Định nghĩa sub-schema:
    ```typescript
    @Schema({ _id: false })
    export class TranscribedSentenceEntity implements ITranscribedSentence {
      @Prop({ type: String, required: true })
      text: string;

      @Prop({ type: Number, required: true })
      start: number;

      @Prop({ type: Number, required: true })
      end: number;
    }
    export const TranscribedSentenceSchema = SchemaFactory.createForClass(TranscribedSentenceEntity);
    ```
  - Trong `LessonTranscriptEntity`:
    - Thêm `@Prop({ type: [TranscribedSentenceSchema], default: [] }) sentences: TranscribedSentenceEntity[];`
    - Xóa trường `@Prop confidence` khỏi `TranscribedWordEntity` (nếu giữ lưu words) hoặc lược bỏ.
- [ ] **3.2.** Cập nhật `LessonTranscriptService.processTranscriptionTask`:
  - Truyền `sentences: result.sentences` vào `upsertByLessonId`.
  - Đảm bảo object lưu vào MongoDB không có bất kỳ field `confidence` nào.
- [ ] **3.3.** Cập nhật `lesson-transcript.service.spec.ts`:
  - Thêm `sentences` vào mock payload trả về từ `assemblyAiService.transcribeStream`.
  - Assert `sentences` được truyền chính xác vào `lessonTranscriptRepo.upsertByLessonId`.

---

### Phase 4: Kiểm Thử, Lint & Đồng Bộ Living Docs
- [ ] **4.1.** Chạy toàn bộ test suite backend: `pnpm --filter backend test -- --run` (đảm bảo 100% test files pass).
- [ ] **4.2.** Kiểm tra lint: `pnpm --filter backend lint` (đảm bảo 0 error).
- [ ] **4.3.** Biên dịch dự án: `pnpm --filter backend build`.
- [ ] **4.4.** Cập nhật Living Docs:
  - `a-agentic/features/ai-video-pipeline/tech-spec.md`: Cập nhật schema `sentences`.
  - `a-agentic/features/ai-video-pipeline/dev-history.md`: Ghi chép dev note về việc tách câu qua AssemblyAI Sentences API và loại bỏ confidence.

---

## 4. Tiêu chí Hoàn thành (Definition of Done)

1. [x] Không viết code trong giai đoạn `/plan`.
2. [ ] Gọi thành công `client.transcripts.sentences(transcript.id)` sau khi transcription hoàn tất.
3. [ ] Dữ liệu `sentences` được chuẩn hóa sạch sẽ: `{ text: string, start: number, end: number }`.
4. [ ] MongoDB collection `lesson_transcripts` lưu đầy đủ mảng `sentences` và hoàn toàn không chứa thuộc tính `confidence`.
5. [ ] 100% Unit tests pass, không phát sinh regression test, không dùng type `any`.
6. [ ] Living Docs được đồng bộ hóa.
