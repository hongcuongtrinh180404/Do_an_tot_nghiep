# Kế Hoạch Triển Khai: Section Danh Sách Khóa Học Đã Mua (Admin User Details)

> **Mục tiêu:**
> Xây dựng phân hệ giao diện mẫu (UI/UX Mockup) hiển thị **Danh sách khóa học đã mua** tại trang [Chi Tiết Người Dùng | DATN Portal Admin](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/admin/users/components/user-details-view.tsx).
> 
> Giao diện đáp ứng đầy đủ các tiêu chuẩn mỹ thuật hiện đại: thẻ khóa học chữ nhật bo góc nhẹ, ảnh thumbnail 16:9 sắc nét, thông tin thanh toán & kích hoạt, thanh tiến độ học tập (Linear Progress Bar) màu xanh ngọc / Teal gradient trực quan, huy hiệu trạng thái (Chưa học / Đang học / Hoàn thành), thanh công cụ tìm kiếm và lọc trạng thái, cùng nút hành động "Gỡ quyền truy cập" (chỉ hiển thị nút thuần UI theo chỉ định của người dùng).
>
> ⚠️ **Phạm vi kỹ thuật:** 100% Client-side UI & Mock Data; không kết nối API backend, không xử lý DB mutations hay nghiệp vụ logic phức tạp.
>
> - **Task Slug:** `user-enrolled-courses`
> - **Plan File:** `docs/PLAN-user-enrolled-courses.md`
> - **Project Type:** `WEB` (Next.js 15+ App Router, React 19, Tailwind CSS v4)
> - **Primary Agent:** `project-planner`
> - **Executing Agent:** `frontend-specialist`
> - **Skills:** `clean-code`, `frontend-design`, `react-best-practices`, `plan-writing`

---

## 1. Quyết Định Thiết Kế Sau Socratic Gate

Dựa trên kết quả phản hồi trực tiếp từ người dùng:
1. **Nút "Gỡ quyền truy cập" (Revoke)**: Chỉ hiển thị nút UI mẫu (variant outline / ghost cảnh báo với icon `lucide:shield-ban` hoặc `lucide:user-minus`), chưa cần xây dựng logic hay dialog xác nhận.
2. **Màu sắc Thanh tiến độ (Linear Progress Bar)**: Sử dụng tone màu **Xanh ngọc / Teal gradient** (`bg-gradient-to-r from-teal-500 to-emerald-500` hoặc `bg-teal-500`), tạo hiệu ứng thị giác hiện đại, thanh thoát và tuân thủ tuyệt đối quy định cấm màu tím (**Purple Ban**).
3. **Thanh công cụ Section (Toolbar)**: Tích hợp đầy đủ ô tìm kiếm nhanh tên khóa học kết hợp bộ 4 Tab lọc trạng thái (`Tất cả`, `Đang học`, `Hoàn thành`, `Chưa học`).

---

## 2. Tổng Quan & Phân Tích Hiện Trạng Codebase

### 2.1. Khảo Sát Màn Hình Thực Tế (`frontend/src/features/admin/users/`)

1. **Vị trí hiện tại của trang Chi tiết Người dùng**:
   - URL: `/admin/users/[userId]`
   - Container component: [`UserDetailsView`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/admin/users/components/user-details-view.tsx)
   - Layout tổng quan hiện gồm 2 phần chính:
     - Header bar trên cùng (Nút quay lại, Avatar/Tên/ID, Trạng thái chưa lưu thay đổi, Nút Lưu thay đổi).
     - Grid 2 cột:
       - Cột 1 (`lg:col-span-1`): Card tóm tắt hồ sơ (Avatar tròn lớn, Họ tên, Email, Username, Role badge, Status badge, ID sao chép, Ngày khởi tạo, Cập nhật gần nhất).
       - Cột 2 (`lg:col-span-2`): Card biểu mẫu chỉnh sửa thông tin tài khoản (`FormInput`, `FormSelect`, `FormTextarea`).
2. **Vị trí tích hợp Section Mới**:
   - Section "Khóa học đã đăng ký / đã mua" sẽ được bố trí ở phía dưới (ngay dưới Grid 2 cột), chiếm toàn bộ chiều rộng `w-full` bên trong container `flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6`.
   - Thiết kế dạng Card đồng bộ phong cách thiết kế của DATN Portal Admin (`bg-card text-card-foreground border border-border/60 rounded-xl p-5 sm:p-6 shadow-xs`).

---

## 3. Đặc Tả Chi Tiết Giao Diện & Dữ Liệu Mẫu (UI Specifications)

### 3.1. Cấu Trúc Khung Section (Header & Toolbar)

- **Header phân hệ**:
  - Icon: `lucide:graduation-cap`
  - Tiêu đề: "Khóa Học Đã Đăng Ký" (kèm badge đếm tổng số lượng: vd `3 khóa học`).
  - Dòng mô tả ngắn: "Danh sách các khóa học học viên đã mua hoặc được cấp quyền truy cập trong hệ thống."
- **Thanh công cụ lọc (Toolbar)**:
  - Input tìm kiếm nhanh tên khóa học (kèm startIcon `lucide:search`).
  - Bộ 4 Tab lọc trạng thái dạng pill buttons:
    - `Tất cả` (hiển thị tổng số lượng)
    - `Đang học` (1% - 95%)
    - `Hoàn thành` (100%)
    - `Chưa học` (0%)

### 3.2. Chi Tiết Thẻ Khóa Học (Course Card Layout)

Mỗi khóa học là một thẻ hình chữ nhật bo góc nhẹ (`rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs`):

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [THUMBNAIL 16:9]   Lập trình Backend chuyên sâu với NestJS & MongoDB                [ Đang học (65%) ] [ Revoke ] │
│  w-20 h-12 bo góc  Mua ngày: 12/10/2026 • 799.000 đ • Đã kích hoạt                                                │
│                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 65% (18/28 bài học)                  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Thumbnail 16:9 thu nhỏ**:
   - Kích thước: `w-20 h-12` (80px × 48px), tỷ lệ chuẩn 16:9, bo góc `rounded-lg`, `object-cover`.
   - Có khung nền `bg-muted` dự phòng kèm placeholder icon `lucide:video` nếu ảnh bị lỗi tải.
2. **Thông tin định danh & Tài chính**:
   - **Tên khóa học**: Font chữ in đậm (`font-semibold text-foreground text-sm sm:text-base hover:text-primary transition-colors line-clamp-1`).
   - **Meta row**:
     - Ngày mua: "Mua ngày 12/10/2026"
     - Dấu chấm phân cách: `•`
     - Số tiền: "799.000 ₫" (màu `text-foreground font-medium`)
     - Trạng thái đơn: Badge nhỏ "Đã thanh toán" (`text-emerald-600 bg-emerald-500/10 border-emerald-500/20`).
3. **Thanh tiến độ học tập (Linear Progress Bar)**:
   - Thanh chạy thanh mảnh (`h-1.5 w-full bg-muted rounded-full overflow-hidden`).
   - Fill bar: Gradient xanh ngọc tươi sáng (`bg-gradient-to-r from-teal-500 to-emerald-500` hoặc `bg-teal-500` đạt chuẩn Purple Ban).
   - Chỉ số trực quan hiển thị kế bên: `65% (18/28 bài học)` in font chữ `font-mono text-xs text-muted-foreground`.
   - Accessibility: `role="progressbar"`, `aria-valuenow={progressPercent}`, `aria-valuemin={0}`, `aria-valuemax={100}`.
4. **Huy hiệu trạng thái (Status Badge)**:
   - **Chưa học (0%)**:
     - Background xám trung tính: `bg-muted text-muted-foreground border-border`.
     - Icon: `lucide:clock-3`
     - Nhãn: "Chưa học"
   - **Đang học (1% - 95%)**:
     - Background xanh dương công nghệ: `bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20`.
     - Icon: `lucide:play-circle`
     - Nhãn: "Đang học"
   - **Hoàn thành (100%)**:
     - Background xanh lá thành tựu: `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`.
     - Icon: `lucide:trophy`
     - Nhãn: "Hoàn thành"
5. **Nút thao tác "Gỡ quyền truy cập" (Revoke Button)**:
   - Button size `sm`, variant `outline` với styling cảnh báo nhẹ: `text-destructive hover:bg-destructive/10 hover:border-destructive/30 border-border/80 text-xs font-medium cursor-pointer`.
   - Icon: `lucide:shield-ban` hoặc `lucide:user-minus`.
   - Nhãn: "Gỡ quyền truy cập".

---

## 4. Bản Thiết Kế Dữ Liệu Mẫu (Mock Data Contract)

Tạo file: `frontend/src/features/admin/users/constants/mock-enrolled-courses.ts`

```typescript
export interface EnrolledCourseItem {
  id: string;
  courseId: string;
  title: string;
  thumbnailUrl: string;
  purchaseDate: string; // ISO Date String
  price: number;
  paymentStatus: 'PAID' | 'REFUNDED';
  totalLessons: number;
  completedLessons: number;
  progressPercent: number; // 0 - 100
}

export const MOCK_ENROLLED_COURSES: EnrolledCourseItem[] = [
  {
    id: 'enroll-001',
    courseId: 'course-nestjs-01',
    title: 'Lập trình Backend chuyên sâu với NestJS, MongoDB & Microservices',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&q=80',
    purchaseDate: '2026-10-12T08:30:00.000Z',
    price: 799000,
    paymentStatus: 'PAID',
    totalLessons: 28,
    completedLessons: 18,
    progressPercent: 65,
  },
  {
    id: 'enroll-002',
    courseId: 'course-react-02',
    title: 'Xây dựng Web App tương tác cao với React 19, Next.js App Router & Tailwind CSS',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&q=80',
    purchaseDate: '2026-09-05T14:15:00.000Z',
    price: 1250000,
    paymentStatus: 'PAID',
    totalLessons: 42,
    completedLessons: 42,
    progressPercent: 100,
  },
  {
    id: 'enroll-003',
    courseId: 'course-ai-video-03',
    title: 'Pipeline Xử Lý Video AI với RabbitMQ, AssemblyAI & Gemini Multimodal',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
    purchaseDate: '2026-10-20T19:45:00.000Z',
    price: 1490000,
    paymentStatus: 'PAID',
    totalLessons: 20,
    completedLessons: 0,
    progressPercent: 0,
  },
];
```

---

## 5. Cấu Trúc File & Phân Tách Component (Architecture Layout)

```
frontend/src/features/admin/users/
├── components/
│   ├── user-details-view.tsx                 # Nhúng UserEnrolledCoursesSection ở dưới cùng trang
│   ├── user-enrolled-courses-section.tsx     # Khung Section bọc header, search bar, status tabs & danh sách
│   └── user-enrolled-course-card.tsx         # Thẻ hiển thị từng khóa học (Thumbnail, Progress, Badge, Revoke button)
└── constants/
    └── mock-enrolled-courses.ts              # Dữ liệu mẫu chuẩn hóa với 3 trạng thái mẫu
```

---

## 6. Danh Sách Tác Vụ Triển Khai (Task Breakdown)

| Task ID | Tên tác vụ | Phụ trách | Kỹ năng | Độ ưu tiên | Ràng buộc | Tiêu chí nghiệm thu (INPUT → OUTPUT → VERIFY) |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **TASK-01** | Khởi tạo Mock Data & Types cho Khóa học đã mua | `frontend-specialist` | `clean-code` | P0 | Không | ✅ **Hoàn thành**: `mock-enrolled-courses.ts` với đầy đủ strict types và 3 item mẫu chuẩn đề bài. |
| **TASK-02** | Xây dựng Component `UserEnrolledCourseCard` | `frontend-specialist` | `frontend-design` | P1 | TASK-01 | ✅ **Hoàn thành**: Thumbnail 16:9 (`w-20 h-12`), ngày mua/giá tiền, linear progress bar xanh ngọc, badge 3 màu và nút Gỡ quyền. |
| **TASK-03** | Xây dựng Khung Section `UserEnrolledCoursesSection` | `frontend-specialist` | `frontend-design` | P1 | TASK-02 | ✅ **Hoàn thành**: Header đếm số lượng, ô search filter, 4 tab trạng thái, empty state xử lý trực quan. |
| **TASK-04** | Nhúng Section vào `UserDetailsView` & Kiểm Tra Tương Thích | `frontend-specialist` | `react-best-practices` | P2 | TASK-03 | ✅ **Hoàn thành**: Nhúng section ở đáy trang `UserDetailsView`, responsive hoàn hảo. |

---

## 7. Phase X: Kế Hoạch Nghiệm Thu & Kiểm Định (Verification Checklist)

- [x] **Màu sắc & Purple Ban**: Toàn bộ CSS sử dụng Teal/Emerald gradient (`from-teal-500 to-emerald-500`), không chứa `purple`, `violet`, hay `indigo`.
- [x] **Tỷ lệ Thumbnail**: Thumbnail chuẩn 16:9 (`w-20 h-12`), bo góc, `object-cover`.
- [x] **Quy chuẩn Định dạng**:
  - Số tiền: Format chuẩn VNĐ (`799.000 ₫`).
  - Ngày tháng: Format chuẩn ngày Việt Nam (`12/10/2026`).
  - Tiến độ: `65% (18/28 bài học)`.
- [x] **3 Trạng thái Status Badge**:
  - 0%: Xám (Chưa học) + icon đồng hồ.
  - 1% - 95%: Xanh dương (Đang học) + icon play.
  - 100%: Xanh lá (Hoàn thành) + icon cúp vàng.
- [x] **Nút Gỡ quyền (Revoke Button)**:
  - Hiển thị nút UI outline cảnh báo kèm icon `lucide:shield-ban`, click có toast thông báo mẫu, không chạm backend.
- [x] **Bộ lọc & Tìm kiếm**:
  - Thanh tìm kiếm và bộ 4 tab lọc trạng thái hoạt động tức thì trên client state.
- [x] **Kiểm tra Build & TypeScript**:
  - `npx tsc --noEmit` pass 100% 0 lỗi.
  - Không vi phạm nguyên tắc TypeScript `any`.

## ✅ PHASE X COMPLETE

- Lint / Type Check: ✅ Pass (`npx tsc --noEmit` exit code 0)
- Purple Ban: ✅ Pass (Teal/Emerald gradient)
- Date: 25/10/2026
