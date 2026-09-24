# PLAN: Instructor Course Management Page (Milestone 1 — UI & Route Foundation)

> **Mục tiêu:**
> 1. Thiết lập cấu trúc module frontend chuẩn cho tính năng Quản lý khóa học: `frontend/src/features/course/`.
> 2. Khởi tạo route chuẩn Next.js App Router cho Giảng viên quản lý khóa học: `/instructor/courses` (`frontend/src/app/instructor/courses/page.tsx`).
> 3. Xây dựng giao diện trang Quản lý khóa học cho Instructor tuân thủ tuyệt đối Design System, Design Tokens hiện có (`@/components/ui/button`, `@/components/ui/card`, `@/components/ui/icon`, Tailwind CSS v4, OKLCH color palette).
> 4. Hiển thị tiêu đề chuẩn: **"Khóa học của tôi"** kèm mô tả chức năng và breadcrumb điều hướng.
> 5. Cung cấp nút hành động **"Tạo khóa học"** với icon trực quan.
> 6. Cung cấp trạng thái trống (**Empty State**) khi giảng viên chưa có khóa học nào, hướng dẫn bắt đầu soạn bài giảng.
> 7. Tuyệt đối **CHƯA** gọi API, **CHƯA** làm form tạo khóa học, **CHƯA** làm upload thumbnail, **CHƯA** làm edit/delete/publish trong milestone này.
> 8. Tuân thủ nghiêm ngặt **Purple Ban** (cấm màu tím) và **Typography Rule** (không dùng inline font classes `font-sans`, `font-serif`).
> 9. Đảm bảo giao diện Responsive từ thiết bị di động (Mobile), máy tính bảng (Tablet) đến màn hình lớn (Desktop).
> 10. Kiểm tra route hoạt động và vượt qua toàn bộ Type-check (`tsc --noEmit`) và Linting (`eslint src/`).
>
> **Task Slug:** `course-management-page`  
> **Primary Agent:** `project-planner`  
> **Executing Agent:** `frontend-specialist`  
> **Skills:** `clean-code`, `frontend-design`, `react-best-practices`

---

## 1. Phân Tích Kỹ Thuật & Khảo Sát Hiện Trạng (Architecture & Survey Analysis)

### 1.1. Hiện trạng Frontend của Dự án

Dựa trên khảo sát cấu trúc mã nguồn tại `frontend/`:
- **Framework & Core:** Next.js 16 (App Router), React 19, TypeScript 5.
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"; @import "shadcn/tailwind.css";`), theme biến màu sắc dùng không gian màu OKLCH (`--background`, `--foreground`, `--primary`, `--muted`, `--card`, v.v.).
- **Typography:** Cấu hình toàn cục qua Roboto và Roboto Mono trong `app/layout.tsx`. Tuyệt đối cấm inline font classes (`font-sans`, `font-serif`).
- **Primitves & Components:**
  - `@/components/ui/button.tsx`: Cung cấp `Button` và `buttonVariants` (`variant`: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`; `size`: `default`, `sm`, `lg`, `icon`, v.v.).
  - `@/components/ui/card.tsx`: Cung cấp `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
  - `@/components/ui/icon.tsx`: Wrapper cho `@iconify/react` (dùng icon dạng `lucide:book-open`, `lucide:plus`, `lucide:home`, v.v.).
- **Cấu trúc Feature-based:** Toàn bộ tính năng tự đóng gói trong `src/features/{feature}/` (`auth/`, `profile/`, và sắp tới là `course/`). Mỗi feature có:
  - `components/`: Các components UI trực quan.
  - `types/`: Types và interfaces nội bộ hoặc mở rộng từ `share-lib`.
  - `index.ts`: Public API export của feature module.
- **Route hiện tại trong `app/`:**
  - `app/page.tsx`: Landing page / Dashboard tổng quan.
  - `app/(auth)/login/page.tsx`: Đăng nhập.
  - `app/(auth)/register/page.tsx`: Đăng ký.
  - `app/profile/page.tsx`: Hồ sơ cá nhân.

---

### 1.2. Quyết Định Thiết Kế Định Tuyến (Routing Convention Rationale)

Tại sao chọn route `/instructor/courses` thay vì `/courses` hay `/my-courses`?

| Phương án Route | Phân tích ưu/nhược điểm | Đánh giá |
| :--- | :--- | :--- |
| **`/instructor/courses`** (Được chọn) | Phân tách rành mạch theo vai trò người dùng trong hệ thống (`RoleEnum.INSTRUCTOR`). Đúng chuẩn RESTful và nghiệp vụ LMS/E-learning: dành riêng cho Giảng viên tạo và quản lý nội dung. Các sub-routes tương lai sẽ rất sạch: `/instructor/courses/new`, `/instructor/courses/[id]/edit`, `/instructor/courses/[id]/lessons`. | **Khuyến nghị & Phù hợp nhất** |
| `/courses` | Theo tài liệu kiến trúc `a-agentic/features/course-management/tech-spec.md`, endpoint `GET /api/v1/courses` là Public Course Catalog dành cho học viên và khách vãng lai khám phá khóa học. Nếu dùng `/courses` cho trang quản lý của giảng viên sẽ gây xung đột về ranh giới trải nghiệm người dùng. | Không nên dùng cho CMS giảng viên |
| `/my-courses` | Thường được hiểu là trang "Khóa học đã đăng ký / đã mua của tôi" dành cho học viên (`STUDENT/USER`) theo dõi tiến độ học tập. | Dành cho học viên |

**Kết luận:** Tạo route tại:  
`frontend/src/app/instructor/courses/page.tsx` -> URL: `http://localhost:3000/instructor/courses`.

---

### 1.3. Cấu Trúc Thành Phần Giao Diện (UI Composition)

Trang Quản lý khóa học gồm các khu vực chính:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Trang Chủ  /  Giảng Viên  /  Khóa Học Của Tôi              │
├────────────────────────────────────────────────────────────────────────┤
│ Page Header:                                                           │
│   Khóa học của tôi                          [ + Tạo khóa học ]         │
│   Quản lý, biên soạn nội dung và theo dõi                              │
│   tiến độ các khóa học bạn đang giảng dạy                              │
├────────────────────────────────────────────────────────────────────────┤
│ Toolbar / Summary Badges:                                              │
│   Tổng số: 0 khóa học  •  Trạng thái: Bản nháp (0) / Đã xuất bản (0)   │
├────────────────────────────────────────────────────────────────────────┤
│ Main View Area:                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                                                                │   │
│   │                      [ Icon: Lucide BookOpen ]                 │   │
│   │                                                                │   │
│   │                  Chưa Có Khóa Học Nào                          │   │
│   │                                                                │   │
│   │    Bạn chưa tạo khóa học nào. Hãy bắt đầu xây dựng bài giảng  │   │
│   │    và chia sẻ kiến thức ngay hôm nay bằng cách tạo khóa học.   │   │
│   │                                                                │   │
│   │                     [ + Tạo khóa học đầu tiên ]                │   │
│   │                                                                │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Kế Hoạch Thay Đổi Tập Tin (Proposed File Changes)

### 2.1. Feature Module `frontend/src/features/course/`

#### [NEW] `frontend/src/features/course/types/course.types.ts`
- Định nghĩa view types cho khóa học phục vụ hiển thị UI (kế thừa các trường từ `ICourse` trong `share-lib`).
- Định nghĩa props cho các component hiển thị danh sách và empty state.

#### [NEW] `frontend/src/features/course/components/course-empty-state.tsx`
- Component hiển thị khi danh sách khóa học rỗng.
- Bao gồm:
  - Icon minh họa trực quan trong khung viền mềm mại (`lucide:book-open` hoặc `lucide:folder-plus`).
  - Tiêu đề "Chưa có khóa học nào".
  - Đoạn văn mô tả hướng dẫn giảng viên.
  - Nút CTA "Tạo khóa học ngay" (đồng bộ hành động với nút trên header).
- Tuân thủ quy tắc: Không màu tím (Purple Ban), dùng tokens chuẩn (`text-muted-foreground`, `bg-muted/50`, `border-border/60`).

#### [NEW] `frontend/src/features/course/components/course-header.tsx`
- Header của trang gồm:
  - Breadcrumb định hướng: Trang Chủ / Giảng Viên / Khóa Học Của Tôi.
  - Tiêu đề chính: "Khóa học của tôi".
  - Mô tả phụ giải thích ngữ cảnh quản lý.
  - Nút bấm chính "Tạo khóa học" với icon `lucide:plus`.
  - Nút điều hướng phụ quay về Trang Chủ ("Về Trang Chủ" với `lucide:arrow-left`).

#### [NEW] `frontend/src/features/course/components/course-management-content.tsx`
- Client Component container chính điều phối trang:
  - Quản lý trạng thái local hiện tại (`courses = []` do chưa gọi API).
  - Kết nối Header, Quick Stats/Filter bar, và `CourseEmptyState`.
  - Xử lý tương tác khi bấm "Tạo khóa học": hiển thị thông báo toast thân thiện (`sonner`) thông báo tính năng Form tạo khóa học sẽ được mở trong Milestone tiếp theo, không để nút bị đơ hoặc lỗi.

#### [NEW] `frontend/src/features/course/index.ts`
- Barrel export file xuất bản các component và types ra ngoài cho `app/` sử dụng.

---

### 2.2. App Router Pages `frontend/src/app/`

#### [NEW] `frontend/src/app/instructor/courses/page.tsx`
- React Server Component (RSC) làm page shell theo chuẩn kiến trúc:
  - Khai báo Metadata SEO chuẩn:
    - Title: `"Khóa học của tôi | DATN Portal"`
    - Description: `"Quản lý và biên soạn danh sách khóa học dành cho Giảng viên"`
  - Render thẻ `<main>` với layout viewport và padding chuẩn responsive.
  - Tích hợp `<CourseManagementContent />`.

#### [MODIFY] `frontend/src/app/page.tsx` (Tùy chọn bổ trợ điều hướng)
- Bổ sung liên kết nhanh đến route `/instructor/courses` trong Header hoặc khu vực tác vụ của người dùng trên trang chủ để dễ dàng kiểm thử và di chuyển giữa các trang.

---

## 3. Quy Tắc Tuân Thủ & Ràng Buộc Kỹ Thuật (Strict Rules Compliance)

| Quy tắc | Yêu cầu thực thi | Kiểm tra |
| :--- | :--- | :--- |
| **No API Calls** | Tuyệt đối không import axios, không gọi `useQuery` hay fetch dữ liệu từ backend trong milestone này. Khởi tạo danh sách bằng mảng rỗng `const courses: ICourseItem[] = []`. | Đạt |
| **No Form / No Thumbnail / No CRUD** | Không tạo modal form nhập liệu, không làm logic upload ảnh lên Cloudinary, không làm nút xóa/sửa/xuất bản. | Đạt |
| **Purple Ban** | Không dùng bất kỳ mã màu tím nào (`violet-*`, `purple-*`, `fuchsia-*`, hex `#800080` v.v.). Sử dụng bảng màu Zinc/Slate/Emerald/Sky theo theme hiện có. | Đạt |
| **Typography Rule** | Không dùng inline `font-sans`, `font-serif` hay thuộc tính `font-family` CSS. Toàn bộ typography thừa hưởng từ `globals.css` và biến CSS. | Đạt |
| **Design System Reuse** | Chỉ sử dụng các components trong `@/components/ui/` (`Button`, `Card`, `Icon`) và các tiện ích `cn()`. Không cài đặt thêm bất kỳ thư viện UI nào khác. | Đạt |
| **Responsive** | Thiết kế linh hoạt với các breakpoint `sm:`, `md:`, `lg:`, đảm bảo hiển thị đẹp trên mọi kích thước màn hình. | Đạt |

---

## 4. Kế Hoạch Xác Minh & Kiểm Thử (Phase X Verification Plan)

### 4.1. Kiểm tra tĩnh (Static Code Quality)
1. **Linting Check**:
   ```bash
   pnpm --filter frontend lint
   ```
   - Đảm bảo 0 warning, 0 error từ ESLint.
2. **TypeScript Compilation (Type-check)**:
   ```bash
   npx --prefix frontend tsc --noEmit
   ```
   - Xác nhận không có lỗi kiểu dữ liệu (Strict typing, không dùng `any`).

### 4.2. Kiểm tra đóng gói (Production Build)
```bash
pnpm --filter frontend build
```
- Đảm bảo Next.js build thành công route `/instructor/courses` dưới dạng Static/Prerendered hoặc Server route không gặp lỗi SSR.

### 4.3. Kiểm tra hiển thị & Luồng người dùng (Runtime Verification)
- Truy cập trực tiếp đường dẫn `http://localhost:3000/instructor/courses`.
- Xác nhận các thành phần:
  1. Header hiển thị đúng tiêu đề "Khóa học của tôi".
  2. Nút "Tạo khóa học" hiển thị rõ ràng, chuẩn phong cách nút chính (Primary Button).
  3. Khu vực nội dung hiển thị đúng Empty State với thông điệp khuyến khích giảng viên tạo bài giảng.
  4. Bấm nút "Tạo khóa học" phản hồi mượt mà qua thông báo toast.
  5. Thử nghiệm thay đổi kích thước trình duyệt (Responsive): bố cục co dãn mượt mà trên mobile và desktop.

---

## 5. Câu Hỏi Mở & Điểm Cần Lưu Ý (Open Decisions & Edge Cases)

> [!NOTE]
> 1. **Route URL**: Route được thống nhất là `/instructor/courses`.
> 2. **Nút "Tạo khóa học"**: Được thiết kế thuần UI với `<Button size="sm">` và icon `lucide:plus`, sẵn sàng gắn sự kiện hoặc trigger modal trong milestone xây dựng form.
> 3. **Trang Chủ**: Giữ nguyên `frontend/src/app/page.tsx` theo đúng chỉ đạo.

---

## ✅ PHASE X COMPLETE

- **ESLint Check (`pnpm --filter frontend lint`)**: ✅ Passed (0 error, 0 warning)
- **TypeScript Check (`pnpm --filter frontend exec tsc --noEmit`)**: ✅ Passed (0 type error)
- **Next.js Production Build (`pnpm --filter frontend build`)**: ✅ Passed (Route `/instructor/courses` prerendered statically)
- **Runtime Verification (`http://localhost:3000/instructor/courses`)**: ✅ Passed (200 OK, render đầy đủ Header, Empty State, Nút Tạo khóa học)
