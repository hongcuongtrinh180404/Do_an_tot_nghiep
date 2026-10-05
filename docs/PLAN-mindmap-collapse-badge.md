# Kế Hoạch Triển Khai Huy Hiệu Thu Gọn Nổi Bật (+Count Badge) Trên Mindmap Node (`mindmap-collapse-badge`)

> **Mục tiêu:**
> 1. Thiết kế và triển khai thành phần **Huy hiệu thu gọn (Collapse Count Badge)** trực quan, tương tác cao tại mép phải của các Node cha (`SectionNode`, `LessonNode`).
> 2. Định vị huy hiệu chính xác tại tọa độ cổng ra Bézier (`Position.Right`, `top: 50%`, `right: -12px`), nhô nửa hình khối ra ngoài mép khung card tạo điểm nhấn theo chuẩn các công cụ Mindmap hàng đầu (XMind, Miro, MindMeister).
> 3. Hỗ trợ chuyển đổi mượt mà giữa hai trạng thái:
>    - **Đang thu gọn (Collapsed):** Hiển thị huy hiệu viên thuốc/tròn `+{count}` (ví dụ: `+4`, `+12`) với màu sắc theo cấp độ, viền nổi, hover scale.
>    - **Đang mở rộng (Expanded):** Chuyển sang nút tròn thu nhỏ dấu trừ `−` (hoặc chevron), tích hợp hoặc bao trùm cổng ra `Handle` của React Flow để các sợi cong Cubic Bézier tuôn ra tự nhiên từ tâm nút.
> 4. Tinh giản giao diện trong thân thẻ Node: Loại bỏ nút `+ / −` cũ nằm bên trong nội dung card, giúp tiêu đề và thông tin bài học thông thoáng, liền mạch.
>
> **Task Slug:** `mindmap-collapse-badge`  
> **Project Type:** `WEB`  
> **Primary Agent:** `frontend-specialist`  
> **Supporting Agent:** `project-planner`  
> **Skill References:** `frontend-design`, `clean-code`, `react-best-practices`, `tailwind-patterns`

---

## 1. Phân Tích Hiện Trạng & Đặc Tả Thiết Kế

### 1.1. Hiện Trạng Thao Tác Thu / Bung Nhánh
- Hiện tại, nút `+ / −` là một button nhỏ kích thước `size-5` (hoặc `size-4.5`) nằm **bên trong góc trên bên phải của thân thẻ** bên cạnh tiêu đề.
- Cổng kết nối (`Handle type="source" position={Position.Right}`) lại là một chấm tròn nhỏ nằm lọt thỏm ở mép ngoài cùng bên phải.
- **Hạn chế:** Người dùng khó nhận biết ngay một nhánh đang ẩn bao nhiêu phần tử con (chỉ thấy dấu `+` nhưng không rõ ẩn 2 hay 20 bài), đồng thời nút bấm bên trong làm chật chội không gian hiển thị tiêu đề bài học.

### 1.2. Đặc Tả Hình Thái Huy Hiệu Mới (Visual Design Spec)
```
  ┌──────────────────────────────────────────┐
  │ [01] Giới thiệu khóa học                 │
  │      12 bài học                          │( +12 )  <-- Huy hiệu neo mép phải (Collapsed)
  └──────────────────────────────────────────┘
                                                │
                                    (Click bung nhánh)
                                                ▼
  ┌──────────────────────────────────────────┐
  │ [01] Giới thiệu khóa học                 │          ╭───── [Bài 1]
  │      12 bài học                          │( − )─────┼───── [Bài 2]
  └──────────────────────────────────────────┘ (Handle) ╰───── [Bài 3]
```

- **Tọa độ neo (Anchor Position):**
  - `absolute top-1/2 -right-3 -translate-y-1/2` (khoảng `-11px` đến `-12px` mép phải).
  - Trùng khớp 100% với trục tọa độ của `Handle source` bên phải.
- **Kích thước & Hình khối:**
  - Thu gọn có số (Collapsed): Hình viên thuốc tròn (`min-w-[24px] h-[22px] px-1.5 rounded-full flex items-center justify-center`).
  - Mở rộng (Expanded): Hình tròn nhỏ gọn (`size-[20px] rounded-full flex items-center justify-center`).
  - Đường viền: `border-2 border-background` (sử dụng biến màu nền trang giúp tự thích ứng Dark/Light Mode và nổi bật trên nền canvas).
  - Đổ bóng: `shadow-sm hover:shadow-md`.
- **Màu sắc theo Cấp độ (Hierarchy Color Coding):**
  - **Cấp Chương (`SectionNode`):** Tông Sky / Ocean
    - Collapsed: `bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px]`
    - Expanded: `bg-sky-500/15 hover:bg-sky-500 text-sky-600 hover:text-white border-sky-400/40`
  - **Cấp Bài học (`LessonNode`):** Tông Emerald / Teal (hoặc Indigo)
    - Collapsed: `bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]`
    - Expanded: `bg-emerald-500/15 hover:bg-emerald-500 text-emerald-600 hover:text-white border-emerald-400/40`
- **Hiệu ứng Hover & Tương tác:**
  - `transition-all duration-150 cursor-pointer active:scale-95 hover:scale-110`
  - Khi hover vào huy hiệu `+count`, hiển thị Tooltip gợi ý (ví dụ: *"Bấm để mở 4 ý chính"* hoặc *"Bấm để mở 12 bài học"*).
  - Sử dụng `e.stopPropagation()` chống kích hoạt sự kiện kéo thả node của canvas.

---

## 2. Giải Pháp Kỹ Thuật (Technical Architecture)

### 2.1. Tích Hợp Cổng Nối React Flow (`Handle`) với Nút Bấm
- Khi **Đang Thu Gọn (`isCollapsed = true`)**:
  - Không có đường nối Bézier đi ra, không cần render `Handle` loại `source` (hoặc ẩn `opacity-0 pointer-events-none`).
  - Render Huy hiệu `+{nodeData.lessonCount}` hoặc `+{nodeData.keyPointCount}`.
- Khi **Đang Mở Rộng (`isCollapsed = false`)**:
  - Render nút dấu trừ `−` (hoặc icon chevron-right / minus).
  - Đặt `Handle type="source" position={Position.Right}` ngay tại tâm hoặc phủ đè phía sau nút bấm với tọa độ chính xác để các đường cong Bézier vẽ tỏa ra từ mép phải của nút bấm.

### 2.2. Dọn Dẹp Bố Cục Thân Card
- Xóa bỏ nút bấm `hasLessons && <button>` và `hasKeypoints && <button>` nằm trong flex header của thân thẻ `SectionNodeComponent` và `LessonNodeComponent`.
- Cho phép tiêu đề `nodeData.title` tận dụng tối đa chiều rộng của card mà không bị ép dòng sớm.

### 2.3. Khả Năng Tương Thích & Tính Toán Tọa Độ Dagre Layout
- Huy hiệu nhô ra ngoài `-12px` bên phải.
- Khoảng cách giữa các cấp hiện tại trong `mindmap-layout.util.ts`:
  - `ranksep: 80` (Khoảng cách từ mép phải node cha sang mép trái node con là 80px).
  - Khoảng đệm $80\,\text{px} - 12\,\text{px} = 68\,\text{px}$ là hoàn toàn rộng rãi, đường cong Bézier uốn lượn tự nhiên mà không bao giờ bị đè lấn hay chạm vào node con kế tiếp.

---

## 3. Phân Công Tác Vụ & Lộ Trình Triển Khai (Task Breakdown)

### Tác vụ 1: Triển khai Component Tái Sử Dụng `CollapseCountBadge` (hoặc nhúng trực tiếp)
- **Tập tin:** Tạo `frontend/src/features/course/components/mindmap/nodes/collapse-count-badge.tsx` (hoặc component nội bộ).
- **Trách nhiệm:** Nhận props `count`, `isCollapsed`, `onToggle`, `variant: 'section' | 'lesson'`, `titleLabel`.
- **Đảm bảo:** Accessibility `aria-label`, dừng lan truyền sự kiện `stopPropagation`, transition hover scale 110%.

### Tác vụ 2: Cập Nhật `SectionNode` (`section-node.tsx`)
- **Tập tin:** `frontend/src/features/course/components/mindmap/nodes/section-node.tsx`
- **Công việc:**
  1. Xóa nút thu gọn cũ trong nội dung card.
  2. Bổ sung `CollapseCountBadge` tại mép phải với số lượng `nodeData.lessonCount`.
  3. Neo `Handle type="source"` khi mở rộng tại vị trí tương ứng.

### Tác vụ 3: Cập Nhật `LessonNode` (`lesson-node.tsx`)
- **Tập tin:** `frontend/src/features/course/components/mindmap/nodes/lesson-node.tsx`
- **Công việc:**
  1. Xóa nút thu gọn cũ trong nội dung card.
  2. Bổ sung `CollapseCountBadge` tại mép phải với số lượng `nodeData.keyPointCount`.
  3. Đồng bộ màu sắc Emerald/Teal hài hòa với nhãn học thử và thời lượng.

### Tác vụ 4: Kiểm Thử Hiển Thị & Tương Tác
- Kiểm tra các trường hợp biên:
  - Node không có con (`count === 0`): Không hiển thị huy hiệu và không có Handle source.
  - Node có 1 con (`count === 1`): Hiển thị `+1`.
  - Node có 2 chữ số (`count >= 10`): Viên thuốc tự động giãn nhẹ `px-1.5` hiển thị đẹp mắt, không tràn viền.
  - Click mở/đóng liên tục không bị gián đoạn hay mất vị trí canvas.

---

## 4. Tiêu Chí Nghiệm Thu (Verification Checklist)

- [ ] Huy hiệu thu gọn hiển thị chính xác số lượng node con ẩn bên trong (ví dụ: `+4`, `+12`).
- [ ] Vị trí neo chuẩn xác ở tâm mép phải (`top-1/2 -right-3 -translate-y-1/2`).
- [ ] Khi chuyển sang trạng thái Expanded, nút đổi thành dấu `−` và đường cong Bézier xuất phát chuẩn xác từ vị trí này.
- [ ] Click vào huy hiệu kích hoạt mở/gập nhánh ngay lập tức mà không kéo lệch canvas.
- [ ] Thân card được giải phóng không gian, giao diện thoáng đãng, sang trọng.
- [ ] Kiểm tra TypeScript (`tsc --noEmit`), Lint và Unit Tests vượt qua 100%.
