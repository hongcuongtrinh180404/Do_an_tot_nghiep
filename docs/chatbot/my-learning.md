# Chatbot — khóa học và tiến độ cá nhân

Hai function chỉ đọc, dùng chung `POST /api/v1/chatbot/messages` có JWT Mindly.
Không nhận `userId` trong arguments; caller ID được truyền riêng từ guard tới tool.
Role admin/instructor không cho phép xem tài khoản khác.

## Quy tắc dữ liệu

- “Khóa đã mua” = enrollment đang hiệu lực, gồm cả đăng ký miễn phí, như `/my-courses`.
  Không dùng giá catalog để suy ra đã thanh toán. Bỏ enrollment bị thu hồi và khóa
  bị xóa; khóa đang ẩn/chưa publish nhưng còn sở hữu vẫn được liệt kê.
- Danh sách sắp theo `enrolledAt DESC, enrollmentId DESC`, phân trang sau khi lọc
  trạng thái và đếm đủ. Mặc định 5, tối đa 10 khóa/trang; trang từ 1 tới 1000.
- Tìm tên là literal substring không phân biệt hoa/thường, có escape regex; không
  mở rộng sang công nghệ/từ khóa liên quan như catalog.
- Tiến độ lấy từ `LearningProgressService.getProgressForCourses()`, tính trên các
  bài video hiện có và completion hợp lệ với media/quiz hiện tại. Có thể hoàn thành
  bằng quiz dù chưa có playback state. `watchedMs` là thời gian tích lũy, không
  quyết định phần trăm hoàn thành.
- `progressPercent=null` khi không có bài video; không thay bằng 0. Có bài video:
  phần trăm được floor tới hai chữ số; chỉ `COMPLETED` khi hoàn thành đủ bài.
- Đọc theo batch 50 enrollment, `maxTimeMS=1500` cho từng query, budget adapter
  tổng 8 giây. Hủy/timeout không được trả dữ liệu scan một phần; lỗi DB trả HTTP
  503 `CHATBOT_LEARNING_UNAVAILABLE`, không giả thành danh sách rỗng.

## `get_my_courses`

```ts
type Arguments = {
  action?: "new_list" | "refine" | "next_page"; // mặc định new_list
  keyword?: string; // 1–100 ký tự, tên literal
  learningStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  clearFilters?: Array<"keyword" | "learningStatus">;
  page?: number;
  limit?: number;
};
```

- `new_list`: bỏ bộ lọc cá nhân trước đó; không nhận `clearFilters`.
- `refine`: phải có danh sách `my_courses`; chỉ thay field được gửi, giữ field
  còn lại, xóa field có trong `clearFilters`, luôn trở lại trang 1.
- `next_page`: không kèm field khác, giữ toàn bộ bộ lọc/limit, tăng trang. Không
  có danh sách hoặc hết trang thì hỏi làm rõ, không tự chạy danh sách không lọc.
- Mỗi danh sách mới/refine/next_page thay ordered IDs, bỏ khóa đang chọn cũ.

Response `kind=my_courses`, `status=found|empty|page_empty`:

```ts
type OwnedCourse = {
  id: string;
  title: string;
  enrolledAt: string; // ISO
  url: string; // /courses/{id} nếu published, ngược lại /my-courses
  resumeUrl: string | null; // /courses/{id}/lessons/{lastLessonId}
  progress: {
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    progressPercent: number | null;
    completedLessons: number;
    totalLessons: number; // bài video
    watchedMs: number;
    lastLessonId: string | null;
    lastPositionSeconds: number;
  };
};
type MyCoursesResult = {
  filtersApplied: { keyword?: string; learningStatus?: string; page: number; limit: number };
  items: OwnedCourse[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};
```

## `get_my_learning_progress`

```ts
type Arguments =
  | { scope: "overview" }
  | { scope: "next_page" } // chỉ phân trang danh sách chọn khóa trùng tên
  | { scope: "course"; courseName: string; page?: number; limit?: number }
  | { scope: "course"; courseId: string }
  | { scope: "course"; position: number } // 1–10 ở trang vừa hiển thị
  | { scope: "course"; current: true };
```

`scope=course` bắt buộc đúng một selector. `courseId` phải có trong câu hỏi/link
hiện tại, không lấy ID model tự tạo. `page/limit` chỉ được dùng với `courseName`.

Response `kind=learning_progress`, `result` theo `scope`:

| Scope | Kết quả | Status |
| --- | --- | --- |
| `overview` | `totalCourses`, `notStarted`, `inProgress`, `completed` của toàn bộ sở hữu, không thừa kế bộ lọc danh sách | `found` hoặc `empty` |
| `selection` | `keyword`, `items: {id,title}[]`, `total`, `page`, `limit`, `hasMore` khi nhiều tên phù hợp | `needs_clarification` hoặc `page_empty` |
| `course` | `course: OwnedCourse`, `remainingLessons`, `lastLessonTitle` (string hoặc null) | `found` |
| `not_owned` | Chỉ `{scope:"not_owned"}`, không lộ tên/tiến độ khóa không được phép truy cập | `empty`, không phải HTTP 401 |

Tên khớp duy nhất được đọc chi tiết; nhiều tên khớp phải chọn, không lấy khóa đầu.
`position` dùng ordered IDs trên trang gần nhất (catalog, sở hữu hoặc selection);
vẫn kiểm tra enrollment thật trước khi trả tiến độ. `current` dùng khóa đã chọn,
hoặc danh sách hiện tại chỉ có một khóa; không đủ ngữ cảnh thì hỏi lại.

Điểm học tiếp phải thuộc bài/section còn hiệu lực trong khóa. Media đã thay hoặc
bài đã xóa sẽ làm mất điểm tiếp tục cũ. Detail kiểm tra enrollment lần nữa sau khi
đọc tiến độ để tránh trả dữ liệu khi quyền vừa bị thu hồi.

## Ngữ cảnh và điều phối

`ChatbotConversationService` gửi một request với ba tool definitions cho học viên
(`search_courses`, `get_my_courses`, `get_my_learning_progress`); giảng viên/admin
được cấp thêm [hai tool kinh doanh](./instructor-business.md). Chỉ thực thi khi
model trả đúng một tool hợp lệ, sau đó backend tự định dạng bằng dữ liệu thật.
Không gửi kết quả cá nhân, course IDs, caller ID, phần trăm hay thời gian học sang
provider; chỉ gửi gợi ý điều hướng và bộ lọc/tên đang được yêu cầu.

Context mới v3 ký HMAC theo tài khoản, TTL 30 phút, tối đa 8192 ký tự; vẫn đọc v2 học tập:

- Mode, kiểu danh sách, bộ lọc/trang/limit, `hasMore`, ordered IDs và ID đang chọn.
- Không phải token cấp quyền; luôn đọc enrollment/tiến độ mới.
- Hỏi detail bằng số thứ tự/“khóa đó” giữ danh sách gốc để tiếp tục phân trang/lọc.
- Nêu tên/ID khóa mới không giữ danh sách cũ không liên quan; tổng quan bỏ selection.
- Chuyển sang catalog mới không mang filter cá nhân sang; list mới bỏ selection cũ.
- `xem thêm` theo **kiểu danh sách**, không chỉ theo mode sau khi xem detail.
- V1 catalog có chữ ký/hạn còn hợp lệ vẫn được nhận, nhưng không tự bịa ordered IDs.

Context chỉ ký, không mã hóa. Không lưu transcript/context trong database,
localStorage hoặc sessionStorage. Không log context và dữ liệu cá nhân.
Quota/timeout giữ nguyên: 5 request/60 giây/tài khoản, backend 40 giây,
frontend 45 giây. Không retry tự động hoặc fallback credential/model.
Chatbot dùng riêng River key 3; key 1–2 vẫn dành cho Mindmap/Summary/Quiz.

## Kiểm thử

```powershell
pnpm --filter backend test:chatbot
pnpm --filter backend exec vitest run src/modules/learning-progress/tests
pnpm --filter frontend exec vitest run src/features/chatbot/tests

# MongoDB local: chỉ tạo/ghi/xóa database fixture riêng tên ngẫu nhiên.
$env:CHATBOT_SEARCH_DB_TESTS='true'
pnpm --filter backend exec vitest run src/modules/chatbot/tests/chatbot-learning.integration.spec.ts
Remove-Item Env:CHATBOT_SEARCH_DB_TESTS
```

Unit/HTTP tests kiểm tra parser, chống override tài khoản, context HMAC/v1/v2,
chọn theo trang, trùng tên, đổi chủ đề, timeout/hủy, không trả tổng một phần, lỗi
nghiệp vụ và allowlist. Mongo integration đối chiếu progress service thật, hai
tài khoản học cùng khóa, quiz không playback, thay media, batch nhiều trang và
snapshot dữ liệu trước/sau truy vấn để phát hiện business writes.

Smoke River/API và browser: xem [HTTP API](./http-api.md) và
[frontend widget](./frontend-widget.md). Không gọi đăng ký, thanh toán, tạo phiên
playback, heartbeat hoặc cập nhật completion. Không thêm RAG/vector infrastructure.

### Kết quả kiểm chứng — 21/11/2026

- 584 test backend pass (35 file): chatbot, progress, public search, Gemini và
  transcript analysis; có Mongo integration trong database fixture riêng.
  Các test AI bài học dùng mock, không gọi key 1–2.
- 63 test frontend pass; build backend/frontend, frontend typecheck và lint các
  file liên quan đều pass.
- Production widget: 12 kiểm tra hội thoại catalog + 9 kiểm tra cá nhân pass.
  Card cá nhân được chụp/đọc ở 1440, 768, 390 px: danh sách, detail, tên trùng,
  tổng quan. `inspectPanel` trong browser harness kiểm tra không tràn ngang,
  panel nằm trong viewport, touch targets và tỷ lệ thanh tiến độ.
- Giữ hướng giao diện hiện có của Mindly cho component này, không thiết kế lại
  landing page. Tên khóa và tỷ lệ/bài còn lại là nội dung chính; số liệu canh phải,
  dùng tabular figures; trạng thái null không biến thành 0; mobile dùng dialog
  toàn màn hình và action từ 44 px. Lint giao diện: 0 FAIL; ba cảnh báo hợp lệ là
  shadow của launcher/dialog nổi và zero-padding đồng hồ `m:ss`.
- Smoke HTTP/River thật pass đủ 5 lượt và 6 kiểm tra, đối chiếu trực tiếp với
  learning API; snapshot tiến độ trước/sau không đổi.
- Smoke widget/River thật pass 3 lượt đầu (danh sách → chọn khóa → “khóa đó”).
  Lượt thứ 4 bị provider trả `CHATBOT_RATE_LIMITED`/HTTP 429 trong khi quota
  Mindly còn 1. Đã dừng, không retry/đổi key hoặc bỏ quota; chưa xác nhận trọn
  smoke widget thật 5 lượt. Chạy lại thủ công sau khi provider khôi phục hạn mức.
