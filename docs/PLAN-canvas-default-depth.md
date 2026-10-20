# Kế Hoạch: Thu Gọn Mặc Định 2 Cấp Độ Cho Sơ Đồ Tư Duy Canvas 2D (Default 2-Level Collapse for Mindmap Canvas)

> **Mục tiêu:**
> Khi người dùng bấm chuyển sang xem **Sơ đồ Mindmap** ở chế độ Canvas 2D trên tab bài học (`LessonMindmapTab`), sơ đồ sẽ tự động được thu gọn mặc định chỉ hiển thị **2 cấp độ đầu tiên**:
> - **Cấp 0 (Root Node)**: Tên bài học.
> - **Cấp 1 (Primary Branches)**: Các chủ đề / nhánh chính trực tiếp của bài học.
> Toàn bộ các nhánh con từ Cấp 2 trở đi sẽ được thu gọn ẩn bên trong các node Cấp 1, hiển thị số lượng nhánh con dưới dạng pill badge (`+{childCount}`). Giảng viên/học viên có thể nhấp vào badge để mở rộng từng nhánh theo nhu cầu (Progressive Disclosure) hoặc bấm nút "Mở rộng tất cả" trên thanh công cụ.
>
> **Task Slug:** `canvas-default-depth`  
> **Plan File:** `docs/PLAN-canvas-default-depth.md`  
> **Project Type:** `WEB (Next.js + React 19 + @xyflow/react)`  
> **Primary Agent:** `project-planner`  
> **Assigned Agents:** `frontend-specialist`, `clean-code`  
>
> **Đã thống nhất qua Socratic Gate:**
> 1. **Duy trì trạng thái làm việc (State Preservation)**: Giữ nguyên trạng thái mở rộng/thu gọn các nhánh mà người dùng đã thao tác trước đó trong suốt phiên làm việc (chỉ tự động khởi tạo mặc định 2 cấp độ ở lần đầu tiên tải/mở trang, khi chuyển sang bài học khác hoặc khi AI sinh lại mindmap).
> 2. **Mở rộng tiệm tiến (Progressive Disclosure)**: Khi người dùng nhấp mở nhánh Cấp 1 (`+{count}`), chỉ hiển thị các nhánh con trực tiếp Cấp 2. Các nhánh con Cấp 3, Cấp 4 bên trong Cấp 2 vẫn giữ nguyên trạng thái thu gọn cho đến khi người dùng nhấp tiếp, tránh việc sơ đồ bị tràn màn hình.
> 3. **Thanh công cụ Canvas Toolbar**: Nút "Mở rộng tất cả / Thu gọn tất cả" cho phép bung mở toàn bộ cây hoặc thu gọn lại theo ý muốn bất cứ lúc nào.  

---

## 1. Phân Tích Kỹ Thuật & Kiến Trúc Hiện Tại

### 1.1. Hiện Trạng Hệ Thống
- File `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-view.tsx`:
  - Đang khởi tạo state: `const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());`.
  - Giá trị ban đầu là `Set()` rỗng → tất cả các node ở mọi cấp độ sâu (Cấp 0, 1, 2, 3, 4, 5...) đều được bung mở tối đa cùng một lúc.
  - Hậu quả: Với các bài học có sơ đồ nhiều nhánh và độ sâu lớn, khi chuyển sang Canvas sơ đồ bị trải rộng quá mức, khó bao quát cấu trúc tổng thể.
- File `frontend/src/features/course/utils/lesson-mindmap-flow.util.ts`:
  - Đã có hàm `countDescendantNodes(node)` đếm số con cháu.
  - Đã có cơ chế kiểm tra `isCollapsed = collapsedIds.has(node.id)`. Khi node bị collapsed, các node con cháu bên dưới sẽ tự động không được thêm vào mảng `rawNodes` và `rawEdges`, thuật toán Dagre tự động tính lại vị trí các node hiển thị rất gọn gàng.

### 1.2. Giải Pháp Kiến Trúc Tương Tự `CourseMindmapView`
Trong sơ đồ tổng thể khóa học (`CourseMindmapView`), hàm `generateDefaultCollapsedIds(rawData)` trong `mindmap-converter.util.ts` đã áp dụng mô hình chuẩn:
- Mọi node từ cấp cần thu gọn sẽ được đưa vào `collapsedIds`.
- Các node ở cấp sâu hơn cũng được thu gọn sẵn (pre-collapsed), để khi người dùng mở một nhánh Cấp 1 thì Cấp 2 xuất hiện gọn gàng chứ không tự động bung tung tóe Cấp 3, Cấp 4.
- Khi người dùng muốn xem sâu hơn thì nhấp tiếp vào từng node Cấp 2.

---

## 2. Kế Hoạch Triển Khai Chi Tiết (Phased Roadmap)

### Phase 1: Bổ Sung Hàm Tạo Danh Sách Thu Gọn Mặc Định 2 Cấp Độ
- **File:** `frontend/src/features/course/utils/lesson-mindmap-flow.util.ts`
- **Hàm mới:** `generateLessonMindmapDefaultCollapsedIds(root: ILessonMindmapNode, maxVisibleLevel = 1): Set<string>`
- **Logic thực thi:**
  1. Duyệt đệ quy cây từ node `root` (level 0).
  2. Bất kỳ node nào ở `level >= maxVisibleLevel` (mặc định level >= 1: các nhánh Cấp 1, Cấp 2, Cấp 3...) mà có `children` (`children.length > 0`) sẽ được thêm ID vào tập `collapsedSet`.
  3. Trả về `collapsedSet`.
  4. Node Root (level 0) không bị thu gọn → các nhánh Cấp 1 luôn hiển thị.
  5. Các nhánh Cấp 1 có con sẽ hiển thị badge `+{childCount}`.

### Phase 2: Áp Dụng State Thu Gọn Mặc Định Trong LessonMindmapCanvasView
- **File:** `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-view.tsx`
- **Logic cập nhật:**
  1. Khởi tạo `collapsedIds`:
     ```typescript
     const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() =>
       generateLessonMindmapDefaultCollapsedIds(root, 1)
     );
     ```
  2. Khi dữ liệu `root` thay đổi (do bài học khác hoặc do AI sinh lại): Đồng bộ lại `collapsedIds` mặc định bằng `generateLessonMindmapDefaultCollapsedIds(root, 1)`.
  3. Đảm bảo nút "Mở rộng tất cả / Thu gọn tất cả" trên `LessonMindmapCanvasToolbar` vẫn hoạt động mượt mà:
     - Nếu đang thu gọn: Bấm sẽ mở rộng toàn bộ (`Set()`).
     - Nếu đang mở rộng: Bấm sẽ thu gọn về 2 cấp hoặc về Root (`collectBranchNodeIds(root)`).
  4. Sau khi khởi tạo layout 2 cấp, tự động gọi `fitView({ padding: 0.25, duration: 350 })` để sơ đồ căn giữa hoàn hảo.

### Phase 3: Kiểm Thử & Tinh Chỉnh Trải Nghiệm Người Dùng (UX Refinements)
- Đảm bảo khi người dùng bấm qua lại giữa 2 nút `[ 🌲 Dạng cây ]` và `[ 🗺️ Sơ đồ Mindmap ]`, giao diện Canvas luôn xuất hiện ngay lập tức ở trạng thái 2 cấp độ trực quan, không bị giật lag hay lệch viewport.
- Đảm bảo click vào badge `+{count}` ở Cấp 1 mở ra Cấp 2 mượt mà (Progressive Disclosure).
- Đảm bảo click vào badge mốc thời gian `formatTime(timestamp)` vẫn tua đúng video (`onSeek`).

---

## 3. Danh Sách File Tác Động (Impacted Files)

| File | Hành động | Mục đích |
| :--- | :--- | :--- |
| `frontend/src/features/course/utils/lesson-mindmap-flow.util.ts` | **Cập nhật** | Thêm hàm `generateLessonMindmapDefaultCollapsedIds(root, maxVisibleLevel)` |
| `frontend/src/features/course/components/player/tabs/mindmap/lesson-mindmap-canvas-view.tsx` | **Cập nhật** | Khởi tạo `collapsedIds` mặc định hiển thị 2 cấp độ và fitView |
| `a-agentic/features/interactive-video-player/dev-history.md` | **Cập nhật** | Ghi nhận tài liệu lịch sử phát triển |

---

## Phase X: Checklist Xác Thực (Verification Checklist)

- [ ] Khi chuyển sang tab "Sơ đồ Mindmap", chỉ nhìn thấy Node Root (Tên bài học) và các Node Cấp 1 (Chủ đề chính).
- [ ] Các Node Cấp 1 có chứa node con hiển thị nút tròn `+{childCount}` rõ ràng, thẩm mỹ.
- [ ] Nhấp vào nút `+{childCount}` của một Node Cấp 1 thì các Node Cấp 2 của riêng nhánh đó mở ra mượt mà; các nhánh con sâu hơn bên trong Cấp 2 vẫn giữ thu gọn để đảm bảo hiển thị ngăn nắp.
- [ ] Nhấp nút "Mở rộng" trên thanh công cụ Canvas thì toàn bộ cây được bung mở hết.
- [ ] Nhấp nút "Thu gọn" trên thanh công cụ Canvas thì toàn bộ cây thu gọn lại gọn gàng.
- [ ] TypeScript `tsc --noEmit` pass 100% 0 lỗi.
- [ ] Tuân thủ **Purple Ban** (Sky Blue, Indigo, Slate).
