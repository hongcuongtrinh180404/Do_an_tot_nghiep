# Interactive Video Player & Mindmap — Dependencies

> **Module:** Interactive Video Player

---

## 1. Upstream & Downstream Dependencies

- **Upstream Dependencies:**
  - `course-management`: Cung cấp API chi tiết bài học (`/api/v1/lessons/:id`) bao gồm link video, `mindmapMarkdown` và `inVideoQuizzes`.
  - `auth-identity`: Cung cấp thông tin xác thực để kiểm tra quyền học viên đã mua khóa học hay chưa.
- **Dependencies Thư viện:**
  - `markmap-lib`, `markmap-view` hoặc `@markmap/react` (dùng cho mindmap viewer).
  - D3.js (phục vụ hiển thị SVG của Markmap).
