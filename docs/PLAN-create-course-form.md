# PLAN: Create Course Form UI (`/instructor/courses/new`)

> **Mục tiêu:**
> 1. Khởi tạo route chuẩn Next.js App Router cho Form tạo khóa học: `/instructor/courses/new` (`frontend/src/app/instructor/courses/new/page.tsx`).
> 2. Xây dựng Form UI chuyên nghiệp, trực quan dành cho Giảng viên nhập thông tin cơ bản của khóa học.
> 3. Tích hợp validation chặt chẽ ở Frontend bằng `react-hook-form` + `zod` (`@hookform/resolvers/zod`), đồng bộ với quy chuẩn nghiệp vụ và schema Backend (`CreateCourseDto`).
> 4. Cung cấp các trường nhập liệu chính xác:
>    - `title`: Bắt buộc, 3 - 200 ký tự, whitespace normalized.
>    - `slug`: Bắt buộc, kebab-case (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`), hỗ trợ tự động sinh slug từ tiêu đề (auto-slugify tiếng Việt).
>    - `shortDescription`: Tùy chọn, tối đa 500 ký tự.
>    - `description`: Tùy chọn, mô tả chi tiết bài học.
>    - `price`: Tùy chọn, kiểu số, giá trị >= 0 (mặc định 0 - miễn phí).
>    - `level`: Tùy chọn, dropdown chọn cấp độ từ `CourseLevelEnum` (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `ALL_LEVELS`).
> 5. Cung cấp trạng thái validation / thông báo lỗi trực quan (`aria-invalid`, text đỏ thân thiện, helper text).
> 6. Cung cấp nút **"Hủy"** quay trở lại danh sách `/instructor/courses` mà không lưu.
> 7. Cung cấp nút **"Tạo khóa học"** (Submit) chuẩn bị sẵn dữ liệu (trigger validation, hiển thị toast xem trước, **tuyệt đối chưa gọi API**).
> 8. Kết nối nút "Tạo khóa học" tại trang danh sách `/instructor/courses` (cả ở `CourseHeader` và `CourseEmptyState`) điều hướng mượt mà sang `/instructor/courses/new`.
> 9. Tuân thủ nghiêm ngặt **Purple Ban** (cấm dùng màu tím), **Typography Rule** (không dùng inline font class), tái sử dụng design tokens của hệ thống.
> 10. Chạy đầy đủ các bộ kiểm tra: Type-check (`tsc --noEmit`), Lint (`eslint src/`), và test suites toàn repo (`pnpm test`).
>
> **Task Slug:** `create-course-form`  
> **Primary Agent:** `project-planner`  
> **Executing Agent:** `frontend-specialist`  
> **Skills:** `clean-code`, `frontend-design`, `react-best-practices`

---

## 1. Phân Tích Kỹ Thuật & Khảo Sát Hiện Trạng (Technical Survey & Spec Analysis)

### 1.1. Hiện trạng Mã nguồn & Giao diện

- **Trang hiện có:**
  - Route `/instructor/courses` (`frontend/src/app/instructor/courses/page.tsx`):
    - Đã có `CourseHeader` với nút "Tạo khóa học" (chưa nối link).
    - Đã có `CourseEmptyState` với nút CTA "Tạo khóa học" (chưa nối link).
- **Thư viện Form & Validation:**
  - `react-hook-form` (v7.88.0) và `zod` (v4.6.5) đã được cài đặt trong `frontend/package.json`.
  - `@hookform/resolvers/zod` đã sẵn sàng (đã áp dụng trong `frontend/src/features/auth/components/login-form.tsx`).
- **UI Primitives hiện có (`frontend/src/components/ui/`):**
  - `button.tsx`: Hỗ trợ đầy đủ biến thể (`default`, `outline`, `secondary`, `ghost`, v.v.).
  - `card.tsx`: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
  - `input.tsx`: `@base-ui/react/input` kết hợp class Tailwind v4 (`border-input`, `focus-visible:ring-ring`, `aria-invalid:border-destructive`).
  - `label.tsx`: Gắn nhãn form chuẩn accessibility.
  - `icon.tsx`: Wrapper `@iconify/react` với icon Lucide (`lucide:arrow-left`, `lucide:plus`, `lucide:sparkles`, `lucide:book-open`, v.v.).
- **Thành phần còn thiếu cần bổ sung:**
  - `textarea.tsx`: Dành cho `shortDescription` và `description`. Cần tạo `@/components/ui/textarea.tsx` kế thừa cùng design token và animation giống `Input`.

---

### 1.2. Đặc Tả Dữ Liệu & Form Schema (`create-course.schema.ts`)

File: `frontend/src/features/course/schemas/create-course.schema.ts`

```typescript
import { z } from 'zod';
import { CourseLevelEnum } from 'share-lib';

export const createCourseSchema = z.object({
  title: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(1, 'Tiêu đề khóa học không được để trống')
        .min(3, 'Tiêu đề khóa học phải có ít nhất 3 ký tự')
        .max(200, 'Tiêu đề khóa học không được vượt quá 200 ký tự')
    ),
  slug: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .pipe(
      z
        .string()
        .min(1, 'Đường dẫn tĩnh (slug) không được để trống')
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          'Slug chỉ được chứa chữ thường, số và dấu gạch ngang (ví dụ: lap-trinh-reactjs)'
        )
    ),
  shortDescription: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().max(500, 'Mô tả ngắn không được vượt quá 500 ký tự'))
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .transform((val) => val.trim())
    .optional()
    .or(z.literal('')),
  price: z.coerce
    .number({ message: 'Giá khóa học phải là một số hợp lệ' })
    .min(0, 'Giá khóa học không được âm (nhập 0 nếu là khóa học miễn phí)')
    .default(0),
  level: z
    .nativeEnum(CourseLevelEnum, {
      message: 'Vui lòng chọn cấp độ khóa học hợp lệ',
    })
    .default(CourseLevelEnum.ALL_LEVELS),
});

export type CreateCourseFormData = z.infer<typeof createCourseSchema>;
```

---

### 1.3. Trải Nghiệm Người Dùng (UX Decisions & Enhancements)

1. **Auto-slugify thông minh**:
   - Khi giảng viên gõ Tiêu đề (ví dụ: `Khóa học Next.js 16 Cơ bản`), form tự động gợi ý slug chuẩn SEO không dấu (`khoa-hoc-nextjs-16-co-ban`).
   - Giảng viên có toàn quyền tự do gõ sửa đè lên slug nếu muốn tùy biến riêng.
2. **Chọn Cấp độ (`level`)**:
   - Cung cấp dropdown chọn trực quan với nhãn tiếng Việt thân thiện:
     - `ALL_LEVELS` -> `Mọi cấp độ (Phù hợp tất cả mọi người)`
     - `BEGINNER` -> `Cơ bản (Dành cho người mới bắt đầu)`
     - `INTERMEDIATE` -> `Trung cấp (Đã có kiến thức nền tảng)`
     - `ADVANCED` -> `Nâng cao (Chuyên sâu)`
3. **Phản hồi Submit (Chưa nối API)**:
   - Khi bấm "Tạo khóa học" (Submit):
     - Form kích hoạt validation toàn bộ trường.
     - Nếu có lỗi: hiển thị highlight viền đỏ + thông điệp lỗi chi tiết.
     - Nếu hợp lệ: hiển thị thông báo `toast.success("Thông tin khóa học hợp lệ! (Chế độ preview - chưa kết nối API)")` từ thư viện `sonner`, in dữ liệu ra `console.log('[Form Preview]', data)`.
4. **Nút Hủy**:
   - Nút "Hủy" kiểu `variant="outline"` hoặc `variant="ghost"`, dùng `<Link href="/instructor/courses">` để quay lại trang quản lý an toàn.

---

## 2. Kế Hoạch Thay Đổi Tập Tin (Proposed File Changes)

### 2.1. Thành phần UI dùng chung (`frontend/src/components/ui/`)

#### [NEW] `frontend/src/components/ui/textarea.tsx`
- Component `Textarea` chuẩn hóa thiết kế kế thừa từ kiểu dáng `Input`:
  - Viền `border-input`, bo góc `rounded-lg`, nền trong suốt / thẻ `bg-transparent`.
  - Trạng thái focus: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`.
  - Trạng thái invalid: `aria-invalid:border-destructive aria-invalid:ring-destructive/20`.
  - Phù hợp nhập liệu văn bản nhiều dòng cho `shortDescription` và `description`.

---

### 2.2. Module Khóa học (`frontend/src/features/course/`)

#### [NEW] `frontend/src/features/course/schemas/create-course.schema.ts`
- Định nghĩa schema Zod xác thực dữ liệu đầu vào chuẩn hóa (whitespace trimming, lowercase slug, price >= 0, level enum).
- Xuất kiểu dữ liệu `CreateCourseFormData`.

#### [NEW] `frontend/src/features/course/utils/slugify.ts`
- Tiện ích chuyển đổi chuỗi tiếng Việt có dấu thành slug kebab-case chuẩn:
  - Loại bỏ dấu tiếng Việt (`á, à, ả, ã, ạ` -> `a`, `đ` -> `d`, v.v.).
  - Xóa ký tự đặc biệt, chuyển khoảng trắng thành `-`.

#### [NEW] `frontend/src/features/course/components/create-course-form.tsx`
- Client Component (`'use client'`) quản lý biểu mẫu tạo khóa học:
  - Sử dụng `useForm<CreateCourseFormData>` với `zodResolver(createCourseSchema)`.
  - Tự động điền slug khi gõ tiêu đề (nếu slug chưa bị can thiệp thủ công).
  - Bố cục lưới responsive 2 cột (Title + Slug, Price + Level, Short Description, Full Description).
  - Nút hành động ở chân trang: Nút "Hủy" và Nút "Tạo khóa học".

#### [NEW] `frontend/src/features/course/components/create-course-header.tsx`
- Header cho trang tạo khóa học:
  - Breadcrumb: Trang Chủ / Giảng Viên / Khóa Học Của Tôi / Tạo Mới.
  - Tiêu đề: "Tạo khóa học mới".
  - Nút "Quay lại" (`lucide:arrow-left`) trỏ về `/instructor/courses`.

#### [MODIFY] `frontend/src/features/course/components/course-header.tsx`
- Cập nhật nút "Tạo khóa học" chuyển thành `<Link href="/instructor/courses/new">` với `buttonVariants({ size: 'sm' })`.

#### [MODIFY] `frontend/src/features/course/components/course-empty-state.tsx`
- Cập nhật nút "Tạo khóa học" trong Empty State thành `<Link href="/instructor/courses/new">` với `buttonVariants()`.

#### [MODIFY] `frontend/src/features/course/index.ts`
- Barrel export bổ sung `CreateCourseForm`, `CreateCourseHeader`, `createCourseSchema`, `slugify`.

---

### 2.3. App Router Pages (`frontend/src/app/`)

#### [NEW] `frontend/src/app/instructor/courses/new/page.tsx`
- React Server Component làm page shell:
  - SEO Metadata: Title `"Tạo khóa học mới | DATN Portal"`, Description `"Tạo và thiết lập thông tin cơ bản cho khóa học mới"`.
  - Render layout container nhất quán với padding chuẩn responsive:
    - `<CreateCourseHeader />`
    - `<CreateCourseForm />`

---

## 3. Danh Sách Nhiệm Vụ Chi Tiết (Task Breakdown)

| Task ID | Nhiệm Vụ | Chi Tiết Thực Hiện | Verification |
| :--- | :--- | :--- | :--- |
| **TASK-01** | Tạo UI Primitive `Textarea` | `frontend/src/components/ui/textarea.tsx` | Export hoạt động, style đồng bộ với `Input` |
| **TASK-02** | Xây dựng Schema Zod & Tiện ích Slug | `frontend/src/features/course/schemas/create-course.schema.ts`<br/>`frontend/src/features/course/utils/slugify.ts` | Type inference chính xác, validate đúng quy tắc |
| **TASK-03** | Xây dựng Component Header & Form UI | `frontend/src/features/course/components/create-course-header.tsx`<br/>`frontend/src/features/course/components/create-course-form.tsx` | Form render đủ 6 trường, hiển thị lỗi rõ ràng |
| **TASK-04** | Cập nhật liên kết nút Tạo khóa học | `frontend/src/features/course/components/course-header.tsx`<br/>`frontend/src/features/course/components/course-empty-state.tsx` | Bấm chuyển hướng ngay sang `/instructor/courses/new` |
| **TASK-05** | Khởi tạo Route `/instructor/courses/new` | `frontend/src/app/instructor/courses/new/page.tsx` | Truy cập route trả về 200 OK, render đầy đủ form |
| **TASK-06** | Export Barrel & Kiểm thử hoàn chỉnh | `frontend/src/features/course/index.ts`<br/>Chạy typecheck, linting, và tests | 0 lint error, 0 type error, toàn bộ test passed |

---

## 4. Ranh Giới Nghiêm Ngặt (Strict Boundaries Checklist)

| Ranh giới | Trạng thái |
| :--- | :--- |
| ❌ Không gọi API (`axios`, `fetch`) | Tuyệt đối tuân thủ |
| ❌ Không React Query (`useMutation`, `useQuery`) | Tuyệt đối tuân thủ |
| ❌ Không upload thumbnail (Cloudinary) | Để dành cho milestone sau |
| ❌ Không edit / delete / publish | Để dành cho milestone sau |
| ❌ Không lesson / video / mindmap | Để dành cho milestone sau |
| ❌ Không sửa homepage `app/page.tsx` | Tuyệt đối giữ nguyên |
| 🎨 Không dùng màu tím (Purple Ban) | Dùng bảng màu Zinc/Slate/Emerald/Sky |
| 🔤 Không dùng inline font classes | Kế thừa hoàn toàn từ `globals.css` |

---

## 5. Kế Hoạch Xác Minh & Kiểm Thử (Phase X Verification Plan)

1. **Frontend Linting**:
   ```bash
   pnpm --filter frontend lint
   ```
2. **Frontend Type-check**:
   ```bash
   pnpm --filter frontend exec tsc --noEmit
   ```
3. **Toàn bộ Unit Tests Monorepo**:
   ```bash
   pnpm test
   ```
4. **Kiểm tra Next.js Build**:
   ```bash
   pnpm --filter frontend build
   ```
5. **Runtime Verification**:
   - Truy cập `http://localhost:3000/instructor/courses` -> Click "Tạo khóa học" -> Điều hướng sang `http://localhost:3000/instructor/courses/new`.
   - Kiểm tra validation: Bấm "Tạo khóa học" khi để trống -> Báo lỗi đỏ tại `title` và `slug`.
   - Nhập tiêu đề tiếng Việt -> Xem slug tự động điền không dấu.
   - Nhập giá âm (`-1000`) -> Báo lỗi "Giá khóa học không được âm".
   - Bấm nút "Hủy" -> Quay lại `/instructor/courses`.
   - Điền đầy đủ hợp lệ và Submit -> Toast thông báo xem trước dữ liệu hợp lệ.

---

## ✅ PHASE X COMPLETE

- **ESLint Check (`pnpm --filter frontend lint`)**: ✅ Passed (0 error, 0 warning)
- **TypeScript Check (`pnpm --filter frontend exec tsc --noEmit`)**: ✅ Passed (0 type error)
- **Next.js Production Build (`pnpm --filter frontend build`)**: ✅ Passed (Route `/instructor/courses/new` prerendered statically)
- **Monorepo Test Suites (`pnpm test`)**: ✅ Passed (13 test files, 90 tests passed)
