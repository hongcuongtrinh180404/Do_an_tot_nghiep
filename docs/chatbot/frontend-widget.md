# Chatbot Frontend Widget

Widget trợ lý Mindly nằm trong `frontend/src/features/chatbot` và được gắn một lần
ở `AppProviders` bằng `next/dynamic` (`ssr: false`). Widget dùng đúng `apiClient`
hiện có để tái sử dụng Bearer token và cơ chế refresh JWT; không có axios client
hay storage token riêng.

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `chatbot.contract.ts` | Zod schema cho response, giới hạn 2000 ký tự, timeout 45 giây |
| `api/chatbot.api.ts` | Gọi `POST /chatbot/messages`, map lỗi sang thông báo tiếng Việt |
| `hooks/use-chatbot.ts` | Lịch sử tạm, chống gửi trùng, hủy request, countdown quota, retry |
| `components/chatbot-widget.tsx` | Launcher, dialog, form, danh sách khóa học, trạng thái lỗi |
| `components/personal-learning-reply.tsx` | Khóa sở hữu, tổng quan/chi tiết tiến độ và chọn khóa trùng tên |
| `components/chatbot.module.css` | Giao diện desktop 420 px và dialog fullscreen dưới 640 px |

## Hành vi

- Widget hiện lời mời đăng nhập cho guest và chỉ mở composer khi đã đăng nhập.
  Widget không xuất hiện ở `/admin*`,
  `/checkout*`, `/login`, `/register`, `/reset-password`, `/verify-email*`,
  `/courses/new` và các trang bài học (`/lessons/`).
- Cuộc trò chuyện chỉ nằm trong component, không lưu server. Component được key
  theo `user.id`; đổi tài khoản sẽ unmount session cũ, hủy request đang chạy và
  xóa transcript. Nút xóa chủ động cũng hủy request nhưng **không** reset quota.
- Mỗi request gửi câu hỏi và `context` ký số tùy chọn từ lần thành công gần nhất;
  không gửi toàn bộ transcript, role hay bộ lọc do client tự tạo. Ngữ cảnh chỉ nằm
  trong bộ nhớ component, không ghi localStorage/sessionStorage.
- Hỏi tiếp giữ điều kiện cũ, “xem thêm” sang trang; chủ đề mới bắt đầu lại.
  Xóa hội thoại/đổi tài khoản bỏ token và hủy request cũ. Response hủy hoàn tất
  muộn không khôi phục context. Lỗi provider/làm rõ giữ context; context hết hạn
  được bỏ mà không đăng xuất. Retry dùng context gốc của request thất bại và chỉ
  cho phép retry lượt mới nhất để không khôi phục nhánh hội thoại cũ.
- Nút gửi bị khóa khi đang chờ hoặc khi còn countdown `Retry-After`. Countdown
  chỉ xuất hiện khi server trả header quota; lỗi 429 từ provider không tạo thời
  gian chờ giả.
- Lỗi mạng, 5xx và timeout có nút “Thử lại câu hỏi”; lỗi 400/403 không retry.
  Chỉ JWT 401 không thể refresh mới đưa người dùng về trạng thái cần đăng nhập.
  Lỗi chatbot/provider không tự đăng xuất tài khoản.
- Card catalog chỉ được dựng từ `data.result.items`; contract buộc
  `url === /courses/{id}`, tối đa 10 item, nên không thể chèn link ngoài hay
  `javascript:`. Widget không tự tạo khóa học hoặc tự viết kết quả tìm kiếm.
- Contract nhận `filtersApplied.relatedKeywords` tùy chọn (tối đa 8 từ); AI mở rộng
  mục tiêu học ở backend. Card vẫn chỉ lấy từ `items` thật, không tạo card từ tên
  công nghệ suy luận. Không nhận mô tả, tags thô hoặc điểm xếp hạng nội bộ.
- Response được phân nhánh theo `kind`: catalog, khóa sở hữu, tiến độ hoặc làm rõ.
  Frontend vẫn nhận response catalog cũ chưa có `kind` trong lúc chuyển phiên bản.
- Khóa sở hữu hiển thị số thứ tự **từ 1 ở mỗi trang**, ngày đăng ký, trạng thái và
  số bài video hoàn thành. Không có bài video hiển thị “Chưa xác định”, không vẽ
  thanh 0% giả. Tổng quan dùng số đếm thật; chi tiết hiển thị bài còn lại, thời
  gian xem tích lũy và điểm tiếp tục học nếu còn hợp lệ.
- Nút “Xem tiến độ”/chọn tên trùng gửi câu hỏi theo số thứ tự của trang vừa trả về.
  Nút ở lượt cũ bị khóa để không chọn nhầm danh sách hiện tại; vẫn đọc được nội
  dung và mở link khóa học. Lượt pending, quota hoặc lỗi không tự đổi context.
- Zod kiểm tra tổng/ratio tiến độ, trạng thái hoàn thành, phân trang và link.
  Link khóa sở hữu chỉ là `/courses/{id}` hoặc `/my-courses`; link học tiếp phải
  đúng `/courses/{courseId}/lessons/{lastLessonId}` đã được server kiểm tra.
  Chỉ điều hướng khi người dùng bấm; không tự mở player hoặc ghi session/heartbeat.
- Trên trang chi tiết khóa học, launcher được nâng lên trên thanh mua hàng cố
  định của mobile.

## Kiểm thử

```sh
pnpm --filter frontend exec vitest run src/features/chatbot/tests
pnpm --filter frontend exec eslint src/features/chatbot
pnpm --filter frontend build
```

Kiểm tra giao diện thật bằng Chrome headless (fixture auth + chatbot, không ghi
dữ liệu):

```sh
cd frontend
node scripts/test-chatbot-visual.mjs
```

Script chụp desktop 1440, mobile 390, trạng thái kết quả/lỗi/cooldown và kiểm tra
launcher không đè thanh mua hàng. Ảnh được ghi vào thư mục temp của OpenCode.

Kiểm thử hội thoại trên trình duyệt thật (12 kiểm tra desktop/mobile; fixture API,
không gọi provider hoặc ghi dữ liệu):

```sh
cd frontend
node scripts/test-chatbot-conversation-browser.mjs
```

Thêm `--live` và truyền JWT có sẵn qua biến môi trường
`CHATBOT_BROWSER_ACCESS_TOKEN` để chạy đúng 5 request thật: backend trả phí
→ rẻ hơn → Yoga → xóa hội thoại/xem thêm → Python. Cần đủ quota tài khoản;
script không tự retry hoặc đổi tài khoản. Không in JWT/context/response body.
Ảnh kiểm chứng nằm trong `opencode/chatbot-conversation-check` ở thư mục temp.

Kiểm tra card cá nhân trên 1440/768/390 px bằng trình duyệt thật, fixture không
gọi River hoặc ghi dữ liệu nghiệp vụ (chạy từ repository root):

```sh
node frontend/scripts/test-chatbot-conversation-browser.mjs --learning
```

Smoke widget cá nhân với backend/River thật dùng đúng 5 lượt: danh sách → chọn
khóa → “khóa đó” → tổng quan → xóa chat, tham chiếu không còn hiệu lực.
Dùng token tài khoản kiểm thử **đã sở hữu khóa học**, không chạy đồng thời với
smoke API 5 lượt trên cùng quota:

```powershell
$env:CHATBOT_BROWSER_ACCESS_TOKEN='YOUR_EXISTING_TEST_ACCOUNT_TOKEN'
node frontend/scripts/test-chatbot-conversation-browser.mjs --live --learning
Remove-Item Env:CHATBOT_BROWSER_ACCESS_TOKEN
```

Để kiểm tra production, build frontend rồi chạy `next start` ở cổng riêng và đặt
`CHATBOT_TEST_ORIGIN` tương ứng. Ảnh smoke thật có thể chứa dữ liệu tài khoản
kiểm thử; không commit/chia sẻ. Không thêm thư viện UI mới.
