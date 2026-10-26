# Kế Hoạch Triển Khai: Bổ Sung 7 Tab Điều Hướng Cho Giao Diện Quản Trị Admin

> **Mục tiêu:**
> Hoàn thiện cấu trúc điều hướng toàn diện của Cổng Quản Trị Admin (`DATN Portal Admin`) với tổng cộng 8 tab theo thứ tự cố định, bảo toàn 100% tính năng của tab Quản lý người dùng hiện tại, đồng thời xây dựng khung giao diện chuẩn mực (page layout, title, description, empty state canvas) cho 7 phân hệ mới chưa triển khai nghiệp vụ.
>
> - **Task Slug:** `admin-navigation-tabs`  
> - **Plan File:** `docs/PLAN-admin-navigation-tabs.md`  
> - **Project Type:** `WEB` (Next.js 15+ App Router, React 19, Tailwind CSS v4)  
> - **Primary Agent:** `project-planner`  
> - **Executing Agent:** `frontend-specialist`  
> - **Skills:** `clean-code`, `frontend-design`, `react-best-practices`, `plan-writing`

---

## 1. Tổng Quan & Phân Tích Hiện Trạng Codebase

### 1.1. Khảo Sát Mã Nguồn Thực Tế (Codebase Survey)

1. **Cấu trúc Route Admin hiện tại (`frontend/src/app/(admin)/admin/`)**:
   - `layout.tsx`: Bọc toàn bộ các route admin bằng `<AdminGuard>` và `<AdminLayout>`.
   - `page.tsx`: Hiện tại thực hiện `redirect('/admin/users')`.
   - `users/page.tsx`: Hiển thị `<UsersTable />` quản lý người dùng với đầy đủ tính năng lọc, tìm kiếm, phân quyền.
2. **Cấu trúc Navigation & Sidebar (`frontend/src/features/admin/`)**:
   - `constants/admin-navigation.ts`: Khai báo mảng `ADMIN_NAV_ITEMS` hiện chỉ chứa 1 mục duy nhất là "Quản lý người dùng" (`/admin/users`).
   - `components/admin-sidebar.tsx`: Lặp qua `ADMIN_NAV_ITEMS` để sinh các link điều hướng trên Sidebar, kiểm tra `isActive` dựa trên `pathname === item.href || pathname.startsWith(`${item.href}/`)`.
   - `components/admin-header.tsx`: Tự động tìm item đang active trong `ADMIN_NAV_ITEMS` để đồng bộ `pageTitle` hiển thị trên Header / Breadcrumbs.
3. **Đặc điểm cần bảo toàn tuyệt đối**:
   - **Tab Quản lý người dùng**: Giữ nguyên toàn bộ cấu trúc tại `frontend/src/app/(admin)/admin/users/page.tsx` và `frontend/src/features/admin/users/`.
   - Không can thiệp vào bất kỳ API Backend nào, không tác động đến cơ chế xác thực Role (`AdminGuard`) hay layout cha (`AdminLayout`).

---

## 2. Danh Sách 8 Tab Cố Định & Cấu Trúc URL Chuẩn Hóa

Hệ thống điều hướng Admin sẽ có đúng 8 tab theo thứ tự yêu cầu từ người dùng:

| Thứ tự | Tên hiển thị Tab (Chính xác 100%) | Đường dẫn URL (Route) | Iconify ID | Mô tả mục đích trang |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Tổng quan** | `/admin/dashboard` | `lucide:layout-dashboard` | Trung tâm điều khiển, thống kê chỉ số KPI vận hành và biểu đồ tăng trưởng toàn hệ thống. |
| **2** | **Quản lý người dùng** | `/admin/users` | `lucide:users` | Quản lý tài khoản, trạng thái hoạt động, khóa/mở tài khoản và phân quyền người dùng. *(Đã có)* |
| **3** | **Quản lý & Phê duyệt Khóa học** | `/admin/courses` | `lucide:book-open-check` | Kiểm duyệt chất lượng nội dung, phê duyệt xuất bản và giám sát các khóa học của giảng viên. |
| **4** | **Quản lý Đơn hàng, Giao dịch & Doanh thu** | `/admin/orders` | `lucide:receipt` | Theo dõi đơn đăng ký khóa học, lịch sử giao dịch cổng thanh toán SePay và thống kê doanh thu. |
| **5** | **Quản lý Danh mục & Phân loại** | `/admin/categories` | `lucide:folder-tree` | Quản lý cây danh mục khóa học, nhóm kỹ năng chuyên môn và các nhãn chủ đề đào tạo. |
| **6** | **Quản lý Khuyến mãi & Mã giảm giá** | `/admin/promotions` | `lucide:ticket-percent` | Thiết lập chiến dịch ưu đãi học phí, phát hành coupon mã giảm giá và quản lý thời hạn áp dụng. |
| **7** | **Kiểm duyệt Đánh giá & Bình luận** | `/admin/reviews` | `lucide:message-square-check` | Giám sát chất lượng bình luận bài giảng, duyệt đánh giá sao từ học viên và xử lý báo cáo vi phạm. |
| **8** | **Cấu hình Hệ thống** | `/admin/settings` | `lucide:settings-2` | Cấu hình tham số nền tảng, thiết lập tích hợp AI (Gemini, AssemblyAI), khóa bảo mật và lưu trữ. |

> [!NOTE]
> **Về Route `/admin`**: Để tạo trải nghiệm tự nhiên, khi người dùng truy cập vào `/admin`, hệ thống sẽ chuyển hướng mặc định về tab đầu tiên là `/admin/dashboard` (thay vì `/admin/users` như trước đây).

---

## 3. Kiến Trúc Khung Giao Diện Cho 7 Tab Chưa Triển Khai (Placeholder Architecture)

Để đảm bảo tuân thủ nguyên tắc thiết kế UI/UX hiện đại (theo `project-architecture.md` và `frontend-design` skill):
1. **Khung giao diện riêng biệt & đồng bộ**:
   - Sử dụng container chuẩn `min-h-0 flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6`.
   - Header trang gồm: Tiêu đề trang (`h2 font-bold text-foreground`), dòng mô tả ngắn (`p text-muted-foreground`), và badge trạng thái phân hệ.
2. **Khu vực nội dung trống (Empty State Canvas)**:
   - Khung card nét đứt thẩm mỹ (`border-dashed border-border/60 bg-card/40 rounded-xl p-8`), hiển thị icon phân hệ kích thước lớn trong nền `bg-muted/80`, thông báo trạng thái "Phân hệ đang trong lộ trình phát triển / Chưa triển khai nghiệp vụ".
   - Chip thông tin thể hiện trạng thái kỹ thuật: `Routing: Hoàn tất`, `UI Table: Đang chờ phát triển`.
3. **Thành phần dùng chung `AdminTabPlaceholder`**:
   - Tạo component chuẩn `AdminTabPlaceholder` tại `frontend/src/features/admin/components/admin-tab-placeholder.tsx` nhận các props: `title`, `description`, `icon`, `badge`.
   - Mỗi file `page.tsx` trong 7 thư mục route mới chỉ cần import và render placeholder với thông tin đặc thù của mình, giúp mã nguồn cực kỳ gọn gàng và dễ dàng thay thế bằng các bảng dữ liệu thực tế sau này mà không phải sửa lại cấu trúc layout.

---

## 4. Cấu Trúc Thư Mục & File Dự Kiến

```
frontend/src/
├── app/
│   └── (admin)/
│       └── admin/
│           ├── page.tsx                           # Cập nhật: redirect về '/admin/overview'
│           ├── layout.tsx                         # Giữ nguyên
│           ├── users/                             # Tab 2: Giữ nguyên 100%
│           │   └── page.tsx
│           ├── overview/                          # Tab 1: MỚI
│           │   └── page.tsx
│           ├── courses/                           # Tab 3: MỚI
│           │   └── page.tsx
│           ├── orders/                            # Tab 4: MỚI
│           │   └── page.tsx
│           ├── categories/                        # Tab 5: MỚI
│           │   └── page.tsx
│           ├── promotions/                        # Tab 6: MỚI
│           │   └── page.tsx
│           ├── reviews/                           # Tab 7: MỚI
│           │   └── page.tsx
│           └── settings/                          # Tab 8: MỚI
│               └── page.tsx
└── features/
    └── admin/
        ├── constants/
        │   └── admin-navigation.ts                # Cập nhật: 8 tab theo đúng thứ tự
        ├── components/
        │   ├── admin-sidebar.tsx                  # Tinh chỉnh: Active link matching chuẩn xác
        │   ├── admin-header.tsx                   # Giữ nguyên (tự động nhận 8 tab)
        │   ├── admin-tab-placeholder.tsx          # MỚI: Khung giao diện placeholder dùng chung
        │   └── ...
        └── index.ts                               # Export admin-tab-placeholder
```

---

## 5. Kế Hoạch Chi Tiết Các Tác Vụ (Task Breakdown)

### Tác Vụ 1: Cập Nhật Danh Sách Menu Điều Hướng `ADMIN_NAV_ITEMS`
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`, `api-patterns`
- **Priority:** `P0`
- **Dependencies:** Không
- **Mô tả:** Mở rộng mảng `ADMIN_NAV_ITEMS` trong `frontend/src/features/admin/constants/admin-navigation.ts` để có đầy đủ 8 tab theo đúng thứ tự, tiêu đề và icon Iconify chính xác.
- **Input:** Danh sách 8 tab từ yêu cầu.
- **Output:** File `admin-navigation.ts` có 8 items hoàn chỉnh.
- **Verify:** Kiểm tra mảng chứa đủ 8 phần tử với đúng tiêu đề, href và icon tương ứng.

### Tác Vụ 2: Xây Dựng Component Khung Giao Diện `AdminTabPlaceholder`
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `react-best-practices`, `tailwind-patterns`
- **Priority:** `P1`
- **Dependencies:** Tác Vụ 1
- **Mô tả:** Xây dựng component `AdminTabPlaceholder` tại `frontend/src/features/admin/components/admin-tab-placeholder.tsx` và export ra `index.ts`. Tuân thủ:
  - Header với `title` và `description` rõ ràng.
  - Vùng nội dung trống sang trọng (card viền đứt, icon trung tâm, badge phân hệ, trạng thái chưa kích hoạt nghiệp vụ).
  - Tuân thủ quy tắc Purple Ban (không dùng dải màu tím/violet, sử dụng token hệ thống `primary`, `muted`, `foreground`).
- **Input:** Interface props (`title`, `description`, `icon`, `badge`).
- **Output:** File `admin-tab-placeholder.tsx` và cập nhật `frontend/src/features/admin/index.ts`.
- **Verify:** Component hiển thị đúng typography, responsive trên mobile/tablet/desktop, không lỗi CSS.

### Tác Vụ 3: Tạo 7 Trang Route Cho Các Tab Còn Lại
- **Agent:** `frontend-specialist`
- **Skills:** `react-best-practices`, `clean-code`
- **Priority:** `P1`
- **Dependencies:** Tác Vụ 1, Tác Vụ 2
- **Mô tả:** Tạo 7 file `page.tsx` trong `frontend/src/app/(admin)/admin/`:
  1. `overview/page.tsx` (Tổng quan)
  2. `courses/page.tsx` (Quản lý & Phê duyệt Khóa học)
  3. `orders/page.tsx` (Quản lý Đơn hàng, Giao dịch & Doanh thu)
  4. `categories/page.tsx` (Quản lý Danh mục & Phân loại)
  5. `promotions/page.tsx` (Quản lý Khuyến mãi & Mã giảm giá)
  6. `reviews/page.tsx` (Kiểm duyệt Đánh giá & Bình luận)
  7. `settings/page.tsx` (Cấu hình Hệ thống)
  Mỗi trang khai báo đầy đủ `Metadata` (SEO title, description) và render component `AdminTabPlaceholder` tương ứng.
- **Input:** Thư mục route và component `AdminTabPlaceholder`.
- **Output:** 7 trang route độc lập, tải đúng dữ liệu khung cho từng tab.
- **Verify:** Truy cập trực tiếp từng URL (`/admin/overview`, `/admin/courses`, ...) render đúng tiêu đề, icon và mô tả.

### Tác Vụ 4: Tinh Chỉnh Điều Hướng Root `/admin` & Kiểm Tra Active Tab Trong Sidebar
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`
- **Priority:** `P2`
- **Dependencies:** Tác Vụ 3
- **Mô tả:**
  - Cập nhật `frontend/src/app/(admin)/admin/page.tsx` redirect về `/admin/overview` (tab mặc định đầu tiên).
  - Kiểm tra logic `isActive` trong `AdminSidebar.tsx` và `AdminHeader.tsx` để đảm bảo khi click chuyển giữa 8 tab, tab đang chọn được highlight chính xác tuyệt đối, không bị trùng lặp trạng thái active.
- **Input:** File `admin/page.tsx`, `admin-sidebar.tsx`.
- **Output:** Chuyển hướng mượt mà, highlight chính xác trên sidebar và header.
- **Verify:** Click thử từng tab từ 1 đến 8, kiểm tra sidebar link đổi màu và header tiêu đề thay đổi theo.

---

## 6. Tiêu Chí Nghiệm Thu (Success Criteria)

1. **Thứ tự & Tên hiển thị**:
   - Menu hiển thị đủ 8 tab theo đúng thứ tự 1 -> 8 đã chỉ định.
   - Tên tab hiển thị chính xác từng từ ngữ theo đề bài.
2. **Khả năng điều hướng**:
   - Nhấn vào bất kỳ tab nào đều chuyển hướng thành công đến route tương ứng mà không làm reload toàn bộ trang (Next.js client-side navigation).
   - Sidebar highlight đúng tab đang active.
   - Header hiển thị đúng tên tab đang được chọn.
3. **Bảo toàn chức năng cũ**:
   - Tab "Quản lý người dùng" (`/admin/users`) giữ nguyên 100% chức năng danh sách người dùng (`UsersTable`), bộ lọc, phân trang.
   - Cơ chế bảo vệ `AdminGuard` và đăng xuất vẫn hoạt động hoàn hảo.
4. **Chất lượng giao diện**:
   - 7 tab mới có khung giao diện riêng biệt, phân biệt rõ ràng bằng tiêu đề, icon, mô tả và khung nội dung trống chuẩn mực.
   - Không bị lỗi build, không có cảnh báo TypeScript hay vi phạm quy chuẩn thiết kế.

---

## 7. Giai Đoạn Kiểm Thử & Xác Minh (Phase X: Verification)

- [x] **Kiểm tra TypeScript & Lint:** `pnpm --filter frontend exec tsc --noEmit` -> Mã thoát 0 (Không có lỗi type).
- [x] **Kiểm tra Giao diện Trực quan & Routing:**
  - [x] Tab 1: Tổng quan (`/admin/dashboard`) hiển thị đúng tiêu đề "Tổng quan" & mô tả, dashboard KPIs.
  - [x] Tab 2: Quản lý người dùng (`/admin/users`) bảng dữ liệu `UsersTable` bảo toàn 100%.
  - [x] Tab 3: Quản lý & Phê duyệt Khóa học (`/admin/courses`)
  - [x] Tab 4: Quản lý Đơn hàng, Giao dịch & Doanh thu (`/admin/orders`)
  - [x] Tab 5: Quản lý Danh mục & Phân loại (`/admin/categories`)
  - [x] Tab 6: Quản lý Khuyến mãi & Mã giảm giá (`/admin/promotions`)
  - [x] Tab 7: Kiểm duyệt Đánh giá & Bình luận (`/admin/reviews`)
  - [x] Tab 8: Cấu hình Hệ thống (`/admin/settings`)
  - [x] Truy cập `/admin` tự động redirect về `/admin/dashboard`.
  - [x] Đăng nhập quyền Admin tự động điều hướng về `/admin/dashboard`.

## ✅ PHASE X COMPLETE

- Type Check: ✅ Pass (tsc exit code 0)
- Routing & Navigation: ✅ 8/8 Tabs Hoạt động mượt mà
- Date: 2026-10-23
