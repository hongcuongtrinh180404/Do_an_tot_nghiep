# PLAN: Triển Khai Bộ Nhập Mốc Thời Gian Kép (Dual-Input Timestamp Picker mm:ss)

> **Mục tiêu:**
> 1. Xây dựng component nhập mốc thời gian chuyên dụng dạng kép: 2 ô input số nhỏ đặt cạnh nhau (`[Phút] : [Giây]`) với dấu `:` cố định ở giữa, thay thế ô nhập text đơn thuần tại tab Summary của Video Player.
> 2. **Chặn hoàn toàn ký tự phi số**: Chỉ chấp nhận các phím số `0-9`, `Backspace`, `Delete`, `ArrowLeft`, `ArrowRight`, `Tab`, và paste số hợp lệ.
> 3. **Khống chế giây (`ss`)**: Giới hạn cứng `0 - 59`. Nếu người dùng nhập giá trị $\ge 60$ (ví dụ: `75`), hệ thống tự động chỉnh về `59`.
> 4. **Khống chế thời lượng video (`totalDuration`)**: Mốc thời gian nhập vào (tính theo tổng giây) không được vượt quá thời lượng tối đa của video bài giảng (`duration`). Nếu vượt quá, tự động clamp về thời lượng tối đa hoặc cảnh báo tức thì.
> 5. **Tự động chuyển ô thông minh (Auto-focus transition)**:
>    - Khi nhập xong 2 chữ số ở ô phút, tự động chuyển con trỏ sang ô giây.
>    - Khi ở ô giây nhấn `Backspace` lúc ô đang rỗng, tự động chuyển con trỏ về ô phút.
>    - Hỗ trợ nhấn phím `:` hoặc `Tab` từ ô phút để nhảy sang ô giây.
> 6. **Tự động format pad 2 chữ số (`00`) on blur**: Khi rời khỏi ô nhập (`onBlur`), tự động đệm số `0` phía trước nếu chỉ có 1 chữ số (ví dụ: `5` -> `05`).
> 7. **Tích hợp nút "Hiện tại"**: Lấy chính xác `currentTime` của video và điền tức thì vào cả 2 ô phút & giây.
>
> **Task Slug:** `timestamp-input`  
> **Plan File:** `docs/PLAN-timestamp-input.md`  
> **Project Type:** `WEB`  
> **Primary Agent:** `project-planner`  
> **Assigned Agents:** `frontend-specialist`, `test-engineer`  
>
> **Đã thống nhất qua Socratic Gate:**
> 1. **Khống chế thời lượng video**: Cho phép giảng viên gõ tự do phút:giây, nhưng khi bấm nút "Lưu ý này", hệ thống sẽ kiểm tra và hiển thị cảnh báo lỗi màu đỏ (kèm toast) nếu mốc thời gian vượt quá tổng độ dài video (`duration`) và chặn không cho lưu.
> 2. **Chuyển con trỏ thông minh**: Tự động chuyển sang ô giây khi nhập đủ 2 chữ số phút (hoặc nhấn phím `:`) và tự động lùi về ô phút khi nhấn `Backspace` lúc ô giây rỗng.
> 3. **Tái sử dụng**: Xây dựng thành component dùng chung `TimestampPickerInput` tại `frontend/src/features/course/components/player/components/timestamp-picker-input.tsx` (hoặc `@/components/ui/timestamp-picker-input.tsx`) để dễ dàng tái sử dụng cho các tính năng khác trong player studio.  

---

## 1. Phân Tích Hiện Trạng & Yêu Cầu Kỹ Thuật

### 1.1. Hiện Trạng Codebase

| Thành phần | File / Module | Hiện trạng | Yêu cầu thay đổi |
| :--- | :--- | :--- | :--- |
| **Container Tab** | `frontend/src/features/course/components/player/lesson-tabs-container.tsx` | Đang truyền `currentTime`, `onSeek` vào `LessonSummaryTab`, nhưng chưa truyền `duration` (tổng thời lượng video). | Bổ sung prop `duration={duration}` vào `<LessonSummaryTab />`. |
| **Tab Summary** | `frontend/src/features/course/components/player/tabs/lesson-summary-tab.tsx` | Dùng `<Input value={keyPointTimeStr} placeholder="00:00" />` là một input chuỗi đơn lẻ, người dùng có thể gõ chữ, sai định dạng hoặc số giây vượt quá 59/duration. | Thay thế bằng component `TimestampPickerInput` chuyên biệt nhận `value` (tính bằng giây), `onChange`, `maxDuration`, và nút "Hiện tại". |
| **Component UI Mới** | `frontend/src/components/ui/timestamp-picker-input.tsx` (hoặc player components) | Chưa có component nhập mốc thời gian dạng dual-box `mm:ss`. | Tạo mới `TimestampPickerInput` tái sử dụng được ở mọi nơi cần nhập timeline video. |

---

## 2. Thiết Kế Chi Tiết Component `TimestampPickerInput`

### 2.1. Kiến Trúc Giao Diện & Trải Nghiệm Người Dùng (UX)

```
┌────────────────────────────────────────────────────────┐
│  Mốc thời gian (mm:ss):                                │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │  [ 05 ]  :  [ 26 ]    │   │ (Clock) Hiện tại     │  │
│  └───────────────────────┘   └──────────────────────┘  │
│   (Ô phút)     (Ô giây)        (Quick action button)   │
└────────────────────────────────────────────────────────┘
```

- **Hộp chứa đôi (Unified Segment Container)**:
  - Viền bo góc `rounded-lg border border-input bg-card focus-within:ring-2 focus-within:ring-sky-500/30`.
  - Hai ô input `type="text"` (với `inputMode="numeric"`):
    - Ô phút (`minutesInputRef`): độ rộng ~40px, font mono, căn giữa.
    - Dấu `:` cố định: text màu `muted-foreground`, không thể xóa hay chỉnh sửa.
    - Ô giây (`secondsInputRef`): độ rộng ~40px, font mono, căn giữa.

### 2.2. Các Quy Tắc Ràng Buộc & Thuật Toán Xử Lý

```mermaid
flowchart TD
    A[Người dùng nhấn phím tại ô Phút/Giây] --> B{Phím điều hướng hoặc số 0-9?}
    B -- Không (chữ cái, ký tự đặc biệt) --> C[Chặn e.preventDefault()]
    B -- Đúng --> D{Đang gõ ở ô Giây hay Phút?}
    D -- Ô Giây --> E[Kiểm tra giá trị sau nhập]
    E --> F{Giá trị > 59?}
    F -- Có --> G[Tự động điều chỉnh = 59]
    F -- Không --> H[Cập nhật state giây]
    D -- Ô Phút --> I{Nhập đủ 2 chữ số hoặc nhấn : / Tab?}
    I -- Có --> J[Tự động focus sang ô Giây]
    I -- Không --> K[Cập nhật state phút]
    G --> L[Tính tổng giây: phút * 60 + giây]
    H --> L
    K --> L
    L --> M{Tổng giây > maxDuration?}
    M -- Có --> N[Tự động clamp = maxDuration]
    M -- Không --> O[Gọi onChange(totalSeconds)]
```

1. **Chặn ký tự không hợp lệ (`onKeyDown`)**:
   - Cho phép các phím điều khiển: `Backspace`, `Delete`, `Tab`, `Enter`, `ArrowLeft`, `ArrowRight`.
   - Cho phép các tổ hợp phím tắt: `Ctrl/Cmd + A`, `Ctrl/Cmd + C`, `Ctrl/Cmd + V`, `Ctrl/Cmd + X`.
   - Cho phép phím `:` hoặc `/` khi đang ở ô phút để tự động chuyển focus sang ô giây (`secondsInputRef.current?.focus()`).
   - Nếu là ký tự khác ngoài `0-9`: gọi `e.preventDefault()`.
2. **Khống chế giá trị Giây (`0 - 59`)**:
   - Khi nhập ô giây: nếu giá trị parse ra $> 59$, gán cứng về `59`.
3. **Khống chế thời lượng tối đa Video (`maxDuration`)**:
   - Nếu `maxDuration > 0` và `totalSeconds > maxDuration`:
     - Tự động clamp về `maxDuration` và phân bổ lại phút:giây tương ứng của `maxDuration`.
     - Hiển thị tooltip hoặc text phụ tinh tế: *"Mốc thời gian tối đa theo video: mm:ss"*.
4. **Xử lý `onBlur` & Pad số 0**:
   - Khi người dùng blur khỏi ô phút: nếu ô đang rỗng thì chuyển thành `00`, nếu có 1 số `5` thì đệm thành `05`.
   - Khi người dùng blur khỏi ô giây: tương tự, đệm thành `00` - `59`.

---

## 3. Kế Hoạch Triển Khai (Task Breakdown)

### Phase 1: Xây Dựng Component `TimestampPickerInput` (P0)

#### Task 1.1: Tạo Component `TimestampPickerInput`
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `clean-code`, `react-best-practices`
- **File**: `frontend/src/features/course/components/player/components/timestamp-picker-input.tsx` (hoặc `@/components/ui/timestamp-picker-input.tsx`)
- **Props**:
  ```typescript
  interface TimestampPickerInputProps {
    valueSeconds: number; // Tổng giây hiện tại (0, 15, 85, ...)
    onChange: (seconds: number) => void;
    maxDuration?: number; // Tổng thời lượng video để chặn trên
    className?: string;
    disabled?: boolean;
    autoFocus?: boolean;
  }
  ```
- **Input**: Giá trị giây ban đầu và `maxDuration`.
- **Output**: Component 2 ô input đồng bộ mượt mà, không vỡ layout, tuân thủ Clean Code & Purple Ban.
- **Verify**: Typecheck thành công và kiểm tra tương tác bàn phím (Backspace, gõ số, nhảy ô).

---

### Phase 2: Tích Hợp Vào Tab Summary & Container (P1)

#### Task 2.1: Bổ Sung Prop `duration` Vào `LessonSummaryTab`
- **Agent**: `frontend-specialist`
- **Skills**: `clean-code`
- **File**:
  - `frontend/src/features/course/components/player/lesson-tabs-container.tsx`
  - `frontend/src/features/course/components/player/tabs/lesson-summary-tab.tsx`
- **Mô tả**: Truyền `duration={duration}` từ `LessonTabsContainer` vào `LessonSummaryTab`.
- **Verify**: `LessonSummaryTab` nhận đúng giá trị `duration` của video.

#### Task 2.2: Thay Thế Input Cũ Bằng `TimestampPickerInput`
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `clean-code`
- **File**: `frontend/src/features/course/components/player/tabs/lesson-summary-tab.tsx`
- **Mô tả**:
  - Thay thế input text thô sơ cũ tại form sửa ý chính và form thêm mới ý chính bằng `TimestampPickerInput`.
  - Kết nối với nút *"Hiện tại"* (`currentTime`) để set giá trị tức thì vào `TimestampPickerInput`.
- **Verify**: Mở form sửa trên trình duyệt, thử nhập các trường hợp: gõ chữ (bị chặn), gõ giây `75` (tự thành `59`), gõ phút vượt quá độ dài video (tự clamp về video duration).

---

### Phase 3: Verification & Polish (Phase X)

#### Task 3.1: Build & Type-check Toàn Diện
- **Agent**: `test-engineer`
- **Skills**: `webapp-testing`, `clean-code`
- **Mô tả**:
  - Chạy `pnpm --filter frontend build` (hoặc `npx tsc --noEmit`).
  - Kiểm tra các edge cases: video chưa load duration (`maxDuration = 0`), paste chuỗi từ clipboard, phím mũi tên.
- **Verify**: Build pass 100%, 0 lỗi type.

---

## 4. Tiêu Chí Nghiệm Thu (Definition of Done)

1. [x] Component gồm đúng 2 ô input số nhỏ đặt cạnh nhau, ở giữa có dấu `:` cố định.
2. [x] Bàn phím gõ chữ hoặc ký tự đặc biệt bị chặn hoàn toàn, chỉ cho phép số 0-9 và các phím điều hướng/xóa.
3. [x] Ô giây không bao giờ hiển thị hoặc lưu giá trị $\ge 60$ (gõ `75` tự về `59`).
4. [x] Mốc thời gian tổng không vượt quá `duration` của video (nếu vượt hiển thị lỗi đỏ và chặn không cho lưu).
5. [x] Gõ 2 số ở ô phút hoặc gõ `:` tự động nhảy sang ô giây.
6. [x] Xóa hết ô giây và bấm `Backspace` tự động lùi về ô phút.
7. [x] Rời chuột (`blur`) tự động format 2 chữ số (ví dụ: `5` -> `05`).
8. [x] Nút "Hiện tại" vẫn hoạt động chuẩn xác, cập nhật tức thì vào cả 2 ô phút và giây.
9. [x] `pnpm --filter frontend build` chạy thành công không có lỗi.

---

## ✅ PHASE X COMPLETE

- **Frontend Build**: ✅ Pass (`next build` - 0 errors, 11/11 routes).
- **TypeScript & Lint**: ✅ 0 type errors.
- **UX & Design**: ✅ 2 ô input nhỏ đặt cạnh nhau, dấu `:` cố định, viền xanh sky focus, viền đỏ rose khi vượt quá video duration, nút Hiện tại tích hợp mượt mà.
- **Date**: 2026-10-18

