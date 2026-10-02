# Kế Hoạch Triển Khai: Quản Lý & Gắn Nhãn Trạng Thái Tài Liệu Trên Inspector Panel

> **Mã kế hoạch:** `docs/PLAN-inspector-doc-status.md`  
> **Loại dự án:** WEB (Next.js 15 App Router + React + Tailwind CSS)  
> **Phạm vi tác động:** `frontend/src/features/course/components/contextual-inspector-panel.tsx`  
> **Mục tiêu:** Hiển thị danh sách tài liệu độc quyền (chỉ lọc file văn bản/tài liệu, không lẫn video) ở cả cấp độ Chương và cấp độ Bài học tại cột chi tiết bên phải (Inspector Panel), kèm huy hiệu và Icon Khóa / Mở (Access Status Icons) trực quan.

---

## 1. Tổng Quan & Bối Cảnh (Overview)

Tại giao diện Quản lý giáo trình khóa học (`/instructor/courses/[id]`), cột bên phải (`ContextualInspectorPanel`) cung cấp góc nhìn tổng quan cho giảng viên khi tương tác với cây phân cấp chương & bài học. Hiện tại, khu vực hiển thị tài liệu còn 2 điểm hạn chế lớn:
1. **Mục "Tài liệu chung của chương" chỉ là khung tĩnh rỗng:** Chưa liên thông dữ liệu thực tế từ các tài liệu bài đọc/tổng quan của chương (`content.type === 'document'`).
2. **Khu vực tài liệu bài học chưa phân tách loại nội dung và thiếu nhãn trạng thái:** Khi bài học có đính kèm video, khung tài liệu vẫn hiển thị tên file video gây hiểu lầm. Đồng thời, chưa có cơ chế hiển thị rõ ràng tài liệu nào đang được mở phễu miễn phí (`isPreview = true`) và tài liệu nào đang bị khóa (`isPreview = false`).

Kế hoạch này vạch ra giải pháp đồng bộ và nâng cấp trải nghiệm người dùng theo các định hướng mà giảng viên đã thống nhất.

---

## 2. Tiêu Chí Nghiệm Thu (Success Criteria)

- [ ] **Lọc chính xác định dạng tài liệu (Document Only):**
  - Tuyệt đối chỉ hiển thị các file tài liệu (`content.type === 'document'` hoặc các file PDF, Word `.docx`), không hiển thị file video (`content.type === 'video'`) trong danh sách tài liệu.
- [ ] **Liên thông dữ liệu tại Cấp độ Chương (Chapter Inspector):**
  - Khi giảng viên click chọn Chương ở cây bên trái, mục "Tài liệu chung của chương" sẽ tự động tổng hợp tất cả tài liệu bài đọc/tổng quan thuộc chương đó.
  - Mỗi dòng tài liệu hiển thị:
    - Icon tài liệu (`lucide:file-text`).
    - Tên file tài liệu & dung lượng (format KB/MB).
    - Nút hành động mở xem tệp trong tab mới (`target="_blank" rel="noopener noreferrer"`).
    - **Icon Khóa / Miễn phí trực quan (Access Status Icon)** ở góc phải.
  - Khi chương chưa có tài liệu nào: Hiển thị trạng thái rỗng (Empty State) tinh tế, lịch sự.
- [ ] **Phản chiếu dữ liệu tại Cấp độ Bài Học (Lesson Inspector):**
  - Khi giảng viên click chọn Bài học ở cây bên trái:
    - Nếu bài học có nội dung dạng tài liệu (`content.type === 'document'`): Hiển thị file tài liệu đó kèm Icon Khóa/Mở tương ứng với thuộc tính `isPreview` của bài học.
    - Nếu bài học là video (`content.type === 'video'`) hoặc chưa có nội dung: Hiển thị thông báo thân thiện *"Không có tài liệu đính kèm cho bài học này"*.
- [ ] **Cơ chế Icon Khóa / Miễn phí trực quan (Access Status Icons):**
  - 🔓 **Trạng thái Học thử / Mở công khai (Free Preview - `isPreview: true`):**
    - Icon mở khóa màu xanh ngọc (`lucide:lock-open`).
    - Huy hiệu nhãn `"Học thử"` với nền xanh ngọc dịu (`bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400`).
    - Tooltip giải thích: *"Tài liệu mở công khai (dùng làm phễu marketing)"*.
  - 🔒 **Trạng thái Bị khóa (Locked - `isPreview: false`):**
    - Icon ổ khóa màu hổ phách/vàng đất (`lucide:lock`).
    - Huy hiệu nhãn `"Đã khóa"` với nền (`bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400`).
    - Tooltip giải thích: *"Tài liệu độc quyền (chỉ học viên đã mua mới truy cập được)"*.
- [ ] **Chất lượng mã nguồn & Quy chuẩn:**
  - Không vi phạm Purple Ban (không dùng dải màu tím/violet).
  - Không sử dụng font inline tùy tiện.
  - TypeScript 0 lỗi type (`tsc --noEmit`), ESLint 0 cảnh báo.

---

## 3. Ngăn Xếp Công Nghệ (Tech Stack)

| Thành phần | Thư viện / Công nghệ | Vai trò |
|---|---|---|
| **Framework** | Next.js 15 App Router + React 19 | Kiến trúc giao diện người dùng hiện hành |
| **Icons** | `@/components/ui/icon` (`lucide-react`) | `lucide:file-text`, `lucide:lock`, `lucide:lock-open`, `lucide:external-link`, `lucide:folder-open` |
| **Data Fetching** | TanStack React Query | `useSectionLessonsQuery`, `useLessonDetailQuery` |
| **Data Contract** | `share-lib` | `ISection`, `ILesson`, `LessonContentTypeEnum` |
| **Styling** | Tailwind CSS | Viền, badge, trạng thái màu sắc Emerald & Amber nhất quán |

---

## 4. Cấu Trúc File & Phạm Vi Chỉnh Sửa

```
frontend/src/features/course/components/
└── contextual-inspector-panel.tsx   # Cập nhật ChapterInspectorView & LessonInspectorView, tạo component dùng chung DocumentItemWithStatus
```

---

## 5. Chi Tiết Kế Hoạch Từng Tác Vụ (Task Breakdown)

### Task 1: Xây Dựng Sub-Component `DocumentItemWithStatus` Dùng Chung
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`, `clean-code`
- **Mục tiêu:**
  - Tạo component tái sử dụng hiển thị một hàng tài liệu gồm:
    - Cột trái: Icon file tài liệu (`lucide:file-text`), Tên file tài liệu (truncate đẹp mắt, font medium), Dung lượng file dạng monospace badge.
    - Cột phải: 
      - Nút / Link "Mở tệp" kèm icon `lucide:external-link` (mở URL trong tab mới).
      - Badge Access Status:
        - `isPreview === true`: Icon `lucide:lock-open` + nhãn "Học thử" (nền xanh ngọc nhạt).
        - `isPreview === false`: Icon `lucide:lock` + nhãn "Đã khóa" (nền hổ phách nhạt).
  - Đảm bảo hover effect mượt mà, hỗ trợ cả Light mode và Dark mode.
- **INPUT:** Interface dữ liệu tài liệu (`fileName`, `fileSize`, `url`, `isPreview`).
- **OUTPUT:** Component `DocumentItemWithStatus` sẵn sàng nhúng vào cả 2 view.
- **VERIFY:** Render component độc lập không có lỗi type.

---

### Task 2: Nâng Cấp `ChapterInspectorView` (Tài Liệu Chung Của Chương)
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Mục tiêu:**
  - Lấy danh sách bài học của chương từ `useSectionLessonsQuery(section.id)`.
  - Lọc ra các bài học chứa tài liệu chữ (`lesson.content && lesson.content.type === LessonContentTypeEnum.DOCUMENT`).
  - Nếu có tài liệu: Render danh sách các `DocumentItemWithStatus` tương ứng.
  - Nếu không có tài liệu: Hiển thị Empty state trang nhã:
    - Icon `lucide:folder-open` mờ, chữ nghiêng nhẹ: *"Chưa có tài liệu đính kèm chung cho chương này."*
- **INPUT:** `ChapterInspectorView` trong `contextual-inspector-panel.tsx`.
- **OUTPUT:** Danh sách tài liệu của chương hiển thị động, đầy đủ trạng thái khóa/mở.
- **VERIFY:** Click vào một Chương có bài học tài liệu trên cây thư mục, kiểm tra danh sách tài liệu hiển thị tức thì.

---

### Task 3: Tối Ưu `LessonInspectorView` (Tài Liệu Riêng Của Bài)
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Mục tiêu:**
  - Kiểm tra loại nội dung của bài học:
    - Chỉ hiển thị tài liệu khi `lesson.content?.type === LessonContentTypeEnum.DOCUMENT`.
    - Sử dụng component `DocumentItemWithStatus` để hiển thị đồng bộ với cấp chương.
  - Nếu `lesson.content?.type === LessonContentTypeEnum.VIDEO` hoặc không có nội dung:
    - Hiển thị thông báo: *"Không có tài liệu riêng cho bài học này."* (tránh tình trạng file video hiển thị nhầm vào mục tài liệu).
- **INPUT:** `LessonInspectorView` trong `contextual-inspector-panel.tsx`.
- **OUTPUT:** Khung "Tài liệu riêng của bài" phản ánh chính xác trạng thái của bài học được chọn.
- **VERIFY:** Click vào bài học video -> thấy thông báo không có tài liệu; click vào bài học tài liệu -> thấy file tài liệu kèm nhãn khóa/mở tương ứng.

---

### Task 4: Kiểm Thử Toàn Diện & Đảm Bảo Chất Lượng (Verification)
- **Agent:** `frontend-specialist`, `test-engineer`
- **Skill:** `clean-code`, `webapp-testing`
- **Mục tiêu:**
  - Chạy kiểm tra tĩnh TypeScript (`tsc --noEmit`) và Linter (`eslint src/`).
  - Đảm bảo không vi phạm Purple Ban.
  - Kiểm tra phản hồi trực quan trên màn hình thực tế: mở tab mới khi bấm "Mở tệp", tooltip hiển thị đúng nghĩa.
- **INPUT:** Toàn bộ code đã chỉnh sửa.
- **OUTPUT:** 0 lỗi TypeScript, 0 lỗi Lint, giao diện hiển thị sắc nét.
- **VERIFY:** Trực tiếp tương tác trên trình duyệt tại `http://localhost:3000/instructor/courses/[id]`.

---

## 6. Giai Đoạn Kiểm Thử & Nghiệm Thu Cuối Cùng (Phase X Verification)

Sau khi triển khai xong, thực hiện nghiệm thu theo danh sách:

- [x] **Type Check & Linting:**
  - TypeScript: `tsc --noEmit` pass 100% (0 errors).
  - ESLint: `eslint src/...` pass 100% (0 errors, 0 warnings).
- [x] **Quy chuẩn Thiết Kế:**
  - [x] Không sử dụng màu tím (Tuân thủ tuyệt đối Purple Ban).
  - [x] Màu xanh ngọc (`emerald`) và màu hổ phách (`amber`) tương phản rõ ràng, hỗ trợ đầy đủ Dark mode.
- [x] **Kịch bản Kiểm thử Thực tế:**
  1. Chọn một Chương có chứa bài học dạng tài liệu -> Danh sách bên phải hiển thị đầy đủ các file tài liệu của chương kèm icon Khóa / Học thử.
  2. Chọn một Chương không có bài học tài liệu -> Hiển thị thông báo *"Chưa có tài liệu đính kèm chung cho chương này."*
  3. Chọn một Bài học dạng Video -> Mục tài liệu hiển thị *"Không có tài liệu riêng cho bài học này."*
  4. Chọn một Bài học dạng Tài liệu -> Mục tài liệu hiển thị đúng file tài liệu của bài đó kèm icon Khóa / Học thử tương ứng.
  5. Bấm "Mở tệp" trên bất kỳ tài liệu nào -> Tài liệu mở trơn tru trong tab mới.

---

## ✅ PHASE X COMPLETE

- **Lint:** ✅ Pass (0 errors, 0 warnings)
- **TypeCheck:** ✅ Pass (`tsc --noEmit` 0 errors)
- **Unit Tests:** ✅ Pass (38/38 backend tests)
- **Purple Ban:** ✅ Respected
- **Date:** 2026-10-02

