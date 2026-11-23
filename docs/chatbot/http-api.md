# Chatbot HTTP API

## Endpoint

```http
POST /api/v1/chatbot/messages
Authorization: Bearer <Mindly access token>
Content-Type: application/json
```

`api/v1` là prefix mặc định; backend dùng `API_PREFIX` khi được cấu hình khác.
Endpoint yêu cầu đăng nhập bằng **JWT của Mindly**, không phải River API key.
Sử dụng global `JwtAuthGuard`/`JwtStrategy` hiện có: token phải hợp lệ, chưa hết
hạn và tài khoản vẫn hoạt động. Student, instructor và admin đều tìm catalog công
khai; hai tool cá nhân chỉ đọc enrollment/tiến độ của chính tài khoản đăng nhập,
không có quyền xem người khác theo role.
Giảng viên/admin còn được cấp [hai tool doanh thu/lượt bán](./instructor-business.md)
của chính mình. Học viên không được cấp hoặc thực thi các tool này.

Request:

```json
{
  "message": "Tìm khóa Python cho người mới dưới 500k"
}
```

- `message`: string không rỗng sau trim, tối đa 2000 ký tự (service giới hạn theo độ dài chuỗi JS).
- `context` tùy chọn: chuỗi tối đa 8192 ký tự, lấy nguyên từ response lần trước.
  Bỏ field này để bắt đầu lại. Backend xác minh chữ ký, tài khoản và hạn 30 phút.
  Không cho caller tự truyền object bộ lọc/lịch sử.
- Các field như `messages`, `tools`, `userId`, `model`,
  `apiKey`, `requestId` hay filter trực tiếp đều bị từ chối với HTTP 400.
- Có ngữ cảnh: hỗ trợ “chỉ dành cho người mới”, “miễn phí”, “rẻ hơn”, “xem thêm”,
  “khóa thứ hai”, “khóa đó”, “chỉ những khóa chưa bắt đầu”.
  Chưa lưu lịch sử server hoặc streaming. Request cũ chỉ có `message` vẫn hợp lệ.

Luồng:

```text
JWT guard → giới hạn lượt gọi → validate body
          → ChatbotMessageService
          → ChatbotConversationService → một request model, đúng một tool:
              search_courses → catalog công khai
              get_my_courses → enrollment đang hiệu lực + tiến độ hiện tại
              get_my_learning_progress → tổng quan / chọn khóa / chi tiết
              get_instructor_revenue → thu nhập sau hoa hồng (instructor/admin)
              get_instructor_sales_stats → lượt mua / bán chạy / so kỳ (instructor/admin)
          → backend dựng câu trả lời + chiếu allowlist → ApiResponse
```

`AppModule` import `ChatbotHttpModule`. `ChatbotModule` AI nền tảng và
`ChatbotSearchModule` không tự khai báo HTTP endpoint hoặc phụ thuộc xác thực.
Không gửi kết quả cá nhân cho model để viết lại câu trả lời, không có lượt gọi
model thứ hai. Xem đầy đủ [hợp đồng hai tool cá nhân](./my-learning.md).
Không thay đổi allocation key: chatbot tiếp tục dùng riêng credential trước đây
là River key 3 trong `CHATBOT_API_KEY`.

## Response thành công — HTTP 200

Giữ envelope `ApiResponse` hiện có. Ví dụ hợp đồng nhánh catalog:

```ts
type ChatbotCatalogApiResponse = {
  success: true;
  data: {
    requestId: string; // UUID do server tạo
    kind: "course_search";
    status: "found" | "empty" | "page_empty";
    answer: string;
    context?: string; // ngữ cảnh ký số, chỉ dùng lại với cùng tài khoản
    result: {
      filtersApplied: {
        keyword?: string;
        relatedKeywords?: string[]; // AI mở rộng mục tiêu rộng, tối đa 8 từ
        minPrice?: number;
        maxPrice?: number;
        maxPriceExclusive: boolean;
        isFree?: boolean;
        level?: "beginner" | "intermediate" | "advanced" | "all_levels";
        page: number;
        limit: number;
      };
      items: Array<{
        id: string;
        title: string;
        price: number;
        level: "beginner" | "intermediate" | "advanced" | "all_levels";
        categoryName: string | null;
        url: string; // /courses/{id}
      }>;
      currency: "VND";
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
  };
  timestamp: string;
};
```

- `found`: có khóa học; frontend nên render card từ `result.items`.
- `empty`: không có khóa học thỏa bộ lọc; `items=[]`, `total=0`, câu trả lời cố định.
- `page_empty`: trang yêu cầu không có dữ liệu dù vẫn có khóa học phù hợp.
- `needs_clarification`: yêu cầu chưa rõ, arguments mâu thuẫn hoặc model không
  gọi đúng tool (`kind=clarification`, không có `result`); hoặc cần chọn khóa trùng
  tên (`kind=learning_progress`, `result.scope=selection`).

Các nhánh khác dùng cùng `requestId`, `status`, `answer`, `context?`:

| `kind` | `result` |
| --- | --- |
| `my_courses` | Danh sách sở hữu có `filtersApplied`, `items`, `total`, `page`, `limit`, `hasMore` |
| `learning_progress` | `scope=overview`, `selection`, `course` hoặc `not_owned` |
| `instructor_revenue` | Thu nhập theo kỳ/khóa, chọn khóa trùng tên hoặc không có quyền với khóa |
| `instructor_sales_stats` | Lượt mua, xếp hạng đồng hạng và so sánh hai kỳ do backend tính |
| `clarification` | Không có `result`; chỉ `status=needs_clarification` |

Các field/giá trị hợp lệ được định nghĩa ở
`backend/src/modules/chatbot/tools/my-learning.types.ts` và được frontend kiểm tra
qua Zod. Không diễn giải mọi `result` như kết quả catalog.

Tên/giá/link trong `answer` được backend dựng từ dữ liệu thật, không dùng model
để tự soạn thông tin khóa học. HTTP response dùng allowlist, không trả provider
response ID, reasoning, raw tool calls, usage, prompt, giao dịch hay playback session.
Nhánh cá nhân chỉ trả thông tin học của caller đã xác thực.
`filtersApplied.relatedKeywords` là metadata tìm kiếm công khai, không phải
reasoning của provider. Mô tả, tags thô và điểm xếp hạng không được trả trong items.

`context` v3 chứa mode, bộ lọc/trang của danh sách gần nhất, các course ID theo thứ
tự hiển thị, course ID đang chọn (nếu có), cờ `hasMore`, giá nhỏ nhất của trang
catalog và hạn dùng. Không chứa JWT, user ID, transcript, tên khóa trả về, phần
trăm, thời gian học, số tiền hay lượt bán. Bộ lọc kinh doanh tách khỏi khóa sở hữu.
Đây là token **ký HMAC, không mã hóa**; chỉ giữ trong bộ nhớ,
không log hoặc đưa vào URL. Context không cấp quyền truy cập.
Chữ ký dùng secret JWT hiện có, tách domain
`mindly:chatbot-conversation-context:v3`, ràng buộc user ID do JWT guard xác thực.
Vẫn nhận context catalog v1 và học tập v2 hợp lệ tới hết hạn; lượt trả sau cấp v3.
Không thêm session collection.
Context sai/hết hạn/khác tài khoản trả 400 `CHATBOT_CONTEXT_INVALID`, không phải
401 và không gọi provider. Frontend bỏ context và yêu cầu người dùng nêu lại.

Header cho request đi tới handler: `Cache-Control: no-store` và
`X-Request-Id: <UUID>`. Header `x-request-id`/`x-correlation-id` từ caller không
được dùng làm ID của request chatbot.

CORS expose `X-Request-Id`, `Retry-After` và các header `X-RateLimit-*` để frontend
được phép đọc; không thay đổi danh sách origin được cấu hình bằng `CORS_ORIGIN`.

## Rate limit và timeout

- **5 yêu cầu / 60 giây / tài khoản**, áp dụng cả admin.
- Định danh lấy từ profile do JWT guard xác thực, không từ `x-user-id`, IP hoặc
  chuỗi access token. Đổi IP hay refresh token không tạo quota mới.
- Bộ đếm riêng, không dùng/chỉnh cấu hình rate limit của các API auth.
- Giới hạn được kiểm tra trước body validation, nên request đăng nhập hợp lệ
  nhưng body sai vẫn chiếm một lượt.
- HTTP 429 do bộ đếm có `code=CHATBOT_HTTP_RATE_LIMITED` và header `Retry-After`
  (giây). Header `X-RateLimit-Limit/Remaining/Reset` do throttler cung cấp.
- Bộ đếm hiện **in-memory, theo mỗi backend process** và reset khi restart.
  Khi chạy nhiều replica cần shared throttler storage; hiện chưa bổ sung Redis.
- Timeout tổng **40 giây**, bao gồm model và tìm kiếm, dù
  `CHATBOT_TIMEOUT_MS` được đặt lớn hơn. Timeout từng model request vẫn lấy cấu
  hình client (mặc định 30 giây).
- Socket client đóng sẽ hủy signal tới client AI. MongoDB đang chạy có deadline
  riêng của query; kết quả hoàn tất sau hủy bị bỏ.
- Đọc cá nhân theo batch 50 khóa, `maxTimeMS=1500` mỗi query và budget tổng
  adapter 8 giây. Lọc trạng thái/đếm toàn bộ trước phân trang; scan không hoàn tất
  trả lỗi, tuyệt đối không trả tổng bị thiếu.
- Không tự retry, đổi model hoặc dùng River key 1/2 để dự phòng.
- Đọc doanh thu có cùng deadline query 1500 ms/budget adapter 8 giây; aggregate
  trên giao dịch thật, không gửi số tiền/kết quả cho model để tính hoặc viết lại.

Khi nối frontend, đặt timeout riêng của request chat lớn hơn 40 giây (ví dụ
45 giây), thay vì dùng mặc định 30 giây của API client chung. Widget đã tích hợp
theo hợp đồng này; xem `frontend-widget.md`.

## Lỗi

Lỗi từ tầng chatbot có response:

```json
{
  "statusCode": 504,
  "code": "CHATBOT_TIMEOUT",
  "message": "Trợ lý phản hồi quá thời gian chờ. Bạn vui lòng thử lại sau.",
  "retryable": true,
  "requestId": "65ac3483-7075-48e3-8bbe-4c3a6eb9cced"
}
```

| HTTP | Trường hợp / code                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------- |
| 400  | Body sai (`ValidationPipe`); hoặc `CHATBOT_REQUEST_INVALID`.                                      |
| 400  | `CHATBOT_CONTEXT_INVALID`: context không hợp lệ/hết hạn/khác tài khoản; không retry nguyên request. |
| 401  | Thiếu/sai/hết hạn JWT Mindly, tài khoản không còn hoạt động.                                      |
| 403  | `CHATBOT_INSTRUCTOR_FORBIDDEN`: không được phép đọc thống kê giảng dạy. |
| 408  | Caller hủy request: `CHATBOT_CANCELLED` (thường socket đã đóng).                                  |
| 422  | Provider không thể xử lý nội dung: `CHATBOT_RESPONSE_BLOCKED`.                                    |
| 422  | `CHATBOT_REVENUE_DATA_INCOMPLETE`: chưa đủ dữ liệu xác nhận số liệu, không retry hay trả 0 giả. |
| 429  | Quota API theo user: `CHATBOT_HTTP_RATE_LIMITED`; hoặc River trả 429: `CHATBOT_RATE_LIMITED`.     |
| 502  | `CHATBOT_PROVIDER_ERROR`, `CHATBOT_RESPONSE_INVALID`, `CHATBOT_RESPONSE_INCOMPLETE`.              |
| 503  | Chatbot tắt, config/key provider lỗi, provider không khả dụng, `CHATBOT_SEARCH_UNAVAILABLE`, `CHATBOT_LEARNING_UNAVAILABLE` hoặc `CHATBOT_REVENUE_UNAVAILABLE`. |
| 504  | Timeout: `CHATBOT_TIMEOUT`.                                                                       |
| 500  | Lỗi không xác định đã làm sạch: `CHATBOT_INTERNAL_ERROR`.                                         |

Validation/auth errors giữ format chuẩn NestJS; không bắt buộc có `code` hoặc
`requestId`. Local rate-limit error có `code`, `retryable` nhưng chưa có
`requestId` vì bị chặn trước handler.

**401/403 của River được map thành HTTP 503**, không phải 401. Frontend không được
refresh JWT hoặc đăng xuất người dùng khi chatbot/provider lỗi. Không tự suy ra
`Retry-After` của River; chỉ local quota có thời gian chờ chắc chắn.

Query database lỗi/timeout trả 503, không giả làm kết quả tìm kiếm rỗng.
Log chỉ có request UUID và mã lỗi chuẩn hóa; không lưu question/JWT, provider
body, credential hay raw exception/cause.

## Chạy và kiểm thử

Khởi động/restart backend bằng lệnh dev hiện có, đảm bảo
`CHATBOT_ENABLED=true` và `CHATBOT_API_KEY` đã cấu hình.

Trong Postman:

1. Đăng nhập theo flow Mindly hiện có, lấy **access token**.
2. Chọn Bearer Token cho endpoint trên.
3. Gửi raw JSON chỉ gồm `message`.
4. Thử các câu React, dưới 500k, Python beginner, miễn phí, thiết kế 200k–500k.
5. Kiểm tra từ khóa không tồn tại, body sai, thiếu/hết hạn token; nếu gặp 429,
   chờ theo hạn mức thay vì dùng key khác.

Ví dụ cURL (thay placeholder token ở máy local, không commit/chia sẻ token):

```sh
curl -X POST http://localhost:8000/api/v1/chatbot/messages \
  -H "Authorization: Bearer YOUR_MINDLY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Có khóa học React không?"}'
```

Script smoke HTTP dùng backend **đã chạy**, mặc định gửi đúng một request:

```powershell
$env:CHATBOT_HTTP_SMOKE_ACCESS_TOKEN='YOUR_MINDLY_ACCESS_TOKEN'
pnpm --filter backend test:chatbot:http:live
Remove-Item Env:CHATBOT_HTTP_SMOKE_ACCESS_TOKEN
```

Thêm `--conversation` để chạy đúng 5 request: lập trình dưới 200k (2 khóa/trang)
→ xem thêm (không trùng trang) → beginner → miễn phí → đổi sang Yoga (xóa bộ lọc cũ).
Cần catalog có hơn 2 khóa lập trình; không tự tạo dữ liệu, retry hoặc bỏ quota:

```sh
pnpm --filter backend test:chatbot:http:live --conversation
```

Smoke hai tool cá nhân dùng đúng 5 request chatbot và hai lượt GET đối chiếu
với API học tập, bằng tài khoản kiểm thử đã có enrollment:

```powershell
$env:CHATBOT_HTTP_SMOKE_ACCESS_TOKEN='YOUR_EXISTING_TEST_ACCOUNT_TOKEN'
pnpm --filter backend test:chatbot:learning:live
Remove-Item Env:CHATBOT_HTTP_SMOKE_ACCESS_TOKEN
```

Luồng: danh sách (2 khóa/trang) → tiến độ khóa đầu → “khóa đó” → lọc chưa bắt
đầu → tổng quan. Không tự đăng nhập/tạo JWT, không ghi enrollment hoặc tiến độ;
không log kết quả cá nhân. Đợi quota hồi phục trước khi chạy một smoke 5 lượt khác.

Tùy chọn process env: `CHATBOT_HTTP_SMOKE_URL` (URL đầy đủ, chỉ HTTPS hoặc HTTP
loopback), `CHATBOT_HTTP_SMOKE_MESSAGE`. Mặc định script đọc PORT/API_PREFIX
từ `backend/.env`, gọi localhost với câu hỏi React. Không tự đăng nhập, tạo JWT,
tạo user hay khởi động `AppModule`. Script không in token/response body.

Kiểm thử tự động:

```sh
pnpm --filter backend test:chatbot
pnpm --filter backend build
```

HTTP tests chạy app Nest cô lập, dùng **JwtAuthGuard và JwtStrategy thật**, ký JWT
test bằng secret giả; mock account lookup, provider và search data. Không đọc
credential `.env`, gọi River, bootstrap AppModule hoặc ghi database.
Bao gồm năm câu hỏi mẫu, trường hợp rỗng, validation/field injection, token
thiếu/hết hạn/sai chữ ký, tài khoản bị khóa, quota theo account, lỗi provider,
DB lỗi, projection bảo mật, timeout tổng và disconnect/cleanup.
