# AI Video Pipeline — Development History & Gotchas

> **Module:** AI Video Pipeline

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `PLANNING` (Thiết kế RabbitMQ topology và AI Contracts).
- **Kế hoạch triển khai:** Sprint 2 (Giai đoạn 3: Cài đặt & Lập trình).

---

## 2. Technical Notes & Gotchas

- **RabbitMQ Prefetch Count**: Khi thiết lập worker, đặt `prefetchCount = 1` hoặc `2` để tránh việc 1 worker nhận quá nhiều video cùng một lúc gây cạn kiệt RAM và CPU.
- **Gemini Structured Output**: Sử dụng chế độ JSON Mode (`responseMimeType: 'application/json'`) hoặc Pydantic/Zod schema validation khi gọi Gemini API để đảm bảo cấu trúc trả về luôn chuẩn JSON, tránh lỗi parse Markdown/JSON.
- **AssemblyAI Webhook vs Polling**: Có thể cấu hình AssemblyAI gửi webhook callback khi hoàn tất transcript hoặc sử dụng polling status để cập nhật tiến trình vào cơ sở dữ liệu.
