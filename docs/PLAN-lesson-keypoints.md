# PLAN: Lesson Key Points Dynamic Input (Nội Dung Cốt Lõi Bài Học)

> **Mục tiêu:**
> 1. Thay thế ô `<textarea>` "Mô tả bài học" truyền thống trong form tạo bài học (`SectionLessonCreateForm`) bằng danh sách nhập liệu động các **Ý cốt lõi của bài học** (Lesson Key Points).
> 2. Mỗi ý cốt lõi sẽ mang một màu pastel dịu mắt xoay vòng (color cycling 5 màu) ở tầng UI, hỗ trợ trải nghiệm thị giác trực quan cho giảng viên khi biên soạn nội dung nhánh sơ đồ tư duy (Mindmap).
> 3. Hỗ trợ thao tác phím mượt mà: bấm `Enter` tại bất kỳ dòng nào sẽ tự động tạo một dòng mới bên dưới và focus con trỏ vào ô mới.
> 4. Lưu trữ dữ liệu chuẩn hóa dạng mảng chuỗi `string[]` được serialize qua trường `description` (JSON stringify mảng chuỗi thuần túy không chứa mã màu), tương thích 100% với schema hiện tại của backend và database.
> 5. Áp dụng ràng buộc validation: bắt buộc tối thiểu 1 ý cốt lõi, tự động chuẩn hóa khoảng trắng (trim whitespace), và loại bỏ dòng rỗng khi submit.
>
> **Task Slug:** `lesson-keypoints`  
> **Primary Agent:** `frontend-specialist`  
> **Supporting Agent:** `project-planner`  
> **Skill References:** `frontend-design`, `clean-code`, `plan-writing`

---

## 1. Phân Tích Kỹ Thuật & Kiến Trúc

### 1.1. Bảng Màu Pastel Xoay Vòng (Pastel Palette)
Hệ thống sử dụng palette 5 màu pastel theo chu kỳ `index % 5` (chỉ áp dụng hiển thị UI, không lưu DB):

| Index | Tên Màu | Mã Nền (Background) | Mã Viền (Border) | Text Color |
| :---: | :--- | :--- | :--- | :--- |
| `0` | Hồng phấn | `#FFADAD` (hoặc `rgba(255, 173, 173, 0.35)`) | `#F59595` | `#1E293B` (`text-slate-800`) |
| `1` | Cam đào | `#FFD6A5` (hoặc `rgba(255, 214, 165, 0.40)`) | `#F3BE7E` | `#1E293B` (`text-slate-800`) |
| `2` | Vàng kem | `#FDFFB6` (hoặc `rgba(253, 255, 182, 0.45)`) | `#E9EB8E` | `#1E293B` (`text-slate-800`) |
| `3` | Xanh bạc hà | `#CAFFBF` (hoặc `rgba(202, 255, 191, 0.40)`) | `#A7EBA3` | `#1E293B` (`text-slate-800`) |
| `4` | Xanh da trời | `#9BF6FF` (hoặc `rgba(155, 246, 255, 0.35)`) | `#75E2EE` | `#1E293B` (`text-slate-800`) |

> *Ghi chú tuân thủ Purple Ban:* Bảng màu tuyệt đối không sử dụng màu tím / tím violet. Độ tương phản chữ `text-slate-800` trên nền pastel đạt chuẩn WCAG AA.

### 1.2. Chiến Lược Dữ Liệu & Serialization
- **Frontend Form State:** Form quản lý mảng `keyPoints: string[]` trực tiếp qua `react-hook-form` / `Controller`.
- **Serialization khi Submit:** 
  ```ts
  const cleanedPoints = keyPoints.map((p) => p.trim()).filter(Boolean);
  const payloadDescription = JSON.stringify(cleanedPoints);
  ```
- **Deserialization khi Đọc/Chỉnh sửa:**
  - Nếu `description` là chuỗi JSON hợp lệ của `string[]` -> parse thành mảng các ý.
  - Nếu là chuỗi text thông thường (legacy) -> tách theo dòng `split('\n')`.
  - Nếu rỗng -> mặc định `['']`.

### 1.3. Trải Nghiệm Bàn Phím (Keyboard UX)
- Lắng nghe sự kiện `onKeyDown`:
  - Phím `Enter` (không kèm `Shift`): Ngăn chặn form submit mặc định (`e.preventDefault()`). Thêm một dòng ý mới ngay sau dòng hiện tại (hoặc ở cuối danh sách), đồng thời kích hoạt `auto-focus` vào ô input mới tạo qua `ref` map.
  - Phím `Backspace` trên ô input rỗng: Tùy chọn xóa nhanh dòng hiện tại và focus ngược về dòng trước đó (nếu còn nhiều hơn 1 dòng).

---

## 2. Cấu Trúc File & Thư Mục

```
frontend/src/features/course/
├── components/
│   ├── lesson-key-points-input.tsx       # [MỚI] Component nhập liệu danh sách ý cốt lõi động
│   └── section-lesson-create-form.tsx     # [CẬP NHẬT] Tích hợp LessonKeyPointsInput thay thế textarea
├── schemas/
│   └── create-lesson.schema.ts            # [CẬP NHẬT] Bổ sung validation keyPoints mảng tối thiểu 1 ý
└── utils/
    └── lesson-key-points.util.ts          # [MỚI] Helper serialize / deserialize JSON key points
```

---

## 3. Kế Hoạch Thực Hiện Chi Tiết (Task Breakdown)

| Task ID | Nhiệm Vụ | Phụ Trách | INPUT → OUTPUT → VERIFY |
| :--- | :--- | :--- | :--- |
| **TASK-01** | Tạo tiện ích serialize & deserialize cho `keyPoints` (`lesson-key-points.util.ts`) | `frontend-specialist`<br>`clean-code` | **INPUT:** Chuỗi `description` hoặc mảng `string[]`<br>**OUTPUT:** Các hàm `serializeKeyPoints()` và `deserializeKeyPoints()`<br>**VERIFY:** Chạy unit test kiểm tra parse mảng rỗng, mảng nhiều phần tử, và legacy string |
| **TASK-02** | Cập nhật Zod Schema `createLessonSchema` hỗ trợ validation danh sách ý cốt lõi | `frontend-specialist`<br>`clean-code` | **INPUT:** File `create-lesson.schema.ts`<br>**OUTPUT:** `keyPoints` validation (mảng chuỗi, trim, min 1 item, max 200 ký tự mỗi ý)<br>**VERIFY:** Form báo lỗi khi mảng rỗng hoặc toàn ký tự trắng |
| **TASK-03** | Xây dựng Component `LessonKeyPointsInput` | `frontend-specialist`<br>`frontend-design` | **INPUT:** Props `value: string[]`, `onChange: (val: string[]) => void`, `error?: string`<br>**OUTPUT:** Component hiển thị palette 5 màu pastel xoay vòng, nút "+ Thêm ý", nút xóa "×", auto-focus khi nhấn Enter<br>**VERIFY:** Render đủ 5 màu xoay vòng, bấm Enter sinh dòng mới và focus chuẩn xác |
| **TASK-04** | Tích hợp `LessonKeyPointsInput` vào `SectionLessonCreateForm` | `frontend-specialist`<br>`frontend-design` | **INPUT:** File `section-lesson-create-form.tsx`<br>**OUTPUT:** Thay thế hoàn toàn `<Textarea id="lesson-description">` bằng `LessonKeyPointsInput`<br>**VERIFY:** Mở Modal Thêm bài học, nhập các ý chính, submit thành công bài học với payload `description` là chuỗi JSON |
| **TASK-05** | Hiển thị các Ý cốt lõi trên giao diện xem chi tiết bài học (`LessonDetailContent`) | `frontend-specialist`<br>`frontend-design` | **INPUT:** File `lesson-detail-content.tsx`<br>**OUTPUT:** Hiển thị danh sách các badge / thẻ ý cốt lõi với màu pastel tương ứng khi xem chi tiết bài học<br>**VERIFY:** Vào trang chi tiết bài học, nhìn thấy các ý cốt lõi hiển thị rõ ràng, chuẩn bị sẵn sàng cho Mindmap |

---

## 4. Giai Đoạn Kiểm Thử & Nghiệm Thu (Phase X)

- [x] **Type Check & Lint:** `pnpm --filter frontend exec npx tsc --noEmit` và `pnpm --filter frontend lint` đạt 0 lỗi, 0 cảnh báo.
- [x] **Accessibility & UX Audit:** Độ tương phản màu chữ `text-slate-800` trên 5 nền pastel đạt chuẩn WCAG AA; phím Enter và Tab điều hướng mượt mà.
- [x] **Purple Ban Verification:** Tuyệt đối không có bất kỳ mã màu tím nào (`#8...`, `#9...` tím, `purple`, `violet`) trong component.
- [x] **Unit Tests:** 12/12 test cases passed 100% tại `src/features/course/tests/lesson-key-points.spec.ts`.
- [x] **Functional Test:** 
  1. Thêm 1 ý -> Mang màu hồng phấn (`#FFADAD`, viền `#F59595`).
  2. Bấm Enter -> Sinh ý thứ 2 màu cam đào (`#FFD6A5`, viền `#F3BE7E`) và con trỏ tự động focus vào ô mới.
  3. Thêm tiếp đến ý thứ 6 -> Màu nền lặp lại chu kỳ từ hồng phấn (`5 % 5 = 0`).
  4. Bấm nút xóa `×` -> Dòng bị xóa, thứ tự màu các dòng tự động cập nhật mượt mà.
  5. Submit form -> Dữ liệu lưu thành công với `description` chứa JSON stringify mảng chuỗi thuần túy không chứa mã màu.

## ✅ PHASE X COMPLETE

- Lint: ✅ Pass (0 errors, 0 warnings)
- Type Check: ✅ Pass (0 errors)
- Unit Tests: ✅ 12/12 Pass
- Backend Tests: ✅ 286/286 Pass
- Date: 2026-10-02

