# Giai Đoạn 6: Pipeline Video & Queue Transcription

> **Thuộc kế hoạch:** [`docs/chatbot/plan-rabbitmq-ai-jobs/README.md`](./README.md)  
> **Trạng thái:** ✅ Đã hoàn thành (PASSED)  
> **Giai đoạn trước:** [`phase-5-quiz-mindmap.md`](./phase-5-quiz-mindmap.md) (Đã hoàn thành)  
> **Giai đoạn tiếp theo:** [`phase-7-hardening-rollout.md`](./phase-7-hardening-rollout.md)  
> **Mục tiêu:** Loại bỏ hoàn toàn cơ chế gọi bất đồng bộ không kiểm soát (`void async` fire-and-forget) trong quá trình xử lý video bài học; đưa việc trích xuất audio bằng FFmpeg và chuyển giọng nói thành văn bản qua AssemblyAI vào hàng đợi riêng biệt, có checkpoint bền vững và khả năng tự phục hồi.

---

## 1. Mục Tiêu Giai Đoạn

1. **Loại Bỏ Fire-and-Forget:** Thay thế lời gọi `LessonTranscriptService.triggerTranscription()` bằng việc tạo Job transcription bền vững trong MongoDB ngay trong cùng transaction tạo bài học video.
2. **Queue Riêng Biệt Cho Video:** Khai báo queue `mindly.transcription.v1` và DLQ `mindly.transcription.dead.v1` độc lập với queue AI để không làm nghẽn các tác vụ LLM ngắn.
3. **Kiểm Soát Tải FFmpeg:** Giới hạn số lượng tiến trình FFmpeg chạy đồng thời (mặc định: 1 tiến trình trên môi trường dev) nhằm tránh tình trạng tràn 100% CPU khi tải lên nhiều video cùng lúc.
4. **Cơ Chế Checkpoint Với AssemblyAI:** Tách việc gọi AssemblyAI thành mô hình 2 bước:
   - Bước 1: Gửi audio (`submit()`) và lưu ngay mã `externalTranscriptId` vào MongoDB.
   - Bước 2: Polling kết quả có timeout; nếu Worker bị restart giữa chừng, lần chạy sau sẽ tiếp tục resume polling dựa trên `externalTranscriptId` thay vì upload và tính tiền lại từ đầu.
5. **Dọn Dẹp File Tạm Bền Vững:** Đảm bảo toàn bộ file audio `.mp3` trích xuất tạm thời trên đĩa cứng luôn được dọn sạch trong khối `finally`, kể cả khi gặp lỗi hoặc bị hủy.
6. **Bảo Vệ Tính Toàn Vẹn Của Bài Học:** Worker chỉ cập nhật trạng thái bài học thành `READY`, lưu thời lượng video (`duration`), lưu `LessonTranscript` và tăng `analysisInputRevision` trong một transaction ngắn duy nhất.

---

## 2. Thiết Kế Kỹ Thuật Chi Tiết

### 2.1. Topology Hàng Đợi Transcription

| Thành phần | Tên | Thuộc tính |
|---|---|---|
| **Exchange** | `mindly.tasks.v1` | `direct`, `durable: true` (Dùng chung exchange) |
| **Routing Key** | `video.transcribe` | Định tuyến tác vụ xử lý âm thanh/video |
| **Queue** | `mindly.transcription.v1` | `durable: true`, dead-lettered sang `mindly.dead.v1` |
| **DLQ** | `mindly.transcription.dead.v1` | `durable: true`, lưu message transcription lỗi |

### 2.2. Luồng Xử Lý Của Transcription Processor

```text
Worker nhận Message { jobId, lessonId } từ queue mindly.transcription.v1
    │
    ▼
1. Atomic Claim Job & Cập nhật Lesson sang status = 'TRANSCRIBING'
    │
    ▼
2. Kiểm tra Checkpoint:
   ├── Đã có externalTranscriptId trong Job chưa?
   ├── Nếu ĐÃ CÓ: Nhảy cóc qua bước trích xuất & upload, đi thẳng tới Bước 5 (Poll kết quả).
   └── Nếu CHƯA CÓ: Thực hiện tuần tự Bước 3 và Bước 4.
    │
    ▼
3. Trích xuất Audio (Có giới hạn Concurrency):
   ├── Tạo Presigned URL mới từ MinIO (tránh lỗi URL cũ hết hạn do xếp hàng)
   ├── Gọi AudioExtractorService chạy FFmpeg trích xuất ra file tạm (.mp3)
   └── Quản lý file tạm theo attempt ID
    │
    ▼
4. Upload & Submit AssemblyAI:
   ├── Upload stream audio lên AssemblyAI
   ├── Gọi client.transcripts.submit() để nhận transcriptId
   └── LƯU NGAY externalTranscriptId VÀO JOB (Checkpoint bền vững)
    │
    ▼
5. Poll Kết Quả AssemblyAI (Có Timeout & AbortSignal):
   ├── Chờ transcript hoàn thành (polling interval 3s, timeout tối đa 15 phút)
   └── Khi có kết quả: Tải danh sách sentences và words có timestamps
    │
    ▼
6. Short MongoDB Transaction (ClientSession):
   ├── Lưu hoặc cập nhật LessonTranscript
   ├── Cập nhật Lesson:
   │      status = 'READY'
   │      duration = videoDuration
   │      increment analysisInputRevision
   └── Đánh dấu Job: status = 'completed', active = false
    │
    ▼
7. Khối FINALLY (Luôn chạy):
   ├── Xóa toàn bộ file audio tạm trên ổ đĩa
   └── Manual ACK Message về RabbitMQ
```

### 2.3. Khắc Phục Lỗi Worker Bị Tắt Khi Đang Chạy

Nếu tiến trình Worker bị tắt đột ngột (do restart, cúp điện, docker recreate):
- **Trường hợp 1 (Đang chạy FFmpeg):** File tạm sẽ được dọn dẹp khi Worker khởi động lại nhờ cơ chế cleanup theo attempt. Job quá hạn lease sẽ được `JobRecoveryService` đưa về hàng chờ.
- **Trường hợp 2 (Đã gửi lên AssemblyAI nhưng chưa xong):** Job đã lưu `externalTranscriptId`. Khi Worker mới claim lại Job, hệ thống phát hiện đã có ID nên **không chạy lại FFmpeg, không upload lại audio**, mà chỉ tiếp tục polling từ AssemblyAI, tiết kiệm chi phí và thời gian.

---

## 3. Ma Trận File Thay Đổi

| File | Hành động | Mục đích |
|---|---|---|
| `backend/src/modules/messaging/rabbitmq-topology.ts` | Chỉnh sửa | Bổ sung queue `mindly.transcription.v1` và DLQ |
| `backend/src/modules/course/services/lesson.service.ts` | Chỉnh sửa | Đưa việc tạo Job transcript vào transaction tạo bài học |
| `backend/src/modules/course/services/lesson-transcript.service.ts` | Chỉnh sửa | Bỏ method `triggerTranscription()` fire-and-forget |
| `backend/src/modules/course/services/audio-extractor.service.ts` | Chỉnh sửa | Bổ sung semaphore giới hạn concurrency FFmpeg và cleanup an toàn |
| `backend/src/modules/assemblyai/assemblyai.service.ts` | Chỉnh sửa | Tách thành 2 method `submitTranscript` và `pollTranscript` |
| `backend/src/modules/transcript-analysis/processors/transcription-job.processor.ts` | **Tạo mới** | Processor chuyên trách xử lý video và transcription |
| `backend/src/modules/course/repositories/lesson-transcript.repository.ts` | Chỉnh sửa | Hỗ trợ lưu transcript bằng `ClientSession` |
| `frontend/src/features/course/components/player/lesson-player-studio.tsx` | Chỉnh sửa | Đảm bảo polling trạng thái video mượt mà |

---

## 4. Danh Sách Nhiệm Vụ Cụ Thể (Checklist)

- [x] Cập nhật topology RabbitMQ bổ sung queue và DLQ cho transcription (`mindly.transcription.v1`, `mindly.transcription.dead.v1`).
- [x] Bổ sung semaphore vào `AudioExtractorService` để giới hạn số tiến trình FFmpeg chạy song song (`FFMPEG_MAX_CONCURRENCY=1`).
- [x] Refactor `AssemblyAiService` để hỗ trợ lưu vết `externalTranscriptId` ngay sau khi submit và polling có timeout.
- [x] Xây dựng `TranscriptionJobProcessor` tuân thủ đầy đủ quy trình checkpoint và khối `finally` dọn dẹp file tạm.
- [x] Sửa đổi `LessonService.createLesson()`: Enqueue Job transcription ngay trong cùng session tạo bài học video mới.
- [x] Xóa bỏ toàn bộ các lời gọi `void this.triggerTranscription()` không an toàn.
- [x] Kiểm thử khả năng hủy (cancellation): Khi tắt Worker, gửi tín hiệu hủy tiến trình FFmpeg (kill child process qua `onModuleDestroy`).
- [x] Kiểm tra việc tăng `analysisInputRevision` sau khi transcript hoàn tất để kích hoạt bảo vệ dữ liệu cho các tác vụ AI sau đó.

---

## 5. Kịch Bản Kiểm Thử & Nghiệm Thu (Verification)

1. **Tải Lên Video Bài Học Chuẩn:** Tạo bài học với video hợp lệ -> API phản hồi ngay, bài học ở trạng thái `TRANSCRIBING`. Worker xử lý trích xuất audio, gửi AssemblyAI, lưu transcript và chuyển bài học sang `READY`.
2. **Nhiều Video Tải Lên Cùng Lúc:** Tải lên đồng thời 5 video bài học. Queue transcript xếp hàng 5 message; chỉ có đúng 1 tiến trình FFmpeg chạy tại một thời điểm; CPU máy dev không bị quá tải.
3. **Kill Worker Giữa Chừng:** Tắt đột ngột Worker khi AssemblyAI đang trong quá trình chuyển văn bản. Bật lại Worker; Worker phát hiện `externalTranscriptId` đã có sẵn trong Job và tiếp tục poll mà không trích xuất hay upload lại.
4. **Video Lỗi Không Có Audio:** Tải lên file video không chứa track âm thanh hoặc file bị hỏng; FFmpeg báo lỗi rõ ràng, file tạm được xóa, Job chuyển sang `failed` và bài học chuyển sang trạng thái lỗi (không bị treo mãi mãi ở `TRANSCRIBING`).
5. **Dọn Dẹp File Tạm:** Kiểm tra thư mục tạm trên ổ cứng sau khi chạy qua 10 lượt xử lý video; xác nhận không có bất kỳ file `.mp3` mồ côi nào bị sót lại.

---

## 6. Tiêu Chí Nghiệm Thu (Exit Gate)

Giai đoạn 6 hoàn thành khi:
- [x] Không còn bất kỳ luồng fire-and-forget nào trong việc xử lý video.
- [x] Bài học không bao giờ bị kẹt vĩnh viễn ở trạng thái `TRANSCRIBING` khi tiến trình khởi động lại.
- [x] Số lượng tiến trình FFmpeg chạy đồng thời luôn tuân thủ đúng ngưỡng cấu hình.
- [x] Không upload lại audio lên AssemblyAI khi đã có checkpoint hợp lệ.
- [x] Toàn bộ file tạm luôn được xóa sạch 100%.

---

## 7. Kế Hoạch Rollback

Nếu pipeline video mới gặp sự cố:
1. Tắt cờ xử lý queue video trong file cấu hình.
2. Trả lại tạm thời phương thức `triggerTranscription()` cũ trong khi khắc phục lỗi.
3. Không làm ảnh hưởng đến các tác vụ Summary, Quiz, Mindmap đã hoạt động ổn định ở Giai đoạn 5.
