# Plan: Điều chỉnh vị trí Navigation Arrows & Hiệu ứng Hover cho Highlight Carousel

> **File:** `docs/PLAN-highlight-nav-arrows.md`  
> **Trạng thái:** COMPLETED  
> **Áp dụng cho:** `frontend/src/features/course/components/public-discovery/news-highlights-carousel.tsx`  
> **Agent thực thi:** `frontend-specialist`

---

## 1. Bối cảnh & Yêu cầu của người dùng

Người dùng yêu cầu tùy chỉnh giao diện và hành vi của cặp nút mũi tên điều hướng (Navigation Arrows) trên section **"News and highlights"** (Highlight Carousel) dựa trên hình ảnh vẽ ghi chú:
1. **Vị trí nút mũi tên trái (`<`)**:
   - Thay vì nằm ở mép ngoài cùng bên trái container (`-left-2`), nút này sẽ dịch vào bên trong và **đè lên mép trái của thẻ thứ 2 đếm từ trái qua phải** (tức đường ranh giới giao nhau giữa Thẻ 1 và Thẻ 2).
2. **Vị trí nút mũi tên phải (`>`)**:
   - Thay vì nằm ở mép ngoài cùng bên phải container (`-right-2`), nút này sẽ dịch vào bên trong và **đè lên mép phải của thẻ thứ 2 đếm từ phải qua trái** (tức đường ranh giới giao nhau giữa Thẻ thứ 2 từ phải sang và Thẻ ngoài cùng bên phải đang hiển thị trên viewport).
3. **Hiệu ứng hiển thị (Hover trigger)**:
   - Bình thường cụm mũi tên điều hướng sẽ ẩn đi (`opacity-0 pointer-events-none`).
   - Cụm điều hướng **chỉ xuất hiện khi người dùng rê chuột (hover) vào vùng thẻ / card slider** ở section highlight, kèm hiệu ứng mượt mà (`transition-opacity duration-200`).
   - Vẫn bảo lưu logic kiểm tra biên cuộn (`canScrollLeft`, `canScrollRight`) để không hiển thị hoặc vô hiệu hóa khi đã ở đầu/cuối danh sách.

---

## 2. Phân tích kỹ thuật & Phương án giải pháp

### 2.1. Cấu trúc kích thước Card hiện tại trong component
- Chiều rộng thẻ (Card Width) theo từng breakpoint:
  - Mobile: `170px` (nút mũi tên ẩn trên mobile, ưu tiên touch swipe)
  - Tablet (`sm`): `w-[200px]`, `gap-3` (12px) hoặc `gap-4` (16px)
  - Desktop (`md`/`lg`): `w-[218px]`, `gap-4` (16px)

### 2.2. Tính toán tọa độ vị trí (Geometry Coordinates)
- **Nút trái**:
  - Khoảng cách từ lề trái track đến mép trái thẻ thứ 2:  
    `Offset Left = Card Width + Gap` = `218px + 16px = 234px` (trên Desktop).
  - Căn giữa nút (đường kính `40px` / `size-10`):  
    Sử dụng lớp CSS Tailwind: `left-[234px] -translate-x-1/2` (hoặc tính toán responsive qua CSS variables `--card-w: 218px; --card-gap: 16px; left: calc(var(--card-w) + var(--card-gap));`).
- **Nút phải**:
  - Khoảng cách từ lề phải track đến mép phải thẻ thứ 2 đếm từ phải sang trái:  
    `Offset Right = Card Width + Gap` = `218px + 16px = 234px` (trên Desktop).
  - Căn giữa nút:  
    Sử dụng lớp CSS Tailwind: `right-[234px] translate-x-1/2` (hoặc `right: calc(var(--card-w) + var(--card-gap));`).

### 2.3. Hiệu ứng Hover để hiển thị
- Bọc thanh trượt trong một container cha có cờ group: `group/carousel` hoặc `group/track`.
- Trạng thái mặc định của 2 nút: `opacity-0 pointer-events-none transition-all duration-300`.
- Khi hover vào container cards (`group-hover/carousel:`):
  - Nếu `canScrollLeft === true`: hiện `opacity-100 pointer-events-auto`.
  - Nếu `canScrollRight === true`: hiện `opacity-100 pointer-events-auto`.
- Thêm hiệu ứng z-index (`z-30`) và bóng đổ (`shadow-2xl`) để nút nổi bật trên nền thẻ có overlay tối.

---

## 3. Danh sách công việc (Task Breakdown)

### Task 1: Cập nhật CSS định vị cho Left & Right Navigation Arrows
- **File**: `frontend/src/features/course/components/public-discovery/news-highlights-carousel.tsx`
- **Chi tiết**:
  - Điều chỉnh lớp định vị của nút Trái từ `-left-2 sm:-left-3` thành vị trí đè lên mép trái Thẻ 2 (`left-[214px] md:left-[234px] -translate-x-1/2`).
  - Điều chỉnh lớp định vị của nút Phải từ `-right-2 sm:-right-3` thành vị trí đè lên mép phải Thẻ 2 từ phải qua (`right-[214px] md:right-[234px] translate-x-1/2`).

### Task 2: Triển khai hiệu ứng hiển thị chỉ khi Hover vào Card/Carousel
- **File**: `frontend/src/features/course/components/public-discovery/news-highlights-carousel.tsx`
- **Chi tiết**:
  - Thiết lập trạng thái ban đầu `opacity-0 pointer-events-none`.
  - Kích hoạt hiển thị khi hover qua `group-hover/carousel:opacity-100 group-hover/carousel:pointer-events-auto`.
  - Kết hợp đồng thời với biến trạng thái `canScrollLeft` và `canScrollRight` (nếu không thể cuộn thì vẫn giữ ẩn/disabled).

### Task 3: Đảm bảo tính thích ứng trên nhiều độ phân giải (Responsive & Touch)
- Kiểm tra hiển thị trên:
  - Mobile (< 768px): Ẩn hoàn toàn nút mũi tên (`hidden md:flex`), giữ nguyên trải nghiệm vuốt chạm cảm ứng `touch-pan-x` & `snap-x`.
  - Tablet/Laptop (768px - 1024px): Căn chỉnh khoảng cách offset phù hợp bề rộng thẻ tương ứng.
  - Desktop (> 1024px): Đảm bảo nút nằm chuẩn xác tại 2 vị trí khoanh đỏ trong ảnh người dùng cung cấp.

### Task 4: Kiểm thử và xác thực (Verification)
- Chạy kiểm tra TypeScript (`node frontend/node_modules/typescript/bin/tsc --noEmit --project frontend/tsconfig.json`).
- Kiểm tra tính mượt mà khi hover vào và đưa chuột ra khỏi card.
- Kiểm tra click cuộn mượt không bị lệch track.

---

## 4. Phân công Agent & Kế hoạch thực hiện
- **Agent chịu trách nhiệm:** `frontend-specialist`
- **Lệnh thực thi tiếp theo:** Chạy `/create` để áp dụng kế hoạch vào code.

