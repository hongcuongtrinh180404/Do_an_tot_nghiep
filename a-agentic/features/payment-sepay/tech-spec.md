# Payment SePay — Technical Specifications

> **Module:** Data Models, Webhook Payload, and Endpoints for SePay Integration.

---

## 1. Mongoose Schemas & Domain Models

### A. Order Schema (`orders`)
- `orderCode`: string (unique index, e.g., "DH" + 6 số ngẫu nhiên)
- `userId`: Types.ObjectId (ref: `User`, required, index)
- `courseId`: Types.ObjectId (ref: `Course`, required, index)
- `amount`: number (required)
- `status`: Enum (`PENDING`, `PAID`, `CANCELLED`, `EXPIRED`)
- Inherits `BaseAbstractDocument`.

### B. Transaction Schema (`transactions`)
- `orderId`: Types.ObjectId (ref: `Order`, required, index)
- `sepayTransactionId`: string (unique index, mã giao dịch từ SePay)
- `amountIn`: number (số tiền thực nhận)
- `bankBrandName`: string (tên ngân hàng, e.g., "MBBank", "Vietcombank")
- `accountNumber`: string (số tài khoản nhận)
- `transactionDate`: Date
- `content`: string (nội dung chuyển khoản)
- Inherits `BaseAbstractDocument`.

### C. Enrollment Schema (`enrollments`)
- `userId`: Types.ObjectId (ref: `User`, required, index)
- `courseId`: Types.ObjectId (ref: `Course`, required, index)
- `orderId`: Types.ObjectId (ref: `Order`, required)
- `enrolledAt`: Date (default: Date.now)
- Compound unique index: `{ userId: 1, courseId: 1 }`.
- Inherits `BaseAbstractDocument`.

---

## 2. API Endpoints

| Method | Endpoint | Description | Auth & Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments/create-order` | Tạo đơn hàng mua khóa học & sinh VietQR info | `USER`, `INSTRUCTOR`, `ADMIN` |
| `GET` | `/api/v1/payments/order-status/:orderCode` | Kiểm tra trạng thái đơn hàng (polling) | `USER`, `INSTRUCTOR`, `ADMIN` |
| `POST` | `/api/v1/payments/sepay-webhook` | Nhận thông báo giao dịch từ SePay | Public (Xác thực Webhook Secret) |
