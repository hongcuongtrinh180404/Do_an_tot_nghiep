# Kế hoạch Triển khai: Tinh Chỉnh Thu Hẹp Chiều Cao Thanh Tua Video (Compact Timeline Bar)

> **File:** `docs/PLAN-compact-timeline-bar.md`  
> **Trạng thái:** DRAFT / PROPOSED  
> **Agent thực hiện:** `project-planner`  
> **Chuyên gia phụ trách:** `frontend-specialist` (Skills: `clean-code`, `frontend-design`, `react-best-practices`, `tailwind-patterns`)  
> **Tệp tin mục tiêu:** `frontend/src/features/course/components/player/lesson-video-screen.tsx`  

---

## 1. Overview (Tổng quan Yêu cầu)

- **Mục tiêu:** Thu hẹp chiều cao thanh tua video (Seekbar / Progress timeline) trong trình phát video (`LessonVideoScreen`) xuống còn khoảng **3/5** so với kích thước hiện tại.
- **Phân tích kích thước hiện tại:**
  - Thanh rãnh nền (Background track): Hiện tại là `h-1.5` = **6px**.
  - Thanh tiến trình đã phát (Played progress) & vùng đệm (Buffer): `h-1.5` = **6px**.
  - Tỉ lệ 3/5: $6\text{px} \times \frac{3}{5} = \mathbf{3.6\text{px}}$ (khoảng `h-[3.5px]` hoặc `h-1` là 4px).
  - Vùng tương tác hover/click của thanh trượt (Slider container hit area): Hiện tại là `h-4` = **16px** (thu hẹp về `h-3` = **12px** hoặc `h-3.5` = **14px** để vẫn đảm bảo diện tích bấm cho người dùng mà không bị cồng kềnh).
  - Nút con trượt tròn (Scrubber thumb circle): Hiện tại là `size-3.5` = **14px** (thu nhỏ về `size-2.5` = **10px** để cân đối với rãnh mảnh).
  - Các mốc Tick Markers trên rãnh: Hiện tại là `size-2` = **8px** (thu nhỏ về `size-1.5` = **6px**).
  - Điểm neo của Google Maps Pin Marker: Điều chỉnh vị trí trục Y để đầu nhọn của ghim tiếp xúc hoàn hảo với rãnh mảnh 3.5px mới.

---

## 2. Kiến trúc & So sánh Thông số (Design Specifications)

| Thành phần | Kích thước Hiện tại | Kích thước Đề xuất (Tỉ lệ 3/5) | Lợi ích Thẩm mỹ & Trải nghiệm |
| :--- | :--- | :--- | :--- |
| **Rãnh trượt video (Track)** | `h-1.5` (6px) | `h-[3.5px]` hoặc `h-1` (3.5px ~ 4px) | Rãnh mảnh mai, hiện đại chuẩn Cinema UI (giống YouTube / Netflix) |
| **Tiến trình phát & Buffer** | `h-1.5` (6px) | `h-[3.5px]` hoặc `h-1` (3.5px ~ 4px) | Đồng bộ chiều cao với rãnh nền |
| **Vùng Hitbox tương tác** | `h-4` (16px) | `h-3` (12px) | Thu gọn chiều dọc khoảng cách với hàng nút điều khiển bên dưới |
| **Con trượt Scrubber Thumb** | `size-3.5` (14px) | `size-2.5` (10px) | Thanh thoát, không che mất chi tiết video khi hover |
| **Tick Markers mốc bài học** | `size-2` (8px) | `size-1.5` (6px) | Nằm gọn gàng trên rãnh mảnh, không tràn viền thô |
| **Pin Marker Chế độ Giảng viên** | `bottom-3` | `bottom-2.5` | Đầu nhọn cắm chuẩn xác vào tâm rãnh trượt |

---

## 3. File Structure & Changes

```
frontend/src/features/course/components/player/
└── lesson-video-screen.tsx      # [MODIFY] Cập nhật chiều cao track h-[3.5px], scrubber thumb size-2.5, tick marker size-1.5
```

---

## 4. Task Breakdown (Chi tiết Công việc Thực hiện)

### Task 1: Thu gọn Thanh Rãnh Tiến Trình & Vùng Đệm
- **Agent:** `frontend-specialist`
- **Priority:** P1
- **Mục tiêu:**
  - Thay đổi `h-1.5` của thanh rãnh nền (`bg-zinc-800`), thanh đệm (`bg-zinc-700/60`), và thanh đã phát (`bg-sky-500`) thành `h-[3.5px]` (hoặc `h-1`).
  - Đảm bảo bo tròn góc mượt mà (`rounded-full`).

### Task 2: Điều chỉnh Tỷ lệ Con trượt (Scrubber Thumb) & Điểm mốc (Tick Markers)
- **Agent:** `frontend-specialist`
- **Priority:** P1
- **Mục tiêu:**
  - Chấm tròn scrubber thumb đổi từ `size-3.5 -ml-1.5` thành `size-2.5 -ml-1.25` với `ring-2 ring-sky-500/40`.
  - Các điểm tick markers đổi từ `size-2` thành `size-1.5` để nằm cân xứng bên trong chiều cao rãnh mới.
  - Các nút câu hỏi checkpoint đổi từ `size-3` thành `size-2.5`.

### Task 3: Cân chỉnh Trục Y của Pin Marker & Khoảng cách Điều khiển
- **Agent:** `frontend-specialist`
- **Priority:** P2
- **Mục tiêu:**
  - Đảm bảo con trỏ Google Maps Pin Marker hiển thị chuẩn xác với đầu nhọn tiếp xúc ngay tại rãnh trượt 3.5px.
  - Cân chỉnh khoảng cách `space-y-2` của khung Controls Overlay dưới video để tổng thể bố cục gọn gàng, tăng không gian thưởng thức nội dung video.

---

## 5. Socratic Gate & Trade-off Questions (Câu hỏi Xác nhận)

1. **Độ cao rãnh trượt (Track Height):**
   - Bạn muốn chọn **3.5px (`h-[3.5px]`)** (đúng chính xác 3/5 của 6px) hay **4px (`h-1`)** (chuẩn bước nhảy Tailwind)?
2. **Kích thước nút tròn Scrubber Thumb khi rê chuột:**
   - Khi hover vào timeline, bạn muốn con trượt tròn thu nhỏ theo tỷ lệ xuống **10px (`size-2.5`)** cho thanh mảnh, hay giữ nguyên **14px (`size-3.5`)** để dễ nhìn vị trí hiện tại?
3. **Hiệu ứng trồi lên (Expand on Hover) như YouTube:**
   - Bạn có muốn áp dụng hiệu ứng: Bình thường rãnh mảnh 3.5px, khi rê chuột vào thì rãnh tự động dãn nhẹ lên 5px (YouTube style) hay luôn giữ cố định 3.5px trong mọi trạng thái?
