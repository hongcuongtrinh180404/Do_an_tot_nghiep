# Chatbot AI client — thiết lập và kiểm thử

## Kiến trúc

```text
ChatbotModule → ChatbotAiClient → OpenAI-compatible API (River / DeepSeek)

TranscriptAnalysisModule → GeminiModule → GeminiService → River / Gemini
```

`ChatbotModule` export `ChatbotAiClient`; `AppModule` dùng module này thông qua
`ChatbotSearchModule` bên trong `ChatbotHttpModule`.
Client dùng package `openai` hiện có, với instance và cấu hình riêng. Mỗi lần
`complete()` gửi tối đa **một request không streaming** tới provider.

Đã có tool [`search_courses`](./search-courses.md) và lớp điều phối tìm kiếm chỉ
đọc và [HTTP API chat có JWT](./http-api.md). Lưu hội thoại, FAQ và frontend là các bước tiếp theo.
Các function nghiệp vụ chỉ được
**đọc dữ liệu đã kiểm tra quyền sở hữu/quyền truy cập**; không thực hiện giao dịch
hoặc thay đổi dữ liệu. Kiến trúc này không cần RAG hay vector database.

## Cấu hình

Khai báo trong `backend/.env` hoặc môi trường triển khai:

```dotenv
CHATBOT_ENABLED=false
CHATBOT_API_KEY=
CHATBOT_BASE_URL=https://api.river.ai/v1
CHATBOT_MODEL=deepseek-ai/DeepSeek-V4.1-Flash-1017
CHATBOT_TIMEOUT_MS=30000
CHATBOT_MAX_OUTPUT_TOKENS=2048
```

| Biến                        | Quy tắc                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| `CHATBOT_ENABLED`           | Mặc định `false`. Khi tắt, module load được mà không khởi tạo SDK.   |
| `CHATBOT_API_KEY`           | Bắt buộc khi bật; dùng riêng credential trước đây đặt ở River key 3. |
| `CHATBOT_BASE_URL`          | HTTPS; không chứa username/password, query hoặc fragment.            |
| `CHATBOT_MODEL`             | Tên model, tối đa 200 ký tự; mặc định như trên.                      |
| `CHATBOT_TIMEOUT_MS`        | Số nguyên từ 1000 đến 120000 ms, áp dụng cho **mỗi lượt gọi model**. |
| `CHATBOT_MAX_OUTPUT_TOKENS` | Số nguyên từ 1 đến 8192, mặc định 2048.                              |

Bật bằng `CHATBOT_ENABLED=true` và gán `CHATBOT_API_KEY`. Client không tự lấy key,
model hoặc timeout từ `RIVER_*`/`GEMINI_*`.

Phân bổ key của dự án:

- `RIVER_API_KEY_1`, `RIVER_API_KEY_2`: Mindmap/Summary/Quiz.
- `CHATBOT_API_KEY`: credential riêng, trước đây là `RIVER_API_KEY_3`.
- Để trống `RIVER_API_KEY_3`, không lặp credential chatbot trong biến dự phòng
  `RIVER_API_KEY`. Biến dự phòng có thể trùng key 1 hoặc 2.
- Sao chép giá trị thật khi cấu hình, không dùng chuỗi literal `${RIVER_API_KEY_3}`:
  client không tự expand biến môi trường hoặc fallback sang River.

Việc tách credential ở ứng dụng không bảo đảm River tách quota theo key nếu các
key dùng chung tài khoản/hạn mức tại provider.

Khởi tạo module không gửi request kiểm tra kết nối. Cấu hình sai được phát hiện
khi backend khởi động; thông báo chỉ chứa tên biến sai. Không đưa key vào source,
frontend, log hoặc commit `.env`.

## Sử dụng qua NestJS DI

Module tiêu thụ import `ChatbotModule`, rồi inject client:

```ts
import { Injectable, Module } from "@nestjs/common";
import { ChatbotAiClient, ChatbotModule } from "./modules/chatbot/index.js";

@Injectable()
export class ChatExampleService {
  constructor(private readonly ai: ChatbotAiClient) {}

  async answer(question: string, signal?: AbortSignal) {
    const result = await this.ai.complete({
      messages: [
        { role: "system", content: "Bạn là trợ lý của Mindly." },
        { role: "user", content: question },
      ],
      signal,
    });
    return result.assistantMessage.content;
  }
}

@Module({
  imports: [ChatbotModule],
  providers: [ChatExampleService],
})
export class ChatExampleModule {}
```

### Function Calling

Input hỗ trợ:

- `messages`: lịch sử do backend xây dựng với role `system`, `user`, `assistant`, `tool`.
- `tools`: danh sách function schema do backend cung cấp.
- `toolChoice`: `auto` (mặc định khi có tools) hoặc `none`.
- `signal`: `AbortSignal` để hủy request.
- `requestId`: UUID từ server; nếu thiếu/sai định dạng sẽ tạo UUID mới.

Output có `assistantMessage`, `finishReason`, `model`, `requestId`,
`providerResponseId`, `durationMs` và token `usage` nếu hợp lệ.

Luồng hai lượt:

1. Gọi `complete({ messages, tools })`.
2. Đọc `assistantMessage.tool_calls`. `content: null` là hợp lệ khi có tool calls.
3. Bộ thực thi kiểm tra tên tool trong allowlist, parse/validate arguments và xác
   minh quyền từ phiên đăng nhập của server trước khi đọc dữ liệu.
4. Append **nguyên `assistantMessage`** vào lịch sử.
5. Thêm một message `{ role: 'tool', tool_call_id: call.id, content: JSON.stringify(data) }`
   cho mỗi call, khớp đúng ID.
6. Gọi `complete()` tiếp; có thể dùng `toolChoice: 'none'` để yêu cầu câu trả lời cuối.

Client giữ nguyên chuỗi arguments, kể cả JSON sai cú pháp; lớp thực thi phải từ
chối tham số không hợp lệ. Client không tự chạy tool, retry hay chuyển model.
Các tool call có thể xuất hiện đồng thời trong một response.

`assistantMessage.reasoning_content` được giữ khi provider trả về để phục vụ
continuation của DeepSeek. Trường này **chỉ dùng nội bộ backend**, không phải nội
dung trả về HTTP/frontend. Kết quả client là contract nội bộ, không dùng trực tiếp
làm response DTO. Lớp điều phối sau này cần giới hạn số lượt gọi model và tổng thời
gian của một cuộc hội thoại.

## Lỗi và log

`ChatbotAiError` là lỗi riêng, có `code`, `retryable` và `configurationFields`
(khi sai cấu hình). Nó không phải lỗi JWT/HTTP của Mindly, không giữ raw SDK error,
response body, headers hoặc `cause`.

| Code                           | Ý nghĩa                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| `CHATBOT_DISABLED`             | Chatbot đang tắt.                                                |
| `CHATBOT_CONFIG_INVALID`       | Sai/thiếu cấu hình; xem `configurationFields`.                   |
| `CHATBOT_REQUEST_INVALID`      | Input rỗng/sai hoặc provider từ chối request, ví dụ 400/404/422. |
| `CHATBOT_PROVIDER_AUTH`        | Provider trả 401/403; không phải lỗi đăng nhập Mindly.           |
| `CHATBOT_RATE_LIMITED`         | Provider trả 429.                                                |
| `CHATBOT_TIMEOUT`              | Hết timeout hoặc provider trả 408.                               |
| `CHATBOT_CANCELLED`            | Caller hủy request.                                              |
| `CHATBOT_PROVIDER_UNAVAILABLE` | Lỗi kết nối hoặc provider trả 5xx.                               |
| `CHATBOT_PROVIDER_ERROR`       | Lỗi provider khác đã được làm sạch.                              |
| `CHATBOT_RESPONSE_INVALID`     | Response sai cấu trúc/rỗng hoặc tool calls không nhất quán.      |
| `CHATBOT_RESPONSE_INCOMPLETE`  | Phản hồi bị cắt (`finish_reason: length`).                       |
| `CHATBOT_RESPONSE_BLOCKED`     | Provider lọc nội dung hoặc trả refusal.                          |

Chỉ rate limit, timeout và provider unavailable có `retryable: true`. Đây là
metadata cho lớp điều phối; SDK và client đều không tự retry (`maxRetries: 0`).

Log thành công chỉ có UUID, model cấu hình, thời gian, finish reason, số tool call
và token usage. Log lỗi chỉ có UUID, thời gian và mã lỗi chuẩn hóa. SDK logging
được đặt `off`, kể cả khi môi trường có `OPENAI_LOG=debug`. Prompt, câu trả lời,
reasoning, tool arguments/result và credential không được log.

## Kiểm thử

Chạy từ thư mục gốc repository:

```sh
# Unit/DI tests; provider được mock, không cần key hoặc MongoDB
pnpm --filter backend test:chatbot

# Hồi quy phần AI bài học
pnpm --filter backend exec vitest run src/modules/chatbot/tests src/modules/gemini/tests src/modules/transcript-analysis/tests

pnpm --filter backend build
```

### Smoke test thực tế

Sau khi khai báo `CHATBOT_ENABLED=true` và `CHATBOT_API_KEY`:

```sh
pnpm --filter backend test:chatbot:live
```

Script đọc `backend/.env`; biến đã đặt trong process được ưu tiên. Script tạo
Nest context chỉ chứa `ChatbotModule`, dùng function giả và dữ liệu ngẫu nhiên:

```text
Request 1 → function call với recordId giả
          → tạo kết quả có nonce và số liệu ngẫu nhiên sau request 1
Request 2 → gửi assistant message + tool result
          → đối chiếu toàn bộ JSON trả lời với kết quả giả
```

Lượt chạy thành công dùng đúng hai request có tính quota tại provider. Script
không load `AppModule`, không kết nối database và không gọi service nghiệp vụ.
Output chỉ là trạng thái, số lượt gọi, thời gian và usage; lỗi có exit code 1.
Lệnh live được chạy thủ công, không nằm trong `pnpm test`.

Không dùng key 1/2 để dự phòng cho chatbot khi test lỗi hoặc gặp 429. Hãy kiểm tra
cấu hình `CHATBOT_API_KEY` hoặc chạy lại thủ công sau khi hạn mức provider phục hồi.
