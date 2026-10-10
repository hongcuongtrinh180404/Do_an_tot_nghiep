# Kế hoạch Triển khai: Thiết kế Giao diện 4 Tab Chi tiết Bài học (Summary, Mindmap, Quizz, Chatbot)

> **File:** `docs/PLAN-lesson-player-tabs.md`  
> **Request:** Chuyển đổi giao diện điều hướng phụ bên dưới Video Player từ 3 tab chung chung thành 4 tab chức năng: **Summary**, **Mindmap**, **Quizz**, và **Chatbot** (hiện tại hiển thị khung giao diện chuẩn bị sẵn layout rỗng/placeholder tinh gọn).  
> **Trạng thái:** Sẵn sàng triển khai  
> **Agent phụ trách:** `@frontend-specialist` | **Skill:** `frontend-design`, `clean-code`

---

## 1. Tổng quan & Mục tiêu (Overview)

### 1.1. Hiện trạng
- Trang chi tiết bài học của giảng viên (`/instructor/courses/[courseId]/lessons/[lessonId]`) đang sử dụng component [`lesson-tabs-container.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-tabs-container.tsx) gồm 3 tab cơ bản:
  - `Tab 1` (layout)
  - `Tab 2` (sparkles)
  - `Tab 3` (folder)
- Thanh tab hiện tại đang chia cố định 3 cột (`grid-cols-3`).
- Phần nội dung hiển thị chung một placeholder đơn giản.

### 1.2. Mục tiêu đạt được
- Cập nhật cấu hình và giao diện thanh điều hướng thành **4 tab chuyên biệt**:
  1. **Tab 1 - Summary**: Tóm tắt nội dung bài học.
  2. **Tab 2 - Mindmap**: Sơ đồ tư duy kiến thức bài học.
  3. **Tab 3 - Quizz**: Danh sách câu hỏi tương tác trong video bài học.
  4. **Tab 4 - Chatbot**: Trợ lý AI hỗ trợ giải đáp thắc mắc.
- Đổi layout thanh tab sang chia 4 cột cân đối (`grid-cols-2 sm:grid-cols-4` để responsive tốt trên mobile/tablet và laptop).
- Thiết kế phần nội dung bên dưới theo từng tab riêng biệt với layout placeholder chỉn chu, hiện đại, thẩm mỹ cao (Modern Glassmorphism / Clean Card with Theme-aware styling, tránh màu tím/violet theo quy tắc dự án), hiển thị icon đại diện, tiêu đề, mô tả và badge trạng thái sẵn sàng tích hợp logic.

---

## 2. Tiêu chí Thành công (Success Criteria)

- [ ] Thanh tab hiển thị đúng thứ tự 4 tab: `1. Summary`, `2. Mindmap`, `3. Quizz`, `4. Chatbot`.
- [ ] Responsive mượt mà: hiển thị 4 cột đều nhau trên màn hình desktop/laptop, co giãn linh hoạt trên màn hình nhỏ.
- [ ] Tương tác chuyển đổi tab (active state / hover state) hiển thị mượt mà với màu sắc đồng bộ (sử dụng Sky Blue token chủ đạo của hệ thống).
- [ ] Mỗi tab hiển thị giao diện khung rỗng (Empty/Placeholder State) trực quan, có biểu tượng riêng biệt, tiêu đề rõ ràng và nhãn đánh dấu khu vực chức năng.
- [ ] Tuân thủ nghiêm ngặt các nguyên tắc thiết kế dự án: Không dùng màu tím (Purple Ban), Không dùng font tùy tiện, TypeScript strict (không `any`), build không có lỗi.

---

## 3. Kiến trúc Giao diện & Cấu trúc File (Architecture & File Structure)

### 3.1. Danh sách file tác động

```text
frontend/src/features/course/components/player/
├── lesson-tabs-container.tsx         # [MODIFY] Chuyển đổi cấu hình 4 tabs, grid layout & router hiển thị nội dung
└── lesson-player-studio.tsx          # [INSPECT] Kiểm tra container bao bọc đảm bảo chiều cao và spacing hiển thị hài hòa
```

### 3.2. Cấu trúc Cấu hình 4 Tab (Tab Configuration)

```typescript
export interface TabConfig {
  id: 'summary' | 'mindmap' | 'quiz' | 'chatbot';
  tabNumber: string;
  title: string;
  icon: string;
  description: string;
  badgeText: string;
}

const TABS: TabConfig[] = [
  {
    id: 'summary',
    tabNumber: '1',
    title: 'Summary',
    icon: 'lucide:file-text',
    description: 'Khu vực tóm tắt tổng quan nội dung, mục tiêu cốt lõi và tài liệu bài học.',
    badgeText: 'Khu vực hiển thị tóm tắt bài học',
  },
  {
    id: 'mindmap',
    tabNumber: '2',
    title: 'Mindmap',
    icon: 'lucide:network',
    description: 'Khu vực trực quan hóa sơ đồ tư duy cây kiến thức của bài học.',
    badgeText: 'Khu vực hiển thị sơ đồ tư duy',
  },
  {
    id: 'quiz',
    tabNumber: '3',
    title: 'Quizz',
    icon: 'lucide:help-circle',
    description: 'Khu vực quản lý và hiển thị danh sách các câu hỏi trắc nghiệm trong video bài giảng.',
    badgeText: 'Khu vực hiển thị câu hỏi trắc nghiệm',
  },
  {
    id: 'chatbot',
    tabNumber: '4',
    title: 'Chatbot',
    icon: 'lucide:bot',
    description: 'Khu vực trợ lý AI thông minh hỗ trợ giải đáp thắc mắc và ôn tập kiến thức.',
    badgeText: 'Khu vực hội thoại Trợ lý AI',
  },
];
```

---

## 4. Phân rã Nhiệm vụ Chi tiết (Task Breakdown)

### Task 1: Cập nhật Cấu hình và Thanh Điều hướng 4 Tab (Tab Bar Navigation)
- **Agent**: `@frontend-specialist`
- **Skill**: `frontend-design`, `clean-code`
- **Mô tả**:
  - Cập nhật mảng `TABS` trong [`lesson-tabs-container.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-tabs-container.tsx) gồm 4 tab: `summary`, `mindmap`, `quiz`, `chatbot`.
  - Điều chỉnh layout lưới từ `grid-cols-3` sang `grid-cols-2 sm:grid-cols-4` để hiển thị 4 nút tab đều đặn và cân đối.
  - Tinh chỉnh typography, padding, và visual states (Active Sky badge, Active bottom-border 2px, hover transitions).
- **INPUT**: `lesson-tabs-container.tsx` hiện tại với 3 tab.
- **OUTPUT**: Thanh tab 4 cột chuẩn responsive hiển thị đúng 4 nhãn: Summary, Mindmap, Quizz, Chatbot.
- **VERIFY**: Kiểm tra DOM hiển thị đầy đủ 4 tab, chuyển đổi active state giữa các tab chính xác.

---

### Task 2: Thiết kế Giao diện Placeholder Khung Rỗng Độc Lập Cho Từng Tab
- **Agent**: `@frontend-specialist`
- **Skill**: `frontend-design`
- **Mô tả**:
  - Tạo layout hiển thị nội dung rỗng tương ứng với từng tab khi được chọn:
    - **Tab Summary**: Icon `lucide:file-text` với icon container màu Sky, badge trạng thái `Tóm tắt nội dung bài giảng`, khung card viền nét đứt nhẹ nhàng tạo không gian sẵn sàng hiển thị văn bản tóm tắt.
    - **Tab Mindmap**: Icon `lucide:network`, badge trạng thái `Sơ đồ tư duy bài học`, khung nền dạng canvas grid/dots tinh tế sẵn sàng nhúng thư viện ReactFlow / Markmap sau này.
    - **Tab Quizz**: Icon `lucide:help-circle`, badge trạng thái `Bộ câu hỏi trắc nghiệm video`, thông điệp hướng dẫn sẵn sàng cho danh sách in-video quiz.
    - **Tab Chatbot**: Icon `lucide:bot`, badge trạng thái `Trợ lý AI hỏi đáp`, khung layout gợi ý hội thoại và khung input giả lập sẵn sàng kết nối AI Assistant.
  - Đảm bảo độ cao tối thiểu (`min-h-[320px]`), cân đối với tỷ lệ màn hình laptop/desktop.
- **INPUT**: Cấu hình 4 tab và active state `activeTabId`.
- **OUTPUT**: Giao diện nội dung bên dưới thay đổi tương ứng theo từng tab, thẩm mỹ cao và chuẩn bị sẵn cấu trúc để tích hợp logic nghiệp vụ.
- **VERIFY**: Bấm từng tab 1 → 2 → 3 → 4, giao diện hiển thị đúng icon, tiêu đề và placeholder của từng chức năng.

---

### Task 3: Kiểm tra Layout Studio & Kiểm thử Hiển thị
- **Agent**: `@frontend-specialist`
- **Skill**: `webapp-testing`
- **Mô tả**:
  - Kiểm tra lại component [`lesson-player-studio.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-player-studio.tsx) để đảm bảo thẻ `<section aria-label="Bảng chuyển đổi Tab mở rộng">` hiển thị đồng bộ, không bị tràn ngang hoặc vỡ layout trên các độ phân giải khác nhau.
  - Chạy `npm run lint` hoặc kiểm tra TypeScript type check trên frontend.
- **INPUT**: File đã cập nhật.
- **OUTPUT**: Trang chạy trơn tru, không có lỗi cảnh báo TypeScript hoặc CSS.
- **VERIFY**: Truy cập `http://localhost:3000/instructor/courses/.../lessons/...` và xác nhận giao diện hiển thị chính xác theo yêu cầu.

---

## 5. Verification Checklist (Phase X)

- [x] Không sử dụng màu tím / violet (`#7c3aed`, `#8b5cf6`, `text-purple-*`, `bg-purple-*`).
- [x] Sử dụng hệ màu thiết kế chuẩn Sky / Slate của dự án (`sky-500`, `sky-600`, `border-border`, `bg-card`).
- [x] TypeScript không chứa type `any`.
- [x] Cấu hình 4 Tab: Summary, Mindmap, Quizz, Chatbot.
- [x] Thanh điều hướng 4 cột cân đối (`grid-cols-4`), bo góc, border highlight khi active.
- [x] Khung rỗng placeholder độc lập cho từng tab, có icon, tiêu đề, mô tả và badge trạng thái rõ ràng.
- [x] Build & Type check sạch sẽ (`npx tsc --noEmit` pass code 0).

## ✅ PHASE X COMPLETE

- Type check: ✅ Pass (`npx tsc --noEmit`)
- Styling & Rules: ✅ Pass (No purple, Sky theme consistent)
- Implementation: ✅ Hoàn tất [`lesson-tabs-container.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/player/lesson-tabs-container.tsx)
- Date: 2026-10-09

