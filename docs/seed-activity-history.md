# Mindly — lịch sử mua, đăng ký và review

## Database và phạm vi đã được xác nhận

- Database: MongoDB `thc_datn`, `localhost:27017`, replica set `rs0`.
- Cấu hình `development`, **dùng chung dữ liệu với Production**. Chủ dự án đã
  xác nhận cho phép ghi seed và chấp nhận quyền học/review/doanh thu seed xuất hiện
  trên các API thật của cả hai môi trường.
- Khoảng được chốt lại: **12–23/11/2026**, giờ Việt Nam. Không dùng tháng 10 vì
  toàn bộ 36 khóa học được tạo ngày 12/11. Mốc cuối được đóng băng tại lần commit,
  không vượt thời điểm đó hoặc 23/11 23:59:59.999 UTC+7.
- Chỉ truy vấn tài khoản và khóa học hiện có. Không tạo user, course, lesson, quiz.
- Chỉ học viên `student/active/deletedAt:null` tham gia quota 5–6. Hai enrollment
  cũ thuộc tài khoản instructor đã xóa mềm được giữ nguyên và **không bù quota**.

## Lệnh chạy từ thư mục gốc

```powershell
# Chỉ đọc; kiểm tra đủ tài khoản, schema và xem số lượng dự kiến
pnpm --filter backend seed:activity

# Chỉ dùng sau khi đã xác nhận tác động lên database dùng chung
pnpm --filter backend seed:activity --apply --expect-db=thc_datn --allow-shared-production

# Kiểm tra bản ghi thật, quan hệ, ngày, tiền, rating, quota và dữ liệu gốc
pnpm --filter backend seed:activity:verify

# Kiểm tra HTTP thật trên localhost; chỉ GET, JWT ngắn hạn, user hiện có
# Không đổi user/password/email-verification/session, không tắt auth guard
pnpm --filter backend seed:activity:verify-api

# Kiểm thử transaction ghi toàn bộ rồi abort, KHÔNG commit dữ liệu thử
pnpm --filter backend seed:activity --apply --test-abort --expect-db=thc_datn --allow-shared-production

# Trình duyệt thật, không mock/fulfill API; chặn mạng riêng chart để test lỗi/retry
pnpm --filter frontend exec node scripts/test-activity-history-browser.mjs
```

Không dùng `seed:refresh` hoặc `seed:reviews` cho tác vụ này. Script `seed:reviews`
cũ có thể tạo tài khoản/khóa học và xóa review.

## Bảo vệ dữ liệu

- Mặc định dry-run; `--apply` bắt buộc chỉ rõ tên database và xác nhận database
  dùng chung Production, bất kể giá trị `NODE_ENV`.
- Nguồn thanh toán `INTERNAL_SEED`, `internalReference` riêng, `seedBatch` và
  `seedReference` trên các bản ghi được nhập. Không gọi cổng thanh toán.
- Không tạo `sepayTransactionId`, `verifiedAt`, `payloadHash`, tài khoản ngân hàng,
  webhook hoặc chữ ký giả. API đối soát/hoàn tiền từ chối payment nội bộ.
- Migration index hẹp: tạo unique partial index bảo vệ **mọi SePay ID thật** trước,
  rồi chỉ bỏ unique index cũ `sepayTransactionId_1` không partial/sparse. Không dùng
  `syncIndexes`, không reset collection hoặc xóa dữ liệu.
- Một transaction cho toàn bộ batch; trạng thái `activity_seed_runs` cùng
  transaction giúp tuần tự hóa các lần chạy. Không chạy song song thao tác MongoDB
  trong một session. Nếu lỗi thì abort, không cố cứu bằng ghi rời rạc.
- Batch cố định `mindly-activity-2026-11-12--23-v1`, quota 5/6 và lựa chọn ngẫu nhiên
  ổn định theo batch/ID truy vấn được; lần chạy lại không đổi mục tiêu hoặc ngày.
- Snapshot trước ghi được lưu dưới
  `%LOCALAPPDATA%\Temp\opencode\activity-history\before-*.ejson`.
  Không xuất mật khẩu, token hoặc URI kết nối. Hash của từng bản ghi gốc được lưu
  trong manifest để kiểm chứng không bị sửa. Khóa học chỉ cập nhật cache
  `ratingAvg`, `reviewCount`, `updatedAt` bằng repository nghiệp vụ.
- Không ghi đè review thật, trạng thái học thật hoặc khôi phục dữ liệu đã xóa.
  Nếu phát hiện không thể đáp ứng quota/nghiệp vụ thì dừng trước commit.
- Giá nhập theo catalog thật hiện có; không có bảng lịch sử giá nên không tuyên bố
  đây là giá ngân hàng hoặc giao dịch thực trong quá khứ. Giá gốc/giảm giá/hoa hồng
  được snapshot theo helper checkout dùng chung. Database hiện không có lịch sử
  điều chỉnh hoa hồng; dùng policy hiện có 30% nền tảng, 70% giảng viên. Script
  dừng để kiểm tra lại nếu phát sinh lịch sử chính sách không thể xác định an toàn.

## Review và miễn phí

Free enrollment dùng chung điều kiện kiểm tra với service đăng ký miễn phí,
`orderId:null`, không có order/payment hoặc doanh thu.

Mỗi enrollment được seed có một review 1–5 sao với nhận xét phù hợp. Trước review,
script lưu câu trả lời quiz theo `quizRevision`, `quizSnapshot` và media completion
theo `contentVersion` của bài có sẵn. Tỷ lệ hoàn thành được kiểm tra theo cùng
`summarizeProgress` mà API sử dụng, **hơn 20%**, không chỉ tăng thời gian xem.
Với curriculum hiện tại, hoàn thành một trong hai bài tương ứng 50%.

Ngày tạo user/course/section/lesson/quiz, ngày mua, thời gian hoàn thành, ngày review
được kiểm tra theo thứ tự và không nằm trong tương lai.

## Kết quả lần commit 23/11/2026

| Nội dung | Kết quả |
|---|---:|
| Khóa học có sẵn | 36 (27 có phí, 9 miễn phí) |
| Học viên đủ điều kiện có sẵn | 9 |
| Mua có phí / order / payment nội bộ mới | 144 / 144 / 144 |
| Đăng ký miễn phí mới | 49 |
| Enrollment / review mới | 193 / 193 |
| Learning progress / video completion mới | 193 / 193 |
| Quiz answer mới | 1.351 |
| Doanh thu seed | 435.000đ |
| Nền tảng / giảng viên từ seed | 130.500đ / 304.500đ |
| Tổng doanh thu gồm hai đơn thật cũ | 439.000đ |
| Tổng đơn PAID / enrollment gồm dữ liệu cũ | 146 / 195 |
| Bản ghi gốc đã đối chiếu hash | 799 |
| Quota | 23 khóa × 5, 13 khóa × 6 |
| Khóa chưa đạt | 0 |

Phân bố sao: 1★:33, 2★:43, 3★:39, 4★:31, 5★:47.
Mua/đăng ký có dữ liệu ở cả 12 ngày từ 12 đến 23/11.

Không đưa hai enrollment cũ vào quota nhưng vẫn giữ doanh thu thật trong Dashboard.
Đây không phải sai lệch: các API tổng ghi nhận 146 lượt có phí + 49 miễn phí.

### Kiểm thử đã thực hiện

- 248 test Backend liên quan (246 test trước đó và 2 test bổ sung chặn đối soát/
  hoàn tiền cho nguồn nội bộ).
- 17 test Frontend liên quan; có kiểm tra response rỗng, lỗi API không dùng mock,
  số tiền từ API không bị nhân hệ số, bảng review và hiệu suất khóa học.
- 453 HTTP request thật: tất cả trả 200 và được đối chiếu database. Bao phủ 36
  khóa học, 9 học viên, cả 193 quyền học và tiến độ đủ review, 144 chi tiết thanh
  toán seed, 4 giảng viên, doanh thu theo ngày/tháng, ranking và phân loại paid/free.
- Kiểm tra thêm 18 request `order-status`/`orders` trên cả 9 học viên: PAID, đúng
  số tiền, không sinh thông tin QR thanh toán lại. Xem đơn của học viên khác trả
  403 đúng phân quyền.
- Rollback: đã ghi toàn bộ batch trong transaction rồi abort và đối chiếu toàn bộ
  business collections không đổi. Một lỗi driver MongoDB CSOT/getMore được phát
  hiện trong kiểm thử và đã sửa trước commit bằng cách bỏ timeout không tương
  thích; không dùng ghi ngoài transaction để né lỗi.
- Chạy lại `--apply`: tạo 0 bản ghi, bỏ qua 193 review có sẵn, không đổi mục tiêu.
- Trình duyệt thật: Admin 1440px và 390px hiển thị 439.000đ từ API thật, không
  tràn ngang; giảng viên hiển thị 147.000đ đúng tài khoản được kiểm tra. Chặn
  riêng request chart xác nhận lỗi không hiển thị số giả, bỏ chặn + retry khôi
  phục dữ liệu thật. Không mock/fulfill payload trả về.
- Server khởi động lại trong quá trình test: batch vẫn `COMPLETED`, 144 order/
  payment và 193 enrollment/review vẫn còn; không seed lại sau khởi động lại.
- Type-check mã Backend chạy thực tế và Frontend đã qua. Type-check toàn repo
  có lỗi ở các test/script ngoài phạm vi (Mongoose model generics, fixture
  course/transcript/jobs); không tự sửa các thay đổi đó.

Kết quả API và screenshot nằm ở
`%LOCALAPPDATA%\Temp\opencode\activity-history\api-verification.json` và
`%LOCALAPPDATA%\Temp\opencode\activity-history\browser\`.
Đối chiếu cuối sau kiểm thử UI được lưu ở `final-database-report.json`; bản kiểm
tra order API lưu ở `order-api-verification.json` trong cùng thư mục.

Biểu đồ Admin đã bỏ fallback số liệu mock và hệ số nhân. Khi HTTP lỗi, biểu đồ
hiển thị lỗi và nút thử lại thay vì số giả/giữ tổng cũ. Response rỗng được xem là
dữ liệu rỗng thật. Không thay đổi giao diện hoặc luồng Frontend không liên quan.

## File triển khai

- `backend/scripts/seed-activity-history.ts`
- `backend/scripts/activity-history/core.ts`
- `backend/scripts/activity-history/core.spec.ts`
- `backend/scripts/verify-activity-api.ts`
- `backend/package.json`
- `backend/src/modules/base/documents/base.abstract.document.ts`
- `backend/src/modules/payment/schemas/payment.schema.ts`
- `backend/src/modules/payment/services/payment.service.ts`
- `backend/src/modules/payment/repositories/payment.repository.ts`
- `backend/src/modules/payment/utils/order-pricing.util.ts`
- `backend/src/modules/payment/tests/internal-payment.spec.ts`
- `backend/src/modules/payment/tests/payment.service.spec.ts`
- `backend/src/modules/enrollment/utils/free-enrollment.util.ts`
- `backend/src/modules/enrollment/services/enrollment.service.ts`
- `backend/src/modules/learning-progress/schemas/lesson-completion.schema.ts`
- `share-lib/src/interfaces/payment.interface.ts`
- `frontend/src/features/admin/dashboard/api/admin-dashboard.api.ts`
- `frontend/src/features/admin/dashboard/components/dashboard-revenue-section.tsx`
- `frontend/src/features/admin/tests/dashboard-revenue-real-data.spec.tsx`
- `frontend/scripts/test-activity-history-browser.mjs`
- `docs/seed-activity-history.md`

Các thay đổi có sẵn khác trong working tree không thuộc lần triển khai này.
