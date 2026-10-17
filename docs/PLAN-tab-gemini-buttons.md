# Kế hoạch Triển khai: Bổ sung Nút "Test AI (Gemini)" Bên Cạnh Mỗi Tab Bài Học

> **File:** `docs/PLAN-tab-gemini-buttons.md`  
> **Request:** Tại trang chi tiết bài học của Giảng viên (`/instructor/courses/[courseId]/lessons/[lessonId]`), phần thanh điều hướng các tab (Summary, Mindmap, Quizz, Chatbot), tạo thêm một button bên cạnh mỗi tab để chuẩn bị cho việc tích hợp kiểm thử gọi Gemini API. Giai đoạn này chỉ xây dựng giao diện tĩnh thuần túy (hover/active, chuẩn UX/UI).  
> **Chế độ:** `/plan` (Chỉ lập kế hoạch, không can thiệp mã nguồn khi chưa xác nhận)  
> **Agent phụ trách:** `@project-planner` phối hợp `@frontend-specialist`  
> **Skill:** `frontend-design`, `clean-code`, `plan-writing`

---

## 1. Tổng quan & Mục tiêu (Overview)

### 1.1. Bối cảnh & Hiện trạng
- Trang chi tiết bài học dành cho Giảng viên (`InstructorLessonDetailPage`) sử dụng component [`lesson-tabs-container.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-tabs-container.tsx) gồm 4 tab phân bổ trên thanh ngang chia 4 cột (`grid-cols-4`):
  1. `1. Summary`
  2. `2. Mindmap`
  3. `3. Quizz`
  4. `4. Chatbot`
- Component [`lesson-tabs-container.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-tabs-container.tsx) hiện tại chưa nhận prop `isInstructor`, và mỗi tab chỉ có nút chuyển tab cơ bản mà chưa có nút tác vụ để kích hoạt hoặc kiểm thử AI.

### 1.2. Quyết định Thiết kế (Đã chốt qua Socratic Gate)
1. **Vị trí nút**: Đặt trực tiếp trên thanh Tab Bar ngay cạnh tên của từng tab (mỗi nút tab hiển thị nhãn tab kèm nút nhỏ `✨ Test AI`).
2. **Phản hồi tương tác**: Chỉ tạo giao diện tĩnh thuần túy (các trạng thái default, hover, active, focus-visible), chưa gắn logic phản hồi toast hay giả lập spinner, sẵn sàng nhận `onTestClick` callback hoặc TanStack mutation ở giai đoạn sau.
3. **Phạm vi quyền hạn**: Chỉ hiển thị khi ở vai trò Giảng viên (`isInstructor={true}`). Khi học viên xem bài học, thanh tab giữ nguyên giao diện gọn gàng chỉ để chuyển đổi tab.

---

## 2. Loại Dự án & Tech Stack (Project Type & Tech Stack)

- **Project Type**: `WEB` (Next.js 15 App Router + React 19)
- **Styling**: Tailwind CSS v4, Token màu hệ thống (Primary Sky Blue, Muted, Border, Card)
- **Icons**: Iconify / Lucide React (`lucide:sparkles`, `lucide:bot`, v.v.)
- **Design Rule**: Tuân thủ triệt để **Purple Ban** (Cấm tuyệt đối màu tím `#7c3aed`, `#8b5cf6`, `text-purple-*`, `bg-purple-*`). Sử dụng bảng màu Sky Blue (`sky-500`, `sky-600`), Slate và Amber.

---

## 3. Tiêu chí Thành công (Success Criteria)

- [ ] Prop `isInstructor` được truyền từ [`lesson-player-studio.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-player-studio.tsx) xuống [`lesson-tabs-container.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-tabs-container.tsx).
- [ ] Bên cạnh mỗi tab trong 4 tab (`Summary`, `Mindmap`, `Quizz`, `Chatbot`) xuất hiện một button `Test AI` với icon `lucide:sparkles` tinh tế.
- [ ] Nút `Test AI` có sự kiện `e.stopPropagation()` độc lập để khi bấm không bị kích hoạt nhầm việc chuyển tab nếu người dùng chỉ muốn test riêng biệt (hoặc tự động kích hoạt tab đồng thời nếu cần).
- [ ] Thiết kế responsive:
  - Màn hình nhỏ (Mobile/Tablet): Hiển thị icon `lucide:sparkles` thu gọn (icon-only button) để tránh vỡ giao diện thanh tab 4 cột.
  - Màn hình Laptop/Desktop (>= 1024px / 1280px): Hiển thị đầy đủ cả icon và chữ `Test AI`.
- [ ] Chỉ hiển thị cho Giảng viên (`isInstructor={true}`).
- [ ] Không có lỗi TypeScript (`npx tsc --noEmit` pass), không có lỗi linting.

---

## 4. Cấu trúc File & Kiến trúc Chi tiết (File Structure)

```text
frontend/src/features/course/components/player/
├── lesson-player-studio.tsx          # [MODIFY] Truyền prop isInstructor={isInstructor} vào LessonTabsContainer
└── lesson-tabs-container.tsx         # [MODIFY] Cập nhật interface props, render button "Test AI" bên cạnh từng tab
```

### Thiết kế Component Interface:
```typescript
interface LessonTabsContainerProps {
  isInstructor?: boolean;
  onTestGemini?: (tabId: TabConfig['id']) => void;
}
```

---

## 5. Phân rã Nhiệm vụ Chi tiết (Task Breakdown)

### Task 1: Cập nhật Interface & Truyền Prop `isInstructor`
- **Agent**: `@frontend-specialist`
- **Skill**: `clean-code`
- **Mô tả**:
  - Cập nhật interface `LessonTabsContainerProps` trong [`lesson-tabs-container.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-tabs-container.tsx) nhận `isInstructor?: boolean` (mặc định `false`).
  - Cập nhật [`lesson-player-studio.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-player-studio.tsx) truyền `isInstructor={isInstructor}` xuống `<LessonTabsContainer />`.
- **INPUT**: File `lesson-player-studio.tsx` và `lesson-tabs-container.tsx` hiện tại.
- **OUTPUT**: Prop `isInstructor` được đồng bộ hóa từ cấp cha xuống cấp con.
- **VERIFY**: TypeScript không báo lỗi thiếu hoặc thừa prop.

---

### Task 2: Thiết kế Nút "Test AI" Bên Cạnh Từng Tab trong Tab Bar
- **Agent**: `@frontend-specialist`
- **Skill**: `frontend-design`, `clean-code`
- **Mô tả**:
  - Tại từng item trong vòng lặp `TABS.map(...)` trên thanh Tab Bar:
    - Bố trí container linh hoạt dạng `flex items-center justify-between` hoặc `flex items-center gap-2`.
    - Thêm nút Button:
      - Icon: `lucide:sparkles` kích thước `size-3` hoặc `size-3.5`.
      - Text: `Test AI` (responsive: ẩn nhãn chữ trên màn hình nhỏ `< 1280px`, hiển thị đầy đủ trên màn hình rộng).
      - Style: Nền `bg-sky-500/10 hover:bg-sky-500 hover:text-white text-sky-600 dark:text-sky-400 border border-sky-500/20 active:scale-95 transition-all`.
      - Tooltip/Title: `Test Gemini API cho [Title]`.
      - Xử lý click: `onClick={(e) => { e.stopPropagation(); onTestGemini?.(tab.id); }}` để không gây conflict với thao tác click chọn tab.
- **INPUT**: Code thanh Tab Bar trong `lesson-tabs-container.tsx`.
- **OUTPUT**: 4 nút "Test AI" xuất hiện liền kề tương ứng với 4 tab: Summary, Mindmap, Quizz, Chatbot.
- **VERIFY**: Kiểm tra DOM hiển thị đầy đủ 4 nút khi `isInstructor=true`, ẩn đi khi `isInstructor=false`.

---

### Task 3: Tinh chỉnh Responsive & Kiểm tra Visual Trực quan
- **Agent**: `@frontend-specialist`
- **Skill**: `frontend-design`, `webapp-testing`
- **Mô tả**:
  - Kiểm tra xem khi xuất hiện thêm nút `Test AI`, chiều rộng của các tab trên các kích thước màn hình (1024px, 1280px, 1440px, 1920px) có bị tràn mép hay ép chữ xuống dòng xấu xí không.
  - Tinh chỉnh `gap`, `padding` (`px-2 sm:px-3 py-2.5`) để thanh tab vừa mắt, tinh tế và cao cấp.
  - Đảm bảo tuân thủ Purple Ban (chỉ dùng Sky Blue/Neutral).
- **INPUT**: Giao diện đã cập nhật nút.
- **OUTPUT**: Giao diện hiển thị sắc nét, cân đối, responsive hoàn hảo trên mọi độ phân giải.
- **VERIFY**: Mở trang trên trình duyệt tại `http://localhost:3000/instructor/courses/6abf0202885b2bce17b4482e/lessons/6ac74c8e1fcc34351bf3aec5`.

---

## 6. Verification Checklist (Phase X)

- [x] **Purple Ban**: Hoàn toàn không sử dụng màu tím / violet (`text-purple-*`, `bg-purple-*`, `#7c3aed`). Sử dụng Sky Blue tokens (`sky-500`, `sky-600`).
- [x] **Type Safety**: Không sử dụng type `any`, interface `LessonTabsContainerProps` định nghĩa tường minh.
- [x] **Quyền hiển thị**: Nút `Test AI` chỉ render khi `isInstructor === true`.
- [x] **Tương tác**: Click vào nút `Test AI` không làm xung đột sự kiện chọn tab nhờ `e.stopPropagation()`.
- [x] **Responsive**: Không vỡ dòng, hiển thị icon `✨` thu gọn trên màn hình nhỏ và nhãn `✨ Test AI` đầy đủ trên màn hình >= 640px.
- [x] **Build & Type Check**: Chạy `tsc --noEmit` pass code 0 không phát sinh lỗi.

## ✅ PHASE X COMPLETE

- Type check: ✅ Pass (`pnpm --filter frontend exec tsc --noEmit`)
- Styling & Rules: ✅ Pass (Tuân thủ Purple Ban, Sky Blue theme, responsive mượt mà)
- Implementation: ✅ Hoàn tất [`lesson-tabs-container.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-tabs-container.tsx) và [`lesson-player-studio.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-player-studio.tsx)
- Date: 2026-10-11

