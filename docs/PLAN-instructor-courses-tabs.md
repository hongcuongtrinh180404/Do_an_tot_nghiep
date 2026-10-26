# Kế Hoạch Triển Khai: Phân Hệ Quản Lý Khóa Học & Chỉ Số Giảng Viên (Admin User Details - Instructor Mode)

> **Mục tiêu:**
> Mở rộng trang [Chi Tiết Người Dùng | DATN Portal Admin](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/admin/users/components/user-details-view.tsx): Khi tài khoản là **Giảng viên** (`role === RoleEnum.INSTRUCTOR`), hệ thống sẽ tự động kích hoạt chế độ hiển thị chuyên biệt:
> 
> 1. **Khối thẻ tóm tắt nhanh (4 Stat KPI Metric Cards)**:
>    - 📚 **Tổng số khóa học**: 5 khóa ("Đánh giá mức độ đóng góp nội dung của giảng viên cho sàn").
>    - 👥 **Tổng học viên**: 1.420 học viên ("Đo lường mức độ ảnh hưởng và quy mô học sinh đang theo học").
>    - 💰 **Tổng doanh thu tạo ra**: 86.500.000 ₫ (Hoa hồng thực nhận: 60.550.000 ₫) ("Tổng giá trị giao dịch mà giảng viên đã đem về cho nền tảng").
>    - ⭐ **Đánh giá trung bình**: 4.8 / 5.0 ⭐ từ 320 lượt đánh giá ("Đo lường uy tín và chất lượng chuyên môn").
> 2. **Bộ điều hướng 2 Tab (Segment Tabs)**:
>    - **Tab 1: Khóa học giảng dạy** (Teaching): Danh sách các khóa học do giảng viên biên soạn và xuất bản trên sàn (kèm trạng thái duyệt, số học viên, doanh thu, đánh giá).
>    - **Tab 2: Khóa học đã mua** (Learning): Phân hệ theo dõi khóa học học viên đã mua (`UserEnrolledCoursesSection` đã xây dựng).
> 3. **Tương thích ngược (Backward Compatibility)**:
>    - Đối với tài khoản Học viên (`STUDENT`) hoặc Admin, giữ nguyên trải nghiệm phân hệ "Khóa học đã mua" trực quan mà không bị vướng các chỉ số giảng viên.
>
> ⚠️ **Phạm vi kỹ thuật:** 100% Client-side UI & Mock Data; thuần hiển thị giao diện mẫu, không can thiệp backend hay DB mutations.
>
> - **Task Slug:** `instructor-courses-tabs`
> - **Plan File:** `docs/PLAN-instructor-courses-tabs.md`
> - **Project Type:** `WEB` (Next.js 15+ App Router, React 19, Tailwind CSS v4)
> - **Primary Agent:** `project-planner`
> - **Executing Agent:** `frontend-specialist`
> - **Skills:** `clean-code`, `frontend-design`, `react-best-practices`, `plan-writing`

---

## 1. Phân Tích Kỹ Thuật & Yêu Cầu Thiết Kế

### 1.1. Hiện Trạng Trang Chi Tiết Người Dùng

1. **Dữ liệu User hiện tại**:
   - `UserDetailsView` nhận `user: IUserProfile`, trong đó trường `user.role` có thể mang các giá trị: `ADMIN`, `INSTRUCTOR`, `STUDENT`.
   - Dưới cùng trang hiện đang render trực tiếp `<UserEnrolledCoursesSection />`.
2. **Cơ chế phân nhánh giao diện theo Role (Role-based UI Rendering)**:
   - Nếu `user.role === RoleEnum.INSTRUCTOR`:
     - Hiển thị Khối 4 Thẻ KPI Tóm Tắt Nhanh.
     - Hiển thị Thanh chuyển Tab: Tab 1 "Khóa học giảng dạy (5)" vs Tab 2 "Khóa học đã mua (3)".
   - Nếu `user.role !== RoleEnum.INSTRUCTOR` (ví dụ `STUDENT`):
     - Chỉ hiển thị phân hệ "Khóa học đã đăng ký" như hiện tại.

### 1.2. Tuân Thủ Quy Chuẩn Thiết Kế & Quy Tắc Dự Án

1. **Tuân thủ Luật Cấm Màu Tím (Purple Ban)**:
   - Toàn bộ 4 thẻ KPI và Tab selector sử dụng bảng màu hài hòa, chuyên nghiệp:
     - Thẻ Khóa học: Tone Xanh dương (`sky-500` / `blue-500`)
     - Thẻ Học viên: Tone Xanh ngọc / Teal (`teal-500` / `cyan-500`)
     - Thẻ Doanh thu: Tone Xanh lá / Emerald (`emerald-500`)
     - Thẻ Đánh giá sao: Tone Vàng cam / Amber (`amber-500`)
   - Tuyệt đối không dùng các class `purple-*`, `violet-*`, `indigo-*`.
2. **Thiết kế Responsive & Visual Excellence**:
   - Khối KPI: Grid 1 cột trên Mobile (`grid-cols-1`), 2 cột trên Tablet (`sm:grid-cols-2`), 4 cột trên Desktop (`lg:grid-cols-4`).
   - Tab Selector: Phong cách Segmented Pill Button hiện đại lấy cảm hứng từ ảnh mẫu người dùng gửi, kèm badge số lượng nổi bật.
   - Ảnh thumbnail thẻ khóa học giảng dạy: Tỷ lệ 16:9 bo góc, thuộc tính `unoptimized` để ngăn lỗi Next.js image domain.

---

## 2. Đặc Tả Chi Tiết Thành Phần Giao Diện (UI Specifications)

### 2.1. Khối 4 Thẻ KPI Tóm Tắt Nhanh (Instructor Stats Summary Cards)

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ 📚 TỔNG SỐ KHÓA HỌC     │ 👥 TỔNG HỌC VIÊN        │ 💰 TỔNG DOANH THU       │ ⭐ ĐÁNH GIÁ TRUNG BÌNH   │
│ 5 khóa                  │ 1.420 học viên          │ 86.500.000 ₫            │ 4.8 / 5.0 ⭐            │
│ Đóng góp nội dung cho sàn│ Quy mô học viên theo học│ Thực nhận: 60.550.000 ₫ │ từ 320 lượt đánh giá    │
└─────────────────────────┴─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

1. **Card 1: Tổng số khóa học**
   - Icon: `lucide:book-open` trong nền `bg-sky-500/10 text-sky-600 dark:text-sky-400`.
   - Giá trị chính: `5 khóa`.
   - Phụ đề: `Đánh giá mức độ đóng góp nội dung của giảng viên cho sàn.`
2. **Card 2: Tổng học viên**
   - Icon: `lucide:users` trong nền `bg-teal-500/10 text-teal-600 dark:text-teal-400`.
   - Giá trị chính: `1.420 học viên`.
   - Phụ đề: `Đo lường mức độ ảnh hưởng và quy mô học sinh đang theo học.`
3. **Card 3: Tổng doanh thu tạo ra**
   - Icon: `lucide:coins` hoặc `lucide:wallet` trong nền `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`.
   - Giá trị chính: `86.500.000 ₫`.
   - Dòng phụ: `Hoa hồng thực nhận: 60.550.000 ₫ (70%)`.
   - Phụ đề: `Tổng giá trị giao dịch mà giảng viên đã đem về cho nền tảng.`
4. **Card 4: Đánh giá trung bình**
   - Icon: `lucide:star` trong nền `bg-amber-500/10 text-amber-600 dark:text-amber-400`.
   - Giá trị chính: `4.8 / 5.0` kèm biểu tượng sao vàng.
   - Phụ đề: `từ 320 lượt đánh giá • Đo lường uy tín và chất lượng chuyên môn.`

---

### 2.2. Thanh Chuyển Tab (Segmented Tabs Navigation)

- **Vị trí**: Nằm phía trên nội dung danh sách khóa học.
- **2 Tab chính**:
  1. **Khóa học giảng dạy** (`teaching`):
     - Icon: `lucide:presentation` hoặc `lucide:graduation-cap`
     - Badge đếm: `5`
     - Nhãn: "Khóa học giảng dạy" (Teaching)
  2. **Khóa học đã mua** (`enrolled`):
     - Icon: `lucide:book-check`
     - Badge đếm: `3`
     - Nhãn: "Khóa học đã mua" (Learning)
- **Hiệu ứng active**: Nền sáng bóng với đổ bóng nhẹ (`bg-background text-foreground shadow-xs border border-border/80 font-semibold`), chuyển đổi trạng thái mượt mà không load lại trang.

---

### 2.3. Danh Sách Khóa Học Giảng Dạy (Teaching Courses List)

Mỗi khóa học trong Tab "Khóa học giảng dạy" được thiết kế dạng Thẻ ngang bo góc nhẹ:
- **Thumbnail 16:9 thu nhỏ**: `w-20 h-12` bo góc, có thuộc tính `unoptimized`.
- **Tên khóa học**: In đậm, hiển thị cấp độ (`Cơ bản` / `Trung cấp` / `Nâng cao`).
- **Thông tin chi tiết**:
  - Giá bán: `799.000 ₫` (hoặc `Miễn phí`).
  - Học viên: `650 học viên`.
  - Đánh giá: `4.9 ⭐ (145)`.
  - Doanh thu khóa: `35.200.000 ₫`.
- **Trạng thái xuất bản**:
  - `Đã xuất bản` (Xanh lá `emerald`)
  - `Bản nháp` (Xám `muted`)
  - `Chờ phê duyệt` (Vàng cam `amber`)
- **Nút hành động**: Nút "Xem trên sàn" (`lucide:external-link`) hoặc "Kiểm duyệt".

---

## 3. Bản Thiết Kế Dữ Liệu Mẫu (Mock Data Contract)

Tạo file: `frontend/src/features/admin/users/constants/mock-instructor-data.ts`

```typescript
export interface InstructorStats {
  totalCourses: number;
  totalStudents: number;
  totalRevenue: number;
  netRevenue: number; // Hoa hồng thực nhận
  averageRating: number;
  totalReviews: number;
}

export interface InstructorTeachingCourse {
  id: string;
  title: string;
  thumbnailUrl: string;
  price: number;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  studentCount: number;
  revenue: number;
  rating: number;
  reviewCount: number;
  status: 'PUBLISHED' | 'DRAFT' | 'PENDING_APPROVAL';
  updatedAt: string;
}

export const MOCK_INSTRUCTOR_STATS: InstructorStats = {
  totalCourses: 5,
  totalStudents: 1420,
  totalRevenue: 86500000,
  netRevenue: 60550000,
  averageRating: 4.8,
  totalReviews: 320,
};

export const MOCK_INSTRUCTOR_COURSES: InstructorTeachingCourse[] = [
  {
    id: 'course-inst-01',
    title: 'Lập trình Backend chuyên sâu với NestJS, MongoDB & Microservices',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=320&auto=format&fit=crop&q=80',
    price: 799000,
    level: 'ADVANCED',
    studentCount: 650,
    revenue: 41548000,
    rating: 4.9,
    reviewCount: 145,
    status: 'PUBLISHED',
    updatedAt: '2026-10-18T10:00:00.000Z',
  },
  {
    id: 'course-inst-02',
    title: 'Xây dựng Web App tương tác cao với React 19, Next.js & Tailwind CSS',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=320&auto=format&fit=crop&q=80',
    price: 1250000,
    level: 'INTERMEDIATE',
    studentCount: 480,
    revenue: 30000000,
    rating: 4.8,
    reviewCount: 110,
    status: 'PUBLISHED',
    updatedAt: '2026-09-25T14:30:00.000Z',
  },
  {
    id: 'course-inst-03',
    title: 'Pipeline Xử Lý Video AI với RabbitMQ, AssemblyAI & Gemini Multimodal',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=320&auto=format&fit=crop&q=80',
    price: 1490000,
    level: 'ADVANCED',
    studentCount: 190,
    revenue: 14952000,
    rating: 4.7,
    reviewCount: 45,
    status: 'PUBLISHED',
    updatedAt: '2026-10-22T08:15:00.000Z',
  },
  {
    id: 'course-inst-04',
    title: 'Kiến trúc Clean Architecture & Domain-Driven Design trong NodeJS',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=320&auto=format&fit=crop&q=80',
    price: 650000,
    level: 'ADVANCED',
    studentCount: 100,
    revenue: 0,
    rating: 5.0,
    reviewCount: 20,
    status: 'PENDING_APPROVAL',
    updatedAt: '2026-10-24T16:00:00.000Z',
  },
  {
    id: 'course-inst-05',
    title: 'TypeScript Masterclass: Từ Cơ Bản Đến Generic Nâng Cao',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=320&auto=format&fit=crop&q=80',
    price: 499000,
    level: 'BEGINNER',
    studentCount: 0,
    revenue: 0,
    rating: 0,
    reviewCount: 0,
    status: 'DRAFT',
    updatedAt: '2026-10-25T07:20:00.000Z',
  },
];
```

---

## 4. Cấu Trúc File & Phân Tách Component (Architecture Layout)

```
frontend/src/features/admin/users/
├── components/
│   ├── user-details-view.tsx                 # Kiểm tra role: Render Instructor Hub hoặc Enrolled Section
│   ├── instructor-stats-overview.tsx         # Khối 4 Thẻ KPI Tóm Tắt Nhanh (Khóa học, Học viên, Doanh thu, Đánh giá)
│   ├── instructor-courses-section.tsx        # Section cha gồm 4 KPI Card + Thanh 2 Tab + Danh sách tương ứng
│   ├── instructor-teaching-card.tsx          # Thẻ hiển thị từng khóa học giảng dạy
│   └── user-enrolled-courses-section.tsx     # Section khóa học đã mua (tái sử dụng trong Tab 2)
└── constants/
    ├── mock-enrolled-courses.ts              # Mock data khóa học đã mua
    └── mock-instructor-data.ts               # Mock data stats & khóa học giảng dạy
```

---

## 5. Danh Sách Tác Vụ Triển Khai (Task Breakdown)

| Task ID | Tên tác vụ | Phụ trách | Kỹ năng | Độ ưu tiên | Ràng buộc | Tiêu chí nghiệm thu (INPUT → OUTPUT → VERIFY) |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **TASK-01** | Khởi tạo Mock Data & Types cho Giảng viên | `frontend-specialist` | `clean-code` | P0 | Không | ✅ **Hoàn thành**: `mock-instructor-data.ts` đầy đủ types strict, không `any`. |
| **TASK-02** | Xây dựng Khối Thẻ Tóm Tắt Nhanh `InstructorStatsOverview` | `frontend-specialist` | `frontend-design` | P1 | TASK-01 | ✅ **Hoàn thành**: Grid 4 thẻ KPI bo góc nhẹ: 📚 5 khóa, 👥 1.420 học viên, 💰 86.500.000đ (thực nhận 60.550.000đ), ⭐ 4.8/5.0 sao (320 đánh giá). |
| **TASK-03** | Xây dựng Thẻ Khóa Học Giảng Dạy `InstructorTeachingCard` | `frontend-specialist` | `frontend-design` | P1 | TASK-01 | ✅ **Hoàn thành**: Thẻ ngang thumbnail 16:9 bo góc, badge level, học viên, doanh thu, đánh giá sao, status badge (Xuất bản / Chờ duyệt / Bản nháp). |
| **TASK-04** | Xây dựng Section Tổng Hợp Có 2 Tab `InstructorCoursesSection` | `frontend-specialist` | `frontend-design` | P1 | TASK-02, TASK-03 | ✅ **Hoàn thành**: Thanh Tab Segmented Pill chuyển đổi mượt mà giữa Tab 1 (Khóa học giảng dạy) và Tab 2 (Khóa học đã mua). |
| **TASK-05** | Tích Hợp Vào `UserDetailsView` Dựa Trên Vai Trò Role | `frontend-specialist` | `react-best-practices` | P2 | TASK-04 | ✅ **Hoàn thành**: Phân nhánh role tự động: Giảng viên hiển thị 4 KPI + 2 Tab; Học viên hiển thị danh sách đã mua. |

---

## 6. Phase X: Kế Hoạch Nghiệm Thu & Kiểm Định (Verification Checklist)

- [x] **Phân nhánh Role chính xác**:
  - Role `INSTRUCTOR`: Hiển thị 4 thẻ KPI + 2 Tab (Khóa học giảng dạy & Khóa học đã mua).
  - Role `STUDENT` hoặc `ADMIN`: Hiển thị trực tiếp danh sách Khóa học đã mua như trước.
- [x] **4 Thẻ KPI Tóm Tắt Nhanh**:
  - Tổng số khóa học: 5 khóa
  - Tổng học viên: 1.420 học viên
  - Tổng doanh thu: 86.500.000 ₫ (Hoa hồng thực nhận: 60.550.000 ₫)
  - Đánh giá trung bình: 4.8 / 5.0 ⭐ (từ 320 lượt đánh giá)
- [x] **Bộ 2 Tab Segmented Navigation**:
  - Tab 1: Khóa học giảng dạy (5 khóa)
  - Tab 2: Khóa học đã mua (3 khóa)
  - Chuyển tab mượt mà, tab active có highlight rõ nét.
- [x] **Màu sắc & Tuân thủ Purple Ban**:
  - Không có class `purple`, `violet`, `indigo`.
  - Phối màu trực quan: Sky, Teal, Emerald, Amber.
- [x] **Chất lượng code & Image safety**:
  - Toàn bộ `<Image />` dùng `unoptimized` để ngăn crash host.
  - `npx tsc --noEmit` đạt 0 lỗi (Exit code 0).

## ✅ PHASE X COMPLETE

- Type Check: ✅ Pass (`npx tsc --noEmit` exit code 0)
- Purple Ban: ✅ Pass (Sky, Teal, Emerald, Amber palette)
- Date: 25/10/2026
