# Interactive Video Player & Mindmap — Development History

> **Module:** Interactive Video Player

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `IN_PROGRESS` (Hoàn thành tầng giao diện Lesson Player Studio 70/30 và 3 Tab container).
- **Kế hoạch triển khai:** Sprint 3 (Giai đoạn 3: Cài đặt & Lập trình giao diện Studio Player).

---

## 2. Technical Notes & Gotchas

- **Next.js SSR với Markmap**: Thư viện Markmap thao tác trực tiếp với DOM (`window`, `svg`). Do đó, component `MarkmapViewer` bắt buộc phải là Client Component (`'use client'`) và nên được nạp qua `next/dynamic` với `{ ssr: false }` để tránh lỗi Hydration mismatch trên Next.js App Router.
- **Phòng chống lặp Quiz**: Khi người dùng xem xong quiz và bấm tiếp tục, nếu video resume tại đúng giây `timestamp` đó, sự kiện `timeupdate` có thể bắn thêm 1 lần nữa trong cùng giây đó. Giải pháp: Thêm `answeredQuizTimestamps` vào Set hoặc cộng thêm `0.5s` khi phát tiếp (`video.currentTime += 0.5`).
- **Cinema Fixed Viewport Layout (70/30)**: Áp dụng `h-screen w-screen overflow-hidden` trên container ngoài cùng để loại bỏ hoàn toàn hiện tượng 2 thanh cuộn lồng nhau (Double scrollbars). Tầng trên chiếm 68% chiều cao (phân chia 70% Video Player 16:9 + 30% Navigation Sidebar), tầng dưới chiếm 32% chiều cao chứa hệ thống 3 Tab toàn màn hình cuộn nội dung độc lập.
- **Light Theme Synchronization**: Toàn bộ giao diện Player Studio (Header, Sidebar điều hướng, Bottom Tabs container) được đồng bộ chuyển sang giao diện Sáng (Light Theme với các tokens `bg-background`, `bg-card`, `text-foreground`, `border-border`), riêng khung canvas phát video giữ tỉ lệ 16:9 nền tối để đảm bảo độ tương phản thị giác khi xem video.
- **Controls Auto-hide & React 19 State Consistency**: Tránh gọi `setShowControls` đồng bộ trong `useEffect` khi trạng thái `isPlaying` thay đổi để không gây cascading renders. Sử dụng biến suy diễn `const isControlsVisible = !isPlaying || showControls;` để vừa đảm bảo hiển thị controls khi tạm dừng, vừa tự động ẩn sau 2.5s khi phát video.
- **Ergonomic Laptop Fit & Dynamic Height Synchronization**: Cấu hình kích thước tầng trên tối ưu hoàn toàn cho màn hình laptop:
  - Màn hình FHD (1440px - 1536px): Video 16:9 rộng ~960px - 1000px, cao ~540px - 562px. Sidebar rộng ~380px - 420px, khoảng cách giữa 2 khối 40px (`xl:gap-[40px]`).
  - Màn hình Laptop nhỏ (1280px - 1366px): Video rộng ~850px - 880px, cao ~480px - 495px. Sidebar rộng ~360px.
  - Chiều cao cột bên phải được đồng bộ chính xác theo chiều cao video 16:9 bằng `ResizeObserver`, giúp thanh cuộn dọc (`overflow-y-auto`) bên trong tab Timeline/Curriculum hoạt động mượt mà không làm trồi sụt khung hình layout.
- **Sentence-Level Timeline & Realtime Outline từ Database (MongoDB)**:
  - Tích hợp hook `useLessonTranscriptQuery` nạp dữ liệu trực tiếp từ collection `lesson_transcripts` trong MongoDB thông qua API `GET /lessons/:id/transcript`.
  - Hiển thị danh sách các câu nói (`sentences: [{ text, start, end }]` tính bằng milliseconds) trong tab Timeline của thanh điều hướng bên phải.
  - Tự động outline sáng rõ (`ring-2 ring-sky-500 border-sky-500 bg-sky-50 dark:bg-sky-950/40`) câu đang phát dựa trên `currentTime` của video player kèm icon âm thanh động.
  - Tự động cuộn thông minh (`scrollIntoView({ behavior: 'smooth', block: 'nearest' })`) theo câu đang nói, đồng thời phát hiện sự kiện lăn chuột thủ công của người dùng (`wheel`, `touchmove`) để tạm dừng cuộn, cung cấp nút nổi bật "Theo video" để tiếp tục cuộn.
  - Giữ nguyên các mốc chương/nội dung quan trọng trên thanh tua video của `LessonVideoScreen` để tránh phân mảnh thanh seekbar.
- **Khắc phục Vỡ Layout Khi Chuyển Trang Client-Side (Circular Flexbox Stretch)**:
  - *Root Cause:* Khi chuyển trang từ Chi tiết khóa học sang Xem trước bài giảng, dữ liệu bài học đã được cache trong React Query nên danh sách render ngay. Do Sidebar ban đầu có `lg:h-auto` và thẻ cha dùng `items-stretch`, Sidebar bung dài làm kéo dãn Video Card qua `items-stretch`, khiến `ResizeObserver` đo nhầm chiều cao dãn nở `>1000px` và khóa cứng `sidebarHeight` ở mức quá khổ.
  - *Giải pháp:* Đổi thẻ cha từ `items-stretch` sang `items-start` để Video Card luôn 100% độc lập giữ chuẩn 16:9 (`~540px`). Cột Sidebar đặt fallback cố định `lg:h-[540px]` khi chưa có `sidebarHeight`.
  - *Scroll Restoration:* Tự động reset `window.scrollTo({ top: 0, left: 0, behavior: 'instant' })` khi mount trang bài học để ngăn hiện tượng trôi vị trí cuộn trang.
  - *Semantic Link:* Chuẩn hóa nút xem trước từ `div router.push` sang thẻ `<Link href={...}>` của Next.js.


