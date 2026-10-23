# Kế Hoạch Triển Khai: Tái Cấu Trúc Thẻ Mindmap Node (Style 2 Minimalist Card)

> **Mục tiêu:**
> 1. Thay đổi thiết kế giao diện của Card Node trên Canvas Mindmap tại trang `[Chi tiết bài học | DATN Portal](http://localhost:3000/instructor/courses/[courseId]/lessons/[lessonId])` (Tab Sơ đồ tư duy).
> 2. **Loại bỏ hoàn toàn** các nhãn phân cấp thô kệch hiện tại ("Chủ đề gốc", "Cấp 1", "Cấp 2", "Cấp 3"...).
> 3. **Áp dụng phong cách Style 2** theo đúng bản mẫu HTML/CSS của người dùng:
>    - Thẻ bo góc tròn lớn `18px`, viền xanh đen sắc nét `#1E2243`, bóng mờ êm dịu, hover nhấc nhẹ (-2px).
>    - Huy hiệu thời gian (`timestamp-badge`) nổi bật ở góc trên mép phải (`top: -14px, right: 18px`), bo pill viền `#818CF8`, biểu tượng play và mốc thời gian font monospace, click để tua video (`onSeek`).
>    - Tiêu đề nội dung chữ đậm 15px `#0F172A`, line-height thoáng đãng 1.45.
>    - Nút tròn mở rộng / thu gọn nhánh con (`expand-btn`) neo ở giữa mép phải (`right: -13px`), màu xanh `#2563EB`, viền trắng 2.5px, hiển thị số nhánh con (`+7`) khi thu gọn hoặc icon thu gọn khi mở rộng.
> 4. Căn chỉnh lại thuật toán tự động bố cục **Dagre Layout** (`lesson-mindmap-flow.util.ts`) cho khớp hoàn hảo với kích thước thẻ mới (`320px × 80px`), đảm bảo đường nối mềm mại `smoothBezier` không bị đè chữ hay chạm biên.
>
> **Task Slug:** `mindmap-card-style`  
> **Plan File:** `docs/PLAN-mindmap-card-style.md`  
> **Project Type:** `WEB (Next.js 16 + React 19 + @xyflow/react)`  
> **Primary Agent:** `project-planner`  
> **Assigned Specialist Agents:** `frontend-specialist`, `clean-code`  
>
> **Đã thống nhất qua Socratic Gate:**
> 1. **Trạng thái Mở rộng (Expanded State)**: Nút tròn mép phải hiển thị icon dấu trừ (`-`) khi nhánh đang mở rộng để người dùng có thể nhấp vào thu gọn nhánh lại.
> 2. **Độ rộng Thẻ (Responsive Width)**: Chiều rộng co giãn tự nhiên theo độ dài nội dung tiêu đề (`min-w-[260px] max-w-[360px]`), giúp tối ưu hóa không gian hiển thị trên canvas đồ họa.
> 3. **Chế độ Theme**: Cố định 100% phong cách nền trắng (`#FFFFFF`), viền xanh đen sắc nét (`#1E2243`), chữ đen (`#0F172A`) theo đúng mẫu Style 2 ở mọi chế độ giao diện (kể cả khi bật Dark Mode).


---

## 1. Phân Tích Hiện Trạng & Yêu Cầu Kỹ Thuật

### 1.1. Hiện Trạng Card Node Hiện Tại (`lesson-mindmap-canvas-node.tsx`)
- Thẻ hiện tại có chiều rộng biến thiên từ 200px - 280px.
- Hiển thị dòng phụ ở đầu: nhãn in hoa `"CHỦ ĐỀ GỐC"`, `"CẤP 1"`, `"CẤP 2"`... kèm nút timestamp nằm ngang hàng trong cùng container.
- Điều này tạo cảm giác chật chội và lặp lại thông tin không cần thiết khi sơ đồ đã thể hiện rõ thứ bậc qua các nhánh nối.
- Màu sắc phân tầng chia theo các mức độ (Sky Blue, Indigo, Slate) nhưng bố cục còn thô.

### 1.2. Thiết Kế Mới Yêu Cầu (Style 2)
```html
<div class="mindmap-card-style2">
  <!-- Huy hiệu Timestamp nổi trên viền -->
  <button class="timestamp-badge" title="Tua video tới mốc 03:56">
    <span class="play-icon">▷</span>
    <span>03:56</span>
  </button>

  <!-- Nội dung chính -->
  <p class="card-title">
    Diễn biến trận chiến sông Bạch Đằng năm 938
  </p>

  <!-- Nút số lượng nhánh con (+7) -->
  <button class="expand-btn" title="Mở rộng / Thu gọn 7 nhánh con">
    +7
  </button>
</div>
```

### 1.3. Các Vấn Đề Kỹ Thuật Cần Đồng Bộ
1. **Kết nối Điểm Nối (Handles) của React Flow**:
   - `Handle target`: Đặt ở mép trái (`Position.Left`) để nhận đường nối từ cha.
   - `Handle source`: Đặt ở mép phải (`Position.Right`) để phát đường nối sang con. Cần căn giữa chuẩn với vị trí của nút tròn mở rộng `expand-btn` (`top: 50%`, `right: -13px`).
2. **Kích thước Node trong Dagre Layout (`lesson-mindmap-flow.util.ts`)**:
   - Thẻ mẫu có chiều rộng co giãn theo nội dung (`min-w-[260px] max-w-[360px]`), padding dọc `20px 24px 18px 20px`, chiều cao trung bình khoảng `76px - 82px` cho tiêu đề 1-2 dòng + khoảng hở 14px phía trên cho huy hiệu nổi.
   - Cần tính toán kích thước bounding box linh hoạt hoặc đặt kích thước tiêu chuẩn `width: 300, height: 80` cho Dagre layout.
   - Cần tăng khoảng cách cột `rankSep: 85` (thay vì 75) và khoảng cách hàng `nodeSep: 26` để các thẻ không chạm vào nhau và đường cong bezier uốn mềm mại.
3. **Hiệu ứng Video Active Tracking (`nodeData.isNearCurrentTime`)**:
   - Giữ nguyên tính năng thông minh: khi video phát đến gần mốc thời gian của node (trong phạm vi 5 giây), thẻ sẽ phát sáng hoặc nổi viền highlight (`ring-2 ring-sky-500` hoặc viền sáng) giúp người học định vị ngay vị trí kiến thức đang phát.
4. **Cố Định Giao Diện Nền Sáng Chuẩn Style 2**:
   - Theo quyết định từ Socratic Gate: Giữ nguyên 100% phong cách nền trắng (`#FFFFFF`), viền xanh đen sắc nét (`#1E2243`), chữ đen (`#0F172A`) theo đúng mẫu Style 2 ở mọi chế độ giao diện (kể cả khi hệ thống bật Dark Mode) để tạo sự đồng nhất và tương phản chuẩn đồ họa mindmap.

---

## 2. Kế Hoạch Triển Khai Chi Tiết (Task Breakdown)

### Task 1: Cập Nhật Bố Cục và Kích Thước Bounding Box trong Dagre Layout
- **File:** `frontend/src/features/course/utils/lesson-mindmap-flow.util.ts`
- **Người thực hiện:** `frontend-specialist`
- **Nội dung:**
  - Cập nhật hằng số `LESSON_NODE_DIMENSIONS`:
    ```typescript
    const LESSON_NODE_DIMENSIONS: Record<number, { width: number; height: number }> = {
      0: { width: 310, height: 82 }, // Root
      1: { width: 300, height: 80 }, // Level 1
      2: { width: 280, height: 78 }, // Level 2+
    };
    ```
  - Cập nhật khoảng cách mặc định `rankSep: 85` và `nodeSep: 26` trong `convertLessonMindmapToFlowElements`.
- **INPUT → OUTPUT → VERIFY:**
  - *Input*: Cây dữ liệu `ILessonMindmapNode`.
  - *Output*: Tọa độ X/Y của các node được tính toán thoáng đãng dựa trên thẻ co giãn 260px - 360px.
  - *Verify*: Kiểm tra tọa độ không gây chồng lấn viền trên canvas.

### Task 2: Triển Khai Giao Diện Thẻ Mới Trong `LessonMindmapCanvasNode`
- **File:** `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-node.tsx`
- **Người thực hiện:** `frontend-specialist`, `clean-code`
- **Nội dung:**
  - Xóa bỏ khối nhãn `Chủ đề gốc` / `Cấp X`.
  - Tạo cấu trúc thẻ theo chuẩn Style 2:
    - Container: bo tròn `rounded-[18px]`, viền sắc nét `border-2 border-[#1E2243] bg-white`, đổ bóng mềm `shadow-[0_4px_12px_rgba(15,23,42,0.05)]`, hover nhấc nhẹ. Chiều rộng linh hoạt `min-w-[260px] max-w-[360px] w-fit`.
    - Timestamp Badge: ghim nổi phía trên mép phải `top-[-14px] right-[18px]`, nền trắng, viền `#818CF8`, chữ `#1E2243`, click gọi `nodeData.onSeek(nodeData.timestamp)`.
    - Tiêu đề: chữ đậm `text-[15px] font-bold text-[#0F172A] leading-[1.45] line-clamp-2`.
    - Nút tròn mở rộng/thu gọn: neo ở tâm mép phải `right-[-13px] top-1/2 -translate-y-1/2`, kích thước `26px × 26px`, viền trắng 2.5px, màu xanh `#2563EB`. Khi thu gọn hiển thị `+N`, khi mở rộng hiển thị icon dấu trừ (`-`) để có thể thu gọn lại.
    - Handles: Đặt chính xác ở tâm trái và tâm phải để đường nối bắt vào tự nhiên.
- **INPUT → OUTPUT → VERIFY:**
  - *Input*: Props `NodeProps` từ `@xyflow/react`.
  - *Output*: Giao diện node chuẩn xác theo prototype HTML/CSS.
  - *Verify*: Render trên trình duyệt kiểm tra độ sắc nét, hiệu ứng hover, nhấp tua video và nhấp mở rộng nhánh.

### Task 3: Tối Ưu Hiệu Ứng Active Time Tracking Khi Video Đang Phát
- **File:** `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-node.tsx`
- **Người thực hiện:** `frontend-specialist`
- **Nội dung:**
  - Hiệu ứng phát sáng hoặc viền highlight `isNearCurrentTime` khi video phát đến đúng đoạn kiến thức mà vẫn giữ chuẩn phối màu của thẻ Style 2.
- **INPUT → OUTPUT → VERIFY:**
  - *Input*: Biến `currentTime` từ video player.
  - *Output*: Thẻ đang phát được làm nổi bật tinh tế.
  - *Verify*: Tua video đến mốc thời gian tương ứng và xem thẻ phản hồi trực quan.

---

## 3. Ma Trận Trách Nhiệm Phân Công (Agent Assignments)

| Nhiệm Vụ | Chuyên Gia (Agent) | Kỹ Năng (Skills) | File Trọng Tâm |
| :--- | :--- | :--- | :--- |
| Điều chỉnh Dagre Layout Bounding Box | `frontend-specialist` | `frontend-design`, `clean-code` | `lesson-mindmap-flow.util.ts` |
| Tái cấu trúc UI Thẻ Mindmap Style 2 | `frontend-specialist` | `frontend-design`, `tailwind-patterns` | `lesson-mindmap-canvas-node.tsx` |
| Kiểm thử Tương thích & Trải nghiệm | `frontend-specialist` | `webapp-testing` | Toàn bộ Canvas View |

---

## 4. Phase X: Kế Hoạch Xác Minh (Verification Checklist)

- [x] Không còn hiển thị chữ "Chủ đề gốc", "Cấp 1", "Cấp 2"... trên bất kỳ thẻ nào.
- [x] Thẻ có kích thước co giãn `min-w-[260px] max-w-[360px]`, bo tròn 18px, viền xanh tím sẫm `#1E2243`, nền trắng `#FFFFFF`, padding chuẩn theo thiết kế.
- [x] Huy hiệu mốc thời gian nổi bật ở góc trên mép phải, nhấp vào tua đúng thời điểm trên video.
- [x] Nút tròn ở mép phải hiển thị số lượng nhánh con (`+N`) khi thu gọn và dấu trừ (`-`) khi mở rộng.
- [x] Đường nối uốn cong `smoothBezier` kết nối chính xác vào tâm thẻ, không bị lệch hoặc đè chữ.
- [x] Chạy kiểm tra TypeScript (`pnpm --filter frontend exec tsc --noEmit`): Pass (Exit code 0).
- [x] Chạy kiểm tra Linter (`pnpm --filter frontend lint`): Pass (Exit code 0, 0 errors, 0 warnings).

---

## ✅ PHASE X COMPLETE

- TypeScript: ✅ Pass (Exit code 0)
- Linter: ✅ Pass (0 errors, 0 warnings)
- Build Verification: Sẵn sàng trên môi trường dev (đang chạy cổng 3000)
- Date: 2026-10-20

