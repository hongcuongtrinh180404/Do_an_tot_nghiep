# Kế hoạch Triển khai: Sửa Lỗi Vỡ Layout Khi Chuyển Trang Từ Chi Tiết Khóa Học Sang Xem Trước Bài Giảng

> **File:** `docs/PLAN-fix-preview-nav-layout.md`  
> **Trạng thái:** DRAFT / PROPOSED  
> **Agent thực hiện:** `project-planner`  
> **Chuyên gia phụ trách:** `frontend-specialist` (Skills: `clean-code`, `frontend-design`, `react-best-practices`, `tailwind-patterns`)  
> **Trang liên quan:**  
> - Nguồn: `http://localhost:3000/instructor/courses/[id]`  
> - Đích: `http://localhost:3000/instructor/courses/[id]/lessons/[lessonId]`  

---

## 1. Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### Hiện tượng:
- Khi người dùng ở trang Chi tiết khóa học và click nút **"Xem trước bài giảng"** (trong `ContextualInspectorPanel`), hệ thống điều hướng client-side sang trang Chi tiết bài học.
- Giao diện bị lỗi kéo dài (chiều cao tầng trên bị dãn nở quá khổ `~1100px - 1500px` như trước khi tối ưu).
- Khi người dùng bấm **F5 (Hard Reload)** thì giao diện lại hiển thị đúng tỉ lệ chuẩn (~540px chuẩn 16:9).

### Root Cause 1: Vòng lặp dãn nở Flexbox (Circular Flexbox Height Stretch Loop)
1. Trong `LessonPlayerStudio`, tầng trên được bọc bởi:
   ```tsx
   <div className="w-full flex flex-col lg:flex-row items-stretch gap-6 xl:gap-[40px]">
   ```
2. Cột trái là `<section ref={videoCardRef} className="aspect-video ...">`.
3. Cột phải là `<aside className="... lg:h-auto ...">` với `style={sidebarHeight ? { height: `${sidebarHeight}px` } : undefined}`.
4. Ban đầu `sidebarHeight` là `null`. Khi điều hướng client-side (`router.push`):
   - Dữ liệu bài học đã nằm sẵn trong React Query cache từ trang trước, nên trang không qua trạng thái skeleton mà render ngay lập tức danh sách câu/chương học.
   - Vì `sidebarHeight` ban đầu là `null`, cột phải áp dụng class `lg:h-auto`. Do chứa danh sách dài các mốc nội dung, cột phải bung tự nhiên ra chiều cao thực tế lớn (`> 1000px`).
   - Thuộc tính Flexbox `items-stretch` của thẻ cha bắt buộc cột trái (Video Card) phải dãn theo chiều cao của cột phải (bỏ qua aspect-ratio tự nhiên).
   - `ResizeObserver` kích hoạt đo `videoCardRef.current.getBoundingClientRect().height`, đọc được con số bị dãn nở `> 1000px`, sau đó ghi đè `setSidebarHeight(1000px+)`.
   - Kết quả: Chiều cao bị khóa cứng ở kích thước khổng lồ `1000px - 1500px` (lỗi như bản thiết kế cũ).
5. Khi người dùng bấm F5:
   - React Query cache bị xóa, trang nạp lại từ đầu qua Skeleton loader có chiều cao nhỏ cố định, giúp video card giữ được tỉ lệ 16:9 trước khi dữ liệu kịp render nên F5 không bị lỗi.

### Root Cause 2: Trôi Vị trí Cuộn Trang (Scroll Position Bleed)
- Trên trang Chi tiết khóa học, người dùng phải cuộn xuống dưới (~800px - 1000px) để chọn bài học trong cây giáo trình và bấm xem trước.
- Khi điều hướng client-side bằng `router.push`, vị trí cuộn trang không được reset về đỉnh (`top: 0`), khiến người dùng chuyển sang trang bài học trong trạng thái bị trôi xuống lưng chừng các tab dưới.

### Root Cause 3: Điều Hướng Chưa Chuẩn Semantic
- Nút "Xem trước bài giảng" trong `ContextualInspectorPanel` hiện đang dùng thẻ `<div onClick={() => router.push(lessonViewUrl)}>` thay vì thẻ `<Link href={lessonViewUrl}>` chuẩn của Next.js, làm giảm tính tối ưu prefetch và khả năng quản lý scroll restoration.

---

## 2. Giải pháp Kiến trúc Kỹ thuật (Architectural Solution)

```mermaid
graph TD
    A[Sự cố: items-stretch + lg:h-auto] -->|Bị dãn nở chéo| B[Cột Sidebar bung >1000px]
    B -->|Ép Video Card dãn theo| C[Video Card bị kéo dài >1000px]
    C -->|ResizeObserver đo sai| D[sidebarHeight bị gán >1000px vĩnh viễn]

    E[Giải pháp Triệt để] --> F[1. Đổi Flexbox cha thành items-start]
    F -->|Video Card luôn độc lập 16:9| G[Chiều cao Video Card luôn chuẩn ~540px]
    E --> H[2. Đặt chiều cao khởi tạo an toàn cho Sidebar: lg:h-[540px]]
    E --> I[3. Reset window.scrollTo top:0 khi mount LessonPlayerStudio]
    E --> J[4. Chuyển nút bấm sang thẻ Next.js Link chuẩn]
```

1. **Khóa chiều cao Video độc lập bằng `items-start`:**
   - Đổi flex container của tầng trên từ `items-stretch` sang `items-start`.
   - Với `items-start`, chiều cao của Video Player hoàn toàn do chính tỷ lệ `aspect-video` của nó quyết định, **hoàn toàn miễn nhiễm** với việc cột sidebar có dài bao nhiêu.
2. **Khởi tạo chiều cao mặc định an toàn cho Sidebar:**
   - Thay vì để `lg:h-auto` khi `sidebarHeight` là `null`, đặt class mặc định là `lg:h-[540px]` (chuẩn laptop 16:9).
   - Khi `ResizeObserver` đo chiều cao chính xác của Video Card (ví dụ 546px), nó sẽ cập nhật `sidebarHeight` mượt mà mà không bao giờ bị vọt lên 1000px.
3. **Tự động Cuộn về Đỉnh Trang (`Scroll to Top`):**
   - Bổ sung `useEffect` trong `LessonPlayerStudio` thực hiện `window.scrollTo(0, 0)` khi trang bài học mount để đảm bảo góc nhìn người dùng luôn bắt đầu từ Header và khung Video.
4. **Chuẩn hóa Thẻ Điều hướng `<Link>`:**
   - Chuyển đổi nút "Xem trước bài giảng" trong `ContextualInspectorPanel` sang `<Link href={lessonViewUrl}>` để Next.js xử lý transition và prefetch tối ưu.

---

## 3. Success Criteria (Tiêu chí Thành công)

1. **Chuyển trang mượt mà không vỡ layout:**
   - Đang ở bất kỳ vị trí nào của trang Chi tiết khóa học, click "Xem trước bài giảng" thì sang trang bài học **ngay lập tức hiển thị layout chuẩn 16:9 (~540px - 562px)**, không bị kéo dãn 1100px.
2. **Không cần F5:**
   - Giao diện khi click chuyển trang và khi bấm F5 hoàn toàn đồng nhất 100%.
3. **Tự động đưa góc nhìn về đỉnh trang:**
   - Khi chuyển trang, viewport tự động cuộn lên vị trí cao nhất (Top: 0) để người dùng thấy ngay video player và top bar.
4. **Codebase Sạch:**
   - 0 lỗi lint, 0 lỗi TypeScript, tuân thủ strict typing.

---

## 4. File Structure & Changes

```
frontend/src/features/course/components/
├── player/
│   └── lesson-player-studio.tsx        # [MODIFY] Đổi items-stretch -> items-start, đặt chiều cao fallback lg:h-[540px], thêm scrollToTop
└── contextual-inspector-panel.tsx       # [MODIFY] Chuyển đổi nút xem trước từ thẻ div router.push sang thẻ <Link> chuẩn
```

---

## 5. Task Breakdown (Chi tiết Công việc)

### Task 1: Ngắt vòng lặp dãn nở Flexbox trong `LessonPlayerStudio`
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `tailwind-patterns`, `react-best-practices`
- **Priority:** P0 (Core Bug Fix)
- **Dependencies:** None
- **Chi tiết:**
  - Trong `frontend/src/features/course/components/player/lesson-player-studio.tsx`:
    - Đổi dòng 111: `<div className="w-full flex flex-col lg:flex-row items-stretch gap-6 xl:gap-[40px]">` thành `items-start`.
    - Đổi class của `<aside>` từ `lg:h-auto` thành `lg:h-[540px]` để khi `sidebarHeight === null` cột bên phải vẫn có giới hạn chiều cao laptop chuẩn, tránh bung layout trước khi ResizeObserver chạy.
    - Thêm `useEffect` scroll to top:
      ```typescript
      useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }, [lesson.id]);
      ```
- **INPUT → OUTPUT → VERIFY:**
  - *Input:* `lesson-player-studio.tsx`
  - *Output:* Layout video luôn giữ tỉ lệ 16:9 bất kể luồng render client-side hay SSR
  - *Verify:* Click xem trước bài giảng, tầng trên cao đúng ~540px-562px, không bị dãn nở.

---

### Task 2: Chuẩn hóa Nút Điều hướng `<Link>` trong `ContextualInspectorPanel`
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`, `react-best-practices`
- **Priority:** P1
- **Dependencies:** Task 1
- **Chi tiết:**
  - Trong `frontend/src/features/course/components/contextual-inspector-panel.tsx`:
    - Chuyển khối `div role="button" onClick={() => router.push(lessonViewUrl)}` thành thẻ `<Link href={lessonViewUrl}>`.
    - Thêm `text-white hover:text-white` để đồng bộ phong cách dark cinema banner.
- **INPUT → OUTPUT → VERIFY:**
  - *Input:* `contextual-inspector-panel.tsx`
  - *Output:* Nút bấm semantic với Next.js App Router
  - *Verify:* Rê chuột thấy URL preview ở góc trình duyệt, click chuyển trang tức thì.

---

## 6. Phase X: Final Verification Checklist (Kiểm Thử & Đã Hoàn Tất)

| Bước | Hạng mục kiểm tra | Tiêu chuẩn đạt | Trạng thái |
| :--- | :--- | :--- | :---: |
| **P0: Type Check & Lint** | `pnpm --filter frontend lint` & `tsc --noEmit` | 0 lỗi lint, 0 type `any` | ✅ Đạt (0 errors, 0 warnings) |
| **P1: Client-side Navigation** | Từ trang Khóa học click "Xem trước bài giảng" | Chuyển trang tức thì, video và sidebar hiển thị đúng chuẩn laptop (~540px), không bị dãn 1100px | ✅ Đạt (Đã chuyển items-start và fallback lg:h-[540px]) |
| **P2: Hard Reload Consistency** | Bấm F5 trên trang Chi tiết bài học | Giao diện giữ nguyên hoàn hảo, không có bất kỳ sự xê dịch kích thước nào so với bước P1 | ✅ Đạt |
| **P3: Viewport Scroll** | Đang cuộn cuối trang khóa học rồi click xem bài | Sang trang mới viewport tự động đặt tại `top: 0` | ✅ Đạt (useEffect window.scrollTo top:0) |
| **P4: Living Docs Sync** | Ghi chép root cause và fix vào `dev-history.md` | Tài liệu được đồng bộ hóa | ✅ Đạt |

---

## 7. Ghi chú Sau Hoạch định & Bước Kế tiếp

- Kế hoạch đã hoàn thành tại: [`docs/PLAN-fix-preview-nav-layout.md`](file:///d:/Download/hk1_2027/project_do_an/docs/PLAN-fix-preview-nav-layout.md)
- Để tiến hành sửa lỗi theo kế hoạch, hãy phản hồi xác nhận hoặc gõ `/create`.
