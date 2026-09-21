# Course Management — Dependencies & Module Integrations

> **Module:** Course Management

---

## 1. Upstream & Downstream Dependencies

- **Upstream Dependencies (Module này phụ thuộc vào):**
  - `auth-identity`: Xác thực người dùng, cung cấp JWT token, thông tin `userId` và quyền hạn (`RoleEnum`).
  - `base-abstract-audit`: Cung cấp `BaseAbstractDocument`, `BaseRepository`, `BaseService` và CLS Context để tự động ghi audit trail.
- **Downstream Dependencies (Các module phụ thuộc vào module này):**
  - `ai-video-pipeline`: Nhận sự kiện bài học mới tải video lên để chạy pipeline chuyển đổi sang text, mindmap và quiz.
  - `interactive-video-player`: Đọc thông tin bài học, video URL, mindmap markdown và mảng câu hỏi in-video quiz để hiển thị.
  - `payment-sepay`: Đọc thông tin giá khóa học và kích hoạt `Enrollment` cho học viên khi thanh toán thành công.
