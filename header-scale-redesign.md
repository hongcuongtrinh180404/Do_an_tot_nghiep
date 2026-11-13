# Plan: Scale Header Logo & Typography (`header-scale-redesign.md`)

> **Task Slug:** `header-scale-redesign`  
> **Project Type:** WEB (Next.js 16 App Router + React 19 + Tailwind CSS v4)  
> **Active Skills:** `design-taste-frontend`, `clean-code`, `web-design-guidelines`  
> **Primary Agent:** `frontend-specialist`  
> **User Request:** Phóng to logo ở thanh header, tăng kích thước và độ cân đối cho nội dung thanh header (nav links, search input, action buttons), áp dụng các nguyên tắc chuẩn của `/design-taste-frontend`.

---

## 1. Mục tiêu & Nguyên tắc Thiết kế (`/design-taste-frontend`)

1. **Tỷ lệ & Kích thước Header & Logo (Editorial Scale)**:
   - Tăng chiều cao Header từ `h-16` (64px) lên `h-[68px] sm:h-[72px]` (72px trên desktop).
   - Tăng kích cỡ `MindlyLogo` từ `h-9 sm:h-10` (36px/40px) lên `h-11 sm:h-12` (44px mobile, 48px desktop).
   - Tối ưu nét chữ Slogan `"MAP YOUR MIND"` trong `MindlyLogo` (`font-size: 9.2px; letter-spacing: 3.4px;`) để dù render ở tỷ lệ nào cũng sắc nét, không bị nhòe.
2. **Typography & Trọng lượng thị giác (Visual Weight & Balance)**:
   - Nav links: Tăng từ `text-sm` (14px) lên `text-[15px]`, `font-medium`, màu `text-neutral-200 hover:text-white`, khoảng cách `gap-7 lg:gap-8`.
   - Search bar: Chiều cao `h-11` (44px), viền và nền sang trọng (`bg-[#222222] border-neutral-700 focus:bg-[#1a1a1a]`), font chữ placeholder/input `text-[15px]`.
   - Action buttons (Đăng nhập / Tham gia miễn phí): Chiều cao `h-10` (40px), padding rộng rãi `px-4` và `px-5`, font chữ `text-[15px]` tương xứng với tầm vóc của logo mới.
   - User Avatar: Tăng nhẹ từ `size-9 sm:size-10` lên `size-10 sm:size-11` (44px) với kích thước icon/ảnh tương ứng.
3. **Trải nghiệm cuộn mượt mà (Smart Sticky Header)**:
   - Đồng bộ `topOffset: 72` trong `useSmartHeaderScroll` để phù hợp với chiều cao 72px của header mới.

---

## 2. Ranh giới Triển khai (Boundaries)

- ✅ **Trong phạm vi:**
  - `frontend/src/features/course/components/public-discovery/public-header.tsx`: Cập nhật cấu trúc chiều cao header, logo size, nav typography, search input size, auth button size, mobile menu & avatar.
  - `frontend/src/components/brand/mindly-logo.tsx`: Tối ưu CSS font cho slogan để hiển thị sắc nét khi scale to.
  - Kiểm tra typecheck (`tsc --noEmit`), chạy unit tests cho header scroll (`vitest`).
  - Cập nhật tài liệu `a-agentic/features/course-management/dev-history.md`.
- ❌ **Ngoài phạm vi:**
  - Không phá vỡ API auth hay các route logic.

---

## 3. Các bước Thực hiện

- [ ] **Bước 1:** Tinh chỉnh `mindly-logo.tsx` để slogan `MAP YOUR MIND` có độ tương phản và nét chữ tối ưu.
- [ ] **Bước 2:** Cập nhật `public-header.tsx` với các kích thước mới:
  - Header wrapper `h-[68px] sm:h-[72px]`.
  - Logo `h-11 sm:h-12 w-auto`.
  - Nav links `text-[15px] font-medium text-neutral-200`.
  - Search bar `h-11`, input `text-[15px]`.
  - Nút Login / Register `h-10`, `text-[15px]`.
  - Avatar `size-10 sm:size-11`.
  - `topOffset: 72` cho `useSmartHeaderScroll`.
- [ ] **Bước 3:** Chạy typecheck và vitest suite.
- [ ] **Bước 4:** Ghi log dev-history tại `a-agentic/features/course-management/dev-history.md`.

