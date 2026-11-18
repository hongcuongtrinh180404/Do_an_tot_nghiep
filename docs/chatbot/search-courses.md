# `search_courses` — tìm khóa học công khai

## Phạm vi đã triển khai

Một function chỉ đọc xử lý các yêu cầu tìm theo chủ đề, mức giá, miễn phí/trả phí,
trình độ và phân trang. Tất cả bộ lọc kết hợp bằng **AND**.

```text
ChatbotSearchModule
  ├─ ChatbotModule → ChatbotAiClient → River AI (credential riêng trước đây là key 3)
  ├─ ChatbotSearchService → SearchCoursesTool
  └─ PublicCourseSearchModule → service/repository chỉ đọc → MongoDB
```

`ChatbotModule` nền tảng vẫn không phụ thuộc database hoặc Gemini/Mindmap/Summary/Quiz.
Module tìm kiếm được tích hợp trong `AppModule`, không kéo theo `CourseModule` và
các dependency enrollment/media/payment. Catalog HTTP hiện tại không bị thay đổi.

**Chưa có HTTP endpoint chat hoặc frontend** ở bước này. Có thể inject service để
sử dụng/test luồng hoàn chỉnh. Không thực hiện đăng ký, thanh toán, ghi dữ liệu
hoặc tìm nội dung bài học riêng tư.

## Contract

| Tham số             | Ý nghĩa                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `keyword`           | Chuỗi 1–100 ký tự sau trim. Match literal không phân biệt hoa/thường trong **tên khóa học OR tên danh mục đang hoạt động, chưa xóa**. |
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

Backend luôn thêm `status = published`, `deletedAt = null`, kể cả người dùng là
admin. Model không có tham số thay đổi phạm vi này.

Arguments có giới hạn 4096 bytes; phải là JSON object với đúng các trường allowlist.
Sai kiểu, field lạ, giá âm, khoảng giá rỗng hoặc điều kiện miễn phí/trả phí mâu
thuẫn bị từ chối trước khi truy vấn. Không tự chuyển chuỗi `"500000"` thành số,
không tự bỏ hoặc nới lỏng bộ lọc để có kết quả.

Keyword được escape regex. Phiên bản này không tìm description, không fuzzy,
không bỏ dấu tiếng Việt, không tự dịch từ khóa hay tìm theo vector.

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

`url` được backend dựng từ ID thật dưới `/courses/{id}`. Query chỉ lấy các field
cần thiết; không gửi mô tả, nội dung trả phí, email giảng viên hoặc audit data tới
model. Truy vấn lọc trước phân trang, sort `createdAt DESC, _id DESC` ổn định.

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

Service hiện stateless: mỗi câu hỏi cần đầy đủ điều kiện, ví dụ “React dưới 500k,
trang 2”. Hội thoại “còn nữa?” cần lớp lịch sử hội thoại ở bước tiếp theo.

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
pnpm --filter backend exec vitest run src/modules/course/tests/public-course-search.integration.spec.ts
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
```

Các case chọn riêng: `react`, `under_500k`, `python_beginner`, `free`,
`design_price_range`, `empty`. Nếu gặp 429, không tự retry: chạy lại case đó thủ công
sau khi provider khôi phục hạn mức.

Script dùng `CHATBOT_API_KEY` trong `backend/.env`, kiểm tra arguments thực tế model
sinh ra, đối chiếu các bản ghi kết quả và từng bộ lọc. Case `empty` dùng từ khóa
ngẫu nhiên và kiểm tra đúng câu trả lời rỗng. Script đọc database cấu hình với
`autoCreate=false`, `autoIndex=false`, không bootstrap `AppModule`, không ghi dữ
liệu hay tạo index. Output chỉ có trạng thái/tên case/số lượng, không có key,
question, tên khóa học, reasoning hoặc nội dung lỗi provider.
