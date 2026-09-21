# AI Video Pipeline — Rules & Business Flows

> **Module:** Xử lý video bất đồng bộ qua RabbitMQ, AssemblyAI (Speech-to-Text) và Google Gemini API (sinh Mindmap Markdown & In-video Quiz).

---

## 1. Nghiệp vụ & Luồng Dữ liệu (Processing Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Instructor as Giảng viên
    participant API as NestJS Video Controller
    participant Storage as Video Storage (S3/Cloudinary/Local)
    participant Broker as RabbitMQ Broker
    participant Consumer as NestJS Video Worker
    participant AAI as AssemblyAI API
    participant Gemini as Google Gemini API
    participant DB as MongoDB

    Instructor->>API: Tải video bài giảng lên
    API->>Storage: Lưu trữ tệp video
    API->>DB: Tạo bản ghi Lesson (status = UPLOADED)
    API->>Broker: Publish message { lessonId, videoUrl } tới Exchange
    API-->>Instructor: Trả về HTTP 202 Accepted (Đang xử lý)

    Consumer->>Broker: Lắng nghe & nhận message
    Consumer->>DB: Cập nhật status = TRANSCRIBING
    Consumer->>AAI: Gửi video/audio URL để transcribe kèm timestamps
    AAI-->>Consumer: Trả về Full Transcript kèm timestamp câu/từ

    Consumer->>DB: Cập nhật status = GENERATING_AI
    Consumer->>Gemini: Gửi prompt phân tích transcript (yêu cầu Markdown Mindmap & In-video Quizzes)
    Gemini-->>Consumer: Trả về JSON { mindmapMarkdown, inVideoQuizzes }

    Consumer->>DB: Lưu mindmapMarkdown, inVideoQuizzes & set status = READY
    Consumer->>Broker: Gửi Manual ACK xác nhận hoàn tất
```

---

## 2. Quy tắc Nghiệp vụ Cốt lõi (Core Business Rules)

1. **Chống nghẽn tiến trình (Non-blocking HTTP)**:
   - Tuyệt đối không gọi AssemblyAI hoặc Gemini đồng bộ bên trong request HTTP của người dùng.
2. **Khả năng chịu lỗi & Thử lại (Idempotency & Retry Strategy)**:
   - Worker chỉ gửi `ack` khi đã lưu dữ liệu thành công vào MongoDB.
   - Khi gặp lỗi mạng tạm thời từ External API (AssemblyAI/Gemini), worker sử dụng cơ chế retry tối đa 3 lần.
   - Nếu vượt quá số lần thử lại, message được chuyển sang Dead Letter Queue (DLQ) và trạng thái bài học được cập nhật là `FAILED` kèm lý do lỗi `failureReason`.
3. **Độ an toàn API Key**:
   - Khóa API của AssemblyAI và Google Gemini được cấu hình qua biến môi trường (`.env`), không hardcode trong mã nguồn.
