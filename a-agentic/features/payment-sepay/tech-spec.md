# Payment SePay — Technical Specifications

## API

Các đường dẫn dưới đây có prefix `/api/v1`.

| Method | Endpoint | Quyền / mục đích |
|---|---|---|
| POST | `/payments/create-order` | Đăng nhập; body `{ courseId }`; backend chốt giá và snapshot |
| GET | `/payments/orders/:orderCode` | Chủ đơn/ADMIN; chi tiết checkout, giá chốt, snapshot khóa học và QR cho tiền còn thiếu |
| GET | `/payments/order-status/:orderCode` | Chủ đơn/ADMIN; chỉ trạng thái, số tiền, hạn, `receivedAmount`, `reconciliationStatus`, `serverTime`; không populate khóa học |
| POST | `/payments/sepay/webhook` | Public nhưng bắt buộc HMAC raw body + timestamp; ACK JSON trực tiếp sau commit |
| POST | `/payments/webhook` | Alias tương thích cùng xác thực và xử lý |
| GET | `/payments/reconciliation?page=1&limit=20` | ADMIN; các receipt chưa đóng đối soát, khác MATCHED; limit tối đa 100 |
| GET | `/payments/reconciliation/:paymentId` | ADMIN; receipt và lịch sử đối soát, kể cả đã resolve |
| POST | `/payments/reconciliation/:paymentId/reprocess` | ADMIN; `{ note, orderCode? }`; chỉ receipt đã xác thực, chưa áp dụng/đóng; không sửa số tiền |
| POST | `/payments/reconciliation/:paymentId/resolve` | ADMIN; `{ type: 'ACKNOWLEDGED' | 'REFUNDED', note, bankReference?, refundedAmount? }`; ghi nhận xử lý bên ngoài, không chuyển tiền |
| POST | `/enrollments/register-free` | Đăng nhập; `{ courseId }`; chỉ giá 0, trả Enrollment, không có Order/Payment |

## Dữ liệu và index

### Orders

- `orderCode`: unique, mã mới `^MD[A-Z0-9]{10}$`. Mã cũ `^MD\d{5}$` vẫn được đọc.
- `userId`, `courseId`: ObjectId; `amount`, `originalPrice`, `discountAmount`: snapshot giá VND.
- `paymentMethod=SEPAY_BANK_TRANSFER`, `expiresAt`, `paidAt` (thời gian ngân hàng), commission/earnings theo giá chốt.
- `status`: PENDING/PAID/CANCELLED/EXPIRED; mọi chuyển PAID/hết hạn đều cập nhật có điều kiện.
- `pendingCheckoutKey`: `${userId}:${courseId}`, chỉ tồn tại khi checkout mới đang PENDING; sparse unique, bỏ khi PAID/EXPIRED/CANCELLED. Không cần xóa/chuyển đổi các đơn cũ để tạo index.
- `paymentRevision`: khóa ghi theo đơn trong transaction, chống cộng dồn tiền từ snapshot cũ.
- `receivedAmount`, `lastPaymentStatus`: số tiền hợp lệ và kết quả đối soát gần nhất.
- `courseSnapshot`: title/slug/thumbnailUrl/instructorName; `bankSnapshot`: bankAccount/bankCode/accountName.
- Index cặp user/course/status và index user/createdAt được giữ nguyên.

### Payments

- `sepayTransactionId`: unique vĩnh viễn, kể cả receipt soft-delete cũng không được dùng lại.
- `orderId`, `orderCode`: nullable cho giao dịch chưa khớp.
- `amountIn`, `accountNumber`, `bankBrandName`, `transactionDate` (nullable nếu parse lỗi), `content`, `rawPayload`.
- `verifiedAt`, `payloadHash` (SHA256 raw body): đánh dấu receipt đi qua xác thực HMAC; không lưu secret/signature.
- `reconciliationStatus`: MATCHED, UNDERPAID, OVERPAID, UNMATCHED_ORDER, EXPIRED_ORDER, INVALID_ACCOUNT, CANCELLED_ORDER, DUPLICATE_PAYMENT, ALREADY_ENROLLED, INVALID_TRANSACTION_DATE, UNAVAILABLE_ORDER.
- `appliedAt`: receipt đã đóng góp vào cấp quyền; `excessAmount`: phần cần đối soát khi nhận thừa.
- `resolution`: type/note/actorId/at/bankReference/refundedAmount. Chỉ ghi nhận việc xử lý ngoài hệ thống.
- `auditHistory`: action/actorId/note/at/previousStatus/previousOrderCode.

### Enrollments

Unique `{ userId: 1, courseId: 1, deletedAt: 1 }`. Khóa miễn phí có `orderId=null`; khóa có phí được tạo cùng Payment/Order trong transaction.

## Transaction và response

Payment transaction dùng snapshot read concern, majority write concern, max commit 10 giây; tổng ngân sách xử lý và retry là 20 giây. MongoDB tự retry write conflict; collision unique receipt/enrollment được đọc lại trong transaction mới với số lần retry giới hạn. Không chạy thao tác song song trong cùng session và không có fallback tuần tự.

Webhook trả đúng `{ "success": true }`, không bị bọc bởi `ApiResponse`. Lỗi storage/commit/cấp quyền được truyền lên HTTP lỗi để SePay retry. Ngoại lệ nghiệp vụ chỉ ACK sau khi receipt đối soát đã commit.

## Frontend

- Tải checkout qua endpoint chi tiết; polling endpoint trạng thái mỗi 3 giây khi còn PENDING.
- Dừng polling khi PAID/EXPIRED/CANCELLED, lỗi 401/403/404 hoặc cần đối soát. Có nút kiểm tra lại cho webhook đến trễ.
- Lỗi tạm thời backoff 6–30 giây, không polling ở tab nền.
- Countdown điều chỉnh theo `serverTime`, không tin đồng hồ máy khách, chỉ refetch một lần tại mốc 0.
- Chỉ hiển thị QR đúng phần còn thiếu; ẩn QR cũ trong lúc tải lại sau partial payment.
- Giá tóm tắt lấy từ Order, không từ giá khóa học đang thay đổi.

## Kiểm thử

```powershell
pnpm --filter share-lib build
pnpm --filter backend test:payment
pnpm --filter backend test:payment:integration
pnpm --filter backend exec tsx --tsconfig ../frontend/tsconfig.json --test ../frontend/src/features/payment/tests/*.spec.ts
```

Integration cần MongoDB replica set local. Database test có tên ngẫu nhiên `mindly_payment_test_*`, chỉ xóa database có đúng tên/prefix đó sau kiểm thử; không dùng database ứng dụng. Các test bao phủ unique index thật, đồng thời, rollback, partial/over/duplicate payment, hết hạn, receipt cũ và HTTP raw-body/ACK/quyền ADMIN.
