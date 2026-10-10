# Interactive Video Player & Mindmap — Development History

> **Module:** Interactive Video Player

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `IN_PROGRESS` (Hoàn thành tầng giao diện Lesson Player Studio 70/30 và 3 Tab container).
- **Kế hoạch triển khai:** Sprint 3 (Giai đoạn 3: Cài đặt & Lập trình giao diện Studio Player).

---

## 2. Technical Notes & Gotchas

- **Next.js SSR với Markmap**: Thư viện Markmap thao tác trực tiếp với DOM (`window`, `svg`). Do đó, component `MarkmapViewer` bắt buộc phải là Client Component (`'use client'`) và nên được nạp qua `next/dynamic` với `{ ssr: false }` để tránh lỗi Hydration mismatch trên Next.js App Router.
- **Phòng chống lặp Quiz**: Khi người dùng xem xong quiz và bấm tiếp tục, nếu video resume tại đúng giây `timestamp` đó, sự kiện `timeupdate` có thể bắn thêm 1 lần nữa trong cùng giây đó. Giải pháp: Thêm `answeredQuizTimestamps` vào Set hoặc cộng thêm `0.5s` khi phát tiếp (`video.currentTime += 0.5`).
- **Cinema Fixed Viewport Layout (70/30)**: Áp dụng `h-screen w-screen overflow-hidden` trên container ngoài cùng để loại bỏ hoàn toàn hiện tượng 2 thanh cuộn lồng nhau (Double scrollbars). Tầng trên chiếm 68% chiều cao (phân chia 70% Video Player 16:9 + 30% Navigation Sidebar), tầng dưới chiếm 32% chiều cao chứa hệ thống 3 Tab toàn màn hình cuộn nội dung độc lập.
- **Light Theme Synchronization**: Toàn bộ giao diện Player Studio (Header, Sidebar điều hướng, Bottom Tabs container) được đồng bộ chuyển sang giao diện Sáng (Light Theme với các tokens `bg-background`, `bg-card`, `text-foreground`, `border-border`), riêng khung canvas phát video giữ tỉ lệ 16:9 nền tối để đảm bảo độ tương phản thị giác khi xem video.
- **Controls Auto-hide & React 19 State Consistency**: Tránh gọi `setShowControls` đồng bộ trong `useEffect` khi trạng thái `isPlaying` thay đổi để không gây cascading renders. Sử dụng biến suy diễn `const isControlsVisible = !isPlaying || showControls;` để vừa đảm bảo hiển thị controls khi tạm dừng, vừa tự động ẩn sau 2.5s khi phát video.
- **Ergonomic Laptop Fit & Dynamic Height Synchronization**: Cấu hình kích thước tầng trên tối ưu hoàn toàn cho màn hình laptop:
  - Màn hình FHD (1440px - 1536px): Video 16:9 rộng ~960px - 1000px, cao ~540px - 562px. Sidebar rộng ~380px - 420px, khoảng cách giữa 2 khối 40px (`xl:gap-[40px]`).
  - Màn hình Laptop nhỏ (1280px - 1366px): Video rộng ~850px - 880px, cao ~480px - 495px. Sidebar rộng ~360px.
  - Chiều cao cột bên phải được đồng bộ chính xác theo chiều cao video 16:9 bằng `ResizeObserver`, giúp thanh cuộn dọc (`overflow-y-auto`) bên trong tab Timeline/Curriculum hoạt động mượt mà không làm trồi sụt khung hình layout.
- **Sentence-Level Timeline & Realtime Outline từ Database (MongoDB)**:
  - Tích hợp hook `useLessonTranscriptQuery` nạp dữ liệu trực tiếp từ collection `lesson_transcripts` trong MongoDB thông qua API `GET /lessons/:id/transcript`.
  - Hiển thị danh sách các câu nói (`sentences: [{ text, start, end }]` tính bằng milliseconds) trong tab Timeline của thanh điều hướng bên phải.
  - Tự động outline sáng rõ (`ring-2 ring-sky-500 border-sky-500 bg-sky-50 dark:bg-sky-950/40`) câu đang phát dựa trên `currentTime` của video player kèm icon âm thanh động.
  - Tự động cuộn thông minh (`scrollIntoView({ behavior: 'smooth', block: 'nearest' })`) theo câu đang nói, đồng thời phát hiện sự kiện lăn chuột thủ công của người dùng (`wheel`, `touchmove`) để tạm dừng cuộn, cung cấp nút nổi bật "Theo video" để tiếp tục cuộn.
  - Giữ nguyên các mốc chương/nội dung quan trọng trên thanh tua video của `LessonVideoScreen` để tránh phân mảnh thanh seekbar.
- **Khắc phục Vỡ Layout Khi Chuyển Trang Client-Side (Circular Flexbox Stretch)**:
  - *Root Cause:* Khi chuyển trang từ Chi tiết khóa học sang Xem trước bài giảng, dữ liệu bài học đã được cache trong React Query nên danh sách render ngay. Do Sidebar ban đầu có `lg:h-auto` và thẻ cha dùng `items-stretch`, Sidebar bung dài làm kéo dãn Video Card qua `items-stretch`, khiến `ResizeObserver` đo nhầm chiều cao dãn nở `>1000px` và khóa cứng `sidebarHeight` ở mức quá khổ.
  - *Giải pháp:* Đổi thẻ cha từ `items-stretch` sang `items-start` để Video Card luôn 100% độc lập giữ chuẩn 16:9 (`~540px`). Cột Sidebar đặt fallback cố định `lg:h-[540px]` khi chưa có `sidebarHeight`.
  - *Scroll Restoration:* Tự động reset `window.scrollTo({ top: 0, left: 0, behavior: 'instant' })` khi mount trang bài học để ngăn hiện tượng trôi vị trí cuộn trang.
  - *Semantic Link:* Chuẩn hóa nút xem trước từ `div router.push` sang thẻ `<Link href={...}>` của Next.js.
- **Marker Ghim Bản Đồ (Google Maps Pin) & Modal Tạo Câu Hỏi Tương Tác Trên Timeline (Instructor Mode)**:
  - *Tính năng:* Hiển thị con trỏ Marker hình ghim bản đồ (Google Maps pin màu vàng hổ phách `bg-amber-400`, viền trắng, đổ bóng `shadow-lg`, tâm dấu `+` đậm) trồi lên trên thanh timeline khi giảng viên rê chuột qua seekbar.
  - *Tương tác phân tách:* Click vào lòng thanh timeline thực hiện tua video (Seek) bình thường; click trực tiếp vào nút ghim Marker sẽ dừng video (`videoRef.current.pause()`), lấy chính xác mốc thời gian `clickedTime` và mở Modal giao diện tạo câu hỏi tương tác (`CreateQuizMarkerModal`).
  - *Mock UI Modal:* Thiết kế dialog chuẩn gồm chọn mốc thời gian, loại câu hỏi (đơn/nhiều đáp án), 4 đáp án A/B/C/D kèm lựa chọn đáp án đúng, checkpoint bắt buộc và nút Lưu câu hỏi demo gắn ngay mốc checkpoint lên timeline.
  - *Phân quyền giao diện:* Tích hợp prop `isInstructor` được truyền từ trang giảng viên (`/instructor/courses/[id]/lessons/[lessonId]` -> `isInstructor={true}`) xuống `LessonDetailContent` -> `LessonPlayerStudio` -> `LessonVideoScreen`, đảm bảo chỉ giảng viên mới thấy tính năng này.
- **Tinh Chỉnh Giao Diện Timeline Thẻ Câu (Pill Badge, Giảm Padding, Căn Giữa & Active Pastel Tinh Tế)**:
  - *Mục tiêu:* Tối ưu hóa không gian hiển thị trong thanh sidebar hẹp, loại bỏ icon thừa, cải thiện khả năng đọc lướt mốc thời gian và thẩm mỹ trực quan.
  - *Compact Spacing:* Giảm padding lề hai bên khung cuộn từ `p-3` thành `px-2 py-2.5 space-y-1.5`, giảm padding trong của mỗi thẻ từ `p-2.5` thành `py-2 px-2.5` để các thẻ tận dụng tối đa bề ngang của sidebar.
  - *Pill Badge & Bỏ Icon Thừa:* Bỏ hoàn toàn các icon rối mắt (`lucide:check`, `lucide:play`, `lucide:volume-2`). Thay bằng huy hiệu thời gian dạng Pill Badge (`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold`) hiển thị mốc thời gian tinh tế.
  - *Vertical Centering (`items-center`):* Chuyển căn lề thẻ từ `items-start` sang `items-center` để Pill Badge luôn được căn giữa hoàn hảo theo trục dọc với 2 dòng văn bản của câu nói.
  - *Active State:* Áp dụng viền tím chàm dịu mắt `border-[#c7d2fe] dark:border-indigo-400` kết hợp hiệu ứng đổ bóng mờ ra xung quanh `box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.25)` (`shadow-[0_4px_14px_0_rgba(99,102,241,0.25)]`) và nền `bg-indigo-50/40 dark:bg-indigo-950/20`, bỏ hoàn toàn text phụ `"Đang nói câu này"` để độ cao của các thẻ luôn cân đối, bằng phẳng.
  - *Đồng bộ Skeleton:* Cập nhật `LessonTimelineSkeleton` đồng bộ kích thước `px-2 py-2.5`, `items-center py-2 px-2.5`, và Pill Badge `rounded-full`.
- **Thu Hẹp Chiều Cao Thanh Tua Video & Hiệu Ứng Dãn Nở Rê Chuột (Compact Timeline Bar 3/5 & Expand on Hover)**:
  - *Mục tiêu:* Thu hẹp chiều cao thanh rãnh timeline xuống 3/5 kích thước ban đầu để mang lại phong cách thanh mảnh, hiện đại chuẩn rạp chiếu phim (Cinema UI / YouTube).
  - *Chiều cao rãnh:* Chuyển xuống `h-[4.5px]` ở trạng thái tĩnh. Khi rê chuột vào vùng thanh tua (`group-hover/slider`), rãnh tự động dãn nở nhẹ lên `h-[5.5px]` với hiệu ứng mượt `transition-all duration-150`.
  - *Scrubber Thumb:* Thu nhỏ nút tròn định vị vị trí hiện tại xuống `size-2.5` (10px, căn lề `-ml-[5px]`) để cân đối với rãnh mảnh mai.
  - *Tick Markers & Ghim Marker:* Tinh chỉnh các chấm tick marker trên rãnh xuống `size-1.5` (6px), căn chỉnh vị trí ghim Google Maps Pin Marker (`bottom-2`) để đầu nhọn cắm chuẩn xác vào tâm rãnh trượt 4.5px.
- **Tái Cấu Trúc Modal Thêm Câu Hỏi Tương Tác Chuẩn Tỉ Lệ 16:9 & Bố Cục 2 Cột Đối Xứng (Two-Column Cinema Layout)**:
  - *Mục tiêu:* Nâng cấp giao diện Modal `CreateQuizMarkerModal` từ dạng thẻ dọc đơn điệu sang định dạng tỉ lệ 16:9 điện ảnh (`aspect-video`), tự động co giãn theo container giao diện người dùng (`max-w-[min(calc(100vw-2rem),calc((86vh*16)/9),1020px)]`), không bị tràn viewport trên mọi kích cỡ màn hình laptop.
  - *Bố cục 2 Cột Landscape:*
    - **Cột Trái (42%):** Bảng điều khiển câu hỏi gồm bộ chuyển đổi hình thức câu hỏi (1 đáp án `single` vs nhiều đáp án `multiple`), ô nhập nội dung câu hỏi `Textarea` tự động đếm ký tự, thẻ Checkpoint bảo vệ video (`Điểm chặn bài học`) kèm biểu tượng ổ khóa, và ô nhập giải thích kiến thức sau khi học viên nộp bài.
    - **Cột Phải (58%):** Quản lý danh sách phương án A, B, C, D (hỗ trợ thêm/bớt từ 2 - 5 phương án, click chữ cái để đổi đáp án đúng màu xanh ngọc emerald), kèm thẻ **Live Student Preview** mô phỏng trực tiếp cách câu hỏi hiển thị trên video học viên với khả năng click thử tương tác.
  - *Căn chỉnh chiều rộng chuẩn Container:* Đồng bộ chiều rộng của Modal khớp chuẩn xác với khối container của 3 tab bên dưới (`w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] max-w-[calc(1440px-3rem)] sm:max-w-[calc(1440px-3rem)] 2xl:max-w-[calc(1536px-3rem)]`), loại bỏ class `sm:max-w-none` để viền hai bên của modal thẳng hàng tuyệt đối với mép container nội dung của trang, đồng thời giới hạn `max-h-[90vh]` bảo toàn tỉ lệ 16:9 không bị tràn màn hình.
- **Tái Cấu Trúc Bố Cục Modal 70/30 (Workspace Nhập Liệu & Danh Sách Điều Hướng)**:
  - *Mục tiêu:* Tối ưu hóa trải nghiệm soạn thảo bộ câu hỏi tương tác tại cùng mốc dừng video, cho phép tạo và quản lý danh mục nhiều câu hỏi mà không cần đóng mở modal nhiều lần.
  - *Cột Trái (~70%): Vùng làm việc chính (Workspace)*
    - Mốc thời gian `[⏱️ mm:ss]` bo góc viền cam nhạt, nhãn định danh `Câu X` nổi bật.
    - Textarea đề bài rộng rãi bo góc kèm bộ đếm ký tự.
    - Bộ chọn hình thức (Segmented Control): `Một đáp án đúng` vs `Nhiều đáp án đúng` với highlight viền cam hổ phách.
    - Lưới 4 đáp án (A, B, C, D) 2 hàng x 2 cột: Hàng 1 (A, B) - Hàng 2 (C, D). Badge chữ cái tương tác (click đổi xanh lá emerald đánh dấu đáp án đúng).
    - Ô nhập giải thích đáp án ở đáy kèm các nút hành động `[Hủy / Đóng]` và `[Lưu / Cập nhật câu hỏi]` màu cam.
  - *Cột Phải (~30%): Danh sách câu hỏi điều hướng (Navigation List)*
    - Header: `"Danh sách câu hỏi (X)"` kèm nút `[+ Thêm câu]` sinh nhanh câu hỏi mới và làm trống form bên trái.
    - Thẻ câu hỏi (Card 1, 2, 3...): Số thứ tự, tiêu đề cắt dòng `line-clamp-2`, thẻ active có viền cam hổ phách nổi bật `border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/10`.
    - Hỗ trợ chuyển đổi mượt mà giữa các câu hỏi với Two-way state sync thời gian thực.
- **Tinh Chỉnh Giao Diện Modal 16:9 Tối Giản & Kéo Thả Thứ Tự (Drag & Drop Reordering)**:
  - *Loại bỏ Header trên cùng:* Xóa bỏ hoàn toàn thanh tiêu đề và gradient line phía trên, giải phóng toàn bộ chiều cao cho form soạn thảo và danh sách điều hướng.
  - *Bỏ Checkpoint:* Không còn checkbox cưỡng bức dừng video, tạo trải nghiệm tương tác liền mạch cho người học.
  - *Cột Trái 70% Tối Giản:*
    - Hàng trên chỉ gồm Badge `[⏱ mm:ss]` và nhãn `Câu X / N`, khoảng trống bên phải để thoáng.
    - Bộ chọn hình thức câu hỏi dạng Compact Segmented Switch mỏng nhẹ (`Một đáp án đúng` vs `Nhiều đáp án đúng`).
    - Lưới đáp án 2x2: Chỉ nút A/B/C/D đổi màu xanh ngọc khi đúng, bỏ hoàn toàn chữ `(Đúng)` bên phải ô input.
  - *Cột Phải 30% Kéo Thả & Active Glow Nền Trắng:*
    - Thẻ câu hỏi Active: Giữ nguyên nền trắng/card (`bg-card`), chỉ bật viền cam nổi bật + đổ bóng mờ xung quanh (`border-amber-500 ring-2 ring-amber-500/25 shadow-md shadow-amber-500/15`).
    - Icon kéo thả 6 chấm `⠿` (`lucide:grip-vertical`): Hỗ trợ HTML5 Drag & Drop giữ và kéo thẻ câu hỏi để hoán đổi thứ tự hiển thị trực quan.
- **Triển Khai Trọn Vẹn Hệ Thống Câu Hỏi Tương Tác Video (Full-stack Backend & Student Interactive Flow)**:
  - *Bộ Nhớ & Cơ Sở Dữ Liệu Backend (`lesson_quizzes` Collection):*
    - Khởi tạo `LessonQuizEntity` kế thừa `BaseAbstractDocument`, đánh chỉ mục phức hợp `{ lessonId: 1, deletedAt: 1, timestamp: 1, order: 1 }` hỗ trợ truy vấn tối ưu theo mốc thời gian.
    - Cài đặt Repository (`LessonQuizRepository`) và Service (`LessonQuizService`) kế thừa `BaseService`, hỗ trợ atomic synchronization câu hỏi tại từng timestamp (`syncQuizzesAtTimestamp`).
    - API Endpoints: `GET /lessons/:id/quizzes`, `PUT /lessons/:id/quizzes/sync`, `DELETE /lessons/quizzes/:quizId`.
    - Viết 10/10 test Vitest phủ trọn các trường hợp nghiệp vụ của `LessonQuizService`.
  - *Giao Diện Học Viên Tương Tác Trong Video (Student In-Video Flow):*
    - Khi video phát tới mốc câu hỏi (`Math.floor(currentTime) === quiz.timestamp`), tự động pause video và hiển thị `InVideoQuizPromptOverlay` gồm 2 nút: `[Làm câu hỏi]` và `[Bỏ qua]`.
    - Modal bài tập học viên `StudentInVideoQuizModal`: Tỉ lệ 16:9 (`aspect-video`) chuẩn kích thước container (`max-w-[calc(1440px-3rem)]`), hỗ trợ làm từng câu hỏi với thanh tiến trình.
    - Phản hồi đúng/sai tức thì: Khi chọn đáp án, hệ thống hiển thị màu xanh lá (`emerald`) nếu đúng hoặc màu đỏ (`rose`) nếu sai kèm biểu tượng trực quan.
    - Nút giải thích đáp án: Bổ sung nút `[💡 Xem giải thích]` cho phép học viên mở rộng/thu gọn phần giải thích chi tiết của giảng viên.
    - Tiếp tục xem video: Nút `[Tiếp tục xem video]` sau khi hoàn thành hoặc bỏ qua sẽ tự động tua nhẹ (+0.5s) và resume video playback mượt mà.
  - *Tích hợp Giảng viên & Seekbar Timeline Markers:*
    - Đồng bộ `CreateQuizMarkerModal` lưu trực tiếp câu hỏi vào MongoDB qua `useSyncLessonQuizzesMutation`.
    - Hiển thị các điểm dừng câu hỏi thực tế từ CSDL trên thanh trượt thời gian Seekbar (`quizCheckpoints`).
- **Khắc Phục Lỗi Đồng Bộ Dữ Liệu Lưu Câu Hỏi (Payload Mismatch Fix)**:
  - *Root Cause:* Phía Client gửi body `{ timestamp, quizzes: [...] }` trong khi NestJS DTO yêu cầu `questions: [...]` với `forbidNonWhitelisted: true`, dẫn đến lỗi `property quizzes should not exist, questions must be an array`.
  - *Giải pháp:* Cập nhật DTO `SyncLessonQuizzesAtTimestampDto` với `@Transform` hỗ trợ song song cả 2 thuộc tính `questions` và `quizzes`; chuẩn hóa API Client và Modal gửi trường `questions`; đồng thời bổ sung quyền `RoleEnum.STUDENT, RoleEnum.USER` vào endpoint đồng bộ để hỗ trợ tài khoản test cục bộ.
- **Tính Năng Nút "Thêm Câu Hỏi" Khi Hover Trúng Mốc Checkpoint Đã Có Trên Timeline**:
  - *Cơ chế Hover Detect:* Khi giảng viên rê chuột trên thanh tua Seekbar chạm trúng mốc thời gian đã có câu hỏi (`quizCheckpoints` lân cận $\pm 1.5$s), hệ thống ẩn ghim tạo mới và hiển thị một button nổi bo góc màu cam `[+ Thêm câu hỏi (Câu N+1)]` ngay phía dưới thanh timeline.
  - *Tự động Append Câu Mới:* Click vào nút này sẽ mở Modal `CreateQuizMarkerModal`, tải toàn bộ các câu hỏi đã có trước đó và tự động khởi tạo câu hỏi tiếp theo ở cuối danh sách, đồng thời chuyển trạng thái soạn thảo active sang câu hỏi mới để giảng viên nhập ngay đề bài và đáp án.
- **Khắc Phục Lỗi Không Click Được Nút "Thêm Câu Hỏi" Khi Hover Dưới Thanh Timeline (Grace Period & Hitbox Bridge Fix)**:
  - *Root Cause:* Khung thanh tua timeline chỉ có chiều cao `h-4` (16px). Nút "Thêm câu hỏi" được đặt ở `top-full mt-2.5` (cách ~10px khoảng trống chết phía dưới). Khi người dùng di chuyển con trỏ chuột từ thanh tua xuống nút bấm, sự kiện `mouseLeave` trên thanh tua kích hoạt tức thì làm reset `hoverSlider = null`, dẫn đến `matchedHoverCheckpoint` biến mất và DOM của nút bấm bị hủy ngay trước hoặc đúng thời điểm click. Ngoài ra, thẻ `<input type="range">` có `z-20` đè lên các checkpoint dots (`z-15`) và thiếu khoảng thời gian trễ (grace period).
  - *Giải pháp:*
    1. Thêm bộ đếm thời gian trễ Grace Period (`hoverLeaveTimeoutRef = 350ms`) khi rời thanh tua slider hoặc rời nút bấm, giúp giữ nguyên trạng thái hiển thị của nút khi chuột di chuyển xuống.
    2. Bổ sung cầu nối hitbox vô hình (`hitbox bridge`: `<div className="absolute -top-3 inset-x-0 h-4 bg-transparent pointer-events-auto" />`) và gắn sự kiện `onMouseEnter`/`onMouseLeave` trên nút để hủy timeout, giữ nút luôn sáng rõ và tương tác ổn định khi con trỏ đang ở trên nút.
    3. Nâng cấp `z-index` của nút lên `z-50` và các mốc checkpoint trên timeline lên `z-30 pointer-events-auto` (vượt qua `z-20` của range input), thêm `e.preventDefault()` và `e.stopPropagation()` trên cả `onMouseDown` và `onClick`.
    4. Mở rộng độ nhạy tìm kiếm mốc checkpoint theo cả tỷ lệ phần trăm bề rộng timeline (`timeDiff <= 2.0s || percentDiff <= 1.8%`), đảm bảo mượt mà trên mọi thời lượng video dài ngắn khác nhau.
    5. Tối giản nhãn nút: Bỏ phần hiển thị số thứ tự trong ngoặc `(Câu N)`, chỉ giữ nguyên nội dung ngắn gọn và sạch sẽ `[+ Thêm câu hỏi]`.
    6. Chuẩn hóa điểm kích hoạt Hover (Yellow Dot Only): Loại bỏ cơ chế tự động khớp gần theo dải timeline $\pm 2.0$s. Chuyển sang kích hoạt strictly khi con trỏ chuột hover trực tiếp vào vòng tròn vàng (`hoveredDotCheckpoint` qua `onMouseEnter` của dot `size-4`), di chuyển dọc thanh tua không còn bị tự động nhảy popup sớm.
- **Xử Lý Liền Mạch Luồng Câu Hỏi Tương Tác Trong Chế Độ Toàn Màn Hình (Fullscreen Interactive Quiz Flow)**:
  - *Phát Lại Ngay Tại Thời Điểm Dừng (Exact Resume Playback):* Bỏ hoàn toàn bước nhảy cóc `videoRef.current.currentTime += 0.5` trong `handleSkipPrompt` và `handleCompleteAndResumeVideo`. Khi học viên bấm `[Bỏ qua]` hoặc hoàn thành câu hỏi, video tiếp tục phát mượt mà ngay tại mili-giây dừng hiện tại; mốc thời gian đã được ghi nhận vào `handledQuizTimestampsRef` để không bị dừng lặp lại.
  - *Khóa Kích Thước Modal Chuẩn Màn Hình Thường (`max-w-[1020px]`):* Thay vì để Modal co giãn theo màn hình lớn khi bật Toàn màn hình, giao diện bài tập học viên được cố định kích thước `max-w-[1020px] aspect-video max-h-[92%]` đặt cân đối ở giữa, typography và 4 đáp án A/B/C/D vừa vặn trong tầm nhìn người học.
  - *In-Player Cinema Overlay & Tương Thích HTML5 Fullscreen API:* Thay thế Radix/Base UI Dialog (vốn dùng Portal đẩy ra `document.body` làm bị trình duyệt che khuất phía sau Fullscreen) bằng In-Player Cinema Overlay (`absolute inset-0 z-40 bg-black/80 backdrop-blur-sm`) nằm trực tiếp bên trong vùng hiển thị của Video Player. Giữ nguyên 100% chế độ Toàn màn hình (Fullscreen) xuyên suốt từ lúc làm bài đến khi tiếp tục xem video.
  - *Chặn Xung Đột Phím Tắt:* Tự động vô hiệu hóa các phím tắt điều khiển video (`Space`, mũi tên tua) khi Overlay câu hỏi đang mở và hỗ trợ phím `Escape` để bỏ qua/đóng modal nhanh.
- **Khắc Phục Tụ Tập Nhiều Chấm Vàng & Gom Cụm 1 Chấm Duy Nhất (Single Quiz Marker Clustered Flow)**:
  - *Xóa Bỏ Mock State Trùng Lặp:* Loại bỏ hoàn toàn state `createdQuizzes` thừa trong `LessonVideoScreen`. Chấm vàng trên timeline giờ đây chỉ được quản lý duy nhất từ MongoDB (`dbQuizzes`), ngăn chặn triệt để tình trạng vẽ đè 2 lớp chấm vàng lên nhau.
  - *Thuật Toán Gom Cụm Lân Cận ($\le 2$s):* Gom tất cả các câu hỏi có mốc thời gian cách nhau $\le 2$ giây về chung 1 `clusterKey`. Dù tại mốc đó có 1, 3 hay 5 câu hỏi thì trên thanh tua chỉ hiển thị duy nhất 1 chấm vàng sạch sẽ, không còn hiện tượng dính chùm hay lệch vài pixel.
  - *Chuẩn Hóa Timestamp Số Nguyên & Tải Cụm:* Chuẩn hóa `Math.round(timestamp)` khi lưu câu hỏi và nạp đầy đủ danh sách câu hỏi trong cụm $\le 2$s khi mở modal `CreateQuizMarkerModal`.
- **Chuyển Đổi Hệ Thống 4 Tab Mở Rộng Dưới Video Player (Summary, Mindmap, Quizz, Chatbot)**:
  - *Mục tiêu:* Thay thế 3 tab chung chung ban đầu (`Tab 1`, `Tab 2`, `Tab 3`) thành 4 tab chuyên biệt theo kiến trúc chức năng bài học: `Summary` (Tóm tắt), `Mindmap` (Sơ đồ tư duy), `Quizz` (Câu hỏi tương tác) và `Chatbot` (Trợ lý AI).
  - *Thanh Điều Hướng 4 Cột:* Đổi cấu hình hiển thị thanh tab sang `grid-cols-4`, mỗi tab có số thứ tự (1, 2, 3, 4) được highlight bằng nhãn Sky Blue khi active (`border-sky-600 bg-background shadow-2xs font-bold`) và hover mượt mà.
  - *Khung Layout Rỗng Chuyên Biệt (Clean Empty Placeholder Layout):* Thiết kế giao diện khung rỗng độc lập cho từng tab trong `LessonTabsContainer`:
    - Tab 1 (Summary): Icon `lucide:file-text`, khung card nét đứt sẵn sàng hiển thị nội dung tóm tắt và key points.
    - Tab 2 (Mindmap): Icon `lucide:network`, tiêu đề sơ đồ tư duy và badge sẵn sàng tích hợp canvas ReactFlow/Markmap.
    - Tab 3 (Quizz): Icon `lucide:help-circle`, sẵn sàng kết nối danh sách câu hỏi trắc nghiệm của bài học.
    - Tab 4 (Chatbot): Icon `lucide:bot`, layout khung hội thoại AI với badge sẵn sàng kết nối trợ lý AI Gemini.
  - *Code Quality & Strict Rules:* Tuân thủ Purple Ban (chỉ dùng Sky Blue / Neutral Slate), không dùng type `any`, `npx tsc --noEmit` pass 100%.

