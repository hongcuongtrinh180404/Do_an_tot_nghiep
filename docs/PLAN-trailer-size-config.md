# PLAN: Trailer Upload Size Config (600MB, UI Silent)

> **Mục tiêu:**
> 1. Nâng giới hạn dung lượng tối đa cho video trailer lên **600MB** (khai báo nội bộ trong code).
> 2. **Ẩn** dòng text hiển thị giới hạn dung lượng khỏi giao diện Empty State của khối Trailer.
> 3. Chỉ sửa đổi file UI, không đụng đến backend hay bất kỳ logic upload thực tế nào.
>
> **Task Slug:** `trailer-size-config`
> **Project Type:** `WEB`
> **Primary Agent:** `frontend-specialist`

---

## 1. Phân Tích Thay Đổi

### 1.1. File mục tiêu
- [`course-media-preview.tsx`](file:///d:/Download/hk1_2027/project_do_an/frontend/src/features/course/components/course-media-preview.tsx)

### 1.2. Thay đổi cụ thể

| # | Loại | Mô tả |
|---|------|--------|
| 1 | **XÓA khỏi UI** | Bỏ dòng `<p className="text-xs text-muted-foreground mt-1.5">Hỗ trợ MP4, WebM (Tối đa 100MB)</p>` trong khối Trailer Empty State (line 81-83) |
| 2 | **THÊM hằng số nội bộ** | Khai báo `const MAX_TRAILER_SIZE_BYTES = 600 * 1024 * 1024` ở đầu file để sẵn sàng dùng khi triển khai logic upload (không render ra UI) |

> **Lưu ý:** Dòng ghi chú định dạng *"Hỗ trợ MP4, WebM"* trong khối Thumbnail **KHÔNG thay đổi**. Chỉ xóa phần "(Tối đa 100MB)" của Trailer.

---

## 2. Task Breakdown

| Task ID | Nhiệm Vụ | Input → Output → Verify |
|---------|----------|--------------------------|
| **TASK-01** | Xóa dòng text giới hạn dung lượng khỏi UI Trailer | **IN:** Line 81-83 `course-media-preview.tsx` <br>**OUT:** Khối Trailer Empty State chỉ còn icon + tiêu đề, không có text phụ <br>**VERIFY:** Giao diện không hiển thị bất kỳ text nào về dung lượng cho Trailer |
| **TASK-02** | Thêm hằng số `MAX_TRAILER_SIZE_BYTES` nội bộ | **IN:** Đầu file component <br>**OUT:** `const MAX_TRAILER_SIZE_BYTES = 600 * 1024 * 1024` (628,060,160 bytes) <br>**VERIFY:** TypeScript compile pass, không xuất hiện trên UI |
| **TASK-03** | Kiểm tra TypeScript compilation | **IN:** File sau chỉnh sửa <br>**OUT:** `pnpm --filter frontend exec npx tsc --noEmit` exit code 0 |

---

## 3. Phase X: Verification Checklist

- [ ] Khối Trailer Empty State **không** hiển thị bất kỳ text nào về giới hạn dung lượng
- [ ] Khối Thumbnail Empty State **vẫn giữ nguyên** hoàn toàn (không bị ảnh hưởng)
- [ ] Hằng số `MAX_TRAILER_SIZE_BYTES = 600 * 1024 * 1024` được khai báo trong file
- [ ] TypeScript compilation pass với exit code 0
