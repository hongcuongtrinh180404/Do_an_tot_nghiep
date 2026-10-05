# PLAN: Phát Video Trailer Trực Tiếp (Inline Playback) Tại Khung 16:9 & Loại Bỏ Modal Dialog

> **Mục tiêu:**
> Thay thế hành vi mở Video Modal Dialog khi click phát trailer bằng trải nghiệm phát video trực tiếp (Inline Playback) ngay tại khung hình 16:9 của thẻ `CourseMediaPreview`. Tự động kích hoạt thanh điều khiển mặc định (`controls`), ẩn nút Play và các badge khi đang phát để trải nghiệm xem video mượt mà, trọn vẹn. Đồng thời loại bỏ hoàn toàn các Modal Dialog (kể cả Lightbox ảnh bìa) nhằm tối giản giao diện.
>
> **Task Slug:** `inline-trailer-playback`
> **Plan File:** `docs/PLAN-inline-trailer-playback.md`
> **Project Type:** `WEB`
> **Primary Specialist Agent:** `frontend-specialist` (hỗ trợ bởi `project-planner`)
> **Skills:** `frontend-design`, `react-best-practices`, `clean-code`

---

## 1. Phân Tích Hiện Trạng & Yêu Cầu Người Dùng

### 1.1. Hiện trạng
- Trong `CourseMediaPreview.tsx`:
  - Khi click vào khung video ở Trạng thái 3 (Chỉ có Trailer) hoặc Trạng thái 4 (Có cả hai), hệ thống đang mở `<Dialog>` Modal với component player phụ (`isVideoModalOpen = true`).
  - Khi click vào khung ảnh ở Trạng thái 2 (Chỉ có Ảnh), hệ thống đang mở Lightbox Modal (`isLightboxOpen = true`).
  - Giao diện có mã modal chiếm nhiều dòng và làm gián đoạn trải nghiệm người dùng trên trang quản lý khóa học.

### 1.2. Quyết định thiết kế theo phản hồi Socratic Gate
1. **Phát Video Inline Trực Tiếp:**
   - Khi người dùng click vào khung video hoặc nút Play ở giữa:
     - Video bắt đầu phát ngay tại chỗ (`videoRef.current?.play()`).
     - Tự động bật thanh điều khiển native của trình duyệt (`controls = true`).
     - Tự động ẩn hoàn toàn:
       - Lớp phủ nền mờ và nút icon Play tròn ở tâm.
       - Các huy hiệu ở góc dưới (`[🏷️ Ảnh bìa (Poster)]`, `[🎬 Video trailer]`).
     - Đảm bảo toàn bộ khung 16:9 dành trọn cho video, thanh tua (timeline), âm lượng và nút toàn màn hình (fullscreen).
2. **Loại bỏ Hoàn toàn Modal Dialog:**
   - Gỡ bỏ `isVideoModalOpen` và Dialog xem video trailer.
   - Gỡ bỏ `isLightboxOpen` và Dialog phóng to ảnh bìa.
   - Gỡ bỏ các thẻ component UI không còn dùng (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`).
   - Khung ảnh bìa tĩnh (Trạng thái 2) hiển thị sạch sẽ, trang nhã, không còn overlay "Nhấn để xem ảnh phóng to" gây vướng mắt.
3. **Quản lý Vòng đời & Trạng thái Đồng bộ (Edge Cases):**
   - Khi đang phát video inline mà người dùng tải lên trailer mới hoặc thumbnail mới: video tự động dừng, reset trạng thái `isPlayingInline = false`, poster cập nhật tức thì.
   - Khi video kết thúc (`onEnded`): thanh điều khiển native vẫn cho phép người dùng bấm Replay dễ dàng.

---

## 2. Thiết Kế Trạng Thái & Kiến Trúc UI (Inline Flow)

```
[Trạng thái Chờ (Idle)]
┌────────────────────────────────────────────────────────────┐
│                       ( ▶ )                                │
│                [Nút Play tròn tâm]                         │
│                                                            │
│ [🏷️ Ảnh bìa (Poster)]                 [🎬 Video trailer]   │
└────────────────────────────────────────────────────────────┘
                              │
                    Click Phát Video
                              ▼
[Trạng thái Đang Phát Inline (Playing)]
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                  <video controls autoPlay>                 │
│                                                            │
│ [ ▶ ] [00:15 / 02:30] ━━━━━━━●────── [🔊] [⚙] [⛶] (Native)│
└────────────────────────────────────────────────────────────┘
(Ẩn nút Play tròn tâm & Ẩn các badge góc dưới để không che khuất)
```

---

## 3. Kế Hoạch Triển Khai Chi Tiết (Task Breakdown)

### Phase 1: Quản Lý Trạng Thái Phát Inline & Tái Cấu Trúc Khung Video
- [x] **TASK-01**: Bổ sung `isPlayingInline` state và `videoRef` trong `CourseMediaPreview.tsx`.
  - **Agent:** `frontend-specialist`
  - **Skills:** `react-best-practices`, `clean-code`
  - **INPUT:** `localTrailerUrl`, `trailerUrl`, `activeTrailer`.
  - **OUTPUT:**
    - Thêm `const [playingTrailerUrl, setPlayingTrailerUrl] = useState<string | null>(null);`.
    - Thêm `const isPlayingInline = Boolean(playingTrailerUrl && playingTrailerUrl === activeTrailer);`.
    - Thêm `const videoRef = useRef<HTMLVideoElement>(null);`.
    - Thêm hàm `handleStartPlayInline()`: Đặt `setPlayingTrailerUrl(activeTrailer)` và gọi `videoRef.current?.play()`.
  - **VERIFY:** Component có state và handler kiểm soát inline playback rõ ràng.

- [x] **TASK-02**: Tích hợp Inline Video vào Trạng thái 3 & Trạng thái 4.
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`, `react-best-practices`
  - **INPUT:** Khung hiển thị Trạng thái 3 (Trailer Only) và Trạng thái 4 (Có cả hai).
  - **OUTPUT:**
    - Gắn `ref={videoRef}` và `controls={isPlayingInline}` trên thẻ `<video>`.
    - Khi `isPlayingInline === false`:
      - Hiển thị lớp phủ Dark Overlay nhẹ (`bg-black/[0.07]`) và nút Play tròn glassmorphism ở tâm.
      - Hiển thị các badge góc dưới.
      - Click vào vùng khung kích hoạt `handleStartPlayInline()`.
    - Khi `isPlayingInline === true`:
      - Ẩn hoàn toàn overlay nút Play và các badge góc dưới.
      - Thẻ video bật `controls` cho phép tua, chỉnh âm lượng, phóng to màn hình tùy ý.
      - Bổ sung `onPlay` cập nhật `playingTrailerUrl`.
  - **VERIFY:** Click nút Play làm video chạy ngay trong khung 16:9, thanh điều khiển native xuất hiện đầy đủ, không mở bất kỳ popup/modal nào.

### Phase 2: Dọn Dẹp Mã & Loại Bỏ Modal Dialog
- [x] **TASK-03**: Xóa bỏ hoàn toàn Lightbox Modal và Video Modal Dialog.
  - **Agent:** `frontend-specialist`
  - **Skills:** `clean-code`
  - **INPUT:** Code modal dialog ở cuối file `CourseMediaPreview.tsx` (dòng 570 - 635) cùng các state `isLightboxOpen`, `isVideoModalOpen`.
  - **OUTPUT:**
    - Xóa bỏ import `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`.
    - Xóa bỏ state `isLightboxOpen`, `isVideoModalOpen`.
    - Xóa bỏ 2 khối JSX `<Dialog open={isLightboxOpen}>` và `<Dialog open={isVideoModalOpen}>`.
    - Đơn giản hóa Trạng thái 2 (Chỉ có Ảnh): Hiển thị ảnh tĩnh sắc nét, loại bỏ hover overlay "Nhấn để xem ảnh phóng to".
  - **VERIFY:** Toàn bộ code modal dialog được dọn dẹp sạch sẽ, component giảm bớt khoảng 80-100 dòng code dư thừa.

### Phase 3: Kiểm Thử Toàn Diện & Đồng Bộ Living Docs (Phase X)
- [x] **TASK-04**: Chạy kiểm tra TypeScript và Linter:
  - `pnpm --filter frontend exec tsc --noEmit` -> Pass (0 errors)
  - `pnpm --filter frontend lint` -> Pass (0 errors, 0 warnings)
- [x] **TASK-05**: Kiểm thử tương tác người dùng:
  - Nhấp Play phát inline mượt mà.
  - Tải trailer mới / thumbnail mới tự động reset trạng thái an toàn.
- [x] **TASK-06**: Cập nhật Living Docs `a-agentic/features/course-management/dev-history.md`.

---

## 4. Bảng Ma Trận Kiểm Thử (Verification Matrix)

| Test Case | Kịch bản kiểm thử | Hành vi kỳ vọng | Trạng Thái |
| :--- | :--- | :--- | :---: |
| **TC-01** | Bấm Play khi có Trailer (Trạng thái 3 hoặc 4) | Video phát trực tiếp ngay trong khung 16:9, không mở modal | [x] |
| **TC-02** | Trạng thái hiển thị khi đang phát inline | Nút Play tròn ở tâm và các badge góc dưới ẩn đi hoàn toàn | [x] |
| **TC-03** | Thanh điều khiển native của trình duyệt | Hiển thị đầy đủ thanh tua, nút âm lượng, nút toàn màn hình | [x] |
| **TC-04** | Nhấp vào ảnh bìa (Trạng thái 2 - Chỉ có ảnh) | Không mở popup/modal phóng to, ảnh giữ nguyên hiển thị tĩnh | [x] |
| **TC-05** | Tải lên ảnh bìa mới khi có video | Poster của video đổi sang ảnh mới ngay lập tức | [x] |
| **TC-06** | Typecheck & Linter | `tsc --noEmit` và `eslint` đạt 100% 0 lỗi, 0 cảnh báo | [x] |

---

## 5. Quy Chuẩn Kỹ Thuật

- **Tuân thủ Clean Code:** Không để lại biến/state/import không sử dụng sau khi gỡ modal.
- **Tuân thủ Purple Ban:** Không sử dụng bất kỳ mã màu tím nào.
- **Typography & Font:** Không sử dụng inline font classes.
- **Strict TypeScript:** Tuyệt đối không dùng kiểu `any`.

---

## ✅ PHASE X COMPLETE

- TypeScript: ✅ Pass (`pnpm --filter frontend exec tsc --noEmit` - 0 errors)
- Linter: ✅ Pass (`pnpm --filter frontend lint` - 0 errors, 0 warnings)
- Inline Playback: ✅ Hoàn tất 100% (Phát trực tiếp tại khung 16:9, ẩn controls overlay, gỡ bỏ toàn bộ modal dialog)
- Date: 2026-10-04

