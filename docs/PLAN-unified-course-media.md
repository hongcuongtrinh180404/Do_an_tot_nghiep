# PLAN: Hợp Nhất Media Khóa Học Thành Một Khung 16:9 Thống Nhất (Unified Media Preview)

> **Mục tiêu:**
> Tái cấu trúc component `CourseMediaPreview` từ bố cục 2 cột (Thumbnail riêng, Trailer riêng) thành **một khối Card duy nhất** với khung hiển thị 16:9 thích ứng thông minh theo 4 trạng thái dữ liệu (State Machine), đi kèm 2 nút bấm độc lập ở chân thẻ (`Tải/Thay ảnh bìa` và `Tải/Thay trailer`).
>
> **Task Slug:** `unified-course-media`
> **Plan File:** `docs/PLAN-unified-course-media.md`
> **Project Type:** `WEB`
> **Primary Specialist Agent:** `frontend-specialist` (hỗ trợ bởi `project-planner`)
> **Skills:** `frontend-design`, `react-best-practices`, `clean-code`

---

## 1. Phân Tích Kiến Trúc & Máy Trạng Thái (State Machine)

### 1.1. Bảng 4 Trạng Thái Thích Ứng (Adaptive States)

| Trạng thái | Điều kiện dữ liệu | Hiển thị trên khung preview 16:9 | Hành vi khi Click vào khung | Nút 1 (Thumbnail) | Nút 2 (Trailer) | Badges góc dưới |
|:---|:---|:---|:---|:---:|:---:|:---|
| **1. Chưa có gì** | `!activeThumbnail && !activeTrailer` | Khung viền nét đứt (Empty State) với icon media, lời nhắc tải lên | Click chọn file ảnh bìa | `[+ Tải ảnh bìa]` | `[+ Tải trailer]` | *(Không có)* |
| **2. Chỉ có Ảnh** | `activeThumbnail && !activeTrailer` | Ảnh tĩnh Thumbnail 16:9 sắc nét, lớp phủ hover xem phóng to | Mở Lightbox Modal xem ảnh full | `[📷 Thay ảnh bìa]` | `[+ Tải trailer]` | `[🏷️ Đã có Thumbnail]` |
| **3. Chỉ có Trailer** | `!activeThumbnail && activeTrailer` | Video preview lấy frame đầu tiên làm poster + Nút Play tròn ở tâm | Mở Video Modal Dialog phát video | `[+ Tải ảnh bìa]` | `[🎬 Thay trailer]` | `[🎬 Đã có Trailer]` |
| **4. Có cả 2 (Chuẩn nhất)** | `activeThumbnail && activeTrailer` | Video player dùng Thumbnail làm poster + Nút Play tròn ở tâm | Mở Video Modal Dialog phát video | `[📷 Thay ảnh bìa]` | `[🎬 Thay trailer]` | `[🏷️ Đã có Thumbnail]` và `[🎬 Đã có Trailer]` |

### 1.2. Quy Tắc Chuyển Đổi Trạng Thái Khi Upload (Reactive Transitions)
- **Đã có trailer, sau đó upload thumbnail:** Khi người dùng chọn/upload ảnh bìa mới, `activePoster` lập tức cập nhật thành ảnh mới nhờ React remount key. Trạng thái lập tức chuyển từ **Trạng thái 3 → Trạng thái 4** mà không cần re-upload video.
- **Đang có cả hai, thay thumbnail mới:** Thumbnail cập nhật, poster của trailer tự động đổi sang ảnh mới ngay lập tức.
- **Đang có cả hai, thay trailer mới:** Video source cập nhật, poster giữ nguyên ảnh thumbnail hiện tại.
- **Đang upload file:** Khung preview hiển thị lớp phủ mờ spinner loading kèm tiến trình phần trăm (riêng biệt cho thumbnail hoặc trailer).

---

## 2. Thiết Kế Wireframe Bố Cục UI (Layout Blueprint)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Media giới thiệu khóa học (Thumbnail & Trailer)       [16:9 Khuyến nghị]│
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │                 [ Khung 16:9 Thích Ứng Tự Động ]                 │  │
│  │                                                                  │  │
│  │                             ( ▶ )                                │  │
│  │              [ Nút Play tròn tâm (Khi có Trailer) ]              │  │
│  │                                                                  │  │
│  │  [🏷️ Đã có Thumbnail]                         [🎬 Đã có Trailer] │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [📷 Tải/Thay ảnh bìa]                             [🎬 Tải/Thay trailer]│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Kế Hoạch Triển Khai Chi Tiết (Task Breakdown)

### Phase 1: Tái Cấu Trúc Khung Card & Header
- [x] **TASK-01**: Tái cấu trúc vỏ bọc ngoài từ 2 Card riêng biệt thành 1 Card thống nhất trong `frontend/src/features/course/components/course-media-preview.tsx`.
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`, `react-best-practices`
  - **INPUT:** Cấu trúc 2 thẻ `<Card>` song song trong `grid-cols-1 md:grid-cols-2`.
  - **OUTPUT:** Gom thành 1 thẻ `<Card>` duy nhất với Header:
    - Tiêu đề: `Media giới thiệu khóa học (Thumbnail & Trailer)` kèm icon `lucide:clapperboard`.
    - Badge bên phải: `[16:9 Khuyến nghị]` (`bg-muted/60 text-muted-foreground text-xs px-2.5 py-0.5 rounded-full font-medium`).
  - **VERIFY:** Giao diện có 1 card duy nhất trải rộng toàn chiều rộng khối nội dung, header chuyên nghiệp.

### Phase 2: Triển Khai Khung 16:9 Đa Trạng Thái (Adaptive 16:9 Frame)
- [x] **TASK-02**: Triển khai logic render khung 16:9 theo 4 trạng thái của State Machine (`w-full max-w-4xl mx-auto aspect-video`).
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`, `clean-code`
  - **INPUT:** `activeThumbnail`, `activeTrailer`, `activePoster`, `isUploadingThumbnail`, `isUploadingTrailer`.
  - **Quy chuẩn kích thước:** Khung 16:9 đặt trong container `w-full max-w-4xl mx-auto aspect-video` để đảm bảo độ cao cân đối, thanh lịch trên mọi độ phân giải màn hình.
  - **OUTPUT:**
    - **Trạng thái 1 (Chưa có gì):** Khung nét đứt `border-2 border-dashed border-slate-300 dark:border-border/80 bg-slate-50 dark:bg-muted/20`, icon đôi camera & film, text hướng dẫn quy chuẩn kích thước/định dạng. Click trực tiếp vào khung trống mở hộp thoại chọn **Ảnh bìa** (ưu tiên ảnh bìa trước).
    - **Trạng thái 2 (Chỉ có Ảnh):** Component `Image` (Next.js) fill 16:9 `object-cover`, hover icon phóng to, click mở Lightbox Modal. Badge góc dưới trái `[🏷️ Đã có Thumbnail]`.
    - **Trạng thái 3 (Chỉ có Trailer):** Thẻ `<video>` nạp frame đầu tiên (`preload="metadata"`), overlay nút Play tròn ở tâm, click mở Video Modal Dialog. Badge góc dưới phải `[🎬 Đã có Trailer]`.
    - **Trạng thái 4 (Có cả 2):** Thẻ `<video>` nhận `poster={activePoster}`, `preload="none"`, nút Play tròn ở tâm, click mở Video Modal Dialog. Cả 2 badges hiển thị ở 2 góc dưới.
  - **VERIFY:** Khung chuyển đổi mượt mà giữa 4 trạng thái khi nạp dữ liệu khác nhau.

### Phase 3: Thanh Hành Động Chân Thẻ (Dual Action Footer)
- [x] **TASK-03**: Thiết kế chân thẻ với 2 nút bấm điều khiển độc lập ở hai bên.
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **INPUT:** `thumbnailInputRef`, `trailerInputRef`, trạng thái nạp file.
  - **OUTPUT:** Khối footer với bố cục `flex items-center justify-between gap-3 pt-4 border-t border-border/40`:
    - **Bên trái (Ảnh bìa):**
      - Nếu chưa có: `Button variant="outline"` `[ ⬆️ Tải lên ảnh bìa ]` kèm icon `lucide:upload`.
      - Nếu đã có: `Button variant="outline"` `[ 📷 Thay ảnh bìa ]` kèm icon `lucide:camera`.
      - Hiển thị tên file hoặc thông tin dung lượng bên cạnh nút.
    - **Bên phải (Video Trailer):**
      - Nếu chưa có: `Button variant="outline"` `[ 🎥 Tải lên trailer ]` kèm icon `lucide:video`.
      - Nếu đã có: `Button variant="outline"` `[ 🎬 Thay trailer ]` kèm icon `lucide:clapperboard`.
      - Hiển thị tên file video hoặc trạng thái lưu trữ MinIO.
  - **VERIFY:** Hai nút kích hoạt chính xác 2 thẻ `<input type="file" />` ẩn tương ứng.

### Phase 4: Xử Lý Tiến Trình Tải Lên (Progress Overlay)
- [x] **TASK-04**: Tích hợp thanh tiến trình tải lên khi đang upload thumbnail hoặc trailer.
  - **Agent:** `frontend-specialist`
  - **Skills:** `clean-code`
  - **INPUT:** `isUploadingThumbnail`, `thumbnailProgress`, `isUploadingTrailer`, `trailerProgress`.
  - **OUTPUT:** Lớp phủ bán trong suốt trên khung preview với spinner và thanh phần trăm tiến trình riêng biệt cho từng loại media đang upload, đồng thời disable tạm thời 2 nút bấm.
  - **VERIFY:** Người dùng theo dõi được phần trăm upload trực quan, không bấm trùng lặp.

### Phase 5: Kiểm Thử & Hoàn Thiện (Phase X - Verification)
- [x] **TASK-05**: Kiểm thử đầy đủ 4 kịch bản theo Test Matrix.
- [x] **TASK-06**: Chạy Type Check: `pnpm exec tsc --noEmit` và ESLint kiểm tra code chất lượng cao.

---

## 4. Bảng Ma Trận Kiểm Thử (Verification Matrix)

| Test Case | Kịch bản dữ liệu | Kỳ vọng hiển thị & Tương tác | Trạng Thái |
|:---|:---|:---|:---:|
| **TC-01** | Khóa học mới (chưa có media) | Khung nét đứt 16:9 max-w-4xl; Footer hiển thị `[+ Tải lên ảnh bìa]` và `[+ Tải lên trailer]`; Click khung trống mở chọn ảnh bìa | [x] |
| **TC-02** | Upload ảnh bìa lần đầu | Khung hiển thị ảnh bìa tĩnh, badge `🏷️ Đã có Thumbnail`; Nút 1 đổi thành `[📷 Thay ảnh bìa]`, nút 2 vẫn là `[+ Tải trailer]` | [x] |
| **TC-03** | Tiếp tục upload trailer khi đã có ảnh bìa | Khung tự động chuyển sang video preview với poster là ảnh bìa + nút Play ở tâm; Nút 2 đổi thành `[🎬 Thay trailer]` | [x] |
| **TC-04** | Chỉ upload trailer trước (chưa có ảnh bìa) | Khung hiển thị video lấy frame đầu làm poster + nút Play; Nút 1 là `[+ Tải lên ảnh bìa]`, nút 2 là `[🎬 Thay trailer]` | [x] |
| **TC-05** | Sau đó upload ảnh bìa vào khóa học chỉ có trailer | Khung video preview lập tức đổi poster sang ảnh bìa vừa chọn; Cả 2 nút chuyển thành `Thay...` | [x] |
| **TC-06** | Bấm vào khung preview khi có video | Mở Dialog Video Player phát trailer bình thường | [x] |
| **TC-07** | Bấm vào khung preview khi chỉ có ảnh | Mở Lightbox Modal phóng to ảnh bìa | [x] |
| **TC-08** | Type check | `pnpm exec tsc --noEmit` hoàn thành Exit code 0 | [x] |

---

## 5. Quyết Định Thiết Kế Đã Thống Nhất (Design Decisions)

1. **Hành vi click khi ở Trạng thái Chưa có gì (Empty State):**
   - Click trực tiếp vào giữa vùng nét đứt trống sẽ ưu tiên mở hộp thoại chọn **Ảnh bìa** khóa học trước.
2. **Kích thước khung 16:9:**
   - Sử dụng `w-full max-w-4xl mx-auto aspect-video` để đảm bảo tỉ lệ khung hình 16:9 sắc nét, chiều cao vừa mắt, không bị kéo dãn quá cao trên màn hình lớn.
3. **Thanh chân thẻ (Footer):**
   - Nút quản lý Ảnh bìa bên trái (`[📷 Thay ảnh bìa]` / `[⬆️ Tải lên ảnh bìa]`), Nút quản lý Video Trailer bên phải (`[🎬 Thay trailer]` / `[🎥 Tải lên trailer]`).

---

## ✅ PHASE X COMPLETE

- Type Check (`pnpm exec tsc --noEmit`): ✅ Pass (0 errors)
- Dev Server: ✅ Đang chạy ổn định tại http://localhost:3000
- Adaptive 4-State Machine: ✅ Hoàn tất 100% (Empty, Thumbnail-only, Trailer-only, Both)
- Date: 2026-10-04

