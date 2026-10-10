# Plan: Kịch Bản Xử Lý Câu Hỏi Tương Tác Trong Chế Độ Toàn Màn Hình (Fullscreen Interactive Quiz Flow)

> **File:** `docs/PLAN-fullscreen-quiz-flow.md`  
> **Feature:** `interactive-video-player`  
> **Module:** Frontend Video Player Studio  
> **Status:** PLANNING (Chờ người dùng duyệt trước khi triển khai)

---

## 1. Tổng Quan & Mục Tiêu

Kế hoạch này giải quyết trọn vẹn trải nghiệm xem video khi gặp mốc câu hỏi tương tác trong cả 2 trạng thái: **Màn hình tiêu chuẩn (Normal View)** và **Toàn màn hình (Fullscreen View)** theo đúng yêu cầu người dùng:

1. **Bấm [Bỏ qua] (Skip):** Video tiếp tục phát ngay tại thời điểm dừng hiện tại (loại bỏ độ trôi `+0.5s`, bảo toàn từng khung hình âm thanh/hình ảnh).
2. **Kích thước Modal câu hỏi:** Cố định kích thước modal hiển thị chuẩn theo kích thước như lúc xem ở giao diện bình thường (`max-w-[1020px]` tỉ lệ 16:9), không bị bung phình quá khổ khi xem trên màn hình lớn Fullscreen.
3. **Kỹ thuật Fullscreen API:** Đảm bảo Modal và Prompt Overlay hiển thị trọn vẹn bên trong ngữ cảnh Fullscreen của trình duyệt (`containerRef`), không bị nuốt sự kiện hay bị che khuất sau lớp màn hình Fullscreen.

---

## 2. Phân Tích Kỹ Thuật & Giải Pháp Kiến Trúc

### A. Phát lại ngay tại thời điểm dừng (Exact Resume Playback)
- **Hiện trạng:** Hàm `handleSkipPrompt` và `handleCompleteAndResumeVideo` đang cộng thêm `videoRef.current.currentTime += 0.5` để ép tua qua giây checkpoint.
- **Giải pháp:**
  - `handledQuizTimestampsRef` đã tự động ghi nhận mốc giây (`handledQuizTimestampsRef.current.add(timestamp)`) ngay khi prompt xuất hiện.
  - Loại bỏ hoàn toàn dòng `videoRef.current.currentTime += 0.5`.
  - Chỉ gọi `videoRef.current.play().catch(() => {})`, video sẽ tiếp tục phát ngay tại mili-giây dừng mà không bị nhảy cóc âm thanh.

### B. Chuẩn hóa Kích thước Modal (Lock Dimensions to Standard Normal View)
- **Hiện trạng:** `DialogContent` của `StudentInVideoQuizModal` dùng `max-w-[calc(1440px-3rem)] 2xl:max-w-[calc(1536px-3rem)]`, khi mở Fullscreen trên màn hình 2K/4K/FHD sẽ nở rộng tới 1500px, quá lớn so với tầm mắt người học.
- **Kích thước tiêu chuẩn lúc không mở full:** Khung video player bình thường có chiều rộng tối đa $\sim 960\text{px} - 1020\text{px}$ (chuẩn 16:9 cao $\sim 540\text{px} - 574\text{px}$).
- **Giải pháp:**
  - Khóa kích thước tối đa của Modal: `max-w-[min(calc(100vw-2rem),1020px)] aspect-video max-h-[85vh]`.
  - Dù đang xem ở màn hình bình thường hay Fullscreen trên màn hình máy tính 1080p/2K/4K, giao diện câu hỏi luôn giữ đúng kích thước $\sim 1020\text{px}$ chuẩn 16:9 đặt cân đối ở giữa, typography và lưới 4 đáp án vừa vặn trong tầm mắt, không phải liếc mắt sang hai bên.

### C. Cơ chế Hiển thị Liền mạch trong Fullscreen (In-Container Cinema Overlay)
- **Vấn đề của HTML5 Fullscreen API:** Khi `container.requestFullscreen()` chạy, nếu dùng `DialogPortal` mặc định của Base UI / Radix đẩy ra `document.body`, trình duyệt sẽ che giấu Modal phía sau lớp Fullscreen.
- **Giải pháp kỹ thuật:**
  - Xây dựng cơ chế **In-Player Overlay** trực tiếp bên trong `containerRef` của Video Player (nằm cùng cấp với `InVideoQuizPromptOverlay` ở `absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm`).
  - Hoặc truyền `container={containerRef.current || undefined}` vào `DialogPortal` để Portal mount trực tiếp vào phần tử Fullscreen.
  - Nhờ đó:
    - Ở chế độ bình thường: Modal nổi trên khung video.
    - Ở chế độ Fullscreen: Modal nổi giữa màn chiếu rạp phim, sắc nét, giữ nguyên trạng thái Fullscreen từ đầu tới cuối.

---

## 3. Kế Hoạch Triển Khai Chi Tiết (Phased Task Breakdown)

### Phase 1: Tinh Chỉnh Xử Lý Thời Gian Resume Video
- [ ] Cập nhật `handleSkipPrompt` trong `lesson-video-screen.tsx`: bỏ `videoRef.current.currentTime += 0.5`, gọi trực tiếp `videoRef.current.play()`.
- [ ] Cập nhật `handleCompleteAndResumeVideo` trong `lesson-video-screen.tsx`: bỏ `videoRef.current.currentTime += 0.5`, gọi trực tiếp `videoRef.current.play()`.

### Phase 2: Chuẩn Hóa Kích Thước & Tỉ Lệ Modal
- [ ] Cập nhật `student-in-video-quiz-modal.tsx`:
  - Thiết lập chiều rộng chuẩn: `max-w-[min(calc(100vw-2rem),1020px)] aspect-video max-h-[85vh]`.
  - Căn giữa hoàn hảo, padding đồng bộ, giữ nguyên giao diện chọn đáp án A/B/C/D, kiểm tra đúng/sai và xem giải thích.
  - Đồng bộ kích thước card của `InVideoQuizPromptOverlay` (`max-w-md`) vừa vặn cân đối trong mọi độ phân giải.

### Phase 3: Xử Lý Ngữ Cảnh Fullscreen Liền Mạch
- [ ] Cung cấp `containerRef` cho Modal để hiển thị trực tiếp bên trong phần tử Fullscreen của trình duyệt.
- [ ] Kiểm tra tương tác phím tắt trong Fullscreen:
  - Phím `F` / icon thu nhỏ: Thu nhỏ bình thường.
  - Phím `Space` khi đang mở Modal: Không làm pause/play video ngầm.
  - Click chọn đáp án: Không làm kích hoạt sự kiện click video nền.

### Phase 4: Kiểm Thử & Cập Nhật Tài Liệu
- [ ] Kiểm thử luồng Fullscreen trên trình duyệt (FHD, 1440p).
- [ ] Chạy `pnpm --filter frontend exec tsc --noEmit` xác nhận 0 lỗi kiểu dữ liệu.
- [ ] Chạy unit test backend (`pnpm --filter backend test ...`) đảm bảo hệ thống ổn định.
- [ ] Ghi chép dev log vào `a-agentic/features/interactive-video-player/dev-history.md`.

---

## 4. Phân Công Trách Nhiệm (Agent Assignments)

| Vai trò | Phụ trách | Phạm vi |
| :--- | :--- | :--- |
| **`frontend-specialist`** | UI/UX & Fullscreen Overlay | `lesson-video-screen.tsx`, `student-in-video-quiz-modal.tsx`, `in-video-quiz-prompt-overlay.tsx` |

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. Khi video chạy tới mốc câu hỏi trong chế độ Toàn màn hình:
   - Video tự động dừng.
   - Popup nhắc nhở xuất hiện nổi bật ở giữa.
2. Nếu bấm **[Bỏ qua]**: Video phát tiếp ngay lập tức tại vị trí dừng (không nhảy tiến 0.5s).
3. Nếu bấm **[Làm câu hỏi]**:
   - Modal bài tập xuất hiện trực tiếp trong Fullscreen mà không bị ẩn hay văng ra ngoài.
   - Kích thước Modal giữ nguyên chuẩn $\sim 1020\text{px}$ (16:9) y hệt như lúc xem ở màn hình tiêu chuẩn, không bị phình to toàn màn hình.
   - Làm xong bấm **[Tiếp tục xem video]**: Modal đóng lại, video tiếp tục phát trong chế độ Fullscreen mượt mà.
