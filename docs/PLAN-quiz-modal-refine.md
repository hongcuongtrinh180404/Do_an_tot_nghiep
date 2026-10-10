# Kế hoạch Triển khai: Tinh Chỉnh Giao Diện Modal Câu Hỏi 16:9 (Bỏ Header, Kéo Thả Thứ Tự, Compact Switch & Active Glow)

> **File:** `docs/PLAN-quiz-modal-refine.md`  
> **Trạng thái:** DRAFT / PROPOSED (Chỉ làm giao diện UI để xem trước, chưa thực hiện Backend)  
> **Agent lập kế hoạch:** `project-planner`  
> **Chuyên gia phụ trách thực thi:** `frontend-specialist` (Skills: `clean-code`, `frontend-design`, `react-best-practices`, `tailwind-patterns`)  
> **Giao diện mục tiêu:** `http://localhost:3000/instructor/courses/[id]/lessons/[lessonId]`  

---

## 1. Overview (Tổng quan Yêu cầu Tinh chỉnh)

Theo phản hồi từ người dùng, Modal tạo câu hỏi tương tác ([`CreateQuizMarkerModal`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/create-quiz-marker-modal.tsx)) cần được tinh chỉnh loại bỏ các chi tiết thừa, tối giản thanh thoát, bổ sung tính năng **kéo thả thay đổi thứ tự câu hỏi**, và điều chỉnh style active tinh tế:

1. **Loại bỏ hoàn toàn thanh Header trên cùng:**
   - Xóa bỏ dải header chứa tiêu đề *"Tạo câu hỏi tương tác video"*, mốc thời gian phụ, thông tin bài học và nút đóng `[✕]` cũ. Trả lại 100% diện tích chiều dọc cho 2 cột làm việc.
2. **Loại bỏ checkbox Checkpoint:**
   - Xóa bỏ checkbox *"Bắt buộc trả lời đúng (Checkpoint)"*, học viên tương tác tự nhiên không bị chặn cưỡng bức dừng video.
3. **Thu nhỏ kích thước bộ chọn hình thức câu hỏi:**
   - Chuyển sang dạng Compact Segmented Switch nhỏ gọn (2 nút con mỏng nhẹ nằm cạnh nhau: `Một đáp án đúng` vs `Nhiều đáp án đúng`).
4. **Lưới 4 đáp án A, B, C, D (2x2):**
   - Khi chọn đáp án đúng: chỉ cần nút chữ cái A/B/C/D đổi sang màu xanh ngọc (`emerald-500`).
   - Bỏ hoàn toàn chữ `(Đúng)` ở mép phải của ô input để giao diện rộng rãi, sạch sẽ.
5. **Thẻ câu hỏi đang chọn ở cột 30% (Active State):**
   - **Không đổi màu nền:** Giữ nguyên nền trắng (`bg-card` / `bg-white`).
   - **Chỉ bật viền nổi bật & đổ bóng:** Viền màu cam hổ phách + đổ bóng nhẹ xung quanh như timeline (`border-amber-500 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/10`).
6. **Bổ sung Ký hiệu Kéo Thả (Drag Handle ⠿):**
   - Thêm icon `⠿` (`lucide:grip-vertical`) ở mép trái của mỗi thẻ ở cột phải với con trỏ `cursor-grab active:cursor-grabbing`.
   - Giảng viên có thể kéo thả trực tiếp để hoán đổi thứ tự các câu hỏi (ví dụ: kéo Câu 3 lên thành Câu 1).

---

## 2. Thiết kế Chi tiết Giao diện 2 Cột (16:9, Tỉ lệ 70% / 30%)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MODAL 16:9 (CONTAINER BOUND: ~1392px - KHÔNG CÒN HEADER TRÊN CÙNG)                                                     │
├─────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┤
│ ◀ CỘT TRÁI (70%): FORM NHẬP LIỆU & BIÊN TẬP                     │ ▶ CỘT PHẢI (30%): DANH SÁCH & KÉO THẢ THỨ TỰ         │
│                                                                 │                                                      │
│ [⏱ 03:19]  Câu 1 / 3                                            │ Danh sách câu hỏi (3)                   [+ Thêm câu] │
│                                                                 │                                                      │
│ Nội dung câu hỏi *                                        32 ký tự│ ┌──────────────────────────────────────────────────┐ │
│ ┌─────────────────────────────────────────────────────────────┐ │ │ ⠿  [1] Câu 1 (Active: Viền cam + đổ bóng, nền card)│ │
│ │ Nhập đề bài câu hỏi tại mốc này...                          │ │ │     Ưu điểm chính của MongoDB so với...        │ │
│ └─────────────────────────────────────────────────────────────┘ │ └──────────────────────────────────────────────────┘ │
│                                                                 │ ┌──────────────────────────────────────────────────┐ │
│ Hình thức: [● Một đáp án đúng]  [○ Nhiều đáp án đúng] (Compact) │ │ ⠿  [2] Câu 2                                     │ │
│                                                                 │ │     Loại index nào tối ưu cho soft delete...     │ │
│ Phương án trả lời (A, B, C, D)  (Click chữ cái để chọn đúng)   │ └──────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────┬──────────────────────────────┐ │ ┌──────────────────────────────────────────────────┐ │
│ │ [A] [ Nội dung đáp án A... ] │ [B] [ Nội dung đáp án B... ] │ │ │ ⠿  [3] Câu 3 (Kéo thả lên/xuống)                 │ │
│ ├──────────────────────────────┼──────────────────────────────┤ │ │     Transaction trong Replica Set hoạt động...   │ │
│ │ [C] [ Nội dung đáp án C... ] │ [D] [ Nội dung đáp án D... ] │ │ └──────────────────────────────────────────────────┘ │
│ └──────────────────────────────┴──────────────────────────────┘ │                                                      │
│                                                                 │ (Thanh cuộn dọc overflow-y-auto riêng biệt)          │
│ Giải thích đáp án (Hiển thị sau khi học viên trả lời):          │                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │                                                      │
│ │ Giải thích lý do vì sao đáp án này chính xác...             │ │                                                      │
│ └─────────────────────────────────────────────────────────────┘ │                                                      │
│                                                                 │                                                      │
│                                   [ Hủy / Đóng ]  [ Lưu câu hỏi ]│                                                      │
└─────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘
```

---

## 3. Đặc tả Kỹ thuật Từng Khối Giao diện

### 3.1. Cột Trái (70% Chiều ngang) – Form Nhập Liệu & Biên Tập
1. **Hàng đầu tiên:**
   - Mốc thời gian: Badge nhỏ gọn bo góc viền cam nhạt `[⏱ 03:19]` (`px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 font-mono text-xs font-bold`).
   - Bên cạnh: Tag định vị số thứ tự `Câu 1 / 3` (`text-xs font-bold text-muted-foreground`).
   - Khoảng trống bên phải để thoáng, không còn checkbox Checkpoint.
2. **Ô nhập nội dung câu hỏi (Question Textarea):**
   - Nhãn: `Nội dung câu hỏi *` kèm bộ đếm ký tự nhỏ bên phải.
   - Textarea: Bo góc `rounded-xl border border-slate-200 dark:border-zinc-800 bg-card p-3 text-xs focus:ring-1 focus:ring-amber-400 outline-none resize-none`, chiều cao 3 - 4 dòng chữ (`min-h-[72px]`).
3. **Chọn hình thức câu hỏi (Compact Segmented Switch):**
   - 2 nút bấm nhỏ gọn cạnh nhau, padding mỏng `py-1.5 px-3 rounded-lg text-xs`:
     - *Nút đang chọn:* `border border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 font-semibold shadow-2xs`.
     - *Nút chưa chọn:* `border border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 font-normal`.
4. **Khu vực các phương án trả lời (A, B, C, D) – Lưới 2x2:**
   - Tiêu đề nhỏ: `Phương án trả lời (A, B, C, D)` kèm ghi chú mờ `(Click vào chữ cái để đánh dấu đáp án đúng)`.
   - Bố trí lưới 2 cột x 2 hàng:
     - Hàng trên: A & B
     - Hàng dưới: C & D
   - Mỗi ô:
     - Badge chữ cái: Nút vuông bo góc `size-8 shrink-0 font-bold text-xs`.
       - ĐÁP ÁN ĐÚNG: Nút đổi sang màu xanh ngọc (`bg-emerald-500 border-emerald-600 text-white shadow-xs`).
       - ĐÁP ÁN THƯỜNG: Nút xám nhạt (`bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200`).
     - Ô input text: Viền bo cạnh badge, trải dài để gõ câu trả lời.
     - **Không có nhãn chữ `(Đúng)` ở mép phải**, trả lại 100% diện tích cho ô nhập liệu.
5. **Khu vực giải thích đáp án:**
   - Nhãn: `Giải thích đáp án (Hiển thị sau khi học viên trả lời)`.
   - Textarea 1 - 2 dòng gọn gàng (`min-h-[46px] rounded-xl`).
6. **Hàng nút hành động chân trang (Footer cột trái):**
   - Căn sát bên phải:
     - Nút phụ: `[ Hủy / Đóng ]` (`bg-card border border-border text-foreground px-4 py-2 rounded-xl text-xs`).
     - Nút chính: `[ Lưu / Cập nhật câu hỏi ]` (`bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs shadow-md shadow-amber-500/20`).

### 3.2. Cột Phải (30% Chiều ngang) – Danh Sách Điều Hướng & Kéo Thả Thứ Tự
1. **Thanh Header nhỏ:**
   - Tiêu đề: `Danh sách câu hỏi (X)` kèm icon danh mục `lucide:list-checks`.
   - Nút nhỏ: `+ Thêm câu` (`bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1`).
2. **Danh sách thẻ câu hỏi kéo thả (Vertical Draggable List):**
   - **Ký hiệu kéo thả (Grip Handle):** Icon 6 chấm `⠿` (`lucide:grip-vertical`) nằm ở mép ngoài cùng bên trái với `cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700`.
   - **Số thứ tự:** Huy hiệu tròn nhỏ `1`, `2`, `3` cạnh drag handle.
   - **Tiêu đề & Tóm tắt:** Tên câu (`Câu X`) và trích đoạn 1 - 2 dòng dùng `line-clamp-2`.
   - **Badge nhỏ góc trên:** Tag loại câu (`1 đáp án` hoặc `Nhiều đáp án`).
   - **Nút xóa câu:** Icon thùng rác nhỏ màu xám nhạt ở góc phải (nếu có > 1 câu).
   - **Quy tắc trạng thái Active:**
     - **Không đổi màu background** (giữ nguyên nền trắng `bg-card` / `bg-white`).
     - **Chỉ bật outline viền nổi bật + đổ bóng mờ xung quanh:** `border-amber-500 ring-2 ring-amber-500/25 shadow-md shadow-amber-500/15`.
   - **Trạng thái chưa chọn:** Viền xám mỏng `border border-border/70 hover:border-border`.
3. **Cơ chế Kéo Thả (HTML5 Drag and Drop):**
   - Người dùng giữ chuột vào icon `grip-vertical` hoặc thân thẻ để kéo câu hỏi lên/xuống.
   - Khi thả chuột (Drop), mảng `questions` lập tức hoán đổi vị trí và cập nhật lại số thứ tự `order` (`1, 2, 3...`) mà không làm mất nội dung đang chỉnh sửa.

---

## 4. File Structure & Changes

- **File sửa đổi duy nhất:** [`frontend/src/features/course/components/player/create-quiz-marker-modal.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/create-quiz-marker-modal.tsx)
  - Loại bỏ hoàn toàn khối `DialogHeader` và gradient line trên cùng.
  - Bỏ checkbox Checkpoint.
  - Compact Question Type switch.
  - Lưới đáp án 2x2 bỏ chữ `(Đúng)`.
  - Cập nhật Active styling cho thẻ ở cột phải (giữ nền trắng, chỉ bật viền cam + bóng).
  - Tích hợp Drag & Drop handlers: `onDragStart`, `onDragOver`, `onDragEnd`, `onDrop`.

---

## 5. Task Breakdown (Chi tiết Công việc)

### Task 1: Loại bỏ Header trên cùng & Căn chỉnh khung modal 16:9
- **Agent:** `frontend-specialist`
- **Mục tiêu:**
  - Xóa bỏ `DialogHeader` và dải màu trên cùng trong `CreateQuizMarkerModal`.
  - Toàn bộ chiều cao của modal được phân bổ trực tiếp cho 2 cột 70/30.
  - Thêm nút đóng `[✕]` tinh tế (nếu cần) hoặc tận dụng nút `[Hủy / Đóng]` ở chân form.

### Task 2: Tái thiết kế Cột Trái 70% (Compact Switch, Không Checkpoint, Bỏ chữ Đúng)
- **Agent:** `frontend-specialist`
- **Mục tiêu:**
  - Hàng 1: Badge thời gian `⏱ 03:19` + `Câu 1 / 3`, bỏ checkbox Checkpoint.
  - Hàng 2: Textarea câu hỏi 3-4 dòng `rounded-xl`.
  - Hàng 3: Compact Segmented switch (2 nút mỏng nhẹ `py-1.5 px-3 rounded-lg text-xs`).
  - Hàng 4: Lưới 2x2 đáp án (A, B trên / C, D dưới), nút chữ cái đổi màu xanh khi đúng, bỏ chữ `(Đúng)` bên phải.
  - Hàng 5 & 6: Ô giải thích và nút `[Hủy / Đóng]`, `[Lưu câu hỏi]` màu cam.

### Task 3: Tái thiết kế Cột Phải 30% (Active Glow Nền Trắng & Drag Handle ⠿)
- **Agent:** `frontend-specialist`
- **Mục tiêu:**
  - Header: `Danh sách câu hỏi (X)` + nút `+ Thêm câu`.
  - Card câu hỏi: Thêm icon `⠿` (`lucide:grip-vertical`) ở mép trái với con trỏ `cursor-grab`.
  - Sửa Active State: Giữ nguyên `bg-card` / `bg-white`, chỉ bật viền cam `border-amber-500 ring-2 ring-amber-500/25 shadow-md shadow-amber-500/15`.

### Task 4: Cài đặt Logic Kéo Thả Thứ Tự (Drag & Drop Reordering)
- **Agent:** `frontend-specialist`
- **Mục tiêu:**
  - Sử dụng HTML5 Drag and Drop API (`draggable`, `onDragStart`, `onDragOver`, `onDrop`).
  - Khi thả câu vào vị trí mới: Cập nhật lại mảng `questions` và cập nhật lại số thứ tự `order`.
  - Giữ nguyên trạng thái câu đang được chọn (Active Question) đúng nội dung.

### Task 5: Kiểm tra Thẩm mỹ, Responsive & TypeScript Typecheck
- **Agent:** `frontend-specialist`
- **Mục tiêu:**
  - Chạy `pnpm --filter frontend exec tsc --noEmit` xác nhận 0 lỗi.
  - Đảm bảo trải nghiệm mượt mà, thoáng mắt chuẩn yêu cầu.

---

## 6. Verification Checklist (Tiêu chí Kiểm tra)

- [ ] Không còn thanh Header trên cùng (không còn dải tiêu đề, mốc thời gian phụ, hay dải ngăn cách trên đỉnh).
- [ ] Không còn checkbox "Bắt buộc trả lời đúng (Checkpoint)".
- [ ] Hàng đầu cột trái chỉ có badge `⏱ 03:19` và nhãn `Câu 1 / 3`.
- [ ] Bộ chọn hình thức câu hỏi là dạng Compact switch mỏng nhẹ, nút active có viền cam nhạt.
- [ ] Lưới đáp án 2x2 gồm A-B hàng trên, C-D hàng dưới; chọn đúng chỉ đổi màu nút chữ cái xanh ngọc, không còn chữ `(Đúng)` bên phải ô input.
- [ ] Thẻ câu hỏi active ở cột phải giữ nguyên nền trắng/card, chỉ bật viền cam nổi bật và đổ bóng mờ xung quanh.
- [ ] Mỗi thẻ câu hỏi ở cột phải có icon 6 chấm `⠿` (`grip-vertical`) ở mép trái, kéo thả được để hoán đổi thứ tự câu.
- [ ] Nút `[+ Thêm câu]` hoạt động bình thường, xóa câu hoạt động bình thường.
- [ ] 0 lỗi TypeScript, 0 lỗi runtime.
