# Chatbot — doanh thu và lượt bán của giảng viên

Hai function chỉ đọc dùng cùng `POST /api/v1/chatbot/messages`:

- `get_instructor_revenue`: tổng thu nhập sau hoa hồng, tùy chọn một khóa giảng dạy.
- `get_instructor_sales_stats`: lượt mua, bảng bán chạy và so sánh giữa hai kỳ.

Học viên vẫn được cấp 3 tool cũ; giảng viên/admin được cấp 5 tool. Role và caller
ID lấy từ profile do JWT guard đọc lại từ database, không tin role claim trong
JWT hay arguments của model. Admin chỉ tra cứu tài khoản của mình, không tự có
quyền xem giảng viên khác qua chatbot.

## Ý nghĩa số tiền

**Thu nhập sau hoa hồng từ đơn đã thanh toán**, không phải xác nhận tiền đã được
chuyển vào ngân hàng giảng viên. Chưa có sổ chi trả/rút tiền trong chức năng này.

Nguồn: `orders`, `status=PAID`, `deletedAt=null` (gồm trường chưa tồn tại), giá trị
đơn dương. Một order là một lượt mua; không đếm enrollment miễn phí, webhook hoặc
từng lần chuyển khoản. `receivedAmount`/tiền chuyển thừa không làm tăng doanh thu.

Thu nhập từng order theo thứ tự:

1. `instructorEarnings` đã lưu, kể cả số **0**.
2. `amount - platformEarnings` đã lưu.
3. Backend tính từ `platformCommissionRate` lưu trên order; đơn cũ chỉ có
   `instructorCommissionRate` hợp lệ thì dùng phần chia này.
4. Thiếu dữ liệu hoặc số tiền mâu thuẫn → không trả tổng một phần hay tự mặc định 30%.

Không tra tỷ lệ hiện tại trên user/commission settings và không dùng giá catalog
hiện tại. Làm tròn hoa hồng VND **trên từng order** như checkout (`Math.round` cho
giá trị dương); không dùng Mongo `$round` vì khác quy tắc ở điểm .5.
Các số tiền/tổng phải là số nguyên không âm an toàn của JavaScript.

`instructorId` snapshot trên order là căn cứ chính; tác giả khóa hiện tại không
được ghi đè snapshot của người khác. Chỉ khi order thiếu instructor ID mới dùng
nhánh tương thích qua tác giả khóa. Khóa đã ẩn/xóa/chuyển tác giả vẫn giữ doanh thu
được ghi nhận cho instructor snapshot.

Ngày ghi nhận là `paidAt`. Nếu thiếu, chỉ khôi phục từ `transactionDate` của
payment liên kết đã xác thực và đã áp dụng; không lấy `createdAt` thay ngày trả
tiền. Order chưa xác định được ngày có thể làm tổng theo kỳ không thể xác nhận;
chatbot sẽ báo thiếu dữ liệu, không đoán kỳ cho order đó.

## Khoảng thời gian

Timezone cố định `Asia/Ho_Chi_Minh`:

| `timeRange` | Nghĩa |
| --- | --- |
| `today`, `yesterday` | Hôm nay đến hiện tại / toàn bộ hôm qua |
| `this_week`, `last_week` | Tuần bắt đầu thứ Hai; tuần này đến hiện tại |
| `7days`, `30days` | Hôm nay và 6 / 29 ngày lịch trước, đến hiện tại |
| `this_month`, `last_month` | Tháng này đến hiện tại / toàn bộ tháng trước |
| `this_year` | Từ đầu năm đến hiện tại |
| `custom` | `startDate` và `endDate` theo `YYYY-MM-DD`, gồm cả ngày cuối |

Mặc định khi chưa nêu thời gian: `this_month`. Hệ thống gửi ngày Việt Nam hiện tại
cho model để chuẩn hóa ngày thiếu năm. Backend kiểm tra ngày thật, không tự đổi
thứ tự ngày bị đảo, không nhận khoảng tương lai hoàn toàn hoặc dài quá 366 ngày.
Khoảng còn đang diễn ra được chặn tại `asOf`, có `isPartial=true`.

So sánh mặc định:

- **Tháng này đến hiện tại so với toàn bộ tháng trước**, không tự cắt thành cùng kỳ.
- Tuần này so với tuần trước đầy đủ; tháng trước so với tháng liền trước.
- Khoảng tùy chọn / rolling days so với khoảng ngày lịch liền trước cùng số ngày.
- Có thể chỉ định kỳ so sánh riêng bằng `compareTimeRange` và cặp ngày custom.
- Kỳ trước bằng 0, kỳ này >0: `direction=new`, `percent=null`; cả hai bằng 0:
  `direction=unchanged`, `percent=0`. Không có Infinity hoặc tỷ lệ tăng 100% giả.

## Arguments

Các field chung, không nhận `userId` / `instructorId`:

```ts
{
  action?: "new_query" | "refine" | "next_page";
  timeRange?: BusinessTimeRange;
  startDate?: string;
  endDate?: string;
  // Tối đa một selector:
  courseName?: string; // literal, 1–100 ký tự, không mở rộng từ khóa
  courseId?: string;   // ObjectId phải được viết trong câu hỏi/link hiện tại
  position?: number;   // 1–10 ở trang thống kê/chọn khóa mới nhất
  current?: true;      // khóa đang chọn trong ngữ cảnh kinh doanh, không phải khóa đang học
  allCourses?: true;   // bỏ bộ lọc khóa
  page?: number;       // 1–1000
  limit?: number;      // mặc định 5, tối đa 10
}
```

Riêng `get_instructor_sales_stats`:

```ts
{
  mode?: "sales_count" | "top_courses" | "compare";
  metric?: "instructor_earnings" | "successful_sales"; // chỉ compare
  compareTimeRange?: BusinessTimeRange;
  compareStartDate?: string;
  compareEndDate?: string;
}
```

- `new_query`: xóa điều kiện kinh doanh cũ, mặc định tháng này/tất cả khóa.
- `refine`: giữ field không gửi, thay field được gửi, về trang 1. Nếu model bỏ
  `action` nhưng gửi `position`, `current` hoặc `allCourses`, backend vẫn hiểu là
  refine và yêu cầu có ngữ cảnh kinh doanh trước đó.
- `next_page`: không gửi thêm field khác; dùng snapshot điều kiện của **danh sách
  gốc** để không phân trang nhầm sau khi đã xem doanh thu chi tiết một khóa.
- Tên khớp nhiều khóa → `scope=selection`, chờ người dùng chọn, không lấy khóa đầu.
- Bán chạy xếp theo `successfulSales DESC`, rồi thu nhập/ID để phân trang ổn định.
  `rank` giữ đồng hạng; `topTiedCount` nêu chính xác số khóa đồng hạng cao nhất,
  kể cả khi yêu cầu `limit=1` chỉ hiển thị một khóa.

Ví dụ:

```json
{"timeRange":"custom","startDate":"2026-11-01","endDate":"2026-11-20"}
{"timeRange":"7days"}
{"timeRange":"this_month","courseName":"React"}
{"mode":"top_courses","timeRange":"this_month","limit":1}
{"mode":"compare","timeRange":"this_month"}
{"mode":"sales_count","timeRange":"this_week"}
```

Ba ví dụ đầu dành cho revenue, ba ví dụ cuối dành cho sales stats.

## Kiến trúc / response

`ChatbotInstructorModule` → `InstructorRevenueReadModule` chỉ đăng ký order model
và repository đọc. Không kéo SePay, checkout, reconciliation, worker hoặc seed
vào module tài chính mới. Không có request AI thứ hai để viết lại kết quả.

`instructor-revenue.pipeline.ts` là định nghĩa chung về quyền doanh thu, ngày trả
tiền và tiền sau hoa hồng. `OrderRepository.getInstructorRevenueKpi()` và
`getInstructorCoursesRevenue()` dùng cùng phép tính với chatbot. Danh sách khóa
của trang giảng dạy vẫn giữ phạm vi khóa hiện tại theo hợp đồng cũ; chatbot có thể
tra cả doanh thu lịch sử của khóa đã xóa/chuyển tác giả.

Response mới có `kind=instructor_revenue|instructor_sales_stats`, `result.scope`:
`revenue`, `sales_count`, `compare`, `top_courses`, `selection`, `not_owned`.
Mọi nhánh có `period`, `asOf`, `timeZone`, `currency` và khóa đã xác minh hoặc null.
Không trả order ID/code, học viên/email, tài khoản ngân hàng hoặc raw payment.

Context **v3** ký HMAC theo tài khoản, TTL 30 phút, tối đa 8192 ký tự:

- Chỉ giữ điều kiện, khóa đã chọn và ordered IDs của danh sách.
- Ngữ cảnh kinh doanh tách khỏi enrollment/tiến độ cá nhân.
- Khi đã xem detail từ bảng bán chạy, “xem thêm” vẫn dùng bảng bán chạy gốc.
- Vẫn đọc context v1 catalog và v2 học tập hợp lệ; chỉ cấp mới v3.
- Không chứa số tiền, tổng lượt bán, JWT, transcript; token chỉ ký, không mã hóa.

Mongo query có `maxTimeMS=1500`; adapter tổng tối đa 8 giây và tuân theo hủy request.
Tổng, phân trang và xếp hạng cùng một aggregation; hai kỳ so sánh cũng cùng một
aggregation. Không trả số scan một phần. Quota vẫn 5 request/60 giây/account,
backend tổng 40 giây, frontend 45 giây. Không retry/fallback key/model tự động.

| HTTP / code | Hành vi |
| --- | --- |
| 403 `CHATBOT_INSTRUCTOR_FORBIDDEN` | Không còn quyền giảng dạy; không retry/đăng xuất, bỏ ngữ cảnh |
| 422 `CHATBOT_REVENUE_DATA_INCOMPLETE` | Chưa thể xác nhận từ dữ liệu cũ; không thay bằng 0, không retry tự động |
| 503 `CHATBOT_REVENUE_UNAVAILABLE` | DB/deadline adapter; cho phép người dùng thử lại thủ công |

## Kiểm thử

```powershell
pnpm --filter backend test:chatbot
pnpm --filter frontend exec vitest run src/features/chatbot/tests

$env:CHATBOT_SEARCH_DB_TESTS='true'
pnpm --filter backend exec vitest run src/modules/chatbot/tests/chatbot-instructor-revenue.integration.spec.ts
Remove-Item Env:CHATBOT_SEARCH_DB_TESTS

node frontend/scripts/test-chatbot-conversation-browser.mjs --business

$env:CHATBOT_BROWSER_ACCESS_TOKEN='EXISTING_INSTRUCTOR_TEST_ACCOUNT_ACCESS_TOKEN'
node frontend/scripts/test-chatbot-conversation-browser.mjs --live --business
Remove-Item Env:CHATBOT_BROWSER_ACCESS_TOKEN

# Một smoke 5 request KHÁC, không chạy cùng quota/minute với browser:
$env:CHATBOT_HTTP_SMOKE_ACCESS_TOKEN='EXISTING_INSTRUCTOR_TEST_ACCOUNT_ACCESS_TOKEN'
pnpm --filter backend test:chatbot:instructor:live
Remove-Item Env:CHATBOT_HTTP_SMOKE_ACCESS_TOKEN
```

Mongo integration chỉ ghi/xóa database fixture tên ngẫu nhiên riêng, có thể đặt
`CHATBOT_DB_TEST_URI` thành URI loopback cho test mới này. Không sửa dữ liệu thật.
Browser mặc định origin `http://localhost:3000`; đặt `CHATBOT_TEST_ORIGIN` để kiểm
tra production cổng khác. Live business dùng `CHATBOT_BROWSER_API_URL` mặc định
`http://localhost:8000/api/v1/` để GET đối chiếu thống kê; JWT chỉ truyền qua env,
không in hay lưu trong repository. Ảnh live có thể chứa dữ liệu tài khoản kiểm thử,
không commit/chia sẻ.

Live chạy đúng 5 request: doanh thu → so tháng trước đầy đủ → bán chạy → chọn
khóa theo position (hoặc lượt mua tuần này nếu chưa có khóa bán) → xóa chat/tham
chiếu không còn hiệu lực. Đối chiếu trực tiếp với GET thống kê giảng viên và kiểm
tra số liệu không đổi. Không đổi tài khoản/key để vượt quota.

Smoke HTTP bổ sung: khoảng ngày custom → 7 ngày gần nhất → hôm nay → lượt mua
tuần này → một khóa giảng dạy được chọn bằng ID thật. Mỗi kết quả đối chiếu GET
thống kê theo đúng khoảng ngày/khóa; đủ 5 lượt thì dừng, không retry tự động.
