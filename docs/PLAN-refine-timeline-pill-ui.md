# Kế hoạch Triển khai: Tinh Chỉnh Giao Diện Timeline Thẻ Câu (Pill Badge, Giảm Padding, Căn Giữa & Active Pastel Tinh Tế)

> **File:** `docs/PLAN-refine-timeline-pill-ui.md`  
> **Trạng thái:** COMPLETED  
> **Agent thực hiện:** `frontend-specialist`  
> **Chuyên gia phụ trách:** `frontend-specialist` (Skills: `clean-code`, `frontend-design`, `react-best-practices`, `tailwind-patterns`)  
> **Component liên quan:** `frontend/src/features/course/components/player/lesson-timeline-tab.tsx`, `lesson-timeline-skeleton.tsx`  

---

## 1. Tổng quan & Mục tiêu Tinh chỉnh (Overview)

Dựa trên hình ảnh thực tế và phản hồi của người dùng về giao diện thanh **Timeline bài giảng**:
1. **Thu gọn lề & khoảng trống (Compact Spacing):**
   - Giảm padding ngang của khung cuộn container so với 2 bên lề trái/phải (`p-3` -> `px-2 py-2.5` hoặc `p-2`), giúp các ô thẻ chiếm trọn không gian bề ngang của thanh sidebar hẹp mà không bị lãng phí diện tích.
   - Giảm padding nội dung bên trong mỗi ô so với viền viền ngoài (`p-2.5` -> `py-2 px-2.5`), giúp thẻ thanh thoát, gọn gàng và tinh tế hơn.
2. **Huy hiệu thời gian dạng Pill Badge & Lược bỏ Icon thừa:**
   - Bỏ hoàn toàn các icon thừa gây rối mắt (bỏ icon dấu tích `lucide:check`, icon phát `lucide:play`, icon loa `lucide:volume-2`).
   - Chuyển huy hiệu thời gian sang dạng **Pill Badge tròn mềm (`rounded-full px-2.5 py-0.5 font-mono text-[11px]`)** chỉ hiển thị mốc thời gian (`00:00`, `03:02`, `03:07`), giúp mắt lướt mốc nhanh và thanh lịch.
   - **Căn giữa theo chiều dọc (`items-center`):** Huy hiệu Pill Badge được căn giữa chính xác với khối văn bản 2 dòng thay vì lệch lên đầu (`items-start`).
3. **Trạng thái Đang phát Tinh tế (Subtle Pastel Active State):**
   - Thay thế viền dày và badge đậm bằng viền xanh sáng nhẹ (`border-sky-500` hoặc `border-blue-500`) và nền pastel nhạt dịu mắt (`bg-sky-50/50 dark:bg-sky-950/25` hoặc `bg-blue-50/40`), không gây nặng mắt cho người học.
   - Lược bỏ dòng chữ phụ `"Đang nói câu này"` để giữ độ cao các thẻ luôn bằng phẳng, cân đối và đều đặn.

---

## 2. So sánh Thiết kế: Hiện tại vs Mục tiêu Mới

| Thành phần | Hiện tại | Thiết kế Mới (Mục tiêu) |
| :--- | :--- | :--- |
| **Container Padding** | `p-3` (lề 12px hai bên) | `px-2 py-2.5` (lề 8px hai bên, tăng không gian đọc) |
| **Thẻ Card Padding** | `p-2.5` (padding trong 10px) | `py-2 px-2.5` (gọn gàng, giảm chiều cao dư thừa) |
| **Căn dọc nội dung** | `items-start` (Badge lệch lên đầu) | `items-center` (Pill Badge căn giữa chuẩn với 2 dòng chữ) |
| **Huy hiệu Thời gian** | Kèm icon Check / Volume / Play | **Pill Badge (`rounded-full`)**, bỏ icon thừa |
| **Active State** | Badge xanh đậm, text phụ "Đang nói", ring đậm | Viền xanh sáng nhẹ `border-sky-500`, nền pastel `bg-sky-50/40`, không text phụ |
| **Fallback & Skeleton** | Đồng bộ cấu trúc cũ | Đồng bộ cấu trúc Pill Badge & `items-center` |

---

## 3. Success Criteria (Tiêu chí Thành công)

1. **Thẩm mỹ Cao cấp:** Thẻ timeline trông gọn gàng, hiện đại, khoảng cách lề hai bên và viền trong được tối ưu vừa vặn với kích thước sidebar 360px - 400px.
2. **Dễ đọc & Lướt nhanh:** Pill Badge thời gian `mm:ss` nổi bật rõ ràng, không bị cản trở bởi icon dấu tích hay icon phát.
3. **Căn giữa hoàn hảo:** Huy hiệu thời gian nằm chính giữa trục dọc của 2 dòng chữ trong mọi thẻ.
4. **Active State êm mắt:** Khi video phát đến câu nào, ô đó đổi màu pastel nhạt và viền xanh thanh lịch, giữ sự tập trung vào bài giảng.
5. **Đảm bảo Code Quality:** TypeScript 0 lỗi (`tsc --noEmit`), ESLint 0 lỗi/cảnh báo, tuân thủ strict typing.

---

## 4. File Structure & Changes

```
frontend/src/features/course/components/player/
├── lesson-timeline-tab.tsx          # [MODIFY] Giảm padding container & card, items-center, pill badge không icon, active pastel
└── lesson-timeline-skeleton.tsx     # [MODIFY] Đồng bộ skeleton với items-center và pill badge rounded-full
```

---

## 5. Task Breakdown (Chi tiết Công việc)

### Task 1: Tinh chỉnh Giao diện Thẻ Câu trong `LessonTimelineTab`
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `tailwind-patterns`, `react-best-practices`
- **Priority:** P0 (Core UI Refinement)
- **Dependencies:** None
- **Chi tiết:**
  - Trong `frontend/src/features/course/components/player/lesson-timeline-tab.tsx`:
    - Đổi padding viewport cuộn từ `p-3` thành `px-2 py-2.5`.
    - Đổi cấu trúc thẻ button từ `p-2.5 flex items-start gap-2.5` thành `py-2 px-2.5 rounded-xl border flex items-center gap-2.5`.
    - Đổi badge thời gian:
      - Xóa thẻ `<Icon />` (bỏ checkmark, volume-2, play).
      - Đổi từ `rounded-md` thành `rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold`.
      - Màu active: `bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30`.
      - Màu đã qua / chưa qua: `bg-muted/60 text-muted-foreground border border-border/60`.
    - Tinh chỉnh Active State của thẻ:
      - Class: `border-sky-500 dark:border-sky-400 bg-sky-50/50 dark:bg-sky-950/25 text-foreground shadow-2xs`.
      - Bỏ nhãn phụ `"Đang nói câu này"` để thẻ luôn bằng phẳng và căn giữa chuẩn 2 dòng.
    - Đồng bộ logic tương tự cho danh sách `fallbackMarkers`.
- **INPUT → OUTPUT → VERIFY:**
  - *Input:* `lesson-timeline-tab.tsx`
  - *Output:* Thẻ timeline tinh gọn, Pill Badge căn giữa trục dọc, Active State pastel nhẹ nhàng
  - *Verify:* Xem timeline: không còn dấu tích, mốc thời gian là Pill tròn mềm căn giữa với 2 dòng text.

---

### Task 2: Đồng bộ `LessonTimelineSkeleton`
- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`, `frontend-design`
- **Priority:** P1
- **Dependencies:** Task 1
- **Chi tiết:**
  - Trong `lesson-timeline-skeleton.tsx`:
    - Đổi padding container từ `p-3` thành `px-2 py-2.5`.
    - Đổi thẻ skeleton từ `items-start` thành `items-center py-2 px-2.5`.
    - Đổi badge skeleton từ `rounded-md` thành `rounded-full`.
- **INPUT → OUTPUT → VERIFY:**
  - *Input:* `lesson-timeline-skeleton.tsx`
  - *Output:* Khung loading khớp chính xác với layout thực tế
  - *Verify:* Khi tải dữ liệu, skeleton hiển thị tương đồng với card thật.

---

## 6. Phase X: Final Verification Checklist (Kiểm Thử Sau Khi Sửa)

| Bước | Hạng mục kiểm tra | Tiêu chuẩn đạt |
| :--- | :--- | :--- |
| **P0: Type Check & Lint** | `pnpm --filter frontend lint` & `tsc --noEmit` | 0 lỗi lint, 0 type `any` |
| **P1: Padding Lề & Viền** | Khoảng cách 2 bên lề và viền trong thẻ | Thu gọn thanh thoát, tận dụng tối đa chiều rộng sidebar |
| **P2: Pill Badge & Bỏ Icon** | Huy hiệu mốc thời gian | Dạng tròn mềm (`rounded-full`), không chứa icon thừa |
| **P3: Căn Giữa 2 Dòng** | Trục dọc giữa Pill Badge và nội dung câu | Pill Badge nằm chính giữa trục dọc của 2 dòng chữ |
| **P4: Active Pastel** | Câu đang phát trong video | Viền xanh sáng nhẹ, nền pastel nhạt dịu mắt, không text phụ cồng kềnh |
| **P5: Dark & Light Mode** | Chế độ sáng và tối | Tương phản tốt, chuẩn màu pastel ở cả 2 theme |

---

## 7. Ghi chú Sau Hoạch định & Bước Kế tiếp

- Kế hoạch đã hoàn thành tại: [`docs/PLAN-refine-timeline-pill-ui.md`](file:///d:/Download/hk1_2027/project_do_an/docs/PLAN-refine-timeline-pill-ui.md)
- Để bắt đầu triển khai các thay đổi trên mã nguồn, hãy phản hồi xác nhận hoặc gõ lệnh `/create`.
