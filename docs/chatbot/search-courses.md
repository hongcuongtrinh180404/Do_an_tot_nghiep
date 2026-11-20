# `search_courses` — tìm khóa học công khai

## Phạm vi đã triển khai

Một function chỉ đọc xử lý các yêu cầu tìm theo chủ đề, mức giá, miễn phí/trả phí,
trình độ và phân trang. AI mở rộng các mục tiêu học rộng thành từ khóa liên quan.
Nhóm chủ đề dùng **OR**; giá/trình độ/miễn phí/phạm vi công khai vẫn kết hợp bằng **AND**.

```text
ChatbotSearchModule
  ├─ ChatbotModule → ChatbotAiClient → River AI (credential riêng trước đây là key 3)
  ├─ ChatbotSearchService → SearchCoursesTool
  └─ PublicCourseSearchModule → service/repository chỉ đọc → MongoDB
```

`ChatbotModule` nền tảng vẫn không phụ thuộc database hoặc Gemini/Mindmap/Summary/Quiz.
Module tìm kiếm được tích hợp qua `ChatbotHttpModule` trong `AppModule`, không kéo theo `CourseModule` và
các dependency enrollment/media/payment. Catalog HTTP hiện tại không bị thay đổi.

Đã có [HTTP API chat](./http-api.md) yêu cầu JWT qua `ChatbotHttpModule`.
Đã có [widget frontend](./frontend-widget.md), chưa lưu lịch sử hội thoại trên server.
Vẫn có thể inject service để sử dụng/test luồng hoàn chỉnh. Không thực hiện đăng ký, thanh toán, ghi dữ liệu
hoặc tìm nội dung bài học riêng tư.

## Contract

| Tham số             | Ý nghĩa                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `keyword`           | Chủ đề/mục tiêu gốc, 1–100 ký tự. Tìm trong tiêu đề, mô tả giới thiệu dạng text, tên danh mục active và tags. |
| `relatedKeywords`   | Tối đa 8 chuỗi, mỗi chuỗi 1–100 ký tự. Công nghệ/cụm từ liên quan do AI suy luận cho mục tiêu rộng. OR với keyword, cần có keyword. |
| `minPrice`          | Số nguyên VND ≥ 0; giá bán hiện tại **≥** giá trị này.                                                                                |
| `maxPrice`          | Số nguyên VND ≥ 0; giá bán hiện tại **≤** giá trị này theo mặc định.                                                                  |
| `maxPriceExclusive` | `true` chuyển cận trên thành **< maxPrice**. Mặc định `false`; chỉ được `true` khi có `maxPrice`.                                     |
| `isFree`            | `true`: giá bằng 0. `false`: giá > 0. Bỏ qua: cả miễn phí và trả phí.                                                                 |
| `level`             | So sánh đúng enum `beginner`, `intermediate`, `advanced`, `all_levels`. Không tự thêm `all_levels` vào kết quả beginner.              |
| `page`              | Mặc định 1, số nguyên 1–1000.                                                                                                         |
| `limit`             | Mặc định 5, số nguyên 1–10.                                                                                                           |

`price`, không phải `originalPrice`, là cơ sở lọc giá. `500k` được model chuyển thành
500000 VND. Giới hạn tối đa cho số tiền là `Number.MAX_SAFE_INTEGER`.

Ví dụ:

| Câu hỏi                                    | Arguments                                                    |
| ------------------------------------------ | ------------------------------------------------------------ |
| Có khóa học React không?                   | `{"keyword":"React"}`                                        |
| Khóa học nào dưới 500k?                    | `{"maxPrice":500000,"maxPriceExclusive":true}`               |
| Tìm khóa Python cho người mới              | `{"keyword":"Python","level":"beginner"}`                    |
| Có khóa học miễn phí không?                | `{"isFree":true}`                                            |
| Có khóa học thiết kế nào từ 200k đến 500k? | `{"keyword":"thiết kế","minPrice":200000,"maxPrice":500000}` |
| Có khóa học lập trình dưới 20k không? | `{"keyword":"lập trình","relatedKeywords":["Python","JavaScript","HTML","CSS","React","Node.js","NestJS","Java"],"maxPrice":20000,"maxPriceExclusive":true}` |
| Tôi muốn học làm website, có khóa nào dưới 200k không? | `{"keyword":"làm website","relatedKeywords":["HTML","CSS","JavaScript","React","Next.js","frontend","web development"],"maxPrice":200000,"maxPriceExclusive":true}` |
| Có khóa học backend dưới 200k không? | `{"keyword":"backend","relatedKeywords":["Node.js","NestJS","Express","REST API"],"maxPrice":200000,"maxPriceExclusive":true}` |

Danh sách mở rộng là ví dụ, không phải bảng alias cố định. Prompt yêu cầu giữ
keyword gốc, chỉ mở rộng mục tiêu rộng; không mở React thành mọi khóa lập trình,
không mở từ khóa chính xác/chủ đề không biết. Không dùng cả danh mục CNTT như
bằng chứng một khóa học dạy backend. Các điều kiện giá/trình độ không được nới.

Backend luôn thêm `status = published`, `deletedAt = null`, kể cả người dùng là
admin. Model không có tham số thay đổi phạm vi này.

Arguments có giới hạn 4096 bytes; phải là JSON object với đúng các trường allowlist.
Sai kiểu, field lạ, giá âm, khoảng giá rỗng hoặc điều kiện miễn phí/trả phí mâu
thuẫn bị từ chối trước khi truy vấn. Không tự chuyển chuỗi `"500000"` thành số,
không tự bỏ hoặc nới lỏng bộ lọc để có kết quả.

Keyword và relatedKeywords được trim/NFC, loại trùng không phân biệt hoa/thường;
không tự cắt danh sách quá giới hạn. Regex được escape, dùng ranh giới từ Unicode
(API không khớp "capital", Java không khớp JavaScript), linh hoạt khoảng trắng.
Không fuzzy/bỏ dấu/vector/RAG. Các cụm từ đồng nghĩa nằm trong relatedKeywords.

## Tìm kiếm và xếp hạng

Một aggregate MongoDB chỉ đọc thực hiện:

1. Lọc `published`, `deletedAt=null`, giá bán hiện tại, trình độ và miễn phí.
2. Lookup tên danh mục đang active/chưa xóa. Danh mục ẩn không tạo topic match.
3. Tìm chủ đề trong tiêu đề, tags, tên danh mục và text mô tả giới thiệu.
   Bỏ HTML tags, attributes, comments, script/style/head và xử lý các HTML entity
   phổ biến. Đây là trích xuất text để tìm kiếm, không phải bộ sanitizer để render.
4. Chấm điểm và lọc các khóa có match. Từ khóa gốc luôn ưu tiên hơn toàn bộ
   các từ khóa mở rộng; trong mỗi nhóm: **tiêu đề > tags > danh mục > mô tả**.
   Điểm cộng theo field: gốc `8000/6000/3000/1000`, mở rộng `80/60/30/10`.
5. Dùng chung tập match cho tổng số và phân trang (`$facet`). Sort điểm giảm dần,
   sau đó `createdAt DESC, _id DESC` để thứ tự ổn định. Không lấy một trang rồi mới rank.

Truy vấn không chủ đề giữ thứ tự mới nhất. Mọi query có deadline 3000 ms,
không `$out`, `$merge`, server-side JavaScript hoặc ghi cache/index/dữ liệu.

`CourseSchema.tags` là metadata tùy chọn (mặc định `[]`, tối đa 20 tag,
mỗi tag tối đa 100 ký tự). Dữ liệu cũ không cần backfill để tìm theo các field khác.
Không tự tạo/gán tag từ chatbot; đợt này chưa bổ sung API/UI quản lý tags.

## Kết quả và chống bịa dữ liệu

`SearchCoursesTool.execute(rawArguments, signal?)` trả:

```ts
{
  filtersApplied: { keyword: 'React', maxPriceExclusive: false, page: 1, limit: 5 },
  items: [
    // { id, title, price, level, categoryName, url }
  ],
  currency: 'VND',
  total: 0,
  page: 1,
  limit: 5,
  hasMore: false
}
```

`url` được backend dựng từ ID thật dưới `/courses/{id}`. Mô tả và tags chỉ dùng để
match/rank trong database; bị loại trước khi trả kết quả. Không gửi mô tả, điểm,
nội dung trả phí, email giảng viên hoặc audit data tới model/frontend.
`filtersApplied.relatedKeywords` cho biết các từ khóa mở rộng đã dùng.

`ChatbotSearchService` chỉ dùng **một request model** để trích xuất điều kiện và
chỉ cho phép **một call `search_courses`**. Tên/giá/link trong câu trả lời được
backend dựng trực tiếp từ tool result, không dùng nội dung model tự sinh và không
gửi kết quả khóa học trở lại model. Đây là lựa chọn chủ động cho tiêu chí không bịa.

Khi `total = 0`, câu trả lời cố định:

> Hiện chưa tìm thấy khóa học công khai phù hợp với các điều kiện bạn yêu cầu.

Trạng thái service:

- `found`: có kết quả; `answer` dựng từ database và `result` chứa dữ liệu có cấu trúc.
- `empty`: không có khóa học thỏa bộ lọc.
- `page_empty`: còn khóa học phù hợp nhưng trang yêu cầu ngoài kết quả hiện có.
- `needs_clarification`: model không gọi tool, gọi sai/nhiều tool hoặc arguments không hợp lệ.
- `unavailable`: truy vấn database lỗi/timeout; không giả làm “không có kết quả”.

Lỗi provider vẫn là `ChatbotAiError` an toàn; không tự retry, đổi model hoặc mượn
key 1/2. Không trả `reasoning_content`, provider message hay raw lỗi database.
Tên khóa học được escape khi dựng Markdown; structured `title` giữ nguyên dữ liệu.

### Sử dụng trong NestJS

```ts
import { Module, Injectable } from "@nestjs/common";
import { ChatbotSearchModule } from "./modules/chatbot/chatbot-search.module.js";
import { ChatbotSearchService } from "./modules/chatbot/services/chatbot-search.service.js";

@Injectable()
export class ExampleService {
  constructor(private readonly chatbot: ChatbotSearchService) {}

  search(question: string, signal?: AbortSignal) {
    return this.chatbot.search(question, { signal });
  }
}

@Module({
  imports: [ChatbotSearchModule],
  providers: [ExampleService],
})
export class ExampleModule {}
```

### Hỏi tiếp có ngữ cảnh

HTTP nhận/trả context ký số theo tài khoản (xem `http-api.md`); không lưu transcript
hay session trong database. AI nhận bộ lọc đã xác minh, giá nhỏ nhất của trang vừa
hiển thị và `hasMore`, không nhận raw context token/JWT hoặc lịch sử câu trả lời.

Tool có các intent điều khiển tìm kiếm (không phải thao tác ghi dữ liệu):

- `action=new_search` (mặc định): câu hỏi độc lập/chủ đề mới, không kế thừa điều kiện.
- `action=refine`: chỉ truyền bộ lọc đổi; backend giữ nguyên các điều kiện còn lại,
  đặt trang về 1. `clearFilters` chỉ cho phép `keyword`, `minPrice`, `maxPrice`,
  `isFree`, `level`, dùng khi người dùng yêu cầu bỏ điều kiện.
- `action=next_page`: không kèm filter; backend giữ nguyên tiêu chí, tăng trang 1.
  Nếu đã hết trang, trả lời đã xem hết, không tự tìm lại từ đầu hoặc nới bộ lọc.
- `action=cheaper`: không kèm filter; backend đặt giá **nhỏ hơn giá thấp nhất của
  trang vừa hiển thị**, giữ các điều kiện khác và quay về trang 1. Không tự đoán
  số tiền. Nếu kết quả đã có khóa miễn phí hoặc không có giá tham chiếu, yêu cầu làm rõ.

Đổi keyword trong refine loại từ khóa mở rộng cũ. Đổi `maxPrice` không tự kế thừa
cờ exclusive cũ. Yêu cầu miễn phí thay thế giá tối thiểu dương được kế thừa.
Các bộ lọc sau khi merge luôn được validate lại, không tự bỏ mâu thuẫn còn lại.
Không có ngữ cảnh mà chỉ hỏi “xem thêm”/“rẻ hơn”/“chỉ người mới” thì yêu cầu nêu
chủ đề, không trả bừa mọi khóa học. Service vẫn chỉ dùng một lượt AI mỗi câu hỏi.

`AbortSignal` hủy lượt model và chặn/bỏ kết quả tool khi đã hủy. Query MongoDB đang
chạy có giới hạn 3000 ms mỗi thao tác; không giả định abort của caller lập tức
chấm dứt query phía MongoDB. Mỗi yêu cầu có tối đa một lượt model, không có vòng lặp
tool không giới hạn.

## Kiểm thử

Từ repository root:

```sh
pnpm --filter backend test:chatbot
pnpm --filter backend exec vitest run src/modules/course/tests/public-course-search.repository.spec.ts
pnpm --filter backend build
```

Test MongoDB thực với dữ liệu giả, PowerShell:

```powershell
$env:CHATBOT_SEARCH_DB_TESTS='true'
pnpm --filter backend test:chatbot
Remove-Item Env:CHATBOT_SEARCH_DB_TESTS
```

Chỉ kết nối `127.0.0.1:27017`; mỗi lượt dùng database riêng
`chatbot_search_test_<random>`, tạo fixture và dọn đúng database đó. Không truy cập
database ứng dụng. Mặc định test này bị skip, unit tests không cần MongoDB.

Smoke test bằng River và catalog thật:

```sh
# Năm câu hỏi nghiệm thu, tối đa năm request provider
pnpm --filter backend test:chatbot:search:live

# Một ca riêng, ví dụ kiểm tra không có kết quả
pnpm --filter backend test:chatbot:search:live --case=empty

# Các mục tiêu rộng: mỗi lệnh đúng một request provider
pnpm --filter backend test:chatbot:search:live --case=programming_under_20k
pnpm --filter backend test:chatbot:search:live --case=website_under_200k
pnpm --filter backend test:chatbot:search:live --case=backend_under_200k
```

Các case chọn riêng: `react`, `under_500k`, `python_beginner`, `free`,
`design_price_range`, `programming_under_20k`, `website_under_200k`,
`backend_under_200k`, `empty`. Nếu gặp 429, không tự retry: chạy lại case đó thủ công
sau khi provider khôi phục hạn mức.

Script dùng `CHATBOT_API_KEY` trong `backend/.env`, kiểm tra arguments thực tế model
sinh ra, đối chiếu các bản ghi kết quả và từng bộ lọc. Case `empty` dùng từ khóa
ngẫu nhiên và kiểm tra đúng câu trả lời rỗng. Script đọc database cấu hình với
`autoCreate=false`, `autoIndex=false`, không bootstrap `AppModule`, không ghi dữ
liệu hay tạo index. Output chỉ có trạng thái/tên case/số lượng, không có key,
question, tên khóa học, reasoning hoặc nội dung lỗi provider.
