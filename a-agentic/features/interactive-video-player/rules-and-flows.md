# Interactive Video Player & Mindmap — Rules & Business Flows

> **Module:** Trình phát video bài giảng đa tương tác (In-video Quiz ngắt quãng) và hiển thị trực quan sơ đồ tư duy Markmap.

---

## 1. Nghiệp vụ & Trải nghiệm Người dùng (UX Flows)

1. **Trình phát Video tương tác (In-video Quiz)**:
   - Học viên mở bài học (`Lesson`).
   - Trong quá trình phát video, component lắng nghe sự kiện `timeupdate`.
   - Khi thời gian phát chạm đến mốc thời gian của một câu hỏi chưa trả lời (`Math.floor(currentTime) === quiz.timestamp`):
     - Trình phát tự động kích hoạt lệnh **Tạm dừng (`video.pause()`)**.
     - Một hộp thoại Modal tương tác xuất hiện hiển thị câu hỏi, danh sách đáp án.
     - Học viên chọn đáp án và bấm "Gửi câu trả lời":
       - Hiển thị ngay phản hồi: Đúng (xanh) hoặc Sai (đỏ) kèm lời giải thích (`explanation`).
       - Nút "Tiếp tục bài học" sáng lên để học viên bấm tiếp tục phát video (`video.play()`).
     - Đánh dấu câu hỏi này đã được hoàn thành để không bị dừng lại liên tục ở cùng 1 giây.
2. **Sơ đồ Tư duy Markmap Song hành (Mindmap Viewer)**:
   - Cạnh trình phát video (hoặc trong tab chuyên dụng), sơ đồ Markmap hiển thị cây kiến thức toàn bài.
   - Thư viện Markmap hỗ trợ: Thu phóng (Zoom), kéo thả (Pan), mở rộng hoặc thu gọn từng nhánh con.
   - Giúp người học có được cái nhìn tổng thể về nội dung bài giảng và cấu trúc các phần kiến thức.

---

## 2. Quy tắc Giao diện & Kỹ thuật (UI & Technical Rules)

1. **Không chặn người học khi tua video**:
   - Nếu người học tua qua một đoạn (seek), chỉ kích hoạt quiz khi thời gian xem bình thường đi qua mốc đó, tránh làm gián đoạn trải nghiệm điều hướng.
2. **Lưu trữ Trạng thái Làm bài**:
   - Kết quả làm in-video quiz (đúng/sai) có thể lưu tạm trong Local State của component hoặc gửi về backend để lưu tiến độ hoàn thành bài học của học viên.
3. **Responsive Layout**:
   - Trên desktop: Hiển thị 2 cột (Cột trái: Video player & Controls; Cột phải: Markmap Mindmap Viewer).
   - Trên mobile: Chuyển sang dạng Tab hoặc Accordion để đảm bảo trải nghiệm cảm ứng mượt mà.
