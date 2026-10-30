# Plan: Redesign Category Grid Section (`category-grid-redesign.md`)

> **Task Slug:** `category-grid-redesign`  
> **Project Type:** WEB (Next.js 16 App Router + React 19 + Tailwind CSS v4)  
> **Active Skills:** `design-taste-frontend`, `clean-code`, `web-design-guidelines`  
> **Primary Agent:** `frontend-specialist`  
> **User Request:** Tái thiết kế khu vực Danh mục khóa học theo ảnh mẫu Domestika ("Courses by category") với lưới card tỉ lệ 1:1, 6 card/dòng trên desktop, hình ảnh minh họa chất lượng cao kèm tên danh mục, không có card "Tất cả lĩnh vực", và click vào card sẽ chuyển hướng cập nhật URL `/?category=[slug]#recent` (Phương án B.1).

---

## 1. Mục tiêu & Nguyên tắc Thiết kế (`/design-taste-frontend`)

1. **Bố cục Lưới Hiện đại (Visual Category Grid)**:
   - Tỉ lệ card chuẩn **1:1 (`aspect-square`)**.
   - Hiển thị **6 card trên 1 hàng** ở màn hình desktop (`lg:grid-cols-6`), tự động co giãn responsive trên mobile (`grid-cols-2`) và tablet (`grid-cols-3` hoặc `grid-cols-4`).
   - Loại bỏ card "Tất cả lĩnh vực" khỏi lưới card theo yêu cầu của user (100% card trong lưới là các danh mục chuyên môn thực tế).
2. **Xử lý Hình ảnh & Fallback Chuẩn Mẫu**:
   - Sử dụng ảnh bìa `imageUrl` thực tế từ cơ sở dữ liệu nếu có.
   - Khi `imageUrl` là null, hệ thống ánh xạ thông minh theo slug / tên danh mục sang kho ảnh minh họa chất lượng cao (editorial / creative photography phong cách Domestika) cho đúng các danh mục thực tế của database.
   - Thêm lớp phủ scrim tối (`bg-gradient-to-t from-black/80 via-black/30 to-transparent`) bảo đảm chữ trắng luôn tương phản sắc nét trên mọi bức ảnh.
   - Hiệu ứng micro-interaction cao cấp: zoom nhẹ ảnh khi hover (`group-hover:scale-105 transition-transform duration-500 ease-out`).
3. **Điều hướng & Đồng bộ URL (Phương án B.1)**:
   - Click vào card sẽ chuyển hướng / cập nhật URL sang `/?category=[slug]#recent`.
   - Trang chủ tự động nhận diện query param `category` từ URL để kích hoạt filter và cuộn mượt xuống catalog `#recent`.
   - Hỗ trợ link chia sẻ trực tiếp (deep-linking): người dùng gửi link `/?category=thiet-ke#recent` cho bạn bè thì trang tự động load và filter đúng danh mục đó.
   - Bổ sung nút bấm nhỏ gọn "Xem tất cả khóa học" hoặc "Xóa lọc" ở khu vực tiêu đề / kết quả để người dùng có thể trở về xem tất cả khi cần.

---

## 2. Ranh giới Triển khai (Boundaries)

- ✅ **Trong phạm vi:**
  - `frontend/src/features/course/components/public-discovery/category-rail.tsx`: Viết lại giao diện thành Lưới danh mục tỉ lệ 1:1, 6 cột, ảnh + tên danh mục, loại bỏ card "Tất cả lĩnh vực", hỗ trợ fallback ảnh theo slug DB.
  - `frontend/src/app/page.tsx`: Đồng bộ `useSearchParams`, `useRouter`, quản lý trạng thái `selectedCategorySlug` từ URL và xử lý deep-link `/?category=[slug]#recent`.
  - Kiểm tra và đảm bảo không vi phạm các quy tắc `/design-taste-frontend`: không dùng font inline (`font-sans`), không dùng màu tím/violet, không dùng icon card rườm rà.
  - Kiểm tra typecheck (`tsc --noEmit`) và lint.
  - Cập nhật tài liệu `a-agentic/features/course-management/dev-history.md`.
- ❌ **Ngoài phạm vi:**
  - Không sửa đổi backend API hay database schema.

---

## 3. Kế hoạch Triển khai Chi tiết

- [ ] **Bước 1:** Chuẩn bị bảng ánh xạ ảnh fallback nghệ thuật chuẩn 1:1 theo slug/chủ đề thực tế của database trong `category-rail.tsx`.
- [ ] **Bước 2:** Tái cấu trúc component `CategoryRail`:
  - Chuyển từ thanh cuộn ngang (horizontal rail) sang lưới card 6 cột (`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4`).
  - Mỗi card: `aspect-square`, `rounded-2xl`, `overflow-hidden`, ảnh full card `object-cover`, scrim gradient và tên danh mục in đậm ở góc dưới.
  - Tích hợp Next.js `Link` và handler `onSelectCategory` cập nhật URL `/?category=[slug]#recent`.
  - Hiển thị trạng thái active viền sáng khi danh mục đó đang được chọn.
  - Skeleton loading 6 card `aspect-square`.
- [ ] **Bước 3:** Cập nhật `frontend/src/app/page.tsx`:
  - Đồng bộ `selectedCategorySlug` với `useSearchParams().get('category')`.
  - Bọc trong `Suspense` (chuẩn Next.js App Router khi dùng `useSearchParams`).
- [ ] **Bước 4:** Kiểm tra Typecheck và Lint (`tsc --noEmit`).
- [ ] **Bước 5:** Cập nhật dev history tại `a-agentic/features/course-management/dev-history.md`.

