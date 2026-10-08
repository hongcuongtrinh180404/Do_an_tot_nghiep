# Kế hoạch Triển khai: Giao diện Trình phát Video Xem trước Bài giảng (Lesson Video Player Studio)

> **Tài liệu Kế hoạch Triển khai (Planning Mode - Giao diện thuần túy)**  
> **Mã kế hoạch**: `docs/PLAN-lesson-video-player.md`  
> **Người tạo**: `project-planner`  
> **Phạm vi**: Xây dựng toàn bộ giao diện (Frontend UI) trang xem trước video bài giảng theo kiến trúc phân tầng 70/30 (Top/Bottom) và 70/30 (Player/Navigation), tích hợp Timeline seek, Mục lục khóa học, và Hệ thống Tab nội dung mở rộng.

---

## 1. Tổng quan & Ranh giới (Scope & Boundaries)

### 1.1. Mục tiêu (Overview)
Khi giảng viên hoặc người dùng ở trang Chi tiết khóa học (`/instructor/courses/[id]`) bấm vào một bài học video và chọn **"Xem trước bài giảng"**, hệ thống điều hướng đến một không gian chuyên biệt chuẩn Studio phục vụ việc phát video, tra cứu mốc thời gian (Timeline), chuyển bài học (Curriculum Sidebar) và xem nội dung mở rộng (Tabs: Mô tả, Mindmap, Tài liệu, Thảo luận).

Theo yêu cầu của người dùng: **Giai đoạn này tập trung hoàn thiện 100% Giao diện (UI & Interactive States)**, sử dụng dữ liệu thực từ các React Query hooks đã có sẵn (`useLessonDetailQuery`, `useCourseSectionsQuery`) kèm bộ mock state trực quan, sinh động (không can thiệp backend, không làm payment hay quiz backend).

### 1.2. Ranh giới (In-Scope vs Out-of-Scope)

| Tiêu chí | Phạm vi giai đoạn này (IN SCOPE) | Ngoài phạm vi (OUT OF SCOPE) |
| :--- | :--- | :--- |
| **Giao diện & Bố cục** | Toàn bộ giao diện 2 tầng: Tầng trên (70% - Player 70% + Nav 30%), Tầng dưới (30% - Tab container) | Thay đổi giao diện trang chủ hay trang quản trị khác |
| **Video Player** | Trình phát video custom HTML5 16:9, Dark theme, đầy đủ bộ controls (Play/Pause, Tua ±10s, Speed 0.75x–2x, Âm lượng/Mute, Timeline Bar, Fullscreen, Tiêu đề + Nút quay lại) | Tích hợp DRM, mã hóa HLS m3u8 nâng cao, watermark bảo vệ bản quyền |
| **Bảng điều hướng** | Cột phải 2 tab con: "Timeline" (click nhảy mốc giây trong video) & "Video" (danh sách bài giảng có badge trạng thái, click chuyển bài) | Tracking tiến độ học sinh vào database (Student progress API) |
| **Hệ thống Tab dưới** | Full-width Tabs: Tab 1 (Mô tả & Ý cốt lõi), Tab 2 (Sơ đồ Mindmap viewer / Canvas), Tab 3 (Tài liệu đính kèm), Tab 4 (Thảo luận / Ghi chú) | API gửi bình luận realtime WebSocket |
| **Backend & Pipeline** | Không can thiệp backend (chỉ dùng các API có sẵn của `CourseModule`) | RabbitMQ workers, AssemblyAI, Gemini AI API pipeline |

---

## 2. Loại Dự án & Công nghệ (Project Type & Tech Stack)

- **Loại dự án**: **WEB Application** (Next.js 16 App Router)
- **Primary Agent**: `frontend-specialist`
- **Assisting Skills**: `frontend-design`, `clean-code`, `react-best-practices`, `tailwind-patterns`
- **Tech Stack**:
  - **Framework**: Next.js 16 (App Router), React 19 (`'use client'` cho interactive player components)
  - **Styling**: Tailwind CSS v4, phong cách Dark Mode Studio (Zelus/Cinematic Dark theme: Slate/Zinc/Sky accents, **tuyệt đối không sử dụng dải màu Purple/Violet theo Purple Ban**)
  - **Icons**: `@iconify/react` (`lucide:*`)
  - **Typography**: Kế thừa chuẩn font Roboto toàn hệ thống (không dùng `font-sans`/`font-serif` inline)
  - **Data Layer**: `@tanstack/react-query` tích hợp API Client (`useLessonDetailQuery`, `useCourseSectionsQuery`, `useSectionLessonsQuery`)
  - **Type Safety**: `share-lib` (`ILesson`, `ISection`, `LessonContentTypeEnum`) — **Nghiêm cấm dùng kiểu `any`**

---

## 3. Kiến trúc Giao diện & Bố cục (Layout Architecture)

```
+--------------------------------------------------------------------------------------------------+
| HEADER THANH ĐIỀU HƯỚNG TRANG: Nút "Quay lại khóa học" | Tên khóa | Tên bài học | Badge trạng thái|
+-------------------------------------------------------------------+------------------------------+
|                                                                   | CỘT PHẢI: BẢNG ĐIỀU HƯỚNG    |
| CỘT TRÁI (70%): TRÌNH PHÁT VIDEO CHÍNH (16:9 Aspect Ratio)        | (30% WIDTH)                  |
|                                                                   | +--------------+-----------+ |
| +---------------------------------------------------------------+ | | Tab Timeline | Tab Video | |
| | [Video Element - HTML5 Engine]                                | | +--------------+-----------+ |
| |                                                               | |                            |
| |                                                               | | [TAB 1: TIMELINE]          |
| |                                                               | | 00:00 Giới thiệu tổng quan |
| |                                                               | | 03:45 Cấu trúc thư mục     |
| |                                                               | | 12:10 Hướng dẫn thực hành  |
| |                                                               | |                            |
| | [Custom Dark Control Bar]                                     | | [TAB 2: MỤC LỤC BÀI HỌC]   |
| | Play | -10s | +10s | 02:45/14:30 | Seek Bar | Vol | 1x | Full | | Section 1: Khởi động       |
| +---------------------------------------------------------------+ | > Bài 1 (Đang phát - Active)|
|                                                                   | - Bài 2 (Đã học xong)       |
|                                                                   | - Bài 3 (Khóa / Cần xem sau) |
+-------------------------------------------------------------------+------------------------------+
| TẦNG DƯỚI (30% VIEWPORT H): BẢNG CHUYỂN ĐỔI TAB TOÀN CHIỀU RỘNG (FULL-WIDTH TAB CONTAINER)       |
| +----------------------+-----------------------+------------------------+----------------------+ |
| | [1] Mô tả & Ý cốt lõi | [2] Sơ đồ tư duy AI   | [3] Tài liệu đính kèm  | [4] Ghi chú bài học  | |
| +----------------------+-----------------------+------------------------+----------------------+ |
| [Tab Content Container: Trượt ngang mượt mà, sticky tabs, scroll nội dung độc lập]              |
+--------------------------------------------------------------------------------------------------+
```

### 3.1. Phân bổ Viewport & Tính toán Kích thước (Viewport Height Allocation)
- **Tổng thể trang**: `h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden` (Giao diện chuẩn Cinema/Studio, loại bỏ cuộn thừa toàn trang).
- **Thanh Header phụ (Top Bar)**: `h-14 shrink-0 border-b border-zinc-800/80 px-4 flex items-center justify-between`.
- **Tầng Trên (Top Deck)**: `flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-zinc-800/80`:
  - Cột Trái (Player Area): `lg:col-span-8 xl:col-span-8 flex flex-col justify-center items-center bg-black/90 p-3 sm:p-4 relative`.
  - Cột Phải (Navigation Area): `lg:col-span-4 xl:col-span-4 flex flex-col bg-zinc-900/90 border-l border-zinc-800/80 min-h-0`.
- **Tầng Dưới (Bottom Deck)**: `h-[280px] sm:h-[320px] shrink-0 flex flex-col bg-zinc-900/60 backdrop-blur-md min-h-0`:
  - Thanh Tab bar ngang: `border-b border-zinc-800/80 px-6 flex items-center gap-2`.
  - Vùng nội dung Tab: `flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar`.

---

## 4. Chi tiết từng Khối Thành phần (Component Breakdown)

### 4.1. Khung phát Video chính (`LessonVideoPlayer`)
- **Tỉ lệ & Hiển thị**: Khung phát tỉ lệ `16:9` (`aspect-video`), tự co giãn vừa vặn khung hình mà không bị tràn (letterboxed nếu màn hình nhỏ), nền tối (`bg-black`).
- **Thanh điều khiển tùy biến (Cinema Overlay Controls)**:
  1. **Nút Play/Pause**: Icon `lucide:play` / `lucide:pause`, phím tắt Spacebar.
  2. **Tua nhanh / Tua lùi 10s**: Nút -10s (`lucide:rotate-ccw`) và +10s (`lucide:rotate-cw`).
  3. **Thanh thời gian (Time Scrubber & Progress Bar)**:
     - Hiển thị `currentTime / totalDuration` (định dạng `mm:ss` hoặc `hh:mm:ss`).
     - Thanh tua tiến độ mượt mà với thanh buffer (dữ liệu đã tải) và điểm hover preview.
     - Đính kèm các mốc đánh dấu (Tick marks) tương ứng với các điểm Timeline trên thanh progress.
  4. **Thanh âm lượng (Volume & Mute)**:
     - Nút toggle Mute (`lucide:volume-2`, `lucide:volume-x`).
     - Slider kéo âm lượng từ `0` đến `1`.
  5. **Tốc độ phát (Playback Speed Menu)**:
     - Popover chọn tốc độ: `0.75x`, `1.0x` (mặc định), `1.25x`, `1.5x`, `1.75x`, `2.0x`.
  6. **Toàn màn hình (Fullscreen Toggle)**:
     - Hỗ trợ Fullscreen API cho container phát video (`lucide:maximize` / `lucide:minimize`).
- **Fallback trạng thái**:
  - Nếu bài học là Document (PDF/DOCX) thay vì Video: Hiển thị Banner xem tài liệu trang trọng.
  - Nếu bài học chưa upload video: Hiển thị Cinema Empty State "Chưa có video được tải lên".

### 4.2. Bảng điều hướng bài học (`LessonNavigationSidebar`)
- **Header 2 Tab con**:
  - **Tab "Timeline"**:
    - Danh sách các mốc thời gian bài học (ví dụ: `00:00 - Giới thiệu`, `03:45 - Cài đặt môi trường`, `12:10 - Demo thực hành`).
    - Nguồn dữ liệu: Kết hợp từ `keyPoints` của bài học, transcript timestamps hoặc mock data trực quan.
    - Click vào mốc: Kích hoạt callback `onSeek(seconds)` làm trình phát video nhảy ngay đến giây tương ứng và phát tiếp.
    - Hiển thị badge mốc thời gian kèm chỉ báo mốc đang phát (active indicator đồng bộ với `currentTime`).
  - **Tab "Video" (Mục lục bài giảng)**:
    - Hiển thị danh sách các chương (`Sections`) và bài học (`Lessons`) trong khóa học.
    - Accordion từng chương cho phép đóng/mở.
    - Bài học hiện tại được highlight nổi bật (Sky/Emerald accent border, phát sáng nhẹ, badge `Đang phát`).
    - Trạng thái bài học:
      - Icon bài video (`lucide:video`), bài tài liệu (`lucide:file-text`).
      - Trạng thái học: Đang phát (pulse dot), Hoàn thành (check icon), Khóa/Học thử (`Học thử` - emerald badge).
    - Click bài học: Điều hướng chuyển video ngay lập tức (cập nhật route hoặc state active lesson).

### 4.3. Bảng chuyển đổi Tab nội dung mở rộng (`LessonContentTabsContainer`)
- **Thanh Tab Bar**: Nằm ngang phía trên, thiết kế phẳng hiện đại, chia đều hoặc xếp cạnh nhau (3 Tab thuần UI):
  - **Tab 1: Tab 1**: Khung hiển thị giao diện có tiêu đề Tab 1, vùng nội dung placeholder thanh lịch.
  - **Tab 2: Tab 2**: Khung hiển thị giao diện có tiêu đề Tab 2, vùng nội dung placeholder thanh lịch.
  - **Tab 3: Tab 3**: Khung hiển thị giao diện có tiêu đề Tab 3, vùng nội dung placeholder thanh lịch.
  - *Ghi chú*: Chỉ dừng lại ở việc hiển thị giao diện và tiêu đề, chưa xử lý logic phức tạp theo yêu cầu người dùng.

---

## 5. Cấu trúc Tệp tin Dự kiến (File Structure)

```text
frontend/src/features/course/
├── components/
│   ├── player/                                         # [NEW FOLDER] Module chuyên trách Player Studio
│   │   ├── lesson-player-studio.tsx                   # [NEW] Main layout container (70/30 Deck + Responsive)
│   │   ├── lesson-player-top-bar.tsx                  # [NEW] Header thanh điều hướng & metadata bài học
│   │   ├── lesson-video-screen.tsx                    # [NEW] Khung phát video 16:9 với Custom Controls Bar
│   │   ├── lesson-video-controls.tsx                  # [NEW] Bộ điều khiển tùy biến (Play, Seek 10s, Speed, Vol, Fullscreen)
│   │   ├── lesson-nav-sidebar.tsx                     # [NEW] Bảng điều hướng phải (2 tabs: Timeline & Curriculum)
│   │   ├── lesson-timeline-tab.tsx                    # [NEW] Tab Timeline với các mốc thời gian & click-to-seek
│   │   ├── lesson-curriculum-tab.tsx                  # [NEW] Tab Mục lục bài giảng (Sections/Lessons navigation)
│   │   └── lesson-tabs-container.tsx                  # [NEW] Tầng dưới: Full-width tabs (Mô tả, Mindmap, Tài liệu, Ghi chú)
│   ├── lesson-detail-content.tsx                      # [UPDATE] Kết nối sang LessonPlayerStudio khi phát bài học
│   └── index.ts                                       # [UPDATE] Export LessonPlayerStudio
frontend/src/app/instructor/courses/[id]/lessons/[lessonId]/
└── page.tsx                                           # [UPDATE/OPTIMIZE] Tối ưu hóa layout toàn màn hình (h-screen)
```

---

## 6. Kế hoạch Triển khai Chi tiết (Task Breakdown)

### Task 1: Thiết kế Hook Quản lý Trạng thái Video Player
- **Agent**: `frontend-specialist`
- **Skills**: `clean-code`, `react-best-practices`
- **Input**: Video element ref HTML5, duration, currentTime, timeline points.
- **Output**: `useVideoPlayerState` hook quản lý:
  - `isPlaying`, `currentTime`, `duration`, `volume`, `isMuted`, `playbackRate`, `isFullscreen`, `bufferedPercent`.
  - Actions: `togglePlay()`, `seek(seconds)`, `seekRelative(±10)`, `setVolume(level)`, `setRate(rate)`, `toggleFullscreen()`.
- **Verify**: Gọi các actions thay đổi trạng thái chính xác, tương thích cross-browser.

### Task 2: Xây dựng Khung phát Video chính (`LessonVideoScreen` & `LessonVideoControls`)
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `tailwind-patterns`
- **Input**: Video URL từ `lesson.content?.url`, tiêu đề bài học.
- **Output**:
  - Giao diện khung phát tỉ lệ 16:9 chuẩn cinema, nền tối `bg-black`.
  - Custom controls bar nổi bật tự ẩn khi không rê chuột (auto-hide sau 3s khi đang play).
  - Tích hợp nút Play/Pause, Tua -10s/+10s, Time display, Slider Progress với buffer bar, Volume slider, Speed popover (0.75x–2x), Fullscreen.
  - Phím tắt bàn phím: Space (Play/Pause), Mũi tên trái/phải (±5s hoặc ±10s), M (Mute), F (Fullscreen).
- **Verify**: Phát video mượt mà, bấm tua ±10s phản hồi tức thì, chỉnh tốc độ phát thay đổi tốc độ thật trên `<video>`.

### Task 3: Xây dựng Bảng điều hướng bài học (`LessonNavSidebar`: Tab Timeline & Tab Video)
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `clean-code`
- **Input**: `courseId`, `lessonId`, `keyPoints`, `courseSections` từ React Query.
- **Output**:
  - Thanh header nhỏ với 2 nút Tab: `Timeline` và `Video`.
  - **Tab Timeline**:
    - Danh sách các mốc thời gian (ví dụ: `00:00 - Giới thiệu`, `02:15 - Kiến trúc`, `08:40 - Demo code`).
    - Nút click nhảy trực tiếp (`seek`) đến thời gian đó trên video player.
    - Hiệu ứng highlight mốc thời gian đang nằm trong khoảng phát hiện tại.
  - **Tab Video**:
    - Danh sách các chương và bài học trong khóa học.
    - Đánh dấu bài học đang phát (`active`), hiển thị các badge bài học thử (`Học thử`) hoặc biểu tượng trạng thái.
    - Click bài học chuyển ngay sang bài mới qua Next.js router.
- **Verify**: Click mốc Timeline làm video tua đến đúng giây; click bài học chuyển bài thông suốt.

### Task 4: Xây dựng Hệ thống Tab nội dung mở rộng (`LessonTabsContainer`)
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `tailwind-patterns`
- **Input**: `lesson` data (description, keyPoints, materials, content).
- **Output**:
  - Thanh Tab bar ngang toàn chiều rộng chia đều hoặc xếp cạnh nhau:
    - Tab 1: **Tổng quan bài học** (Mô tả, Ý cốt lõi bài học bằng chips nhiều màu, thời lượng, dung lượng).
    - Tab 2: **Sơ đồ tư duy AI** (Khung preview Mindmap hiện đại, chuẩn bị cho Markmap).
    - Tab 3: **Tài liệu đính kèm** (Danh sách tệp tài liệu, nút mở / tải).
    - Tab 4: **Ghi chú & Thảo luận** (Khung lưu ghi chú học tập kèm mốc thời gian).
  - Cuộn nội dung mượt mà, độc lập với tầng trên, không làm giật khung hình video.
- **Verify**: Chuyển đổi tab tức thời, giao diện đẹp mắt, nhất quán màu sắc.

### Task 5: Tích hợp Toàn diện Layout Studio & Tối ưu hóa Trang (`LessonPlayerStudio`)
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `react-best-practices`
- **Input**: Ghép nối Tầng trên (70% viewport) và Tầng dưới (30% viewport) vào `/instructor/courses/[id]/lessons/[lessonId]/page.tsx`.
- **Output**:
  - Giao diện tổng thể hoàn chỉnh, khớp đúng 100% tỉ lệ yêu cầu của người dùng.
  - Hỗ trợ Responsive: Trên màn hình lớn giữ 2 tầng 70/30; trên màn hình nhỏ/tablet tự động chuyển sang layout xếp chồng linh hoạt mà không vỡ giao diện.
  - Header trên cùng có nút "Quay lại khóa học" và tên khóa học/bài học rõ ràng.
- **Verify**: Mở trang trên trình duyệt hiển thị chính xác layout, không xuất hiện thanh cuộn kép (double scrollbars).

---

## 7. Tiêu chí Nghiệm thu (Success Criteria)

1. **Đúng cấu trúc phân bổ không gian**:
   - Tầng trên chiếm ~70% chiều cao màn hình: Cột trái phát video chiếm ~70% chiều rộng, Cột phải điều hướng chiếm ~30% chiều rộng.
   - Tầng dưới chiếm ~30% chiều cao màn hình: Thanh tab ngang toàn màn hình.
2. **Trình phát Video chuẩn chỉnh**:
   - Chuẩn tỉ lệ 16:9, nền tối điện ảnh.
   - Đầy đủ nút: Play/Pause, Tua ±10s, Playback rate (0.75x - 2x), Âm lượng/Mute, Seekbar, Toàn màn hình.
   - Nút quay lại trang chi tiết/danh sách khóa học.
3. **Tab Timeline tương tác thật**:
   - Hiển thị danh sách các mốc thời gian.
   - Click mốc nào thì video nhảy (`seek`) ngay đến mốc đó.
4. **Tab Video (Mục lục bài giảng) đồng bộ**:
   - Danh sách bài học của khóa học được hiển thị rõ ràng.
   - Bài đang xem được highlight nổi bật, chuyển bài mượt mà.
5. **Tuân thủ quy chuẩn dự án**:
   - Không sử dụng màu tím (Purple Ban).
   - Không sử dụng kiểu `any`.
   - Không dùng `font-sans` hay `font-serif` inline.

---

## 8. Giai đoạn Kiểm thử & Đảm bảo Chất lượng (Phase X Checklist)

- [x] **Lint & Type Check**: Chạy `npm run lint` và `npx tsc --noEmit` đạt 0 lỗi (Exit status 0).
- [x] **Purple Ban Check**: Xác nhận 100% không chứa class màu tím/violet, sử dụng tông màu Slate/Zinc/Sky/Emerald chuẩn Cinema.
- [x] **Font Uniformity**: Kế thừa font Roboto hệ thống, không có class font inline.
- [x] **Double Scrollbar Check**: Container `h-screen w-screen overflow-hidden` loại bỏ thanh cuộn kép.
- [x] **Controls Interactive Test**: Bộ controls tua ±10s, tốc độ phát, thanh âm lượng/mute, toàn màn hình và phím tắt (Space, Left/Right, M, F) hoạt động mượt mà.
- [x] **Timeline Seek Test**: Tab Timeline hỗ trợ click nhảy trực tiếp đến mốc giây tương ứng trong video.
- [x] **Responsive Test**: Thiết lập responsive phân tầng trên Desktop/Laptop và cuộn xếp chồng linh hoạt trên màn hình hẹp.

## ✅ PHASE X COMPLETE

- Lint: ✅ Pass (0 errors, 0 warnings)
- TypeScript: ✅ Pass (0 errors)
- Design: ✅ Cinema Dark Studio (No Purple, 70/30 Layout, 3 Bottom Tabs)
- Date: 2026-10-08

---

## 9. Câu hỏi Làm rõ & Khảo sát Socratic (Socratic Gate Decisions)

Nhằm đảm bảo giao diện được xây dựng đúng nhất với kỳ vọng của bạn, vui lòng cho biết ý kiến về 3 điểm sau:

1. **Dữ liệu Timeline (Mốc thời gian)**:
   - *Lựa chọn A*: Tự động lấy danh sách Ý cốt lõi (Key Points) của bài học (đã có trường `time` hoặc tự phân bổ mốc) kết hợp với mock data thông minh (00:00 - Giới thiệu, 03:45 - Cài đặt, 12:10 - Thực hành).
   - *Lựa chọn B*: Chỉ dùng thuần túy mock data tĩnh trên giao diện.
   - *(Khuyến nghị: Lựa chọn A để bài học nào có Key Points cũng hiển thị được mốc tương ứng).*

2. **Cách chuyển bài học trong Tab "Video"**:
   - *Lựa chọn A*: Dùng Next.js navigation đẩy sang URL bài học mới (`/instructor/courses/[id]/lessons/[newLessonId]`) để giữ URL chuẩn mực và bookmark được.
   - *Lựa chọn B*: Chuyển đổi nội bộ trong state của component để video đổi ngay mà không cần reload trang.
   - *(Khuyến nghị: Lựa chọn A kết hợp Next.js soft navigation để URL luôn đồng bộ).*

3. **Nội dung mặc định cho các Tab tầng dưới**:
   - Đề xuất mặc định: **Tab 1** (Tổng quan & Ý cốt lõi), **Tab 2** (Sơ đồ tư duy AI Mindmap), **Tab 3** (Tài liệu đính kèm), **Tab 4** (Ghi chú bài học).
   - Bạn có muốn giữ nguyên 4 tab này hay có yêu cầu cụ thể nào khác về tên gọi các tab không?
