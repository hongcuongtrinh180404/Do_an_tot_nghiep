# Plan: Category Modal Redesign (`category-modal-redesign.md`)

> **Task Slug:** `category-modal-redesign`  
> **Project Type:** WEB (Next.js 16 App Router + React 19 + Tailwind CSS v4)  
> **Active Skills:** `design-taste-frontend`, `web-design-guidelines`  
> **Primary Agent:** `frontend-specialist`  
> **User Request:** Loại bỏ trường "Thứ tự hiển thị", tái thiết kế modal thêm/sửa danh mục mới theo phong cách Admin hiện đại, sau đó kiểm định toàn diện bằng `web-design-guidelines`.

---

## 1. Overview & Mục tiêu

Tái cấu trúc và nâng cấp trải nghiệm giao diện Modal thêm mới / chỉnh sửa danh mục khóa học (`CategoryModal`) tại `frontend/src/features/admin/categories/components/category-modal.tsx`:
1. **Loại bỏ trường "Thứ tự hiển thị"**: Cả ở form tạo mới và form chỉnh sửa theo quyết định Socratic Gate. Giá trị `order` mặc định bằng 0 khi tạo mới và giữ nguyên khi cập nhật.
2. **Tái thiết kế giao diện theo phong cách `/design-taste-frontend` (App Screens)**:
   - Áp dụng các nguyên tắc: Quiet borders, flat surfaces, color on data/state (không tràn lan trên chrome), loại bỏ các thành phần rườm rà (khung nét đứt cồng kềnh).
   - Nâng cấp trường "Trạng thái hiển thị" thành dạng Status Bar Card hàng ngang tinh tế với chỉ báo trạng thái, nhãn rõ ràng và toggle switch mượt mà.
   - Nâng cấp khu vực "Ảnh đại diện danh mục" thành cụm Media Uploader nhỏ gọn (Compact Media Uploader) gồm thumbnail preview bo góc, hướng dẫn kích thước/định dạng và các nút hành động (Chọn ảnh / Xóa ảnh) công thái học cao.
   - Bổ sung chỉ báo slug động khi gõ tên danh mục ở form tạo mới và giữ tính năng tạo lại slug ở form chỉnh sửa.
3. **Kiểm định chất lượng với `/web-design-guidelines`**:
   - Chạy `audit-ui.mjs` đạt 0 lỗi: Không dùng inline font classes (`font-mono`, `font-sans`), đảm bảo `aria-label` trên các icon-only button, đảm bảo `outline-none` đi kèm focus ring rõ ràng, đầy đủ `htmlFor` và `alt`.
   - TypeScript typecheck (`tsc --noEmit`) và ESLint đạt 0 lỗi.

---

## 2. Ranh giới (Boundaries)

- ✅ **Trong phạm vi:**
  - Sửa đổi `frontend/src/features/admin/categories/components/category-modal.tsx`.
  - Cập nhật schema `frontend/src/features/admin/categories/schemas/category.schema.ts` nếu cần hỗ trợ default.
  - Chạy và kiểm tra `audit-ui.mjs` và TypeScript build.
  - Cập nhật tài liệu dev history tại `a-agentic/features/course-management/dev-history.md`.
- ❌ **Ngoài phạm vi:**
  - Không thay đổi backend API contracts (`CreateCourseCategoryDto` đã hỗ trợ `order` optional với default 0).
  - Không sửa đổi database Mongoose schema.

---

## 3. Kế hoạch triển khai

1. **Step 1:** Cập nhật `category.schema.ts` đảm bảo `order` có `.default(0)`.
2. **Step 2:** Tái cấu trúc `CategoryModal` (`category-modal.tsx`):
   - Bỏ render trường input "Thứ tự hiển thị".
   - Triển khai Status Bar Card cho trường "Trạng thái".
   - Triển khai Compact Media Uploader cho ảnh đại diện.
   - Chuẩn hóa accessibility (aria attributes, keyboard focus, labels).
3. **Step 3:** Kiểm tra với `web-design-guidelines` (`audit-ui.mjs`).
4. **Step 4:** Chạy TypeCheck (`tsc --noEmit`) và ESLint.
5. **Step 5:** Cập nhật `dev-history.md`.

