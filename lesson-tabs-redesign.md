# Plan: Redesign Lesson Studio Tabs (`lesson-tabs-redesign.md`)

> **Task Slug:** `lesson-tabs-redesign`  
> **Project Type:** WEB (Next.js 16 App Router + React 19 + Tailwind CSS v4)  
> **Active Skills:** `design-taste-frontend`, `clean-code`, `frontend-design`  
> **Primary Agent:** `frontend-specialist`  
> **User Choices:**  
> - Tab Bar Style: **Phương án 2 — Segmented Pill Track** (bo góc tinh gọn, không kéo dãn 100%, không đánh số 1-2-3).  
> - AI Action: **Mỗi tab có nút AI chuyên biệt** để kích hoạt tạo lại dịch vụ AI theo ngữ cảnh tab đó khi giảng viên chưa ưng ý.  
> - Hiển thị Key Points (Tab Summary): **Lựa chọn A — Vertical Timeline** liên kết với dòng thời gian video.

---

## 1. Mục tiêu & Nguyên tắc Thiết kế (`/design-taste-frontend`)

1. **Thanh Tab Bar dạng Segmented Pill Track (Bên trái) + Toolbar AI (Bên phải)**:
   - Loại bỏ cấu trúc `grid grid-cols-3` kéo dãn 1440px. Thay bằng cụm Segmented Control nhỏ gọn (~380px) đặt bên trái, nền xám `bg-muted/60 p-1 rounded-xl`.
   - Bỏ hoàn toàn việc đánh số index `1`, `2`, `3` (quy tắc *No index numbering* của design-taste).
   - Tách rời nút AI ra khỏi tab trigger: Gom nút kích hoạt AI của tab đang hoạt động sang góc phải của Tab Bar (`[✨ Tạo lại tóm tắt / Mindmap / Câu hỏi AI]`), hiển thị trạng thái loading spinner khi đang xử lý.
2. **Tab Summary — Bố cục Editorial & Vertical Interactive Timeline**:
   - Phần Tổng quan (Overview): Thiết kế phẳng, typography sắc sảo, loại bỏ badge thừa và viền xám lồng nhau.
   - Phần Ý chính (Key Points): Thiết kế dạng **Vertical Timeline List** với trục dòng thời gian nối liền:
     - Mốc thời gian dạng `00:27` số tabular font đơn trục bên trái, nhấp vào là tua video đến giây tương ứng (`onSeek`).
     - Tự động nhận diện `isNearCurrentTime` khi video phát đến đoạn đó: Node mốc thời gian sáng lên kèm hiệu ứng highlight tinh tế.
     - Nút Chỉnh sửa / Xóa xuất hiện mượt mà khi hover (`group-hover:opacity-100`).
3. **Đồng bộ Thẩm mỹ Toàn diện (Mindmap & Quiz Tabs)**:
   - Mindmap: Tích hợp bộ chuyển đổi chế độ xem (Dạng cây / Canvas) hài hòa vào thanh điều khiển, loại bỏ hoàn toàn mã màu indigo/tím vi phạm Purple Ban.
   - Quiz: Thẻ câu hỏi gắn mốc thời gian tua video, 4 đáp án dạng lưới gọn gàng với nhãn đáp án đúng màu xanh ngọc (`emerald-500`), không dùng màu tím (Purple Ban).

---

## 2. Ranh giới Triển khai (Boundaries)

- ✅ **Trong phạm vi:**
  - `frontend/src/features/course/components/player/lesson-tabs-container.tsx`: Thiết kế lại thanh Tab Bar thành Segmented Pill Track + Right Action Toolbar.
  - `frontend/src/features/course/components/player/tabs/lesson-summary-tab.tsx`: Viết lại giao diện Tổng quan & Vertical Timeline cho Key Points.
  - `frontend/src/features/course/components/player/tabs/lesson-mindmap-tab.tsx`: Tối ưu header và thanh công cụ đồng bộ, tuân thủ Purple Ban.
  - `frontend/src/features/course/components/player/tabs/lesson-quiz-tab.tsx`: Tối ưu header và danh sách câu hỏi theo phong cách sạch sẽ.
  - Kiểm tra TypeScript (`tsc --noEmit`).
  - Ghi nhận `a-agentic/features/interactive-video-player/dev-history.md`.
- ❌ **Ngoài phạm vi:**
  - Không thay đổi logic API backend hoặc RabbitMQ / Gemini prompt pipelines.

---

## 3. Kế hoạch Triển khai Chi tiết

- [x] **Bước 1:** Cập nhật `LessonTabsContainer` (`frontend/src/features/course/components/player/lesson-tabs-container.tsx`):
  - Chuyển tab header thành bố cục 2 bên: Left (Segmented Pill Track) + Right (Contextual AI Action Toolbar cho active tab).
  - Loại bỏ các nút `Test AI` nhồi nhét bên trong từng tab button.
- [x] **Bước 2:** Cập nhật `LessonSummaryTab` (`frontend/src/features/course/components/player/tabs/lesson-summary-tab.tsx`):
  - Làm lại thẻ Tổng quan gọn gàng, thanh thoát.
  - Dựng cấu trúc Vertical Timeline cho các Key Points (`relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 ...`).
  - Nổi bật mốc thời gian đang phát (`isNearCurrentTime`), nút tua video `onSeek`, inline edit form mượt mà.
- [x] **Bước 3:** Tinh chỉnh `LessonMindmapTab` & `LessonQuizTab`:
  - Đồng bộ tiêu đề và nút thao tác ngữ cảnh, tuân thủ Purple Ban (`indigo` -> `sky`).
- [x] **Bước 4:** Chạy kiểm tra TypeScript `tsc --noEmit` (Thành công, 0 lỗi) và ESLint (Thành công, 0 lỗi).
- [x] **Bước 5:** Cập nhật tài liệu `a-agentic/features/interactive-video-player/dev-history.md`.
- [x] **Bước 6:** Xóa bỏ toàn bộ dải sub-header banner dư thừa (lặp tiêu đề + lặp nút AI) bên dưới thanh tab theo ảnh phản hồi của người dùng trong cả 3 tab (Quiz, Summary, Mindmap).
