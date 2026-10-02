# PLAN: Lesson Key Points Unique UUID Identification (Định Danh ID Riêng Biệt Cho Từng Ý Cốt Lõi)

> **Mục tiêu:**
> 1. Nâng cấp cấu trúc dữ liệu của các **Ý cốt lõi bài học (Lesson Key Points)** từ mảng chuỗi đơn thuần (`string[]`) sang mảng đối tượng có định danh duy nhất: `ILessonKeyPoint[] = Array<{ id: string; text: string }>`.
> 2. Sử dụng định danh chuẩn quốc tế **UUID v4** (`crypto.randomUUID()`) cho từng ý, tạo nền tảng vững chắc cho:
>    - Nhận diện và liên kết các node con trên sơ đồ tư duy Mindmap (Markmap / React Flow).
>    - Theo dõi tiến độ hoàn thành từng ý học của học viên.
>    - Đảm bảo tính ổn định của React DOM (`key={point.id}` thay vì `key={index}`) khi thêm, sửa, xóa hoặc sắp xếp lại thứ tự.
> 3. Tương thích ngược 100% với cơ chế lưu trữ hiện tại: serialize đối tượng `[{ id, text }]` thành chuỗi JSON qua trường `description` của bài học, không cần can thiệp migration hay thay đổi cấu trúc database MongoDB / backend DTO.
> 4. Tự động nâng cấp (auto-migration) các dữ liệu cũ (chuỗi text hoặc mảng string đơn thuần) thành dạng đối tượng có UUID khi load lên giao diện.
>
> **Task Slug:** `keypoint-ids`  
> **Primary Agent:** `frontend-specialist`  
> **Supporting Agent:** `project-planner`  
> **Skill References:** `clean-code`, `frontend-design`, `plan-writing`

---

## 1. Phân Tích Kỹ Thuật & Cấu Trúc Dữ Liệu

### 1.1. Interface Đối Tượng Ý Cốt Lõi (`ILessonKeyPoint`)
```ts
export interface ILessonKeyPoint {
  id: string;   // Chuỗi UUID v4 chuẩn quốc tế: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  text: string; // Nội dung ý cốt lõi (tối đa 200 ký tự)
}
```

### 1.2. Cơ Chế Sinh UUID v4 Chuẩn Quốc Tế
Sử dụng API chuẩn `crypto.randomUUID()` sẵn có của trình duyệt hiện đại và môi trường Node.js 16+, kèm fallback an toàn:
```ts
export function generateKeyPointId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
```

### 1.3. Cơ Chế Serialization & Backward Compatibility
- **Serialize khi Lưu:**
  ```ts
  export function serializeKeyPoints(points?: ILessonKeyPoint[]): string {
    const cleaned = (points ?? [])
      .filter((p) => p && typeof p.text === 'string' && p.text.trim().length > 0)
      .map((p) => ({
        id: p.id?.trim() || generateKeyPointId(),
        text: p.text.trim(),
      }));
    return JSON.stringify(cleaned);
  }
  ```
- **Deserialize khi Đọc:**
  - Nếu là JSON array của `{ id, text }` -> Giữ nguyên ID, trim text.
  - Nếu là JSON array của `string[]` (dữ liệu cũ từ Milestone 35) -> Tự động sinh UUID mới cho từng ý: `{ id: generateKeyPointId(), text: str }`.
  - Nếu là văn bản tự do (legacy text) -> Tách từng dòng và sinh UUID: `{ id: generateKeyPointId(), text: line }`.
  - Nếu rỗng -> Trả về mảng rỗng `[]` (khi form khởi tạo sẽ có 1 item mặc định `{ id: generateKeyPointId(), text: '' }`).

---

## 2. Kế Hoạch Thực Hiện Chi Tiết (Task Breakdown)

| Task ID | Nhiệm Vụ | Phụ Trách | INPUT → OUTPUT → VERIFY |
| :--- | :--- | :--- | :--- |
| **TASK-01** | Cập nhật tiện ích `lesson-key-points.util.ts` với kiểu `ILessonKeyPoint`, hàm `generateKeyPointId()`, và nâng cấp serialize/deserialize | `frontend-specialist`<br>`clean-code` | **INPUT:** File `lesson-key-points.util.ts`<br>**OUTPUT:** Export `ILessonKeyPoint`, `generateKeyPointId()`, serialize/deserialize với object `{ id, text }`<br>**VERIFY:** Unit test kiểm tra sinh đúng định dạng UUID và chuyển đổi dữ liệu legacy |
| **TASK-02** | Cập nhật Zod validation schema trong `create-lesson.schema.ts` | `frontend-specialist`<br>`clean-code` | **INPUT:** File `create-lesson.schema.ts`<br>**OUTPUT:** `keyPoints` validate mảng đối tượng `z.object({ id: z.string(), text: z.string() })`<br>**VERIFY:** Form báo lỗi chính xác khi mảng rỗng hoặc text rỗng |
| **TASK-03** | Nâng cấp component `LessonKeyPointsInput` sử dụng `ILessonKeyPoint` và `key={point.id}` | `frontend-specialist`<br>`frontend-design` | **INPUT:** File `lesson-key-points-input.tsx`<br>**OUTPUT:** Quản lý state mảng đối tượng `{ id, text }`, phím Enter sinh object mới kèm UUID, gán `key={point.id}` trên DOM<br>**VERIFY:** Thao tác nhập, xóa, nhấn Enter sinh dòng mới ổn định |
| **TASK-04** | Đồng bộ hóa `SectionLessonCreateForm` | `frontend-specialist`<br>`frontend-design` | **INPUT:** File `section-lesson-create-form.tsx`<br>**OUTPUT:** Default values khởi tạo `[{ id: generateKeyPointId(), text: '' }]`, reset form và submit payload chuẩn hóa<br>**VERIFY:** Submit bài học mới lưu thành công chuỗi JSON `[{ id, text }]` |
| **TASK-05** | Cập nhật giao diện hiển thị trong `LessonDetailContent` và `ContextualInspectorPanel` | `frontend-specialist`<br>`frontend-design` | **INPUT:** File `lesson-detail-content.tsx` và `contextual-inspector-panel.tsx`<br>**OUTPUT:** Render các thẻ/badge pastel sử dụng `point.id` làm React key và hiển thị `point.text`<br>**VERIFY:** Xem chi tiết bài học và inspector panel hiển thị đầy đủ, không có warning `key` của React |
| **TASK-06** | Cập nhật toàn diện bộ Unit Test trong `lesson-key-points.spec.ts` | `frontend-specialist`<br>`clean-code` | **INPUT:** File `lesson-key-points.spec.ts`<br>**OUTPUT:** Bộ test kiểm thử UUID regex, serialization object, auto-migration legacy string, schema validation<br>**VERIFY:** Chạy `npx tsx --test` đạt 100% pass |

---

## 3. Giai Đoạn Kiểm Thử & Nghiệm Thu (Phase X)

- [x] **Type Check & Lint:** `pnpm --filter frontend exec npx tsc --noEmit` và `pnpm --filter frontend lint` đạt 0 lỗi, 0 cảnh báo.
- [x] **UUID Regex Validation:** Tất cả ID sinh ra tuân thủ định dạng UUID v4: `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`.
- [x] **Backward Compatibility:** Dữ liệu cũ dạng chuỗi `["Ý 1", "Ý 2"]` hoặc legacy multiline được tự động gán UUID khi hiển thị mà không gây lỗi ứng dụng.
- [x] **DOM Stability:** Danh sách nhập liệu sử dụng `key={point.id}`, không bị mất focus hoặc nhầm lẫn nội dung khi xóa một ý ở giữa danh sách.
- [x] **Full Test Suite:** 100% test cases pass trên cả Frontend (14/14 tests) và Backend.

