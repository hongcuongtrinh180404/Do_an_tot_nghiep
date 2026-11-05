# Kế hoạch Triển khai: Phóng to Toàn màn hình cho Sơ đồ Mindmap Bài học

> **Yêu cầu người dùng:** Khi nhấp vào nút được khoanh tròn đỏ trên thanh công cụ của Sơ đồ tư duy bài học, sơ đồ sẽ phóng to toàn màn hình theo đúng cơ chế của **Mindmap tổng quát** (`course-mindmap-view.tsx`).

---

## 1. Mô tả Mục tiêu & Bối cảnh (Goal Description)

### Hiện trạng
- **Mindmap bài học (`LessonMindmapCanvasView`)**: 
  - Nút thứ 3 được khoanh tròn đỏ hiện đang dùng icon `lucide:maximize` (hình 4 góc vuông `[ ]`), nhưng lại kích hoạt `fitView` (căn vừa khung canvas nhỏ 520px).
  - Nút toàn màn hình nằm ở tận cùng bên phải thanh toolbar, sử dụng API trình duyệt `containerRef.current.requestFullscreen()`. Cơ chế này chỉ áp dụng class `h-screen w-screen` nội bộ mà **không thoát ly khỏi layout cha** (`fixed inset-0 z-50`), khiến giao diện không thực sự bao trùm toàn bộ màn hình một cách liền mạch, và có thể bị lỗi quyền truy cập fullscreen của trình duyệt.
- **Mindmap tổng quát (`CourseMindmapView`)**:
  - Không phụ thuộc vào `requestFullscreen()` của trình duyệt.
  - Sử dụng React state `isFullscreen` kết hợp lớp phủ CSS tuyệt đối:
    ```tsx
    const containerClasses = isFullscreen
      ? 'fixed inset-0 z-50 w-screen h-screen bg-background flex flex-col'
      : 'w-full h-[680px] rounded-2xl border border-border/70 shadow-xs overflow-hidden';
    ```
  - Khi bật toàn màn hình: Canvas lập tức thoát ly khỏi cây DOM cha, phủ trọn toàn bộ màn hình với `z-50`, hiển thị thanh điều khiển trên cùng kèm nút thoát toàn màn hình và tự động kích hoạt `fitView` để canh giữa sơ đồ theo khung hình mới.
  - Hỗ trợ phím tắt `Escape` để thoát ra nhanh chóng.

---

## 2. Điểm cần Người dùng Duyệt (User Review Required)

> [!IMPORTANT]
> **Tái cấu trúc nhóm nút trên thanh công cụ (`LessonMindmapCanvasToolbar`):**
> 1. **Nút khoanh tròn đỏ (Vị trí thứ 3)**: Chuyển đổi thành nút **Toàn màn hình / Phóng to (Fullscreen Toggle)** sử dụng icon `lucide:maximize` (khi thường) và `lucide:minimize` (khi đang toàn màn hình).
> 2. **Nút Căn giữa (Fit View)**: Dùng icon `lucide:scan` hoặc `lucide:focus` ("Căn vừa khung hình") để phân biệt rõ ràng với nút Toàn màn hình, loại bỏ hiện tượng có 2 icon maximize gây hiểu lầm.
> 3. **Loại bỏ nút maximize trùng lặp ở cuối thanh toolbar**: Giữ thanh công cụ nhỏ gọn, tinh tế theo chuẩn `/design-taste-frontend`.

> [!TIP]
> Khi đang ở chế độ toàn màn hình:
> - Tự động bổ sung một thanh tiêu đề nhỏ phía trên: `Sơ đồ tư duy: [Tên bài học]` cùng nút `[✕ Thoát (Esc)]` bên cạnh thanh công cụ giúp người dùng dễ dàng định hướng và thoát ra.

---

## 3. Câu hỏi Mở (Open Questions)

- Hiện tại kế hoạch đã đồng bộ 100% cơ chế `fixed inset-0 z-50` của Mindmap tổng quát và gán trực tiếp vào nút bạn đã khoanh tròn. Bạn có muốn giữ thêm nút Căn giữa (Fit View) với icon `lucide:scan` bên cạnh Zoom In/Out không, hay chỉ cần Zoom In, Zoom Out và Toàn màn hình?
  *(Khuyến nghị: Giữ nút Căn giữa với icon `lucide:scan` để người dùng vẫn có thể reset góc nhìn khi di chuyển node).*

---

## 4. Chi tiết Thay đổi Mã nguồn (Proposed Changes)

### Component: Lesson Mindmap Canvas

#### [MODIFY] `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-view.tsx`
- **Loại bỏ**: Lời gọi `containerRef.current.requestFullscreen()` và `document.exitFullscreen()`.
- **Thêm cơ chế từ Mindmap tổng quát**:
  1. Quản lý trạng thái `isFullscreen: boolean`.
  2. Bổ sung `containerClasses`:
     ```tsx
     const containerClasses = isFullscreen
       ? 'fixed inset-0 z-50 w-screen h-screen bg-background flex flex-col p-4 sm:p-6 transition-all duration-200'
       : 'relative w-full rounded-2xl border border-border/80 bg-muted/15 overflow-hidden transition-all h-[520px] sm:h-[580px]';
     ```
  3. Bổ sung lắng nghe sự kiện phím `Escape`:
     ```tsx
     useEffect(() => {
       const handleKeyDown = (e: KeyboardEvent) => {
         if (e.key === 'Escape' && isFullscreen) {
           setIsFullscreen(false);
         }
       };
       window.addEventListener('keydown', handleKeyDown);
       return () => window.removeEventListener('keydown', handleKeyDown);
     }, [isFullscreen]);
     ```
  4. Tự động gọi `fitView({ padding: 0.25, duration: 300 })` khi trạng thái `isFullscreen` thay đổi để sơ đồ luôn căn giữa hoàn hảo.
  5. Khi `isFullscreen === true`: Hiển thị thanh Top Bar gồm tên nhánh gốc / tiêu đề bài học và nút bấm thoát nhanh.

#### [MODIFY] `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-toolbar.tsx`
- Cập nhật vị trí nút thứ 3 (nút khoanh tròn đỏ) thành nút **Toàn màn hình**:
  ```tsx
  {/* Fullscreen Toggle - Nút thứ 3 người dùng khoanh tròn */}
  <Button
    type="button"
    variant={isFullscreen ? 'secondary' : 'ghost'}
    size="sm"
    onClick={onToggleFullscreen}
    title={isFullscreen ? 'Thoát toàn màn hình (Esc)' : 'Xem toàn màn hình'}
    className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
  >
    <Icon
      icon={isFullscreen ? 'lucide:minimize-2' : 'lucide:maximize'}
      className="size-3.5"
    />
  </Button>
  ```
- Nút Căn giữa (Fit View): Đổi icon thành `lucide:scan` để tách biệt chức năng rõ ràng.
- Xóa bỏ nút Fullscreen thừa ở góc cuối thanh toolbar.

---

## 5. Kế hoạch Kiểm tra (Verification Plan)

### Kiểm tra Tự động
```bash
# Kiểm tra biên dịch TypeScript
node node_modules/typescript/bin/tsc --project frontend/tsconfig.json --noEmit

# Kiểm tra ESLint
node frontend/node_modules/eslint/bin/eslint.js --config frontend/eslint.config.mjs frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-view.tsx frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-toolbar.tsx
```

### Kiểm tra Thủ công
1. Mở trang chi tiết bài học [Chi tiết bài học | DATN Portal](http://localhost:3000/courses/6abf0202885b2bce17b4482e/lessons/6adada21ea90b87f17ec433e).
2. Chuyển sang tab **Sơ đồ tư duy (Mindmap)** -> chọn chế độ **Sơ đồ Mindmap**.
3. Nhấp vào nút khoanh tròn đỏ trên thanh công cụ:
   - Sơ đồ phải phóng to tràn toàn bộ màn hình máy tính (`fixed inset-0 z-50`).
   - Sơ đồ tự động căn giữa toàn màn hình mượt mà.
   - Nhấn phím `Escape` hoặc bấm nút thu nhỏ trên toolbar -> Trở về kích thước tab bình thường.

