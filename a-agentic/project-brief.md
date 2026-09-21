# ĐỀ TÀI: HỆ THỐNG HỌC TRỰC TUYẾN VỚI VIDEO ĐA TƯƠNG TÁC
## Project Master Brief & Strategic Orientation for AI Agents

> **File:** `a-agentic/project-brief.md`  
> **Vai trò:** Single Source of Truth (Tài liệu gốc) định hướng toàn diện cho AI Agents (Antigravity, Gemini, Copilot...) về nghiệp vụ, kiến trúc và phạm vi đề tài đồ án tốt nghiệp.

---

## 1. Thông tin Tổng quan Đề tài

- **Tên đề tài:** Hệ thống Học trực tuyến với Video Đa tương tác (Interactive Video E-Learning Platform)
- **Sinh viên thực hiện:** Trịnh Hồng Cường
- **Mã số sinh viên (MSSV):** 28211151710
- **Giảng viên hướng dẫn (GVHD):** ThS. Nguyễn Hữu Phúc
- **Thời gian thực hiện:** 28/9/2026 – 22/12/2026 (3 tháng)

---

## 2. Mục tiêu Dự án & Bài toán Giải quyết

1. **Nền tảng E-Learning Đa tương tác**: Kết hợp quản lý khóa học hiện đại, chuyển đổi bài giảng thông minh bằng AI và thanh toán tự động qua mã VietQR (SePay).
2. **Tự động hóa biên soạn bài giảng**:
   - Sử dụng **AssemblyAI** để chuyển đổi giọng nói bài giảng thành văn bản (Speech-to-Text) kèm mốc thời gian (timestamp).
   - Tận dụng **Gemini API** để tự động phân tích transcript, sinh sơ đồ tư duy (Mindmap dạng Markdown) và bộ câu hỏi trắc nghiệm/flashcard ôn tập kèm điểm dừng (breakpoints).
   - Giúp giảng viên tiết kiệm 80% thời gian tạo tài liệu và câu hỏi kiểm tra.
3. **Trải nghiệm học tập chủ động cho học viên**:
   - **In-video Quiz**: Video tự động dừng tại các mốc thời gian quy định để học viên trả lời câu hỏi củng cố kiến thức trước khi xem tiếp.
   - **AImindmap Viewer**: Sơ đồ tư duy dạng cây trực quan (sử dụng thư viện **Markmap**) hiển thị song song với video, giúp người học nắm bắt toàn bộ bức tranh kiến thức bài giảng một cách trực quan, mạch lạc.
4. **Kiến trúc Bất đồng bộ Vững chắc**:
   - Sử dụng **RabbitMQ** làm Message Broker điều phối các tác vụ nặng (upload video, gọi Speech-to-Text, gọi LLM) nhằm chống nghẽn server và đảm bảo tính sẵn sàng cao.
5. **Thanh toán Tức thì (Instant Activation)**:
   - Tích hợp cổng thanh toán **SePay** qua mã VietQR, tự động xác thực và kích hoạt khóa học tức thời cho học viên qua Webhook.

---

## 3. Tech Stack Cốt lõi

| Lớp hệ thống | Công nghệ / Dịch vụ | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Ngôn ngữ** | TypeScript (Strict mode) | Áp dụng toàn diện cả Frontend, Backend và Share-Lib |
| **Backend API** | NestJS 11 | RESTful API, Repository Pattern, CLS Context, Base Abstract |
| **Frontend Web** | Next.js 16 (App Router), React 19, Tailwind CSS | Giao diện học trực tuyến, Server & Client Components |
| **Cơ sở dữ liệu** | MongoDB + Mongoose 8 | Lưu trữ tài liệu (Khóa học, bài giảng, quiz, giao dịch, người dùng) |
| **Message Queue** | RabbitMQ (AMQP) | Hàng đợi điều phối xử lý video và tác vụ AI nền |
| **Speech-to-Text** | AssemblyAI API | Chuyển giọng nói tiếng Việt/Anh sang text có timestamp chính xác |
| **AI LLM** | Google Gemini API (Gemini Flash/Pro) | Phân tích transcript, sinh mindmap markdown, sinh câu hỏi quiz |
| **Trực quan hóa Mindmap** | Markmap (`@markmap/react`, `markmap-view`) | Hiển thị sơ đồ tư duy tương tác dạng cây từ Markdown |
| **Cổng thanh toán** | SePay (VietQR + Webhook) | Tự động quét mã ngân hàng, kích hoạt khóa học tự động |
| **Shared Contracts** | `share-lib/` (pnpm workspace) | Chia sẻ DTOs, Enums, Interfaces giữa Backend và Frontend |

---

## 4. Năm Trụ cột Chức năng Chi tiết

### Trụ cột 1: Quản lý Khóa học & Tài khoản
- **Hệ thống vai trò**:
  - `ADMIN`: Quản trị hệ thống, phê duyệt khóa học, quản lý người dùng, xem báo cáo doanh thu toàn hệ thống.
  - `INSTRUCTOR` / `TEACHER`: Giảng viên tạo khóa học, tải bài giảng video, xem danh sách bài tập AI sinh ra, theo dõi doanh thu học viên mua khóa của mình.
  - `USER` / `STUDENT`: Học viên xem danh mục, mua khóa học qua VietQR, học qua video tương tác và mindmap, theo dõi tiến độ học tập.
- **Cấu trúc bài giảng**: Khóa học (`Course`) → Chương học (`Chapter`) → Bài học (`Lesson` - Video, Quiz, Tài liệu).

### Trụ cột 2: AI Pipeline Xử lý Video Bài giảng (Async via RabbitMQ)
- **Luồng xử lý bất đồng bộ**:
  1. Giảng viên tải file video lên hệ thống → Lưu file / Storage URL.
  2. Backend phát hành message `video.process` tới RabbitMQ Exchange.
  3. Worker nhận message và gửi audio sang **AssemblyAI** (Speech-to-Text).
  4. Nhận transcript có timestamp từ AssemblyAI.
  5. Worker gửi transcript sang **Gemini API** với prompt chuẩn hóa:
     - Sinh sơ đồ tư duy dạng Markdown phân cấp chuẩn (`# Bài giảng`, `## Ý chính`, `- Ý phụ`).
     - Sinh danh sách câu hỏi trắc nghiệm/flashcard kèm mốc dừng video (`timestamp` giây).
  6. Lưu kết quả vào MongoDB (`mindmapMarkdown`, `inVideoQuizzes`), cập nhật trạng thái bài học thành `READY`.

### Trụ cột 3: Trình phát Video Đa tương tác & Mindmap
- **In-video Quiz**:
  - Khi học viên xem video, player theo dõi thời gian hiện tại (`currentTime`).
  - Khi chạm mốc thời gian câu hỏi (`quiz.timestamp`), video tự động **Tạm dừng (Pause)** và mở modal/dialog câu hỏi tương tác.
  - Học viên trả lời, nhận phản hồi ngay (đúng/sai, lời giải thích) rồi mới bấm tiếp tục xem video.
- **AImindmap Song hành**:
  - Sơ đồ tư duy được render bằng thư viện **Markmap** nằm ở tab hoặc panel cạnh video.
  - Hiển thị cấu trúc cây tri thức bài học trực quan, hỗ trợ zoom, pan, thu gọn/mở rộng nhánh.

### Trụ cột 4: Xử lý Bất đồng bộ Quy mô lớn (RabbitMQ)
- Quản lý tải hiệu quả, chống tràn bộ nhớ và time-out khi xử lý video dung lượng lớn.
- Topology rõ ràng: Exchange, Queue, Dead Letter Exchange (DLX), Dead Letter Queue (DLQ).
- Đảm bảo cơ chế Retry với số lần giới hạn (Max 3 lần) và ghi log lỗi chi tiết (`failureReason`).

### Trụ cột 5: Thanh toán Tự động qua SePay
- Học viên chọn khóa học → Tạo đơn hàng (`Order`) với mã tham chiếu duy nhất (ví dụ: `DH123456`).
- Frontend hiển thị mã VietQR động với đúng số tiền và nội dung chuyển khoản.
- SePay bắn **Webhook** về Backend ngay khi tiền vào tài khoản ngân hàng.
- Backend xác thực chữ ký/secret, kiểm tra Idempotency (chống trùng lặp giao dịch), tạo bản ghi `Enrollment` kích hoạt khóa học tức thì trong MongoDB Transaction.

---

## 5. Ranh giới Phạm vi Dự án (Project Boundaries & Out of Scope)

> [!IMPORTANT]
> **AI Agent TUYỆT ĐỐI KHÔNG tự ý đề xuất hoặc code các tính năng ngoài phạm vi sau:**
> 1. ❌ **KHÔNG** làm lớp học ảo thời gian thực (Livestreaming, WebRTC, Zoom SDK, màn hình chia sẻ trực tiếp).
> 2. ❌ **KHÔNG** làm AI chấm điểm tự luận phức tạp (chỉ tập trung trắc nghiệm, flashcard, điểm dừng in-video quiz và mindmap).
> 3. ❌ **KHÔNG** yêu cầu tương tác 2 chiều phức tạp (như click node mindmap nhảy tua timeline video) trong giai đoạn hiện tại. Markmap tập trung thể hiện cấu trúc kiến thức phân cấp bài giảng.

---

## 6. Lộ trình Triển khai (28/9/2026 – 22/12/2026)

| Giai đoạn | Nội dung công việc | Mốc thời gian |
| :--- | :--- | :--- |
| **Giai đoạn 1** | Khảo sát & Phân tích yêu cầu | 28/9 – 05/10/2026 (8 ngày) |
| **Giai đoạn 2** | Thiết kế hệ thống, DB Schema, RabbitMQ topology, DTO Contracts | 06/10 – 15/10/2026 (10 ngày) |
| **Giai đoạn 3** | Cài đặt & Lập trình (Backend, AI Pipeline, Frontend) | 16/10 – 26/11/2026 (42 ngày) |
| **Giai đoạn 4** | Kiểm thử hệ thống (Unit tests, Integration, E2E) | 27/11 – 05/12/2026 (9 ngày) |
| **Giai đoạn 5** | Hoàn thiện báo cáo, nghiệm thu & bảo vệ đồ án | 06/12 – 15/12/2026 (8 ngày) |
