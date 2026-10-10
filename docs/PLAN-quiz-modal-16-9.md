# Kế hoạch Triển khai: Tái cấu trúc Modal Thêm Câu Hỏi Tương Tác Theo Tỉ Lệ 16:9 & Giới Hạn Container (Chế độ Giảng viên)

> **File:** `docs/PLAN-quiz-modal-16-9.md`  
> **Trạng thái:** DRAFT / PROPOSED (Chỉ làm giao diện UI để xem trước, chưa thực hiện Backend)  
> **Agent lập kế hoạch:** `project-planner`  
> **Chuyên gia phụ trách thực thi:** `frontend-specialist` (Skills: `clean-code`, `frontend-design`, `react-best-practices`, `tailwind-patterns`)  
> **Giao diện mục tiêu:** `http://localhost:3000/instructor/courses/[id]/lessons/[lessonId]`  

---

## 1. Overview (Tổng quan Yêu cầu & Mục tiêu)

- **Mục tiêu:** Tái thiết kế toàn diện Modal tạo câu hỏi tương tác (`CreateQuizMarkerModal`) khi giảng viên click vào biểu tượng thêm câu hỏi trên thanh Timeline của bài học.
- **Yêu cầu cốt lõi từ người dùng:**
  1. **Tỉ lệ khung hình chuẩn 16:9 (`aspect-video`):** Toàn bộ khung modal tuân thủ tỉ lệ 16:9 chuẩn màn chiếu/video điện ảnh.
  2. **Độ rộng bằng container giao diện:** Độ rộng của modal không bung toàn màn hình vô tội vạ mà được neo khít với container hiển thị (khung container của trình phát video hoặc container nội dung bài học).
  3. **Phạm vi công việc (Scope):** **CHỈ LÀM GIAO DIỆN (UI ONLY)** để xem trước (preview), mock dữ liệu và tương tác trực quan, chưa cần làm phần backend/API.

---

## 2. Phân tích Thách thức Kỹ thuật & Kiến trúc Giao diện 16:9

### 2.1. Thách thức của Tỉ lệ 16:9 (Landscape Aspect Ratio)
- Khung hình 16:9 là định dạng **chiều ngang rộng hơn chiều cao** (ví dụ: rộng 960px thì cao 540px).
- Modal dạng dọc (portrait) truyền thống xếp các ô nhập liệu thành 1 cột từ trên xuống dưới sẽ khiến giao diện bị tràn chiều dọc, phải cuộn trang liên tục và làm hỏng trải nghiệm người dùng.
- **Giải pháp thiết kế:** Áp dụng **Bố cục 2 Cột Đối Xứng (Two-Column Cinema Layout)**:
  - **Cột trái (~45% chiều rộng):** Cấu hình tổng quan câu hỏi (Mốc thời gian, Tiêu đề câu hỏi, Chọn loại 1 đáp án/nhiều đáp án, Điểm chặn Checkpoint, Giải thích kiến thức).
  - **Cột phải (~55% chiều rộng):** Quản lý các phương án đáp án (A, B, C, D...) kèm đánh dấu đáp án đúng trực quan, và khu vực xem trước (Live Preview).

### 2.2. Hai Phương án Neo Container (Container-Bound Strategy)

| Đặc tính | Phương án 1: Dialog Neo Container (Recommended) | Phương án 2: In-Video Canvas Overlay |
| :--- | :--- | :--- |
| **Bản chất** | Dùng Radix Dialog / Modal nổi, nhưng giới hạn `max-w` khớp với chiều rộng container video và khóa cứng `aspect-video`. | Render trực tiếp như một lớp phủ (`absolute inset-0 z-30`) nằm đè lên khung canvas video 16:9 khi tạm dừng. |
| **Ưu điểm** | Độc lập, không bị ảnh hưởng bởi fullscreen hay controls của thẻ `<video>`, dễ quản lý backdrop mờ tối phía sau. | Tự nhiên như xem trên video, 100% ăn khớp từng pixel với khung video 16:9 hiện tại. |
| **Độ linh hoạt** | Có thể xem rõ nét trên mọi kích thước màn hình laptop/PC, không che khuất thanh controls dưới chân nếu muốn. | Giảng viên có cảm giác đang chỉnh sửa trực tiếp trên từng khung hình video. |

> **Khuyến nghị:** Áp dụng **Phương án 1** (hoặc cấu hình để modal Dialog căn giữa có kích thước vừa khít kích thước của khung video bên dưới với class `aspect-video w-full max-w-4xl`), mang lại giao diện sang trọng, sắc nét chuẩn Studio.

---

## 3. Kiến trúc Chi tiết Giao diện 16:9 (Visual Specification)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MODAL 16:9 (aspect-video)                                                    [✕ Đóng]  │
├─────────────────────────────────────────┬──────────────────────────────────────────────┤
│ ◀ CỘT TRÁI: THIẾT LẬP CÂU HỎI (45%)    │ ▶ CỘT PHẢI: PHƯƠNG ÁN & PREVIEW (55%)        │
│                                         │                                              │
│ • Header: [02:15] Tạo câu hỏi tương tác │ • Danh sách lựa chọn đáp án:                 │
│ • Loại câu hỏi:                         │   [A] [ Nội dung đáp án A...               ] │
│   [● Một đáp án]  [○ Nhiều đáp án]      │   [B] [ Nội dung đáp án B (Đúng)...  (✓)   ] │
│ • Nội dung câu hỏi (*):                 │   [C] [ Nội dung đáp án C...               ] │
│   [ Nhập câu hỏi kiểm tra tại mốc...  ] │   [D] [ Nội dung đáp án D...               ] │
│                                         │   [+ Thêm phương án lựa chọn]                │
│ • Cấu hình Checkpoint:                  │                                              │
│   [✓] Bắt buộc học viên trả lời đúng   │ • Tab Live Preview (Xem trước như học viên): │
│ • Giải thích đáp án (Optional):         │   "Thẻ mô phỏng câu hỏi xuất hiện trên video"│
│   [ Nhập lý do kiến thức củng cố...   ] │                                              │
├─────────────────────────────────────────┴──────────────────────────────────────────────┤
│ FOOTER: [Mốc: 02:15]                                   [Hủy bỏ]  [Lưu câu hỏi (Demo)]  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Phân bổ Thành phần UI
1. **Header Bar:**
   - Huy hiệu mốc thời gian nổi bật: Pill Badge màu vàng hổ phách (`bg-amber-500/15 border-amber-500/30 text-amber-500 font-mono font-bold`).
   - Tiêu đề: *"Tạo câu hỏi tương tác cho video"*.
   - Nút đóng nhanh `[✕]` góc trên bên phải.
2. **Cột Trái (Left Panel):**
   - Bộ chọn hình thức: 2 Tab / Toggle Buttons tinh tế: *"Một đáp án"* vs *"Nhiều đáp án"*.
   - Ô nhập câu hỏi (`Textarea` linh hoạt 3 dòng, tự động co giãn).
   - Checkbox Checkpoint: Thiết kế dạng Switch/Toggle card với nền mờ hiện đại, giải thích rõ *"Dừng video yêu cầu học viên trả lời trước khi xem tiếp"*.
   - Ô nhập giải thích đáp án sau khi làm bài.
3. **Cột Phải (Right Panel):**
   - Danh sách các lựa chọn A, B, C, D:
     - Nút chữ cái A, B, C, D tương tác (Click để đánh dấu đáp án đúng -> chuyển màu xanh ngọc `emerald-500`).
     - Ô nhập nội dung cho từng đáp án.
     - Nút xóa phương án hoặc thêm phương án (nâng cấp từ cố định 4 sang linh hoạt 2 - 5 phương án).
   - Card Live Preview thu nhỏ: Mô phỏng giao diện học viên sẽ nhìn thấy khi video chạy đến mốc thời gian này.
4. **Footer Bar:**
   - Trạng thái tóm tắt: Đang tạo câu hỏi tại giây thứ X.
   - Nút *"Hủy bỏ"* (Variant Ghost/Outline).
   - Nút *"Lưu câu hỏi (Giao diện xem trước)"* (Gradient Amber / Dark text, shadow nổi khối).

---

## 4. File Structure & Scope of Changes

```
frontend/src/features/course/
├── components/
│   └── player/
│       ├── create-quiz-marker-modal.tsx         # [REFACTOR] Nâng cấp sang tỉ lệ 16:9, bố cục 2 cột, fitting container
│       ├── lesson-video-screen.tsx              # [UPDATE] Đồng bộ kích thước container & truyền kích thước tham chiếu nếu cần
│       └── quiz-marker-preview-card.tsx         # [OPTIONAL / NEW] Thẻ mô phỏng xem trước câu hỏi ở cột phải
```

---

## 5. Task Breakdown (Chi tiết Công việc Thực hiện)

### Task 1: Tái cấu trúc Vỏ Khung Modal (Aspect-Ratio 16:9 & Container Fitting)
- **Agent phụ trách:** `frontend-specialist`
- **Priority:** P1
- **Mục tiêu:**
  - Cập nhật wrapper của `CreateQuizMarkerModal` sang định dạng `aspect-video` (hoặc `w-full max-w-4xl xl:max-w-5xl aspect-[16/9]`).
  - Đảm bảo chiều cao và chiều rộng luôn giữ chuẩn 16:9, tự động co giãn theo viewport nhưng không vượt quá độ rộng của container bài giảng.
  - Xử lý `overflow-hidden` ở khung ngoài và `overflow-y-auto` ở các panel con để đảm bảo không bị méo tỉ lệ 16:9 trên màn hình nhỏ.

### Task 2: Thiết kế Bố cục 2 Cột (Two-Column Split Layout)
- **Agent phụ trách:** `frontend-specialist`
- **Priority:** P1
- **Mục tiêu:**
  - Chia phần thân modal thành 2 cột: Cột trái (Form nhập câu hỏi & checkpoint) và Cột phải (Danh sách đáp án A/B/C/D & Live Preview).
  - Sử dụng CSS Grid hoặc Flexbox: `grid grid-cols-12 gap-5 h-full`.
  - Căn chỉnh typography, khoảng cách padding (`p-4` đến `p-6`) chuẩn mực để tận dụng tối đa chiều ngang mà không làm rối mắt.

### Task 3: Nâng cấp Trải nghiệm Lựa chọn Đáp án & Checkpoint
- **Agent phụ trách:** `frontend-specialist`
- **Priority:** P2
- **Mục tiêu:**
  - Hỗ trợ đổi trạng thái linh hoạt: Một đáp án đúng (Radio behavior) vs Nhiều đáp án đúng (Checkbox behavior).
  - Tinh chỉnh nút chữ cái A/B/C/D với màu sắc tương phản sắc nét (Emerald khi đúng, Muted xám khi thường).
  - Card Checkpoint có icon bảo vệ/ổ khóa thể hiện tính chất "Điểm chặn bài giảng".

### Task 4: Tích hợp Thẻ Xem trước (Live Interactive Preview)
- **Agent phụ trách:** `frontend-specialist`
- **Priority:** P2
- **Mục tiêu:**
  - Hiển thị ngay bên cạnh khung nhập liệu cách câu hỏi sẽ hiển thị trực quan cho học viên.
  - Khi giảng viên gõ câu hỏi hoặc thay đổi đáp án ở bên trái, card xem trước cập nhật theo thời gian thực (Real-time Preview).

### Task 5: Kiểm tra Thẩm mỹ & Tương tác Kích hoạt từ Timeline Pin Marker
- **Agent phụ trách:** `frontend-specialist`
- **Priority:** P2
- **Mục tiêu:**
  - Kiểm tra thao tác: Click vào Marker hình ghim bản đồ màu vàng trên seekbar -> Modal 16:9 mở ra mượt mà, đúng mốc giây.
  - Nút Lưu câu hỏi hiển thị Toast thành công dạng demo và đóng modal sau 1s.
  - Đảm bảo không có lỗi render, không xung đột CSS trên Next.js 16 và Tailwind CSS v4.

---

## 6. Verification Checklist (Tiêu chí Kiểm định)

- [ ] Khi click vào Marker hình ghim bản đồ màu vàng, Modal mở ra với tỉ lệ khung hình chuẩn 16:9 (`aspect-video`).
- [ ] Độ rộng của Modal tương ứng và nằm gọn trong phạm vi container của giao diện người dùng.
- [ ] Bố cục 2 cột nằm ngang cân đối, không bị cuộn trang vỡ layout hay che mất các nút điều khiển.
- [ ] Cột trái nhập thông tin câu hỏi, loại câu hỏi và checkpoint trơn tru.
- [ ] Cột phải nhập 4 đáp án A/B/C/D, click đổi đáp án đúng hoạt động chính xác.
- [ ] Nút Hủy và nút Lưu câu hỏi demo hoạt động mượt mà, video resume/pause đúng kỳ vọng.
- [ ] 100% tuân thủ quy tắc: Không can thiệp code Backend, giữ nguyên tính toàn vẹn của mã nguồn hiện tại.
