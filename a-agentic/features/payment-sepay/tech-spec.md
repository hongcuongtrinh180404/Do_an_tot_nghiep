# Payment SePay — Technical Specifications

> **Module:** Data Models, Webhook Payload, and Endpoints for SePay Integration.

---

## 1. Mongoose Schemas & Domain Models

### A. Order Schema (`orders`)
- `orderCode`: string (unique index, tiền tố `MD` + 5 số ngẫu nhiên)
- `userId`: Types.ObjectId (ref: `UserEntity`, required, index)
- `courseId`: Types.ObjectId (ref: `CourseEntity`, required, index)
- `amount`: number (required, số tiền thực tế cần thanh toán)
- `originalPrice`: number (giá gốc niêm yết)
- `discountAmount`: number (số tiền giảm giá)
- `paymentMethod`: string (`SEPAY_BANK_TRANSFER`, `FREE`)
- `expiresAt`: Date (thời hạn thanh toán đơn hàng, index)
- `paidAt`: Date | null (thời điểm thanh toán thành công)
- `instructorCommissionRate`: number (tỷ lệ hoa hồng giảng viên, mặc định 0.7 = 70%)
- `instructorEarnings`: number (số tiền giảng viên nhận được)
- `status`: Enum (`PENDING`, `PAID`, `CANCELLED`, `EXPIRED`)
- Compound index: `{ userId: 1, courseId: 1, status: 1 }`
- Inherits `BaseAbstractDocument`.

### B. Payment Schema (`payments`)
- `orderId`: Types.ObjectId | null (ref: `OrderEntity`, index)
- `orderCode`: string | null (mã đơn hàng đọc từ giao dịch SePay, index)
- `sepayTransactionId`: string (unique index, mã giao dịch từ SePay, đảm bảo Idempotency)
- `amountIn`: number (số tiền thực nhận)
- `bankBrandName`: string (tên ngân hàng, e.g., "MBBank", "Vietcombank")
- `accountNumber`: string (số tài khoản nhận)
- `transactionDate`: Date (thời gian giao dịch theo SePay)
- `content`: string (nội dung chuyển khoản)
- `reconciliationStatus`: Enum (`MATCHED`, `UNDERPAID`, `OVERPAID`, `UNMATCHED_ORDER`, `EXPIRED_ORDER`, `INVALID_ACCOUNT`)
- `rawPayload`: Record<string, unknown> (toàn bộ payload Webhook phục vụ truy vết)
- Inherits `BaseAbstractDocument`.

### C. Enrollment Schema (`enrollments`)
- `userId`: Types.ObjectId (ref: `UserEntity`, required, index)
- `courseId`: Types.ObjectId (ref: `CourseEntity`, required, index)
- `orderId`: Types.ObjectId (ref: `OrderEntity`, required)
- `enrolledAt`: Date (default: Date.now)
- Compound unique index: `{ userId: 1, courseId: 1, deletedAt: 1 }`.
- Inherits `BaseAbstractDocument`.

---

## 2. API Endpoints

| Method | Endpoint | Description | Auth & Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments/create-order` | Tạo đơn hàng mua khóa học & sinh VietQR info | `STUDENT`, `INSTRUCTOR`, `ADMIN` |
| `GET` | `/api/v1/payments/order-status/:orderCode` | Kiểm tra trạng thái đơn hàng (polling) | `STUDENT`, `INSTRUCTOR`, `ADMIN` (Owner/Admin) |
| `POST` | `/api/v1/payments/sepay/webhook` | Nhận thông báo giao dịch từ SePay | Public (HMAC-SHA256 signature verification) |
| `POST` | `/api/v1/payments/webhook` | Endpoint alias nhận Webhook SePay | Public (HMAC-SHA256 signature verification) |
