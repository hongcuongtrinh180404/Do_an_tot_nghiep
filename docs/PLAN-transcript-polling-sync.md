# Kế hoạch Triển khai: Tự động Đồng bộ Transcript Timeline (Polling & Realtime Sync)

> **Mã kế hoạch:** `PLAN-transcript-polling-sync`  
> **Mục tiêu:** Khắc phục lỗi video player bị kẹt biểu tượng xoay vòng (loading spinner) khi đang trích xuất transcript, và tự động hiển thị danh sách câu nói (Transcript Timeline) ngay khi hệ thống xử lý xong trong cơ sở dữ liệu mà người dùng **không cần phải tải lại trang (F5)**.

---

## 1. Tổng quan & Bản chất Vấn đề (Root Cause Analysis)

### 1.1. Hiện tượng người dùng gặp phải
- Khi người dùng tải video bài học lên hệ thống và chuyển vào trang xem bài học (`LessonPlayerStudio`), nếu transcript chưa hoàn tất, tab Timeline sẽ hiển thị vòng tròn xoay `Đang trích xuất phụ đề bài học` (Icon `lucide:loader-2 animate-spin`).
- Mặc dù backend và AssemblyAI đã xử lý xong và lưu thành công transcript vào collection `lesson_transcripts` trong MongoDB (trạng thái `READY`), giao diện người dùng vẫn tiếp tục xoay vòng vô thời hạn.
- **Chỉ khi người dùng F5 / reload lại toàn bộ trang**, timeline các câu nói mới hiển thị ra.

### 1.2. Phân tích nguyên nhân gốc rễ (Root Cause)

1. **Thiếu cơ chế Polling / Refetch tự động trong React Query (`useLessonTranscriptQuery`)**:
   - Trong `frontend/src/features/course/api/course.api.ts`, hook `useLessonTranscriptQuery` chỉ gọi query đúng một lần khi component mount.
   - Query được cấu hình `staleTime: 60 * 1000` (1 phút) và **hoàn toàn không có thuộc tính `refetchInterval`**.
   - Khi query nhận về bản ghi transcript ban đầu có trạng thái `TRANSCRIBING` (hoặc rỗng), React Query lưu vào cache và không bao giờ gửi lại request kiểm tra trạng thái mới.
2. **Xử lý 404 cứng ngắc làm dừng truy vấn (`retry: false`)**:
   - Nếu người dùng truy cập trang bài học ngay tức thì khi video vừa tải lên (trước khi bản ghi transcript trong MongoDB kịp tạo), backend trả về mã `404 Not Found`.
   - Trong hook `useLessonTranscriptQuery`, có đoạn mã `if (status === 404) return false;`, dẫn đến việc React Query chuyển ngay sang trạng thái Error vĩnh viễn và không bao giờ thử lại.
3. **Mất đồng bộ giữa trạng thái Bài học (`Lesson`) và Bản ghi Phụ đề (`LessonTranscript`)**:
   - Khi AssemblyAI hoàn thành, backend cập nhật thời lượng video (`duration`) và trạng thái `transcriptionStatus = READY` vào collection `lessons`.
   - Tuy nhiên, trang phát video (`LessonDetailContent`) đã lấy dữ liệu `lesson` từ trước qua `useLessonDetailQuery` và không được invalidate cache khi transcript hoàn tất. Do đó, player có thể dùng sai duration hoặc fallback status.
4. **Backend trả về 404 thay vì trạng thái tiến trình (Transient State)**:
   - Tại `LessonTranscriptService.getTranscriptByLessonId`, nếu chưa tìm thấy bản ghi transcript trong collection `lesson_transcripts`, service ném ra `NotFoundException` (404) ngay lập tức, ngay cả khi bài học tồn tại và đang ở trạng thái `TRANSCRIBING` hoặc `QUEUED`.

---

## 2. Kiến trúc Giải pháp (Solution Architecture)

```text
[Người dùng tải video] 
         │
         ▼
[Backend] ──> Lưu Lesson (status = TRANSCRIBING) & Bắn tác vụ AssemblyAI ngầm
         │
         ▼
[Frontend Player mở]
         │
         ├── Gọi useLessonTranscriptQuery(lessonId)
         │       │
         │       ├──> Trạng thái: TRANSCRIBING hoặc QUEUED
         │       │       │
         │       │       ▼
         │       └──> Kích hoạt refetchInterval (3000ms - Polling thông minh)
         │
[AssemblyAI hoàn tất ngầm]
         │
         ▼
[Backend] ──> Lưu DB: transcript.status = READY, sentences: [...], lesson.duration = X
         │
[Lần Poll tiếp theo (sau max 3s)]
         │
         ▼
[Frontend useLessonTranscriptQuery]
         │
         ├── Nhận data với status === 'READY'
         ├── Tự động TẮT refetchInterval (trả về false)
         ├── Giao diện Timeline ngay lập tức chuyển từ spinner sang danh sách câu nói
         ├── Hiển thị Toast thông báo: "Đã trích xuất xong phụ đề bài giảng!"
         └── Invalidate query lessonDetail & sections để đồng bộ thời lượng chuẩn
```

---

## 3. Tiêu chí Nghiệm thu (Success Criteria)

- [ ] **Tự động cập nhật không cần F5**: Khi ở trạng thái `TRANSCRIBING`, sau khi backend lưu transcript thành công, tab Timeline tự động hiển thị đầy đủ danh sách câu nói trong vòng 3-4 giây mà không cần reload trang.
- [ ] **Dừng Polling đúng lúc**: Khi transcript đạt trạng thái `READY` hoặc `FAILED`, việc polling dừng lại hoàn toàn, không tạo tải dư thừa cho server.
- [ ] **Không bị lỗi khi gặp 404 tạm thời**: Nếu vừa upload mà bản ghi chưa tạo kịp, hệ thống vẫn tiếp tục thăm dò nhẹ nhàng thay vì văng lỗi dừng hẳn.
- [ ] **Đồng bộ thời lượng bài học**: Khi transcript về trạng thái `READY`, thời lượng video chuẩn (`duration`) được cập nhật đồng bộ lên video player và curriculum list.
- [ ] **Thông báo trải nghiệm người dùng (UX)**: Người dùng nhận được thông báo toast chúc mừng nhẹ nhàng khi transcript sẵn sàng.
- [ ] **100% Type-safe & Linting Clean**: Không dùng `any`, tuân thủ toàn bộ Project Architectural Rules (`RULE_GUIDE.md`).

---

## 4. Chi tiết Kế hoạch Triển khai (Task Breakdown)

### Phase 1: Nâng cấp Backend (Graceful In-Progress Transcript Response)

#### Task 1.1: Trả về trạng thái tiến trình thay vì 404 khi bài học đang xử lý
- **Agent**: `backend-specialist`
- **Skill**: `api-patterns`, `clean-code`
- **File cần sửa**: `backend/src/modules/course/services/lesson-transcript.service.ts`
- **Mô tả công việc**:
  - Trong hàm `getTranscriptByLessonId(lessonId)`:
    - Khi không tìm thấy bản ghi trong `lessonTranscriptRepo`, truy vấn `lessonRepo.findById(lessonId)`.
    - Nếu bài học tồn tại và có `transcriptionStatus` là `QUEUED` hoặc `TRANSCRIBING`, thay vì ném ra `NotFoundException` (404), trả về một đối tượng transcript tạm thời có trạng thái tương ứng:
      ```typescript
      return {
        id: '',
        lessonId: trimmedLessonId,
        rawTranscript: '',
        sentences: [],
        durationSeconds: lesson.content?.duration || 0,
        languageCode: 'vi',
        externalTranscriptId: null,
        status: lesson.transcriptionStatus,
        failureReason: null,
      } as unknown as ILessonTranscript;
      ```
    - Chỉ ném `NotFoundException` nếu bài học không tồn tại hoặc đã bị `IDLE` mà không hề có transcript.
- **INPUT**: `lessonId: string`
- **OUTPUT**: `ILessonTranscript` với trạng thái `TRANSCRIBING` ngay cả khi record collection riêng chưa kịp khởi tạo xong.
- **VERIFY**: Chạy unit test cho `lesson-transcript.service.spec.ts`.

---

### Phase 2: Nâng cấp Frontend Hook & Polling Thông minh (TanStack React Query)

#### Task 2.1: Bổ sung Smart Polling & Auto Retry trong `useLessonTranscriptQuery`
- **Agent**: `frontend-specialist`
- **Skill**: `react-best-practices`, `clean-code`
- **File cần sửa**: `frontend/src/features/course/api/course.api.ts`
- **Mô tả công việc**:
  - Cập nhật `useLessonTranscriptQuery(lessonId?: string, currentLessonStatus?: LessonTranscriptionStatusEnum)`:
    - Cấu hình `refetchInterval`:
      ```typescript
      refetchInterval: (query) => {
        const transcriptData = query.state.data;
        const status = transcriptData?.status;
        
        // Nếu đang trong tiến trình xử lý, thăm dò định kỳ mỗi 3 giây
        if (
          status === LessonTranscriptionStatusEnum.TRANSCRIBING ||
          status === LessonTranscriptionStatusEnum.QUEUED ||
          (!status && currentLessonStatus === LessonTranscriptionStatusEnum.TRANSCRIBING)
        ) {
          return 3000;
        }
        
        // Dừng polling khi đã READY hoặc FAILED hoặc IDLE
        return false;
      }
      ```
    - Cập nhật hàm `retry`: Nếu gặp 404 nhưng `currentLessonStatus === TRANSCRIBING`, vẫn cho phép retry định kỳ thay vì hủy bỏ ngay.
    - Đặt `staleTime: 0` khi đang `TRANSCRIBING` để luôn ưu tiên lấy dữ liệu mới nhất.
- **INPUT**: `lessonId`, `currentLessonStatus`
- **OUTPUT**: Hook tự động thăm dò và cập nhật dữ liệu khi backend chuyển trạng thái `READY`.
- **VERIFY**: Kiểm tra `refetchInterval` hoạt động chính xác trong React Query Devtools.

#### Task 2.2: Tự động đồng bộ cache và hiển thị Toast tại `LessonPlayerStudio`
- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`, `clean-code`
- **File cần sửa**: `frontend/src/features/course/components/player/lesson-player-studio.tsx`
- **Mô tả công việc**:
  - Truyền `lesson.transcriptionStatus` vào hook `useLessonTranscriptQuery(lesson.id, lesson.transcriptionStatus)`.
  - Sử dụng `useEffect` theo dõi sự chuyển giao trạng thái của `transcript?.status`:
    - Nếu trạng thái trước đó là `TRANSCRIBING` (hoặc `QUEUED`) và trạng thái mới chuyển thành `READY`:
      - Kích hoạt thông báo thành công: `toast.success('Phụ đề bài giảng đã sẵn sàng!')`.
      - Invalidate cache `useLessonDetailQuery(lesson.id)` để lấy `duration` video mới nhất.
      - Invalidate cache `courseKeys.sections(courseId)` để cập nhật thời lượng và icon bài học trong danh sách chương.
- **INPUT**: Thay đổi của `transcript?.status` từ `TRANSCRIBING` sang `READY`.
- **OUTPUT**: Timeline tự động bung ra, toast xuất hiện, toàn bộ studio đồng bộ không cần reload.
- **VERIFY**: Thử nghiệm upload video và quan sát UI cập nhật tức thì.

---

### Phase 3: Nâng cấp trải nghiệm người dùng tại Tab Timeline (`LessonTimelineTab`)

#### Task 3.1: Thêm hiệu ứng chuyển trạng thái mượt mà và thanh tiến trình ước tính
- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`, `clean-code`
- **File cần sửa**: `frontend/src/features/course/components/player/lesson-timeline-tab.tsx`
- **Mô tả công việc**:
  - Tại trạng thái `TRANSCRIBING`, bổ sung badge "Tự động cập nhật khi hoàn tất" kèm pulsing dot animation (`animate-pulse`) để người dùng yên tâm không cần nhấn F5.
  - Bổ sung nút bấm thủ công "Kiểm tra ngay" (Refresh) nhỏ gọn cạnh loading spinner để người dùng có thể chủ động kích hoạt query refetch nếu muốn.
- **INPUT**: Props `transcriptionStatus`, `onRefresh`
- **OUTPUT**: UX rõ ràng, người dùng hiểu rằng hệ thống đang tự động thăm dò kết quả.
- **VERIFY**: Review giao diện trực quan trong dark mode và light mode.

---

## 5. Kế hoạch Kiểm thử & Xác thực (Phase X: Verification)

| Bước | Hành động | Công cụ / Lệnh | Tiêu chí đạt |
| :--- | :--- | :--- | :--- |
| **X.1** | Unit test Backend | `pnpm --filter backend test lesson-transcript.service.spec.ts` | 100% test cases pass, bao gồm case trả về trạng thái tiến trình |
| **X.2** | Type Check & Lint | `pnpm type-check` & `pnpm lint` | Không có lỗi TypeScript (`no any`), không vi phạm ESLint |
| **X.3** | Kiểm thử trực tiếp (E2E) | Tải video bài học mới qua UI giảng viên -> Xem bài học -> Chờ trích xuất | Timeline tự động hiện sau khi backend lưu DB mà không cần nhấn F5 |
| **X.4** | Kiểm tra Network Tab | Chrome DevTools -> Network | Các request polling gửi đều đặn mỗi 3s khi transcribing và dừng ngay khi đạt status READY |

---

## ✅ PHASE X COMPLETE

- **Type Check Frontend (`tsc --noEmit`)**: ✅ PASS (0 errors)
- **Type Check Backend (`tsc --noEmit`)**: ✅ PASS (0 errors)
- **Unit Tests Backend**: ✅ PASS 100% (26/26 tests passed)
- **Exponential Backoff Polling Strategy**: ✅ Áp dụng 3s -> 5s -> 10s (timeout tối đa 5 phút)
- **Silent Synchronization**: ✅ Âm thầm đồng bộ timeline & duration không bật toast theo quyết định người dùng
- **Date**: 2026-10-23
