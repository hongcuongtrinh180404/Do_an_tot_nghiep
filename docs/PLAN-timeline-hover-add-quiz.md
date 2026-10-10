# Kế Hoạch Tính Năng: Nút "Thêm Câu Hỏi" Khi Hover Trúng Mốc Đã Có Câu Hỏi Trên Timeline (PLAN-timeline-hover-add-quiz.md)

## 1. Mục Tiêu & Mô Tả Yêu Cầu (Feature Overview)
- **Hành vi người dùng:**
  1. Giảng viên rê chuột (hover) trên thanh tua Seekbar của video.
  2. Khi vị trí con trỏ chuột chạm vào (hoặc ở rất gần $\pm 1.5s$) một mốc thời gian **đã có bộ câu hỏi** (checkpoint trong CSDL `quizCheckpoints`):
     - Hiển thị một nút bấm nổi hoặc thẻ hành động ngay bên dưới thanh timeline với nội dung: **"Thêm câu hỏi"** (kèm số thứ tự câu tiếp theo hoặc số lượng câu hiện có).
  3. Khi giảng viên click vào nút **"Thêm câu hỏi"** này:
     - Tự động tạm dừng video.
     - Mở Modal `CreateQuizMarkerModal` tại đúng mốc thời gian đó.
     - **Tự động thêm câu hỏi tiếp theo** vào bộ câu hỏi hiện tại (ví dụ: mốc này đang có 2 câu thì tự động sinh thêm `Câu 3` trống ở cuối danh sách).
     - Tự động chuyển active focus sang câu hỏi mới tạo để giảng viên có thể gõ ngay đề bài và các phương án mới.

---

## 2. Kiến Trúc & Thiết Kế Giải Pháp (Architecture & Design)

### Bước 1: Phát hiện Hover trúng Mốc Đã Có Câu Hỏi (`matchedHoverCheckpoint`)
- Trong `LessonVideoScreen`:
  - Dựa trên `hoverSlider.time` và danh sách `quizCheckpoints` (Map các câu hỏi theo timestamp), tính toán xem con trỏ chuột có đang trúng hoặc lân cận ($\le 1.5s$) mốc nào không:
    ```typescript
    const matchedHoverCheckpoint = useMemo(() => {
      if (!hoverSlider?.isHovering || !isInstructor) return null;
      for (const [ts, questions] of quizCheckpoints.entries()) {
        if (Math.abs(ts - hoverSlider.time) <= 1.5) {
          return {
            timestamp: ts,
            percent: (ts / duration) * 100,
            questions,
          };
        }
      }
      return null;
    }, [hoverSlider, isInstructor, quizCheckpoints, duration]);
    ```

### Bước 2: Hiển Thị Nút "Thêm Câu Hỏi" Ở Dưới Thanh Timeline
- Khi `matchedHoverCheckpoint !== null`:
  - Hiển thị một popover / floating action pill ngay phía dưới thanh trượt timeline tại vị trí phần trăm `matchedHoverCheckpoint.percent%`:
    - Giao diện: Nền tối bo góc, viền cam hổ phách, nút bấm màu cam `bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg`.
    - Nội dung hiển thị: 
      - Icon dấu cộng `+` hoặc `lucide:plus-circle`.
      - Text: `"Thêm câu hỏi"` (hoặc `"Thêm câu hỏi mới (Câu ${count + 1})"`).
      - Nhãn phụ: `Đang có ${count} câu hỏi tại ${formatTime(ts)}`.
    - Nút có `z-index` cao, tránh bị che khuất bởi thanh tua hay các nút điều khiển.

### Bước 3: Cơ Chế Tự Động Thêm Câu Tiếp Theo Vào Bộ Câu Hỏi Hiện Có
- Cập nhật `CreateQuizMarkerModal`:
  - Bổ sung prop `initialAddNewQuestion?: boolean` (mặc định `false`).
  - Trong `useEffect` khi mở modal:
    - Nếu mốc thời gian đó đã có câu hỏi (`matched.length > 0`):
      - Load danh sách câu hỏi hiện có.
      - **Nếu `initialAddNewQuestion === true`**:
        - Tự động gọi `createDefaultQuestion(matched.length + 1)` và append vào cuối mảng `questions`.
        - Đặt `activeQuestionIndex = matched.length` (trỏ trực tiếp vào câu hỏi mới).
  - Đảm bảo khi lưu, API `PUT /lessons/:id/quizzes/sync` gửi lên toàn bộ danh sách gồm các câu cũ + câu mới tạo.

---

## 3. Phân Công Trách Nhiệm (Agent Assignments)
- **Frontend Specialist:**
  - Cập nhật logic phát hiện hover và render nút floating "Thêm câu hỏi" dưới thanh timeline trong `lesson-video-screen.tsx`.
  - Cập nhật prop `initialAddNewQuestion` và luồng tự động append câu hỏi mới trong `create-quiz-marker-modal.tsx`.

---

## 4. Kịch Bản Kiểm Thử & Xác Nhận (Verification Checklist)
1. **Kiểm thử Hover Không Trúng Mốc:**
   - Rê chuột vào khoảng trống chưa có câu hỏi -> hiển thị tooltip/pin marker bình thường, không hiện nút "Thêm câu hỏi" của bộ câu hỏi cũ.
2. **Kiểm thử Hover Trúng Mốc Đã Có Câu Hỏi:**
   - Rê chuột vào chấm tròn mốc đã lưu câu hỏi -> nút `"Thêm câu hỏi"` hiện ra mượt mà bên dưới thanh timeline.
3. **Kiểm thử Click Thêm Câu Hỏi:**
   - Click vào nút `"Thêm câu hỏi"` -> Modal mở ra, danh sách cột phải giữ nguyên các câu cũ (ví dụ Câu 1) và tự động tạo thêm Câu 2 mới tinh ở trạng thái active.
   - Nhập đề bài cho Câu 2 -> Bấm `Lưu / Cập nhật câu hỏi` -> Hệ thống lưu thành công cả Câu 1 và Câu 2.
4. **Kiểm thử Typecheck & Unit Test:**
   - Chạy `pnpm --filter frontend exec tsc --noEmit` đạt 0 lỗi.
   - Chạy `vitest run` backend đạt 10/10 PASS.
