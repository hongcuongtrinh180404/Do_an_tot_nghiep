# Kế Hoạch Triển Khai: Giao Diện Quản Lý Danh Mục & Phân Loại (Admin Categories)

> [!NOTE]
> **Tài liệu này đã được thay thế.** Kế hoạch mock UI bên dưới đã được thay bằng triển khai
> thật với collection `course_categories`, upload ảnh MinIO và CRUD API. Xem
> `C:\Users\cuong\.opencode\plan\PLAN-course-category-tag.md` cho kế hoạch hiện hành.

> **Mục tiêu:**
> Xây dựng lại hoàn chỉnh giao diện phân hệ **[Quản Lý Danh Mục & Phân Loại | DATN Portal Admin](http://localhost:3000/admin/categories)** theo đúng bản mẫu HTML/CSS do người dùng cung cấp.
> 
> Giao diện đáp ứng đầy đủ các tiêu chuẩn mỹ thuật hiện đại của DATN Portal Admin:
> 1. **Header & Thao tác chính**: Tiêu đề trang "Quản lý Danh mục", dòng mô tả, nút "Thêm danh mục mới" kích hoạt Dialog.
> 2. **Bảng Danh Mục Chuẩn Mực 3 Cột**: Khung bo tròn `rounded-2xl`, ô tìm kiếm nhanh danh mục, nhãn tổng số lượng, bảng hiển thị 3 cột:
>    - **Danh mục**: Biểu tượng icon màu sắc trong khung vuông `w-10 h-10 rounded-xl`, Tên danh mục in đậm, Slug đường dẫn `font-mono text-muted-foreground`.
>    - **Số khóa học**: Pill badge `340 khóa`, `520 khóa`, v.v.
>    - **Thao tác**: Nút Sửa (`lucide:pencil`) và Xóa (`lucide:trash-2`) phản hồi trực quan bằng Toast thông báo mẫu.
> 3. **Modal Dialog Thêm Danh Mục Mới**:
>    - Form nhập Tên danh mục (bắt buộc, tự động đồng bộ hiển thị slug thân thiện SEO `/ten-danh-muc`).
>    - Khung Upload biểu tượng / hình ảnh với hiệu ứng kéo thả, hỗ trợ chọn file ảnh từ máy và xem trước (Preview box: ảnh thu nhỏ, tên file, badge "Sẵn sàng tải lên", nút xóa ảnh).
>    - Nút Hủy và Lưu danh mục (cập nhật danh sách mẫu trên client).
>
> ⚠️ **Phạm vi kỹ thuật:** 100% Client-side UI & Mock Data; thuần hiển thị giao diện mẫu, không can thiệp backend API hay Database mutations.
>
> - **Task Slug:** `admin-categories-ui`
> - **Plan File:** `docs/PLAN-admin-categories-ui.md`
> - **Project Type:** `WEB` (Next.js 15+ App Router, React 19, Tailwind CSS v4)
> - **Primary Agent:** `project-planner`
> - **Executing Agent:** `frontend-specialist`
> - **Skills:** `clean-code`, `frontend-design`, `react-best-practices`, `plan-writing`

---

## 1. Quyết Định Thiết Kế Sau Socratic Gate

Dựa trên phản hồi trực tiếp từ người dùng:
1. **Nút Thao Tác Sửa (Edit Button)**: Chỉ hiển thị Toast thông báo trải nghiệm mẫu khi bấm icon Sửa, chưa cần mở modal sửa phức tạp.
2. **Nút Thao Tác Xóa (Delete Button)**: Thuần giao diện: bấm vào hiển thị Toast thông báo đã xóa giả lập khỏi bảng, không cần popup xác nhận.
3. **Modal Thêm Danh Mục Mới (Add Category Modal)**:
   - Form gồm Tên danh mục (bắt buộc).
   - Tự động sinh Slug URL thân thiện SEO theo Tên danh mục (ví dụ gõ "Lập trình Web" -> tự sinh `/lap-trinh-web`).
   - Khung upload ảnh kéo thả có preview thumbnail ảnh thu nhỏ, tên file và nút gỡ ảnh đúng 100% theo mẫu HTML.
   - Nút Hủy và Lưu danh mục (thêm trực tiếp vào danh sách trên client).

---

## 2. Phân Tích Kỹ Thuật & Yêu Cầu Thiết Kế

### 2.1. Hiện Trạng Route `/admin/categories`

1. **Vị trí hiện tại**:
   - File trang: [`frontend/src/app/(admin)/admin/categories/page.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/app/%28admin%29/admin/categories/page.tsx).
   - Hiện tại trang đang render component giữ chỗ [`AdminTabPlaceholder`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/admin/components/admin-tab-placeholder.tsx).
2. **Kế hoạch chuyển đổi**:
   - Thay thế `AdminTabPlaceholder` bằng component [`CategoriesView`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/admin/categories/components/categories-view.tsx).
   - Module tính năng đặt tại `frontend/src/features/admin/categories/`.

### 2.2. Tuân Thủ Quy Chuẩn Thiết Kế & Quy Tắc Dự Án

1. **Tuân thủ Luật Cấm Màu Tím (Purple Ban)**:
   - Thay thế class `indigo` trong mẫu bằng các tone màu hài hòa: Sky, Pink, Emerald, Amber, Teal.
2. **Icons Hệ Thống**:
   - Chuyển đổi toàn bộ icon FontAwesome trong mẫu sang Iconify chuẩn dự án (`@/components/ui/icon` với tiền tố `lucide:`).
3. **Upload & Preview Client**:
   - Dùng `FileReader.readAsDataURL` để tạo base64 preview ảnh tức thì khi người dùng chọn file từ máy.

---

## 3. Bản Thiết Kế Dữ Liệu Mẫu (Mock Data Contract)

Tạo file: `frontend/src/features/admin/categories/constants/mock-categories.ts`

```typescript
export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  courseCount: number;
  iconName: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
  };
  imageUrl?: string;
}

export const MOCK_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-01',
    name: 'Công nghệ Thông tin & Dữ liệu',
    slug: '/cong-nghe-thong-tin',
    courseCount: 340,
    iconName: 'lucide:code-xml',
    colorScheme: {
      bg: 'bg-sky-50 dark:bg-sky-500/10',
      border: 'border-sky-200/80 dark:border-sky-500/20',
      text: 'text-sky-600 dark:text-sky-400',
    },
  },
  {
    id: 'cat-02',
    name: 'Kinh doanh & Marketing',
    slug: '/kinh-doanh-marketing',
    courseCount: 520,
    iconName: 'lucide:megaphone',
    colorScheme: {
      bg: 'bg-pink-50 dark:bg-pink-500/10',
      border: 'border-pink-200/80 dark:border-pink-500/20',
      text: 'text-pink-600 dark:text-pink-400',
    },
  },
  {
    id: 'cat-03',
    name: 'Tài chính & Đầu tư',
    slug: '/tai-chinh-dau-tu',
    courseCount: 148,
    iconName: 'lucide:trending-up',
    colorScheme: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200/80 dark:border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
  },
  {
    id: 'cat-04',
    name: 'Thiết kế Đồ họa & UI/UX',
    slug: '/thiet-ke-do-hoa',
    courseCount: 177,
    iconName: 'lucide:palette',
    colorScheme: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200/80 dark:border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
    },
  },
  {
    id: 'cat-05',
    name: 'Ngoại ngữ & Kỹ năng mềm',
    slug: '/ngoai-ngu-ky-nang',
    courseCount: 215,
    iconName: 'lucide:languages',
    colorScheme: {
      bg: 'bg-teal-50 dark:bg-teal-500/10',
      border: 'border-teal-200/80 dark:border-teal-500/20',
      text: 'text-teal-600 dark:text-teal-400',
    },
  },
];
```

---

## 4. Cấu Trúc File & Phân Tách Component (Architecture Layout)

```
frontend/src/features/admin/categories/
├── components/
│   ├── categories-view.tsx           # Container chính (Header, Search, Table, Quản lý State Modal)
│   ├── categories-table.tsx          # Bảng danh mục 3 cột (Danh mục, Số khóa học, Thao tác)
│   └── category-modal.tsx            # Dialog Thêm danh mục với Image Upload & Preview
├── constants/
│   └── mock-categories.ts            # Dữ liệu danh mục mẫu
└── index.ts                          # Export module categories

frontend/src/app/(admin)/admin/categories/page.tsx # Render <CategoriesView />
```

---

## 5. Danh Sách Tác Vụ Triển Khai (Task Breakdown)

| Task ID | Tên tác vụ | Phụ trách | Kỹ năng | Độ ưu tiên | Ràng buộc | Tiêu chí nghiệm thu (INPUT → OUTPUT → VERIFY) |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **TASK-01** | Khởi tạo Mock Data & Types Danh Mục | `frontend-specialist` | `clean-code` | P0 | Không | ✅ **Hoàn thành**: `mock-categories.ts` có type interface strict, không `any`. |
| **TASK-02** | Xây dựng Dialog Thêm Danh Mục `CategoryModal` | `frontend-specialist` | `frontend-design` | P1 | TASK-01 | ✅ **Hoàn thành**: Modal backdrop blur, input Tên danh mục, tự động sinh slug SEO, upload ảnh kéo thả có preview và nút xóa ảnh. |
| **TASK-03** | Xây dựng Bảng Danh Mục `CategoriesTable` | `frontend-specialist` | `frontend-design` | P1 | TASK-01 | ✅ **Hoàn thành**: Bảng 3 cột bo góc `rounded-2xl`, hiển thị icon màu, slug monospace, pill badge số khóa học, nút Sửa/Xóa. |
| **TASK-04** | Xây dựng Container `CategoriesView` & Tìm Kiếm | `frontend-specialist` | `frontend-design` | P1 | TASK-02, TASK-03 | ✅ **Hoàn thành**: Quản lý CRUD state trên client: Thêm mới, Sửa, Xóa danh mục kèm toast sonner thông báo mẫu. |
| **TASK-05** | Tích Hợp Vào Route `/admin/categories` | `frontend-specialist` | `react-best-practices` | P2 | TASK-04 | ✅ **Hoàn thành**: Nhúng `<CategoriesView />` vào trang `admin/categories/page.tsx`, `npx tsc --noEmit` pass 100%. |

---

## 6. Phase X: Kế Hoạch Nghiệm Thu & Kiểm Định (Verification Checklist)

- [x] **Khớp 100% bố cục HTML mẫu của người dùng**:
  - Header với tiêu đề "Quản lý Danh mục" và nút "Thêm danh mục mới".
  - Bảng bo tròn `rounded-2xl` viền `border-slate-200/80` (hoặc `border-border/80`).
  - Ô tìm kiếm danh mục có icon kính lúp.
  - Cột 1: Icon box `w-10 h-10 rounded-xl` + Tên danh mục + Slug `/...`.
  - Cột 2: Pill badge `... khóa`.
  - Cột 3: Nút Sửa & Xóa (Toast thông báo mẫu).
- [x] **Modal Thêm Danh Mục**:
  - Mở khi bấm "Thêm danh mục mới".
  - Tự động sinh slug URL khi nhập Tên danh mục.
  - Có khung upload ảnh nét đứt `border-dashed` và preview ảnh sau khi chọn.
  - Nút Hủy đóng modal; nút Lưu thêm danh mục vào bảng và đóng modal.
- [x] **Màu sắc & Purple Ban**:
  - Không có class `purple`, `violet`, `indigo`.
  - Icon thay thế bằng Sky, Pink, Emerald, Amber, Teal.
- [x] **Kiểm tra TypeScript**:
  - `npx tsc --noEmit` đạt 0 lỗi (Exit code 0).

## ✅ PHASE X COMPLETE

- Type Check: ✅ Pass (`npx tsc --noEmit` exit code 0)
- Purple Ban: ✅ Pass (Sky, Pink, Emerald, Amber, Teal)
- Date: 25/10/2026
