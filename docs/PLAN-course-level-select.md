# PLAN: Redesign Component Dropdown Chọn Cấp Độ (Course Level Custom Select)

> **Mục tiêu:**
> 1. Thiết kế và triển khai một **Modern Custom Select** đẳng cấp SaaS hiện đại, tối giản, thanh lịch cho trường **Cấp độ (Trình độ)** trong form tạo/chỉnh sửa khóa học (`create-course-form.tsx`).
> 2. Đạt chuẩn cân xứng tuyệt đối 1:1 với ô input **Học phí (VND)** nằm kế bên: cùng chiều cao, cùng bán kính bo góc (`rounded-xl`), cùng màu nền/border, cùng hiệu ứng focus ring, cùng typography.
> 3. Tích hợp thanh chỉ số trực quan (Level Bars Indicator) tinh tế:
>    - **Tất cả cấp độ (`ALL_LEVELS`)**: Biểu tượng phân tầng toàn diện (`lucide:layers` hoặc 3 vạch trung tính).
>    - **Cơ bản (`BEGINNER`)**: 1 thanh vạch kích hoạt (1/3).
>    - **Trung cấp (`INTERMEDIATE`)**: 2 thanh vạch kích hoạt (2/3).
>    - **Nâng cao (`ADVANCED`)**: 3 thanh vạch kích hoạt (3/3).
> 4. Không dùng emoji, không subtitle/mô tả dài dòng, hỗ trợ checkmark kích hoạt và hiệu ứng animation mở popup mượt mà.
> 5. Giữ nguyên 100% logic backend, enum `CourseLevelEnum`, và tích hợp an toàn với `react-hook-form` thông qua `<Controller />`.
>
> **Task Slug:** `course-level-select`  
> **Plan File:** `docs/PLAN-course-level-select.md`  
> **Primary Agent:** `frontend-specialist`  
> **Supporting Agents:** `project-planner`, `test-engineer`  
>
> **Đã thống nhất:**
> - **Visual cho 'Tất cả cấp độ'**: Cụm 3 vạch xếp tầng phân cấp đồng mức hoặc icon layers nhỏ gọn.
> - **Chiều cao chuẩn**: `h-8` (32px) đồng bộ cho cả ô Học phí (VND) và Dropdown Cấp độ, kết hợp bo góc `rounded-xl`.  

---

## 1. Phân Tích Hiện Trạng & Yêu Cầu Kỹ Thuật

### 1.1. Hiện Trạng Codebase

| Thành phần | File / Vị trí | Hiện trạng | Vấn đề / Cần nâng cấp |
| :--- | :--- | :--- | :--- |
| **Field Cấp độ hiện tại** | `frontend/src/features/course/components/create-course-form.tsx` (L220-L263) | Đang sử dụng thẻ HTML native `<select id="level">` với các thẻ `<option>` đơn điệu | Giao diện thô cứng, phụ thuộc render hệ điều hành, không có icon/visual bars, không có checkmark, thiếu cảm giác SaaS cao cấp. |
| **Field Học phí kế bên** | `frontend/src/features/course/components/create-course-form.tsx` (L189-L219) | Dùng `<Input id="price" type="number">` với đuôi tiền tệ `đ` tuyệt đối bên phải | Đang dùng class mặc định (`h-8 rounded-lg`), cần đồng bộ nâng cấp thẩm mỹ với field Cấp độ để tạo thành cặp đôi hài hòa. |
| **Enum & Contract** | `share-lib/src/interfaces/course.interface.ts` | `CourseLevelEnum` gồm 4 giá trị: `ALL_LEVELS`, `BEGINNER`, `INTERMEDIATE`, `ADVANCED` | Giữ nguyên 100% enum và kiểu dữ liệu. |
| **Design Tokens & Icons** | `frontend/src/app/globals.css`, `@iconify/react` (`lucide:*`) | Hỗ trợ CSS Variables OKLCH, Dark mode, `rounded-xl`, Lucide icons qua component `Icon` | Tận dụng token chuẩn của hệ thống, tuyệt đối tuân thủ Purple Ban. |

---

### 1.2. So Sánh Chi Tiết Thiết Kế (Before vs. After)

```
[HIỆN TẠI - Thô sơ, Native HTML Select]
┌─────────────────────────────────┐
│ Cấp độ (Tùy chọn)               │
│ [ Tất cả cấp độ               ▼]│  <-- Thẻ <select> mặc định của OS, không icon, không hiệu ứng
└─────────────────────────────────┘

[SAU KHI REDESIGN - Modern SaaS Custom Select]
┌────────────────────────────────────────────────────────┐
│ Cấp độ (Tùy chọn)                                      │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [▰▱▱]  Cơ bản                                   ▲ │ │  <-- Trigger: h-9 / h-10, rounded-xl, border nhẹ
│ └────────────────────────────────────────────────────┘ │
│   ┌──────────────────────────────────────────────────┐ │  <-- Floating Panel (z-50, shadow-lg, border-border)
│   │ [▤] Tất cả cấp độ                                │ │
│   │ [▰▱▱] Cơ bản                                   ✓ │ │  <-- Active state (bg-primary/5, text-primary)
│   │ [▰▰▱] Trung cấp                                  │ │
│   │ [▰▰▰] Nâng cao                                   │ │
│   └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## 2. Kiến Trúc & Thiết Kế Giải Pháp Component

### 2.1. Cấu Trúc Thư Mục & File Dự Kiến

```plaintext
frontend/src/
├── features/course/
│   ├── components/
│   │   ├── course-level-select.tsx          # [MỚI] Custom Select component độc lập, tái sử dụng được
│   │   └── create-course-form.tsx           # [CẬP NHẬT] Thay thế <select> bằng <CourseLevelSelect /> qua Controller
│   └── tests/
│       └── course-level-select.spec.ts      # [MỚI] Unit test kiểm tra logic lựa chọn, render options & enum mapping
```

---

### 2.2. Thiết Kế Chi Tiết Từng Phần

#### A. Level Indicator Visual (Thanh Cấp Độ)
Thay vì icon thô hoặc emoji, ta xây dựng một sub-component SVG/Flex siêu nhẹ `LevelIndicator`:
- **`ALL_LEVELS` ('Tất cả cấp độ')**:
  - Icon `lucide:layers` kích thước `size-3.5` hoặc cụm 3 vạch xếp tầng đồng mức thể hiện tính phổ quát.
- **`BEGINNER` ('Cơ bản')**:
  - 3 vạch mini dọc (cao 6px, 9px, 12px; rộng 3px, bo góc `rounded-full`):
  - Vạch 1: màu `text-primary` (kích hoạt).
  - Vạch 2, 3: màu `text-muted-foreground/30` (chưa kích hoạt).
- **`INTERMEDIATE` ('Trung cấp')**:
  - Vạch 1, 2: màu `text-primary` (kích hoạt).
  - Vạch 3: màu `text-muted-foreground/30`.
- **`ADVANCED` ('Nâng cao')**:
  - Cả 3 vạch 1, 2, 3: màu `text-primary` (kích hoạt đầy đủ).

#### B. Trigger Button (Đóng vai trò như 1 Form Input)
- **Kích thước**: Chiều cao `h-8` (32px) khớp 100% với ô Học phí mặc định.
- **Bo góc**: `rounded-xl`.
- **Màu sắc**:
  - Light mode: `bg-background border border-input hover:border-border/80`.
  - Dark mode: `dark:bg-input/20 border-input`.
- **Bố cục (Flexbox justify-between)**:
  - Trái: `LevelIndicator` của cấp độ đang chọn (`shrink-0`).
  - Giữa: Nhãn cấp độ (`text-sm font-medium text-foreground truncate pl-2 flex-1 text-left`).
  - Phải: `Icon icon="lucide:chevron-down"` (`size-4 text-muted-foreground shrink-0 transition-transform duration-200`, xoay `rotate-180` khi mở menu).
- **Focus & Error State**:
  - Focus: `focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring outline-none`.
  - Invalid (Error): `border-destructive ring-destructive/20`.

#### C. Dropdown Floating Panel
- **Vị trí**: Tuyệt đối ngay dưới Trigger (`top-full mt-1.5 inset-x-0`), `z-50`.
- **Style**: `bg-popover text-popover-foreground border border-border/80 shadow-lg rounded-xl p-1.5 space-y-0.5`.
- **Animation**:
  - Mở: `animate-in fade-in-0 zoom-in-95 duration-150 ease-out`.
  - Đóng: `animate-out fade-out-0 zoom-out-95 duration-100 ease-in`.
- **Option Item Layout**:
  - `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors cursor-pointer select-none`.
  - Khi Active: `bg-primary/10 text-primary font-medium`.
  - Khi Hover: `hover:bg-muted/70 text-foreground`.
  - Checkmark: `<Icon icon="lucide:check" className="size-4 ml-auto text-primary" />` (chỉ xuất hiện tại option đang chọn).

#### D. UX & Keyboard Accessibility
- **Click Trigger**: Bật/tắt dropdown.
- **Click Option**: Cập nhật giá trị `onChange`, tự động đóng dropdown, trả focus về trigger.
- **Click Outside**: Tự động đóng dropdown qua listener `mousedown`.
- **Phím Escape**: Đóng dropdown ngay lập tức.
- **Phím Arrow Up / Down**: Di chuyển tiêu điểm giữa các lựa chọn.
- **Phím Enter / Space**: Chọn giá trị đang focus.

---

### 2.3. Tích Hợp React Hook Form (`create-course-form.tsx`)

Sử dụng component `<Controller />` từ `react-hook-form`:
```tsx
<Controller
  control={control}
  name="level"
  render={({ field, fieldState }) => (
    <CourseLevelSelect
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      disabled={isPending}
      isInvalid={Boolean(fieldState.error)}
    />
  )}
/>
```
Đồng thời tinh chỉnh ô input `price` ở cột bên trái:
```tsx
<Input
  id="price"
  type="number"
  min={0}
  step={1000}
  placeholder="0"
  aria-invalid={Boolean(errors.price)}
  disabled={isPending}
  className="h-8 rounded-xl" // Đảm bảo đồng bộ chiều cao và bo góc tuyệt đối với CourseLevelSelect
  {...register('price', { valueAsNumber: true })}
/>
```

---

## 3. Kế Hoạch Triển Khai Chi Tiết (Phases)

### Giai Đoạn 1: Xây Dựng Component `CourseLevelSelect`
- Tạo file `frontend/src/features/course/components/course-level-select.tsx`.
- Thiết kế `LevelIndicator` SVG/Bar mini tinh tế cho 4 cấp độ.
- Triển khai Trigger, Floating Panel, Option list và các trạng thái Active / Hover.
- Thêm ref và hook xử lý click-outside, phím Escape, phím mũi tên.

### Giai Đoạn 2: Tích Hợp Vào Form & Cân Chỉnh Với Field Học Phí
- Mở `frontend/src/features/course/components/create-course-form.tsx`.
- Import `CourseLevelSelect` và bọc qua `<Controller />`.
- Đồng bộ kích thước (`h-9`, `rounded-xl`) giữa `Input` Học phí và `CourseLevelSelect`.
- Kiểm tra hiển thị thông báo lỗi validation nếu có.

### Giai Đoạn 3: Export & Tái Sử Dụng
- Thêm export `CourseLevelSelect` vào `frontend/src/features/course/components/index.ts` hoặc `frontend/src/features/course/index.ts`.

### Giai Đoạn 4: Kiểm Thử & Đảm Bảo Chất Lượng
- Viết unit test `course-level-select.spec.ts` kiểm thử:
  1. Render 4 cấp độ tương ứng `CourseLevelEnum`.
  2. LevelIndicator hiển thị số vạch chuẩn (1, 2, 3 vạch).
  3. Giá trị default và thay đổi giá trị khi click option.
- Chạy `npx tsc --noEmit` và `pnpm --filter frontend lint` đảm bảo 0 errors, 0 warnings.
- Kiểm tra tính tương phản và thẩm mỹ ở cả Light Mode và Dark Mode.

---

## 4. Bảng Tiêu Chí Nghiệm Thu (Verification Checklist)

| Tiêu chí | Mô tả kiểm tra | Kết quả mong đợi |
| :--- | :--- | :--- |
| **Visual Consistency** | Đặt cạnh field Học phí (VND) trên cả màn hình desktop và mobile | Cùng chiều cao `h-8`, cùng `rounded-xl`, viền và nền tiệp nhau 100% |
| **No Emoji & No Subtitle** | Kiểm tra danh sách option | 100% không có emoji, không có văn bản giải thích phụ, chỉ gồm: `[Indicator] [Tên cấp độ] [Checkmark]` |
| **Chevron Rotation** | Click mở/đóng Trigger | Icon chevron xoay mượt mà 180 độ |
| **Click Outside / Escape** | Mở dropdown rồi bấm phím Esc hoặc click chuột ra ngoài | Dropdown đóng ngay lập tức |
| **Form Data & Validation** | Submit form tạo khóa học với các cấp độ khác nhau | Payload gửi lên backend đúng chuẩn enum (`ALL_LEVELS`, `BEGINNER`, etc.) |
| **Dark Mode** | Chuyển đổi giữa theme Sáng / Tối | Màu popover, text và border hiển thị tương phản rõ nét, không bị chói hoặc chìm |
| **Zero Lints & Tests** | Chạy toàn bộ test suite frontend | 100% pass, 0 lỗi TypeScript, 0 cảnh báo ESLint |
