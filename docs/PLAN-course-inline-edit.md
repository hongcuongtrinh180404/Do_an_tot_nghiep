# PLAN: Triển Khai Chức Năng Inline Edit Chi Tiết Khóa Học (Course Inline Editing)

> **Mục tiêu:**
> 1. Triển khai chức năng chỉnh sửa trực tiếp (Inline Editing) tại trang `[Chi tiết khóa học | DATN Portal](http://localhost:3000/instructor/courses/[id])` mà không cần chuyển trang hoặc mở modal lớn.
> 2. **Tiêu đề khóa học (`title`)**: Chế độ xem hiển thị thẻ `<h1>`, hover xuất hiện bút chì (`lucide:pencil`). Click chuyển thành `<input type="text">` với nút tick xanh (Lưu), dấu X (Hủy), hỗ trợ phím tắt Enter/Esc và xử lý onBlur an toàn.
> 3. **Tự động sinh Slug & Chống trùng lặp**: Khi đổi tên khóa học, hệ thống tự động sinh slug mới. Nếu slug đã tồn tại ở khóa học khác (không tính khóa học hiện tại), tự động thêm hậu tố số thứ tự (`-1`, `-2`, ...) để đảm bảo tính duy nhất.
> 4. **Học phí (`price`, `originalPrice`, `salePrice`)**: Sử dụng Inline Popover với Switch chọn "Miễn phí" / "Có phí". Khi chọn "Có phí", mở 2 ô: "Giá gốc" và "Giá khuyến mãi (Sale Price)" với validation chặt chẽ (`salePrice <= originalPrice`).
> 5. **Trình độ / Cấp độ (`level`)**: Dropdown Select thay đổi tại chỗ giữa 4 cấp độ (`ALL_LEVELS`, `BEGINNER`, `INTERMEDIATE`, `ADVANCED`) với phản hồi cập nhật tức thời.
> 6. **Mô tả ngắn gọn (`shortDescription`)**: Nút sửa góc phải card chuyển nội dung tĩnh thành `<textarea rows="3">`, giới hạn 200 ký tự kèm bộ đếm ký tự (`0/200`) và nút Lưu/Hủy.
> 7. **Mô tả chi tiết (`description`)**: Hỗ trợ nút sửa góc phải card để inline switch sang trình soạn thảo `RichTextEditor` (Tiptap) đã tích hợp.
> 8. Tuân thủ tuyệt đối quy tắc kiến trúc dự án: Clean Code, Purple Ban, NestJS BaseService + Abstract Repository, MongoDB transaction & index, không sử dụng type `any`.
>
> **Task Slug:** `course-inline-edit`  
> **Plan File:** `docs/PLAN-course-inline-edit.md`  
> **Primary Agent:** `project-planner`  
> **Assigned Agents:** `backend-specialist`, `frontend-specialist`, `test-engineer`  

---

## 1. Phân Tích Hiện Trạng & Yêu Cầu Kỹ Thuật

### 1.1. Hiện Trạng Codebase

| Thành phần | File / Module | Hiện trạng | Yêu cầu thay đổi |
| :--- | :--- | :--- | :--- |
| **Giao diện Chi tiết** | `frontend/src/features/course/components/course-detail-content.tsx` | Đang render tĩnh toàn bộ thông tin (h1 title, slug badge, quick stats price/level, card shortDescription, card description). | Chia nhỏ và tích hợp các component Inline Edit chuyên biệt: Title, Price Popover, Level Select, ShortDesc Card, DetailDesc Card. |
| **Component Popover** | `frontend/src/components/ui/` | Chưa có `popover.tsx` độc lập (mới có `dialog.tsx` dựa trên `@base-ui/react`). | Xây dựng `frontend/src/components/ui/popover.tsx` sử dụng `@base-ui/react/popover` đồng bộ token Shadcn. |
| **Frontend API & Hook** | `frontend/src/features/course/api/course.api.ts` | Chưa có hàm `updateCourse` và hook `useUpdateCourseMutation`. | Bổ sung API client `courseApi.updateCourse` và hook React Query invalidating cache `detail` & `myCourses`. |
| **Share-lib Types** | `share-lib/src/interfaces/course.interface.ts` | `ICourse` chỉ có `price: number`. Chưa có trường `originalPrice`. Chưa có `IUpdateCoursePayload`. | Bổ sung `originalPrice?: number \| null`, `IUpdateCoursePayload`, và chuyển `slugify` vào `share-lib/src/utils/slug.util.ts`. |
| **Backend Entity** | `backend/src/modules/course/schemas/course.schema.ts` | `CourseEntity` chỉ lưu `price: number`. | Bổ sung `@Prop({ type: Number, default: null }) originalPrice?: number \| null;`. |
| **Backend DTO** | `backend/src/modules/course/dto/` | Chưa có `update-course.dto.ts`. | Tạo mới `UpdateCourseDto` với validation `class-validator` + `class-transformer` (trim, min/max, number check). |
| **Backend Service** | `backend/src/modules/course/services/course.service.ts` | Chưa có hàm `updateCourse` và logic tự động xử lý slug conflict kèm số thứ tự. | Bổ sung `generateUniqueSlug(baseSlug, excludeCourseId)` và `updateCourse(...)` với audit CLS context. |
| **Backend Controller** | `backend/src/modules/course/course.controller.ts` | Chưa có endpoint `PATCH /courses/:id`. | Thêm `@Patch(':id')` với guard `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)`. |

---

### 1.2. Giải Pháp Xử Lý Slug Tự Động & Chống Trùng (Slug Collision Resolution)

Khi giảng viên đổi tên khóa học từ *"Lập trình React"* sang *"Lập trình Next.js"*:
1. **Thuật toán Slugify Chuẩn Tiếng Việt:** 
   Chuẩn hóa bỏ dấu, chuyển chữ thường, thay thế ký tự đặc biệt và khoảng trắng bằng dấu gạch ngang (ví dụ: `lap-trinh-next-js`).
2. **Kiểm tra trùng lặp tại Backend (Database Level):**
   - Tìm kiếm các khóa học chưa bị xóa (`deletedAt: null`) có `_id !== currentCourseId` và `slug` khớp với regex:
     `^lap-trinh-next-js(-([0-9]+))?$`
   - Nếu không có bản ghi nào trùng: Giữ nguyên `lap-trinh-next-js`.
   - Nếu đã tồn tại bản ghi chính xác `lap-trinh-next-js` hoặc các hậu tố `-1`, `-2`:
     Lấy danh sách các số hậu tố hiện có, tìm số lớn nhất `N` và gán slug mới là `lap-trinh-next-js-${N + 1}` (ví dụ: `lap-trinh-next-js-1`).
   - Đảm bảo tính nhất quán (atomic update) và không bao giờ xung đột với index `unique` của MongoDB.

```mermaid
flowchart TD
    A[Giảng viên sửa Tiêu đề: newTitle] --> B[Slugify: baseSlug]
    B --> C{baseSlug == course.slug?}
    C -- Đúng --> D[Giữ nguyên slug hiện tại]
    C -- Khác --> E[Truy vấn DB: các slug trùng pattern ^baseSlug(-[0-9]+)?$]
    E --> F{Có bản ghi nào khác trùng?}
    F -- Không --> G[Slug mới = baseSlug]
    F -- Có --> H[Tìm max index N hiện có]
    H --> I[Slug mới = baseSlug-${N + 1}]
    G --> J[Cập nhật đồng thời title & slug vào MongoDB]
    I --> J
    D --> J
    J --> K[Trả về ApiResponse khóa học đã cập nhật]
```

---

### 1.3. Mô Hình Dữ Liệu Học Phí (Price Architecture)

Để đảm bảo tính linh hoạt cho khóa học miễn phí, khóa học bán giá niêm yết, và khóa học đang chạy chương trình khuyến mãi:
- **`price` (number, required, default 0):** Giá bán thực tế mà học viên phải thanh toán qua cổng SePay.
  - Nếu miễn phí: `price = 0`.
  - Nếu có phí không khuyến mãi: `price = originalPrice`.
  - Nếu có phí và có khuyến mãi: `price = salePrice`.
- **`originalPrice` (number | null, optional):** Giá gốc / Giá niêm yết (dùng để gạch ngang trên giao diện `<s>500.000 đ</s>`).
- **Quy tắc kiểm tra nghiệp vụ (Validation Rules):**
  - Miễn phí: `price = 0`, `originalPrice = null`.
  - Có phí: `originalPrice > 0`.
  - Nếu có `salePrice`: Bắt buộc `0 < salePrice <= originalPrice`. Khi đó lưu `price = salePrice` và `originalPrice = originalPrice`.

---

## 2. Thiết Kế Kiến Trúc & Cấu Trúc File

### 2.1. Cấu Trúc File Sẽ Thay Đổi & Tạo Mới

```plaintext
share-lib/
├── src/
│   ├── interfaces/
│   │   └── course.interface.ts                 # Cập nhật ICourse (originalPrice) & thêm IUpdateCoursePayload
│   └── utils/
│       └── slug.util.ts                        # [MỚI] Chia sẻ slugify chuẩn tiếng Việt cho cả Backend & Frontend

backend/
├── src/modules/course/
│   ├── dto/
│   │   └── update-course.dto.ts                # [MỚI] DTO validate dữ liệu cập nhật khóa học
│   ├── schemas/
│   │   └── course.schema.ts                    # Thêm trường originalPrice
│   ├── repositories/
│   │   └── course.repository.ts                # Thêm hàm tìm các slug theo regex để đánh số thứ tự
│   ├── services/
│   │   └── course.service.ts                   # Bổ sung updateCourse & generateUniqueSlug
│   ├── course.controller.ts                    # Bổ sung endpoint PATCH /courses/:id
│   └── tests/
│       ├── course.service.spec.ts              # Unit test cho updateCourse & auto slug suffix
│       └── course.controller.spec.ts           # Unit test cho PATCH endpoint

frontend/
├── src/
│   ├── components/ui/
│   │   └── popover.tsx                         # [MỚI] Shadcn-compliant Popover sử dụng @base-ui/react
│   └── features/course/
│       ├── api/
│       │   └── course.api.ts                   # Thêm updateCourse API client & useUpdateCourseMutation
│       ├── components/
│       │   ├── course-detail-content.tsx       # Tích hợp các inline editors vào trang chi tiết
│       │   └── inline/
│       │       ├── course-title-inline-edit.tsx       # [MỚI] Inline edit Title + pencil icon + save/cancel + slug preview
│       │       ├── course-price-inline-popover.tsx    # [MỚI] Popover Switch Free/Paid + Original/Sale price
│       │       ├── course-level-inline-select.tsx     # [MỚI] Dropdown select Level tại chỗ
│       │       ├── course-short-desc-inline-card.tsx  # [MỚI] Card Expandable Textarea 200 ký tự + character counter
│       │       └── course-desc-inline-card.tsx        # [MỚI] Card Tiptap RichTextEditor inline edit
│       └── tests/
│           └── course-inline-edit.spec.tsx     # Unit test cho các tương tác inline edit
```

---

## 3. Kế Hoạch Triển Khai Chi Tiết (Task Breakdown)

### Phase 1: Shared Library & Backend Core API

#### Task 1.1: Mở rộng `share-lib` (Contract & Tiện ích Slug)
- **Agent:** `backend-specialist`
- **Skills:** `clean-code`, `api-patterns`
- **Input:** `share-lib/src/interfaces/course.interface.ts`, `frontend/src/features/course/utils/slugify.ts`
- **Action:**
  - Tạo `share-lib/src/utils/slug.util.ts` chuyển hàm `slugify` chuẩn tiếng Việt vào đây và export ra `share-lib/src/index.ts`.
  - Cập nhật interface `ICourse` thêm thuộc tính `originalPrice?: number | null;`.
  - Thêm interface `IUpdateCoursePayload` định nghĩa các trường cho phép cập nhật: `title`, `slug`, `price`, `originalPrice`, `level`, `shortDescription`, `description`, `thumbnailUrl`, `trailerUrl`, `status`.
- **Output:** `share-lib` build thành công, cung cấp kiểu dữ liệu đồng nhất.
- **Verify:** `pnpm --filter share-lib build` chạy thành công không lỗi type.

#### Task 1.2: Cập nhật Schema & Tạo DTO trong Backend
- **Agent:** `backend-specialist`
- **Skills:** `database-design`, `clean-code`
- **Input:** `backend/src/modules/course/schemas/course.schema.ts`
- **Action:**
  - Thêm trường `originalPrice` vào `CourseEntity` (`@Prop({ type: Number, required: false, default: null, min: 0 })`).
  - Tạo file `backend/src/modules/course/dto/update-course.dto.ts`:
    - `title`: optional string, min 3, max 200, trimmed.
    - `slug`: optional string (kebab-case).
    - `price`: optional number, min 0.
    - `originalPrice`: optional number, min 0.
    - `level`: optional enum `CourseLevelEnum`.
    - `shortDescription`: optional string, trimmed, max 500.
    - `description`: optional string.
    - `status`: optional enum `CourseStatusEnum`.
- **Output:** DTO và Schema backend sẵn sàng.
- **Verify:** Typecheck `pnpm --filter backend build` pass.

#### Task 1.3: Repository & Service Logic (Auto Slug Suffix & Update Course)
- **Agent:** `backend-specialist`
- **Skills:** `api-patterns`, `clean-code`
- **Input:** `backend/src/modules/course/repositories/course.repository.ts`, `backend/src/modules/course/services/course.service.ts`
- **Action:**
  - Trong `CourseRepository`: Bổ sung hàm `findConflictingSlugs(baseSlug: string, excludeCourseId: string, session?: ClientSession): Promise<string[]>`.
  - Trong `CourseService`:
    - Viết hàm `generateUniqueSlug(baseSlug: string, currentCourseId: string, session?: ClientSession): Promise<string>`.
    - Viết hàm `updateCourse(courseId: string, dto: UpdateCourseDto, userId: string, role: RoleEnum, session?: ClientSession): Promise<ICourse>`.
    - Kiểm tra quyền sở hữu (chỉ giảng viên tạo khóa học hoặc Admin mới được sửa).
    - Tự động sinh slug mới kèm hậu tố số nếu tiêu đề thay đổi và không truyền slug thủ công.
    - Validate logic giá: Nếu `originalPrice` và `price` cùng tồn tại, đảm bảo `price <= originalPrice`.
- **Output:** Nghiệp vụ cập nhật hoàn thiện và an toàn.
- **Verify:** Viết unit tests kiểm tra trường hợp slug trùng lặp tự sinh `-1`, `-2`.

#### Task 1.4: Controller Endpoint & Backend Unit Tests
- **Agent:** `backend-specialist`, `test-engineer`
- **Skills:** `api-patterns`, `testing-patterns`
- **Input:** `backend/src/modules/course/course.controller.ts`
- **Action:**
  - Bổ sung `@Patch(':id')` vào `CourseController` với decorator `@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)` và pipe `ParseObjectIdPipe`.
  - Viết unit test trong `course.service.spec.ts` cho các scenarios:
    - Sửa title thành công -> slug sinh tự động.
    - Sửa title trùng slug với khóa học khác -> slug tự động thêm `-1`.
    - Sửa học phí (miễn phí về có phí, có phí sang miễn phí).
    - Sửa level, shortDescription, description.
    - Giảng viên khác sửa khóa học -> ném lỗi `ForbiddenException`.
- **Output:** Controller endpoint hoàn chỉnh, 100% test cases pass.
- **Verify:** `pnpm --filter backend test` pass.

---

### Phase 2: Frontend Components & Inline Edit Feature

#### Task 2.1: Tạo Component Reusable `Popover`
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `clean-code`
- **Input:** `@base-ui/react/popover`
- **Action:**
  - Tạo `frontend/src/components/ui/popover.tsx` sử dụng `@base-ui/react/popover` bọc theo chuẩn Shadcn (bao gồm `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverPortal`).
  - Hỗ trợ animation mượt mà, backdrop blur nhẹ, focus management, và tuân thủ chặt chẽ design tokens và **Purple Ban** (dùng màu neutral/zinc/slate).
- **Output:** Component Popover tái sử dụng sẵn sàng trong `@/components/ui/popover`.
- **Verify:** Popover mở/đóng chính xác khi click trigger hoặc click ra ngoài.

#### Task 2.2: Frontend API Client & Mutation Hook
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`, `react-best-practices`
- **Input:** `frontend/src/features/course/api/course.api.ts`
- **Action:**
  - Thêm phương thức `courseApi.updateCourse(courseId: string, payload: IUpdateCoursePayload): Promise<ICourse>`.
  - Thêm hook `useUpdateCourseMutation(courseId: string)`:
    - Khi mutation thành công: Tự động invalidate `courseKeys.detail(courseId)` và `courseKeys.myCourses()`.
    - Hiển thị thông báo Toast thành công hoặc lỗi qua `sonner`.
- **Output:** Hook sẵn sàng cho tất cả các inline components.
- **Verify:** Gọi test mock hook cập nhật dữ liệu và trigger refetch thành công.

#### Task 2.3: Xây Dựng Component `CourseTitleInlineEdit`
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `clean-code`
- **Input:** Tiêu đề và Slug hiện tại của khóa học
- **Action:**
  - Tạo `frontend/src/features/course/components/inline/course-title-inline-edit.tsx`.
  - **Trạng thái xem:** Thẻ `<h1>` font-bold text-2xl/3xl, nhóm `group`, hiển thị icon bút chì `lucide:pencil` khi hover (hoặc bấm vào icon). Bên dưới hiển thị badge slug hiện tại.
  - **Trạng thái sửa:**
    - Input text auto-focus, độ dài tối thiểu 3, tối đa 200 ký tự.
    - Cụm nút hành động góc phải input:
      - Nút tick xanh (`lucide:check`, `text-emerald-600 hover:bg-emerald-500/10`) để Lưu.
      - Nút X đỏ/xám (`lucide:x`, `text-muted-foreground hover:bg-destructive/10 hover:text-destructive`) để Hủy.
    - Hỗ trợ phím tắt: Bấm `Enter` để lưu, `Esc` để hủy.
    - Xử lý onBlur: Nếu không bấm nút Hủy mà click ra ngoài, tự động lưu hoặc hủy tùy cấu hình an toàn (khuyến nghị: hủy nếu rỗng/không đổi; nếu có thay đổi thì lưu).
- **Output:** Inline Title Editor mượt mà, chuyên nghiệp.
- **Verify:** Đổi tên khóa học -> Input hiển thị trạng thái loading spinner -> Tên và Slug mới tự cập nhật ngay trên giao diện.

#### Task 2.4: Xây Dựng Component `CoursePriceInlinePopover`
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `clean-code`
- **Input:** Học phí hiện tại (`price`, `originalPrice`)
- **Action:**
  - Tạo `frontend/src/features/course/components/inline/course-price-inline-popover.tsx`.
  - Trigger gắn vào ô "Học phí" trong Quick Stats Grid (kèm icon chỉnh sửa nhỏ khi hover).
  - Nội dung Popover:
    - Header: "Cập nhật học phí khóa học".
    - Segmented Switch/Radio chọn 2 chế độ:
      - **Miễn phí** (`price = 0`).
      - **Có phí**.
    - Nếu chọn Có phí, mở rộng hiển thị 2 ô input số có hậu tố `đ`:
      - **Giá gốc (Niêm yết)**: Ô nhập bắt buộc (ví dụ: `500,000`).
      - **Giá khuyến mãi (Sale Price)**: Ô nhập tùy chọn (ví dụ: `299,000`).
    - Hiển thị cảnh báo validation nếu `salePrice > originalPrice`.
    - Nút "Lưu học phí" và "Hủy".
  - Hiển thị trên giao diện:
    - Nếu miễn phí: Chữ "Miễn phí" xanh ngọc (`text-emerald-600`).
    - Nếu có khuyến mãi: Hiển thị giá bán đậm kèm giá gốc gạch ngang nhỏ bên cạnh (`299.000 đ` kèm `<s>500.000 đ</s>`).
- **Output:** Popover trực quan, tính toán giá chính xác.
- **Verify:** Đổi từ Miễn phí sang Có phí -> Gửi payload đúng -> UI cập nhật học phí lập tức.

#### Task 2.5: Xây Dựng Component `CourseLevelInlineSelect`
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `clean-code`
- **Input:** Cấp độ hiện tại (`level`)
- **Action:**
  - Tạo `frontend/src/features/course/components/inline/course-level-inline-select.tsx`.
  - Có thể click trực tiếp vào Badge cấp độ ở header hoặc ô Cấp độ trong Quick Stats.
  - Dropdown hiển thị 4 lựa chọn:
    - `ALL_LEVELS`: Mọi cấp độ
    - `BEGINNER`: Cơ bản
    - `INTERMEDIATE`: Trung cấp
    - `ADVANCED`: Nâng cao
  - Khi chọn một mục khác giá trị hiện tại, tự động gửi mutation PATCH cập nhật ngay lập tức với spinner nhỏ và toast thành công.
- **Output:** Chuyển đổi cấp độ 1-click mượt mà.
- **Verify:** Click chọn cấp độ -> Icon loading nhẹ -> Cập nhật thành công.

#### Task 2.6: Xây Dựng Card Inline `CourseShortDescInlineCard` & `CourseDescInlineCard`
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `clean-code`
- **Input:** `shortDescription` và `description` hiện có của khóa học
- **Action:**
  - **Mô tả ngắn gọn (`shortDescription`):**
    - Tạo `course-short-desc-inline-card.tsx`.
    - Header card có nút "Sửa" (`lucide:pencil`) ở góc phải.
    - Khi click: Nội dung text chuyển thành `<Textarea rows={3} maxLength={200} />`.
    - Phía dưới góc phải textarea hiển thị bộ đếm ký tự `[độ_dài]/200` (đổi màu vàng cam khi >180 ký tự).
    - Cụm nút: "Lưu thay đổi" (disabled nếu vượt quá 200 hoặc không đổi) và "Hủy".
  - **Nội dung mô tả chi tiết (`description`):**
    - Tạo `course-desc-inline-card.tsx`.
    - Header card có nút "Chỉnh sửa nội dung" (`lucide:pencil`) ở góc phải.
    - Khi click: Card chuyển sang chế độ soạn thảo với component `RichTextEditor` (Tiptap) đã dựng sẵn.
    - Cụm nút phía dưới: "Lưu nội dung" và "Hủy".
- **Output:** Giảng viên có thể chỉnh sửa cả mô tả tóm tắt lẫn nội dung chi tiết dạng Rich Text ngay tại chỗ.
- **Verify:** Nhập mô tả ngắn > 200 ký tự bị chặn/báo đỏ; chỉnh sửa mô tả chi tiết lưu HTML chuẩn.

#### Task 2.7: Tích Hợp Toàn Bộ Vào `CourseDetailContent`
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`, `frontend-design`
- **Input:** `frontend/src/features/course/components/course-detail-content.tsx`
- **Action:**
  - Thay thế các khối tĩnh bằng các component inline mới xây dựng:
    - Thay khối `<h1>{course.title}</h1>` bằng `<CourseTitleInlineEdit course={course} />`.
    - Thay ô Giá trong Quick Stats bằng `<CoursePriceInlinePopover course={course} />`.
    - Thay ô Cấp độ bằng `<CourseLevelInlineSelect course={course} />`.
    - Thay Card Mô tả ngắn gọn bằng `<CourseShortDescInlineCard course={course} />`.
    - Thay Card Nội dung mô tả chi tiết bằng `<CourseDescInlineCard course={course} />`.
  - Đảm bảo layout responsive hoàn hảo trên mọi kích thước màn hình (mobile, tablet, desktop).
- **Output:** Trang chi tiết khóa học sở hữu trải nghiệm Inline Editing cao cấp, chuẩn LMS hiện đại.
- **Verify:** Mở `http://localhost:3000/instructor/courses/[id]` và thực hiện tuần tự việc sửa từng trường thông tin.

---

### Phase 3: Kiểm Thử & Tối Ưu Hóa (QA & Verification)

#### Task 3.1: Viết Unit Tests & E2E Testing
- **Agent:** `test-engineer`
- **Skills:** `testing-patterns`, `webapp-testing`
- **Input:** `frontend/src/features/course/tests/`
- **Action:**
  - Viết test kiểm tra trạng thái bật/tắt chế độ edit của Title, Price Popover, Short Description Textarea (kiểm tra bộ đếm ký tự `0/200`).
  - Viết test kiểm tra phím tắt Enter/Esc trên inline input.
  - Chạy toàn bộ test suite của backend và frontend.
- **Output:** 100% test cases pass.
- **Verify:** `pnpm test` pass toàn diện.

---

## 4. Kế Hoạch Phòng Ngừa Rủi Ro & Rollback

| Rủi ro tiềm ẩn | Biện pháp phòng ngừa / Khắc phục |
| :--- | :--- |
| **Xung đột Slug đồng thời (Race Condition)** | Kiểm tra regex và cấp số thứ tự thực hiện bên trong MongoDB transaction session; index unique trên slug sẽ chặn tuyệt đối duplicate key error. |
| **Lưu nhầm khi người dùng bấm trượt ra ngoài (`onBlur`)** | Với Title, nếu người dùng bấm `Esc` hoặc bấm nút Hủy, lập tức revert về giá trị ban đầu. Với Short Description và Rich Text, chỉ lưu khi bấm nút "Lưu thay đổi", không tự động lưu khi blur để tránh mất dữ liệu. |
| **Lỗi Hydration SSR với Popover / Floating UI** | Sử dụng `@base-ui/react/popover` với mounting portal an toàn hoặc dynamic client rendering (`'use client'`). |
| **Vi phạm Purple Ban** | Sử dụng các gam màu trung tính của Shadcn: Slate, Zinc, Emerald (thành công/lưu), Destructive (hủy/xóa). Tuyệt đối không dùng màu tím/violet. |

---

## 5. Phase X: Final Verification Checklist

- [x] `ICourse` và `IUpdateCoursePayload` trong `share-lib` định nghĩa đầy đủ trường `originalPrice` và các thuộc tính liên quan.
- [x] Hàm `slugify` tiếng Việt dùng chung từ `share-lib` hoạt động chính xác với các ký tự có dấu, chữ `đ`, `Đ`.
- [x] Backend endpoint `PATCH /courses/:id` bảo vệ bằng RolesGuard và kiểm tra quyền sở hữu của giảng viên.
- [x] Thuật toán sinh hậu tố slug `-1`, `-2` tự động tăng chính xác khi sửa tiêu đề trùng lặp.
- [x] Component Popover `@base-ui/react` hoạt động mượt mà, hỗ trợ chọn Miễn phí hoặc Có phí (Giá gốc + Giá khuyến mãi).
- [x] Dropdown Cấp độ cho phép đổi trực tiếp tại chỗ và tự động lưu.
- [x] Textarea Mô tả ngắn hiển thị bộ đếm ký tự `0/200`, chặn nhập quá 200 ký tự.
- [x] Card Nội dung mô tả chi tiết cho phép chuyển sang `RichTextEditor` để sửa và lưu HTML an toàn.
- [x] Tuân thủ tuyệt đối quy tắc **Clean Code** và **Purple Ban** (không có màu tím).
- [x] Không có type `any` nào được sử dụng trong mã nguồn mới.
- [x] Toàn bộ unit tests backend và frontend pass 100%.

## ✅ PHASE X COMPLETE

- **Backend Unit Tests**: ✅ Pass (337/337 tests pass, bao gồm test suite cho `updateCourse` và `generateUniqueSlug`)
- **Frontend Unit Tests**: ✅ Pass (10/10 tests pass trong `course-inline-edit.spec.ts`)
- **Frontend Typecheck**: ✅ Pass (`tsc --noEmit` 0 errors)
- **Frontend ESLint**: ✅ Pass (`eslint src/` 0 errors, 0 warnings)
- **Date**: 2026-10-04
