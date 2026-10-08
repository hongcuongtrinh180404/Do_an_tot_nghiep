# Kế Hoạch Chuẩn Hóa Độ Rộng Container Toàn Bộ Ứng Dụng (Standardize Container Width)

> **Mã kế hoạch:** `PLAN-container-standardization.md`  
> **Mục tiêu:** Đồng bộ độ rộng container của tất cả các màn hình (Chi tiết khóa học, Quản lý khóa học, Tạo khóa học, Hồ sơ cá nhân, và cả Trang chủ Landing Page) theo kích thước chuẩn công thái học của trang **Chi tiết bài học** (`max-w-[1440px] 2xl:max-w-[1536px]`).  
> **Phạm vi xác nhận:** Toàn bộ ứng dụng bao gồm cả Trang chủ (Landing page) và tất cả các trang quản trị / portal.  
> **Trạng thái:** `COMPLETED` (Đã hoàn thành và kiểm thử thành công).

---

## 1. Hiện Trạng & Vấn Đề (Problem Statement)

- **Trang Chi tiết bài học** (`/instructor/courses/[id]/lessons/[lessonId]`):
  - Sử dụng chuẩn độ rộng container: `w-full max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-6`.
  - Không gian thoáng đãng, tỉ lệ hiển thị cân đối hoàn hảo trên màn hình Laptop FHD (1440px–1536px) và màn hình nhỏ (1280px–1366px).
- **Trang Chi tiết khóa học** (`/instructor/courses/[id]`) và các trang khác (Trang chủ, Hồ sơ, Quản lý khóa học):
  - Đang bị giới hạn ở `max-w-5xl` (tương đương `1024px`).
  - Gây ra sự hụt hẫng thị giác khi người dùng chuyển qua lại giữa trang Chi tiết khóa học và xem trước Bài giảng (chênh lệch từ ~400px đến ~512px bề ngang).
  - Khung nội dung, danh sách chương học và Inspector panel bị bó hẹp trong 1024px, gây cảm giác chật chội trên màn hình máy tính.

---

## 2. Tiêu Chuẩn Chuẩn Hóa (Target Standard)

Tất cả các container giao diện chính sẽ dùng chung một quy chuẩn lớp Tailwind CSS:

```tsx
className="w-full max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6"
```

### Bảng Kích thước Phân bổ theo Viewport:

| Loại màn hình | Viewport Width | Độ rộng Container hiển thị | Padding ngang |
| :--- | :--- | :--- | :--- |
| **Laptop nhỏ / Tablet** | `1280px - 1366px` | Toàn chiều rộng (100%) | `px-6` (24px mỗi bên) |
| **Laptop Full HD** | `1440px - 1535px` | `1440px` | `px-6` (24px mỗi bên) |
| **Màn hình lớn / 2K** | `1536px+` | `1536px` | `px-6` (24px mỗi bên) |

---

## 3. Danh Sách Tệp Tin Cần Cập Nhật (Impacted Files)

```text
frontend/src/
├── features/course/components/
│   ├── course-detail-content.tsx       # [UPDATE] Thay max-w-5xl thành max-w-[1440px] 2xl:max-w-[1536px] (error & main view)
│   ├── course-detail-skeleton.tsx      # [UPDATE] Thay max-w-5xl thành max-w-[1440px] 2xl:max-w-[1536px]
│   └── course-management-content.tsx   # [UPDATE] Thay max-w-5xl thành max-w-[1440px] 2xl:max-w-[1536px]
├── features/profile/components/
│   └── profile-page-content.tsx        # [UPDATE] Thay max-w-5xl thành max-w-[1440px] 2xl:max-w-[1536px]
└── app/
    ├── instructor/courses/new/
    │   └── page.tsx                    # [UPDATE] Thay max-w-5xl thành max-w-[1440px] 2xl:max-w-[1536px]
    └── page.tsx (Trang chủ)            # [UPDATE] Thay max-w-5xl thành max-w-[1440px] 2xl:max-w-[1536px] (header, content, footer)
```

---

## 4. Phân Rã Nhiệm Vụ Chi Tiết (Task Breakdown)

### Task 1: Chuẩn hóa Trang Chi Tiết Khóa Học & Skeleton
- **Agent**: `frontend-specialist`
- **Tệp tin**:
  - `frontend/src/features/course/components/course-detail-content.tsx` (Dòng 92 và 144)
  - `frontend/src/features/course/components/course-detail-skeleton.tsx` (Dòng 6)
- **Thực hiện**:
  - Đổi `max-w-5xl` ➔ `max-w-[1440px] 2xl:max-w-[1536px]`.
  - Đảm bảo thẻ thông tin tổng quan, video trailer/thumbnail và cây chương học hiển thị thoáng đãng và thẳng hàng với trang phát bài giảng.

### Task 2: Chuẩn hóa Trang Quản Lý Khóa Học & Tạo Khóa Học Mới
- **Agent**: `frontend-specialist`
- **Tệp tin**:
  - `frontend/src/features/course/components/course-management-content.tsx` (Dòng 17)
  - `frontend/src/app/instructor/courses/new/page.tsx` (Dòng 13)
- **Thực hiện**:
  - Đổi `max-w-5xl` ➔ `max-w-[1440px] 2xl:max-w-[1536px]`.
  - Giữ bố cục form tạo khóa học và danh sách khóa học cân đối.

### Task 3: Chuẩn hóa Trang Hồ Sơ Cá Nhân (Profile Page)
- **Agent**: `frontend-specialist`
- **Tệp tin**:
  - `frontend/src/features/profile/components/profile-page-content.tsx` (Dòng 59)
- **Thực hiện**:
  - Đổi `max-w-5xl` ➔ `max-w-[1440px] 2xl:max-w-[1536px]`.

### Task 4: Chuẩn hóa Trang Chủ (Landing Page)
- **Agent**: `frontend-specialist`
- **Tệp tin**:
  - `frontend/src/app/page.tsx` (Dòng 29: Header, Dòng 99: Main grid, Dòng 235: Footer)
- **Thực hiện**:
  - Đổi `max-w-5xl` ➔ `max-w-[1440px] 2xl:max-w-[1536px]`.
  - Mở rộng bố cục giới thiệu và đăng nhập/đăng ký để tạo ấn tượng trực quan mạnh mẽ.

### Task 5: Kiểm tra và Đồng bộ Living Documentation
- **Tệp tin**: `a-agentic/features/course-management/dev-history.md`
- **Thực hiện**: Ghi lại quy chuẩn container mới cho toàn bộ hệ thống.

---

## 5. Tiêu Chí Nghiệm Thu (Success Criteria)

1. **Đồng bộ 100% kích thước**: Khi chuyển đổi qua lại giữa bất kỳ trang nào (Trang chủ, Quản lý khóa học, Chi tiết khóa học, Xem trước bài giảng), các lề biên trái và phải thẳng hàng tuyệt đối.
2. **Không phá vỡ bố cục bên trong**:
   - Thẻ thông tin khóa học (Hero Overview Card), danh sách chương học (Tree view & Mindmap view) co giãn mượt mà.
   - Thẻ danh sách khóa học (`CourseCard`) và Grid trên trang chủ sắp xếp ngay ngắn.
3. **Kiểm thử chất lượng**:
   - `pnpm --filter frontend exec tsc --noEmit` đạt 0 lỗi.
   - `pnpm --filter frontend exec eslint` đạt 0 lỗi.

---

## 6. Giai Đoạn Kiểm Thử (Phase X Checklist)

- [x] **Type Check**: TypeScript kiểm tra toàn bộ frontend không có lỗi (`tsc --noEmit` exit code 0).
- [x] **Lint Check**: ESLint thông qua 100% không cảnh báo (`eslint` exit code 0).
- [x] **Align Verification**: Lề container của tất cả các trang (Chi tiết khóa học, Quản lý khóa học, Tạo khóa học, Hồ sơ cá nhân, Trang chủ và Chi tiết bài học) đồng bộ chính xác tại `max-w-[1440px] 2xl:max-w-[1536px]`.
- [x] **Responsive Verification**: Đạt chuẩn trên cả 1280px, 1366px, 1440px và 1536px.

