# AI Video Pipeline — Dependencies & Module Integrations

> **Module:** AI Video Pipeline

---

## 1. Upstream & Downstream Dependencies

- **Upstream Dependencies:**
  - `course-management`: Cung cấp bản ghi `Lesson` và đường dẫn file video để xử lý.
  - RabbitMQ Server: Broker vận chuyển messages.
  - AssemblyAI Cloud API: Cung cấp dịch vụ Speech-to-Text.
  - Google Gemini API: Cung cấp LLM phân tích văn bản và sinh cấu trúc JSON.
- **Downstream Dependencies:**
  - `interactive-video-player`: Nhận dữ liệu `mindmapMarkdown` và mảng câu hỏi `inVideoQuizzes` đã sinh để hiển thị cho học viên.
